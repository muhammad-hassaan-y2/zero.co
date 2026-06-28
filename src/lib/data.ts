import 'server-only';
import { pool } from '@/db';
import { requireWorkspace } from '@/lib/session';

type WorkspaceDataValue = string | number | boolean | Date | null | string[];

type WorkspaceDataRecord = Record<string, WorkspaceDataValue> & {
  id: string;
  workspaceId: string;
  agentId?: string | null;
  departmentId?: string | null;
  ownerAgentId?: string | null;
  leadId?: string | null;
  queryId?: string | null;
  workflowId?: string | null;
  workflowRunId?: string | null;
  name: string;
  title: string;
  companyName: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
  operatingModel: string;
  objective: string;
  owner: string;
  failureHandling: string;
  auditRequirements: string;
  summary: string;
  auditSummary: string;
  purpose: string;
  role: string;
  goal: string;
  currentTask: string;
  trigger: string;
  successMetric: string;
  failurePath: string;
  description: string;
  condition: string;
  action: string;
  result: string;
  proof: string;
  unit: string;
  resultSummary: string;
  evidence: string;
  contactName: string;
  email: string;
  customerName: string;
  customerEmail: string;
  customerId?: string | null;
  accountId?: string | null;
  contactId?: string | null;
  website?: string | null;
  industry?: string | null;
  annualRevenue: string | number;
  lifecycleStage: string;
  phone?: string | null;
  type: string;
  dueAt?: Date | string | null;
  segment?: string | null;
  painPoint: string;
  intent: string;
  priority: string;
  source: string;
  notes: string;
  toEmail: string;
  subject: string;
  body: string;
  message: string;
  approvalReason: string;
  providerMessageId?: string | null;
  failureReason?: string | null;
  closeReason: string;
  nextStep: string;
  currency: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  sourceType: string;
  sourceId?: string | null;
  stepName: string;
  toolUsed?: string | null;
  status: string;
  decision: string;
  severity: string;
  riskLevel: string;
  autonomyLevel: string;
  eventType: string;
  mode: string;
  policyMatched: string;
  databaseReference: string;
  approvedBy?: string | null;
  enabled: boolean;
  createdAt: Date | string;
  budget: string | number;
  dailyBudget: string | number;
  costToday: string | number;
  value: string | number;
  costUsd: string | number;
  moneySpent: string | number;
  successRate: number;
  durationMs: number;
  tasksCompleted: number;
  hoursSaved: number;
  riskyActionsBlocked: number;
  stepIndex: number;
  score: number;
  coreKpis: string[];
  launchChecklist: string[];
  recommendations: string[];
  kpis: string[];
  tools: string[];
  steps: string[];
  toolsUsed: string[];
  approvalPoints: string[];
  requiredTools: string[];
  approvalRules: string[];
  outputArtifacts: string[];
};

function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function mapRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camelKey(key), value])) as WorkspaceDataRecord;
}

async function workspaceRows(table: string, workspaceId: string, orderBy = 'created_at desc') {
  const result = await pool.query(`select * from ${table} where workspace_id = $1 order by ${orderBy}`, [workspaceId]);
  return result.rows.map(mapRow);
}

export async function getWorkspaceData() {
  const { user, workspace } = await requireWorkspace();
  const [deptRows, agentRows, workflowRows, policyRows, decisionRows, eventRows, blueprintRows, sopRows, reportRows, runRows, stepRunRows, resultRows, leadRows, emailRows, queryRows, replyRows, customerRows, dealRows, accountRows, contactRows, activityRows, memoryRows] = await Promise.all([
    workspaceRows('departments', workspace.id, 'created_at asc'),
    workspaceRows('digital_ftes', workspace.id, 'created_at asc'),
    workspaceRows('workflows', workspace.id, 'created_at asc'),
    workspaceRows('policies', workspace.id, 'created_at asc'),
    workspaceRows('decision_ledger', workspace.id),
    workspaceRows('simulation_events', workspace.id),
    workspaceRows('company_blueprints', workspace.id),
    workspaceRows('sops', workspace.id),
    workspaceRows('board_reports', workspace.id),
    workspaceRows('workflow_runs', workspace.id),
    workspaceRows('workflow_step_runs', workspace.id),
    workspaceRows('business_results', workspace.id),
    workspaceRows('sales_leads', workspace.id),
    workspaceRows('outbound_emails', workspace.id),
    workspaceRows('customer_queries', workspace.id),
    workspaceRows('customer_replies', workspace.id),
    workspaceRows('customers', workspace.id),
    workspaceRows('sales_deals', workspace.id),
    workspaceRows('crm_accounts', workspace.id),
    workspaceRows('crm_contacts', workspace.id),
    workspaceRows('crm_activities', workspace.id),
    workspaceRows('agent_memories', workspace.id),
  ]);

  const spendToday = agentRows.reduce((sum, agent) => sum + Number(agent.costToday || 0), 0);
  const riskyActionsBlocked = decisionRows.filter((decision) => ['blocked', 'throttled', 'paused'].includes(decision.decision)).length;
  const humanApprovalsNeeded = decisionRows.filter((decision) => decision.decision === 'pending').length;
  const verifiedTaskResults = resultRows
    .filter((result) => result.status === 'verified' && result.unit === 'tasks')
    .reduce((sum, result) => sum + Number(result.value || 0), 0);
  const actionResults = resultRows
    .filter((result) => result.status === 'verified' && result.unit === 'actions')
    .reduce((sum, result) => sum + Number(result.value || 0), 0);
  const hoursSavedResults = resultRows
    .filter((result) => result.status === 'verified' && result.unit === 'hours')
    .reduce((sum, result) => sum + Number(result.value || 0), 0);
  const tasksCompletedToday = Math.round(verifiedTaskResults + actionResults + decisionRows.filter((decision) => decision.decision === 'executed').length);
  const avgSuccess = agentRows.length ? Math.round(agentRows.reduce((sum, agent) => sum + agent.successRate, 0) / agentRows.length) : 0;
  const operatingHealth = Math.max(55, Math.min(99, avgSuccess - humanApprovalsNeeded * 2 + riskyActionsBlocked));

  return {
    user,
    workspace,
    departments: deptRows,
    agents: agentRows,
    workflows: workflowRows,
    policies: policyRows,
    decisions: decisionRows,
    events: eventRows,
    blueprint: blueprintRows[0],
    sops: sopRows,
    reports: reportRows,
    workflowRuns: runRows,
    workflowStepRuns: stepRunRows,
    businessResults: resultRows,
    salesLeads: leadRows,
    outboundEmails: emailRows,
    customerQueries: queryRows,
    customerReplies: replyRows,
    customers: customerRows,
    salesDeals: dealRows,
    crmAccounts: accountRows,
    crmContacts: contactRows,
    crmActivities: activityRows,
    agentMemories: memoryRows,
    metrics: {
      digitalFtesActive: agentRows.filter((agent) => !['paused', 'blocked'].includes(agent.status)).length,
      tasksCompletedToday,
      aiSpendToday: spendToday,
      riskyActionsBlocked,
      humanApprovalsNeeded,
      estimatedHoursSaved: Math.max(1, hoursSavedResults + tasksCompletedToday * 0.2 + agentRows.length),
      operatingHealth,
      agentRoi: spendToday > 0 ? Math.max(1.2, (tasksCompletedToday * 8) / spendToday) : 1,
      workflowRunsCompleted: runRows.filter((run) => run.status === 'completed').length,
      verifiedResults: resultRows.filter((result) => result.status === 'verified').length,
      salesLeads: leadRows.length,
      emailsSent: emailRows.filter((email) => email.status === 'sent').length,
      customerQueries: queryRows.length,
      customerRepliesSent: replyRows.filter((reply) => reply.status === 'sent').length,
      customers: customerRows.length,
      closedDeals: dealRows.filter((deal) => deal.stage === 'closed_won').length,
      crmActivitiesOpen: activityRows.filter((activity) => activity.status === 'open').length,
      agentMemories: memoryRows.length,
    },
  };
}
