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
  const stripTypesParser = (query: unknown) => {
    if (query && typeof query === 'object' && 'types' in query) {
      const copy = { ...(query as Record<string, unknown>) };
      delete copy.types;
      return copy;
    }
    return query;
  };
  const patchQuery = (target: { prototype: { query: (...args: unknown[]) => unknown } }) => {
    const original = target.prototype.query;
    target.prototype.query = function patchedQuery(query: unknown, ...args: unknown[]) {
      return original.call(this, stripTypesParser(query), ...args);
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
          throw new Error('DATABASE_URL is required');
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
