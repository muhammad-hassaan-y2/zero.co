import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

// Better Auth default tables. Keep singular names to match Better Auth defaults.
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt,
  updatedAt,
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt,
  updatedAt,
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt,
  updatedAt,
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt,
  updatedAt,
});

export const riskLevel = pgEnum('risk_level', ['low', 'medium', 'high', 'critical']);
export const autonomyLevel = pgEnum('autonomy_level', ['observe', 'suggest', 'approval_required', 'auto_act']);
export const agentStatus = pgEnum('agent_status', ['healthy', 'warning', 'blocked', 'throttled', 'paused']);
export const policyMode = pgEnum('policy_mode', ['auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate']);
export const decisionStatus = pgEnum('decision_status', ['pending', 'approved', 'rejected', 'blocked', 'executed', 'throttled', 'paused']);
export const eventSeverity = pgEnum('event_severity', ['info', 'warning', 'high', 'critical']);
export const workflowRunStatus = pgEnum('workflow_run_status', ['queued', 'running', 'waiting_approval', 'completed', 'failed']);
export const resultStatus = pgEnum('result_status', ['projected', 'verified', 'blocked']);
export const leadStatus = pgEnum('lead_status', ['new', 'qualified', 'contacted', 'replied', 'disqualified']);
export const outboundEmailStatus = pgEnum('outbound_email_status', ['draft', 'pending_approval', 'sent', 'failed', 'blocked']);

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  businessType: text('business_type'),
  customerSegment: text('customer_segment'),
  createdAt,
  updatedAt,
}, (t) => ({
  slugIdx: uniqueIndex('workspaces_slug_idx').on(t.slug),
}));

export const onboardingProfiles = pgTable('onboarding_profiles', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  businessDescription: text('business_description').notNull(),
  customers: text('customers').notNull(),
  problemSolved: text('problem_solved'),
  customerOutcome: text('customer_outcome'),
  coreDepartments: text('core_departments'),
  existingHumanRoles: text('existing_human_roles'),
  repetitiveWork: text('repetitive_work'),
  highRiskWork: text('high_risk_work'),
  currentTools: text('current_tools'),
  aiAutomationGoals: text('ai_automation_goals'),
  actionsRequiringApproval: text('actions_requiring_approval'),
  blockedActions: text('blocked_actions'),
  autoApprovedActions: text('auto_approved_actions'),
  monthlyAiBudget: numeric('monthly_ai_budget', { precision: 10, scale: 2 }).notNull().default('500'),
  riskTolerance: riskLevel('risk_tolerance').notNull().default('medium'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  createdAt,
  updatedAt,
});

export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  purpose: text('purpose').notNull(),
  kpis: jsonb('kpis').$type<string[]>().notNull().default([]),
  riskLevel: riskLevel('risk_level').notNull().default('medium'),
  budget: numeric('budget', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt,
});

export const digitalFtes = pgTable('digital_ftes', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  goal: text('goal').notNull(),
  tools: jsonb('tools').$type<string[]>().notNull().default([]),
  autonomyLevel: autonomyLevel('autonomy_level').notNull().default('suggest'),
  dailyBudget: numeric('daily_budget', { precision: 10, scale: 2 }).notNull().default('10'),
  riskLevel: riskLevel('risk_level').notNull().default('medium'),
  status: agentStatus('status').notNull().default('healthy'),
  currentTask: text('current_task').notNull().default('Waiting for assigned workflow'),
  successRate: integer('success_rate').notNull().default(90),
  costToday: numeric('cost_today', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt,
});

export const workflows = pgTable('workflows', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  trigger: text('trigger').notNull(),
  ownerAgentId: text('owner_agent_id').references(() => digitalFtes.id, { onDelete: 'set null' }),
  steps: jsonb('steps').$type<string[]>().notNull().default([]),
  toolsUsed: jsonb('tools_used').$type<string[]>().notNull().default([]),
  approvalPoints: jsonb('approval_points').$type<string[]>().notNull().default([]),
  successMetric: text('success_metric').notNull(),
  failurePath: text('failure_path').notNull(),
  createdAt,
});

export const workflowRuns = pgTable('workflow_runs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  workflowId: text('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => digitalFtes.id, { onDelete: 'set null' }),
  status: workflowRunStatus('status').notNull().default('queued'),
  triggerSnapshot: text('trigger_snapshot').notNull(),
  resultSummary: text('result_summary').notNull().default('Waiting for execution'),
  outputArtifacts: jsonb('output_artifacts').$type<string[]>().notNull().default([]),
  costUsd: numeric('cost_usd', { precision: 10, scale: 2 }).notNull().default('0'),
  durationMs: integer('duration_ms').notNull().default(0),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt,
});

export const workflowStepRuns = pgTable('workflow_step_runs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  workflowRunId: text('workflow_run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull(),
  stepName: text('step_name').notNull(),
  status: workflowRunStatus('status').notNull().default('completed'),
  evidence: text('evidence').notNull(),
  toolUsed: text('tool_used'),
  createdAt,
});

export const businessResults = pgTable('business_results', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  workflowRunId: text('workflow_run_id').references(() => workflowRuns.id, { onDelete: 'set null' }),
  agentId: text('agent_id').references(() => digitalFtes.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  value: numeric('value', { precision: 12, scale: 2 }).notNull().default('0'),
  unit: text('unit').notNull().default('tasks'),
  proof: text('proof').notNull(),
  status: resultStatus('status').notNull().default('projected'),
  createdAt,
});

export const salesLeads = pgTable('sales_leads', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  ownerAgentId: text('owner_agent_id').references(() => digitalFtes.id, { onDelete: 'set null' }),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  website: text('website'),
  segment: text('segment'),
  painPoint: text('pain_point').notNull(),
  status: leadStatus('status').notNull().default('new'),
  score: integer('score').notNull().default(0),
  source: text('source').notNull().default('manual'),
  notes: text('notes').notNull().default(''),
  createdAt,
});

export const outboundEmails = pgTable('outbound_emails', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  leadId: text('lead_id').notNull().references(() => salesLeads.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => digitalFtes.id, { onDelete: 'set null' }),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: outboundEmailStatus('status').notNull().default('pending_approval'),
  approvalReason: text('approval_reason').notNull(),
  providerMessageId: text('provider_message_id'),
  failureReason: text('failure_reason'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt,
});

export const policies = pgTable('policies', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  condition: text('condition').notNull(),
  action: text('action').notNull(),
  mode: policyMode('mode').notNull(),
  riskLevel: riskLevel('risk_level').notNull().default('medium'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt,
});

export const decisionLedger = pgTable('decision_ledger', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => digitalFtes.id, { onDelete: 'set null' }),
  departmentId: text('department_id').references(() => departments.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  policyMatched: text('policy_matched').notNull(),
  riskLevel: riskLevel('risk_level').notNull().default('medium'),
  decision: decisionStatus('decision').notNull().default('pending'),
  result: text('result').notNull().default('Waiting for review'),
  approvedBy: text('approved_by'),
  databaseReference: text('database_reference').notNull(),
  createdAt,
});

export const simulationEvents = pgTable('simulation_events', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => digitalFtes.id, { onDelete: 'set null' }),
  eventType: text('event_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: eventSeverity('severity').notNull().default('info'),
  status: text('status').notNull().default('open'),
  createdAt,
});


export const companyBlueprints = pgTable('company_blueprints', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  targetCustomer: text('target_customer').notNull(),
  valueProposition: text('value_proposition').notNull(),
  revenueModel: text('revenue_model').notNull(),
  operatingModel: text('operating_model').notNull(),
  coreKpis: jsonb('core_kpis').$type<string[]>().notNull().default([]),
  launchChecklist: jsonb('launch_checklist').$type<string[]>().notNull().default([]),
  createdAt,
  updatedAt,
});

export const sops = pgTable('sops', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  workflowId: text('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  objective: text('objective').notNull(),
  owner: text('owner').notNull(),
  steps: jsonb('steps').$type<string[]>().notNull().default([]),
  requiredTools: jsonb('required_tools').$type<string[]>().notNull().default([]),
  approvalRules: jsonb('approval_rules').$type<string[]>().notNull().default([]),
  failureHandling: text('failure_handling').notNull(),
  auditRequirements: text('audit_requirements').notNull(),
  createdAt,
});

export const boardReports = pgTable('board_reports', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  moneySpent: numeric('money_spent', { precision: 10, scale: 2 }).notNull().default('0'),
  hoursSaved: integer('hours_saved').notNull().default(0),
  riskyActionsBlocked: integer('risky_actions_blocked').notNull().default(0),
  recommendations: jsonb('recommendations').$type<string[]>().notNull().default([]),
  auditSummary: text('audit_summary').notNull(),
  createdAt,
});

export const workspaceRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(user, { fields: [workspaces.userId], references: [user.id] }),
  departments: many(departments),
  digitalFtes: many(digitalFtes),
  policies: many(policies),
  decisions: many(decisionLedger),
  workflowRuns: many(workflowRuns),
  businessResults: many(businessResults),
  salesLeads: many(salesLeads),
}));

export const departmentRelations = relations(departments, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [departments.workspaceId], references: [workspaces.id] }),
  agents: many(digitalFtes),
}));

export const digitalFteRelations = relations(digitalFtes, ({ one }) => ({
  workspace: one(workspaces, { fields: [digitalFtes.workspaceId], references: [workspaces.id] }),
  department: one(departments, { fields: [digitalFtes.departmentId], references: [departments.id] }),
}));

export const workflowRunRelations = relations(workflowRuns, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [workflowRuns.workspaceId], references: [workspaces.id] }),
  workflow: one(workflows, { fields: [workflowRuns.workflowId], references: [workflows.id] }),
  agent: one(digitalFtes, { fields: [workflowRuns.agentId], references: [digitalFtes.id] }),
  steps: many(workflowStepRuns),
}));
