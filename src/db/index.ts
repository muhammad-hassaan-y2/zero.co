import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createRequire } from 'node:module';
import * as schema from './schema';

const globalForPg = globalThis as unknown as {
  zerocoPool?: Pool;
  zerocoMemDb?: unknown;
};

const memorySchemaSql = `
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE autonomy_level AS ENUM ('observe', 'suggest', 'approval_required', 'auto_act');
CREATE TYPE agent_status AS ENUM ('healthy', 'warning', 'blocked', 'throttled', 'paused');
CREATE TYPE policy_mode AS ENUM ('auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate');
CREATE TYPE decision_status AS ENUM ('pending', 'approved', 'rejected', 'blocked', 'executed', 'throttled', 'paused');
CREATE TYPE event_severity AS ENUM ('info', 'warning', 'high', 'critical');
CREATE TYPE workflow_run_status AS ENUM ('queued', 'running', 'waiting_approval', 'completed', 'failed');
CREATE TYPE result_status AS ENUM ('projected', 'verified', 'blocked');
CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'contacted', 'replied', 'negotiating', 'closed_won', 'closed_lost', 'disqualified');
CREATE TYPE outbound_email_status AS ENUM ('draft', 'pending_approval', 'sent', 'failed', 'blocked');
CREATE TYPE customer_query_status AS ENUM ('new', 'triaged', 'pending_approval', 'replied', 'closed', 'blocked');

CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  business_type text,
  customer_segment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE integration_accounts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  email text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'connected',
  last_sync_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider, provider_account_id)
);
CREATE UNIQUE INDEX workspaces_slug_idx ON workspaces(slug);

CREATE TABLE onboarding_profiles (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_description text NOT NULL,
  customers text NOT NULL,
  problem_solved text,
  customer_outcome text,
  core_departments text,
  existing_human_roles text,
  repetitive_work text,
  high_risk_work text,
  current_tools text,
  ai_automation_goals text,
  actions_requiring_approval text,
  blocked_actions text,
  auto_approved_actions text,
  monthly_ai_budget numeric(10, 2) NOT NULL DEFAULT 500,
  risk_tolerance risk_level NOT NULL DEFAULT 'medium',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  purpose text NOT NULL,
  kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level risk_level NOT NULL DEFAULT 'medium',
  budget numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE digital_ftes (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  department_id text REFERENCES departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text NOT NULL,
  goal text NOT NULL,
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  autonomy_level autonomy_level NOT NULL DEFAULT 'suggest',
  daily_budget numeric(10, 2) NOT NULL DEFAULT 10,
  risk_level risk_level NOT NULL DEFAULT 'medium',
  status agent_status NOT NULL DEFAULT 'healthy',
  current_task text NOT NULL DEFAULT 'Waiting for assigned workflow',
  success_rate integer NOT NULL DEFAULT 90,
  cost_today numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workflows (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger text NOT NULL,
  owner_agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  tools_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  approval_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_metric text NOT NULL,
  failure_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workflow_runs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_id text NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  status workflow_run_status NOT NULL DEFAULT 'queued',
  trigger_snapshot text NOT NULL,
  result_summary text NOT NULL DEFAULT 'Waiting for execution',
  output_artifacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  cost_usd numeric(10, 2) NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workflow_step_runs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_run_id text NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  step_name text NOT NULL,
  status workflow_run_status NOT NULL DEFAULT 'completed',
  evidence text NOT NULL,
  tool_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE business_results (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_run_id text REFERENCES workflow_runs(id) ON DELETE SET NULL,
  agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  name text NOT NULL,
  value numeric(12, 2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'tasks',
  proof text NOT NULL,
  status result_status NOT NULL DEFAULT 'projected',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales_leads (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  website text,
  segment text,
  pain_point text NOT NULL,
  status lead_status NOT NULL DEFAULT 'new',
  score integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbound_emails (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id text NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status outbound_email_status NOT NULL DEFAULT 'pending_approval',
  approval_reason text NOT NULL,
  provider_message_id text,
  failure_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customer_queries (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  company_name text,
  subject text NOT NULL,
  message text NOT NULL,
  intent text NOT NULL DEFAULT 'general',
  priority risk_level NOT NULL DEFAULT 'medium',
  status customer_query_status NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customer_replies (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  query_id text NOT NULL REFERENCES customer_queries(id) ON DELETE CASCADE,
  agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status outbound_email_status NOT NULL DEFAULT 'pending_approval',
  approval_reason text NOT NULL,
  provider_message_id text,
  failure_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id text REFERENCES sales_leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'sales',
  status text NOT NULL DEFAULT 'active',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales_deals (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id text REFERENCES sales_leads(id) ON DELETE SET NULL,
  customer_id text REFERENCES customers(id) ON DELETE SET NULL,
  owner_agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'closed_won',
  value numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  close_reason text NOT NULL,
  next_step text NOT NULL DEFAULT 'Onboard customer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_accounts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  name text NOT NULL,
  website text,
  industry text,
  status text NOT NULL DEFAULT 'prospect',
  annual_revenue numeric(12,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_contacts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  account_id text REFERENCES crm_accounts(id) ON DELETE SET NULL,
  owner_agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  title text,
  lifecycle_stage text NOT NULL DEFAULT 'lead',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm_activities (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id text REFERENCES sales_leads(id) ON DELETE SET NULL,
  customer_id text REFERENCES customers(id) ON DELETE SET NULL,
  account_id text REFERENCES crm_accounts(id) ON DELETE SET NULL,
  contact_id text REFERENCES crm_contacts(id) ON DELETE SET NULL,
  owner_agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'task',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_memories (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id text,
  content text NOT NULL,
  embedding jsonb NOT NULL DEFAULT '[]',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE policies (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  condition text NOT NULL,
  action text NOT NULL,
  mode policy_mode NOT NULL,
  risk_level risk_level NOT NULL DEFAULT 'medium',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE decision_ledger (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  department_id text REFERENCES departments(id) ON DELETE SET NULL,
  action text NOT NULL,
  policy_matched text NOT NULL,
  risk_level risk_level NOT NULL DEFAULT 'medium',
  decision decision_status NOT NULL DEFAULT 'pending',
  result text NOT NULL DEFAULT 'Waiting for review',
  approved_by text,
  database_reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE simulation_events (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id text REFERENCES digital_ftes(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity event_severity NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_blueprints (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  target_customer text NOT NULL,
  value_proposition text NOT NULL,
  revenue_model text NOT NULL,
  operating_model text NOT NULL,
  core_kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  launch_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sops (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_id text REFERENCES workflows(id) ON DELETE SET NULL,
  title text NOT NULL,
  objective text NOT NULL,
  owner text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  approval_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  failure_handling text NOT NULL,
  audit_requirements text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE board_reports (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  tasks_completed integer NOT NULL DEFAULT 0,
  money_spent numeric(10, 2) NOT NULL DEFAULT 0,
  hours_saved integer NOT NULL DEFAULT 0,
  risky_actions_blocked integer NOT NULL DEFAULT 0,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

function createMemoryPool() {
  const require = createRequire(import.meta.url);
  const { newDb } = require('pg-mem') as typeof import('pg-mem');

  if (!globalForPg.zerocoMemDb) {
    const memDb = newDb({ autoCreateForeignKeyIndices: true });
    memDb.public.none(memorySchemaSql);
    globalForPg.zerocoMemDb = memDb;
  }

  const memDb = globalForPg.zerocoMemDb as ReturnType<typeof newDb>;
  const { Pool: MemoryPool, Client: MemoryClient } = memDb.adapters.createPg();
  const stripUnsupportedPgOptions = (query: unknown) => {
    if (query && typeof query === 'object' && 'types' in query) {
      const copy = { ...(query as Record<string, unknown>) };
      delete copy.types;
      delete copy.rowMode;
      return copy;
    }
    if (query && typeof query === 'object' && 'rowMode' in query) {
      const copy = { ...(query as Record<string, unknown>) };
      delete copy.rowMode;
      return copy;
    }
    return query;
  };
  const patchQuery = (target: { prototype: { query: (...args: unknown[]) => unknown } }) => {
    const original = target.prototype.query;
    target.prototype.query = function patchedQuery(query: unknown, ...args: unknown[]) {
      return original.call(this, stripUnsupportedPgOptions(query), ...args);
    };
  };
  patchQuery(MemoryPool);
  patchQuery(MemoryClient);
  return new MemoryPool() as Pool;
}

export const pool =
  globalForPg.zerocoPool ??
  (process.env.USE_PG_MEM === '1'
    ? createMemoryPool()
    : (() => {
        if (!process.env.DATABASE_URL) {
          if (!process.env.DB_HOST) {
            throw new Error('DATABASE_URL or DB_HOST is required');
          }

          return new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
            user: process.env.DB_USER || 'postgres',
            database: process.env.DB_NAME || 'postgres',
            password: process.env.DB_PASSWORD || (async () => {
              const { Signer } = await import('@aws-sdk/rds-signer');
              const signer = new Signer({
                hostname: process.env.DB_HOST!,
                port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
                username: process.env.DB_USER || 'postgres',
                region: process.env.AWS_REGION || 'us-east-1',
              });
              return signer.getAuthToken();
            }),
            ssl: { rejectUnauthorized: false },
          });
        }

        return new Pool({
          connectionString: process.env.DATABASE_URL,
          // Aurora/Vercel usually requires SSL. For local Docker, use ?sslmode=disable or set NODE_ENV=development.
          ssl: process.env.DATABASE_URL.includes('sslmode=disable')
            ? false
            : { rejectUnauthorized: false },
        });
      })());

if (process.env.NODE_ENV !== 'production') globalForPg.zerocoPool = pool;

export const db = drizzle(pool, { schema });
export * from './schema';
