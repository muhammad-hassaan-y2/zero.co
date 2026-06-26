import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, decisionLedger, digitalFtes, policies, simulationEvents, sops, workflows } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

const schema = z.object({
  task: z.string().min(8),
  outcome: z.string().min(6),
  trigger: z.string().min(4),
  departmentId: z.string().optional().nullable(),
  tools: z.array(z.string()).default([]),
  approvalRule: z.string().min(4),
  autonomyLevel: z.enum(['observe', 'suggest', 'approval_required', 'auto_act']).default('approval_required'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dailyBudget: z.coerce.number().min(0).default(15),
});

function cleanTitle(value: string) {
  return value
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function inferAutomationType(task: string, tools: string[]) {
  const source = `${task} ${tools.join(' ')}`;
  if (includesAny(source, ['stripe', 'payment', 'invoice', 'billing', 'revenue'])) return 'revenue';
  if (includesAny(source, ['support', 'ticket', 'customer', 'refund', 'return'])) return 'customer';
  if (includesAny(source, ['lead', 'sales', 'outreach', 'crm', 'pipeline'])) return 'sales';
  if (includesAny(source, ['content', 'seo', 'campaign', 'marketing'])) return 'growth';
  if (includesAny(source, ['deploy', 'incident', 'bug', 'api', 'engineering'])) return 'engineering';
  return 'operations';
}

function roleFor(type: string) {
  if (type === 'revenue') return 'Revenue automation operator';
  if (type === 'customer') return 'Customer operations automation operator';
  if (type === 'sales') return 'Pipeline automation operator';
  if (type === 'growth') return 'Growth operations automation operator';
  if (type === 'engineering') return 'Engineering operations automation operator';
  return 'Business operations automation operator';
}

function resultSteps(input: { type: string; task: string; outcome: string; trigger: string; tools: string[]; requiresApproval: boolean }) {
  const contextStep = input.type === 'revenue'
    ? 'Fetch account, invoice, payment status, and prior recovery attempts'
    : input.type === 'customer'
      ? 'Fetch customer history, policy context, sentiment, and unresolved issue details'
      : input.type === 'sales'
        ? 'Fetch lead profile, account fit, prior touchpoints, and pipeline stage'
        : `Collect required context for: ${input.task}`;

  const actionStep = input.type === 'revenue'
    ? 'Prepare recovery action, customer message, and next billing step'
    : input.type === 'customer'
      ? 'Prepare resolution path, response, and escalation notes'
      : input.type === 'sales'
        ? 'Prepare qualification summary, outreach draft, and CRM update'
        : `Execute the safe automation steps with ${input.tools.slice(0, 3).join(', ') || 'ZeroCo Runtime'}`;

  return [
    `Detect trigger: ${input.trigger}`,
    contextStep,
    'Validate required data and identify missing fields',
    'Check policy, risk score, blocked actions, and approval rules',
    actionStep,
    input.requiresApproval ? 'Create approval packet with recommendation, risk, and expected result' : 'Execute approved low-risk action and log the action',
    `Measure outcome: ${input.outcome}`,
    'Write result, artifacts, cost, risk, and next action to the Results Center and decision ledger',
  ];
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid automation request', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const automationName = cleanTitle(data.task) || 'Task Automation';
  const departmentId = data.departmentId || null;
  const tools = data.tools.length ? data.tools : ['Bedrock', 'Company Memory', 'Decision Ledger'];
  const requiresApproval = ['approval_required', 'high', 'critical'].includes(data.autonomyLevel) || ['high', 'critical'].includes(data.riskLevel);
  const automationType = inferAutomationType(data.task, tools);
  const steps = resultSteps({ type: automationType, task: data.task, outcome: data.outcome, trigger: data.trigger, tools, requiresApproval });

  const [agent] = await db.insert(digitalFtes).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    departmentId,
    name: `${automationName} Agent`,
    role: roleFor(automationType),
    goal: `Own "${data.task}" from trigger to measurable result. Target outcome: ${data.outcome}. Tools: ${tools.join(', ')}. Approval boundary: ${data.approvalRule}.`,
    tools,
    autonomyLevel: data.autonomyLevel,
    dailyBudget: String(data.dailyBudget),
    riskLevel: data.riskLevel,
    status: 'healthy',
    currentTask: `Preparing executable ${automationType} workflow with proof records`,
    successRate: 88,
    costToday: '0',
  }).returning();

  const [workflow] = await db.insert(workflows).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    ownerAgentId: agent.id,
    name: `${automationName} Workflow`,
    trigger: data.trigger,
    steps,
    toolsUsed: tools,
    approvalPoints: requiresApproval ? [data.approvalRule] : [],
    successMetric: data.outcome,
    failurePath: 'Stop automation, keep the record, and escalate to the workspace owner with the failed step and required fix.',
  }).returning();

  const [policy] = await db.insert(policies).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    name: `${automationName} Approval Policy`,
    description: `Controls when the ${automationName} automation can act without human review.`,
    condition: data.approvalRule,
    action: requiresApproval ? 'Require owner approval before execution' : 'Auto-approve and log the action',
    mode: requiresApproval ? 'require_approval' : 'auto_approve',
    riskLevel: data.riskLevel,
    enabled: true,
  }).returning();

  const [sop] = await db.insert(sops).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    workflowId: workflow.id,
    title: `${automationName} SOP`,
    objective: `Produce the result: ${data.outcome}`,
    owner: agent.name,
    steps,
    requiredTools: tools,
    approvalRules: [data.approvalRule],
    failureHandling: workflow.failurePath,
    auditRequirements: 'Every run must store trigger, agent, tools used, approval status, result, and cost in the decision ledger.',
  }).returning();

  await db.insert(simulationEvents).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent.id,
    eventType: 'automation_created',
    title: `${automationName} automation is ready`,
    description: `${agent.name} owns ${workflow.name} and is governed by ${policy.name}.`,
    severity: data.riskLevel === 'critical' ? 'critical' : data.riskLevel === 'high' ? 'high' : 'info',
    status: 'open',
  });

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent.id,
    departmentId,
    action: `Created automation package: ${automationName}`,
    policyMatched: policy.name,
    riskLevel: data.riskLevel,
    decision: requiresApproval ? 'pending' : 'executed',
    result: `Created agent, workflow, policy, and SOP for: ${data.task}`,
    approvedBy: requiresApproval ? null : ctx.user.email,
    databaseReference: `aurora:automation:${workflow.id}`,
  });

  return NextResponse.json({ agent, workflow, policy, sop });
}
