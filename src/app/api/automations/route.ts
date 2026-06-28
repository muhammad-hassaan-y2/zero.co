import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, decisionLedger, digitalFtes, policies, simulationEvents, sops, workflows } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { designAutomationWithBedrock } from '@/lib/bedrock';

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

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid automation request', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const departmentId = data.departmentId || null;
  const tools = data.tools.length ? data.tools : ['Bedrock', 'Company Memory', 'Decision Ledger'];
  const requiresApproval = ['approval_required', 'high', 'critical'].includes(data.autonomyLevel) || ['high', 'critical'].includes(data.riskLevel);
  let design: Awaited<ReturnType<typeof designAutomationWithBedrock>>;

  try {
    design = await designAutomationWithBedrock({
      task: data.task,
      outcome: data.outcome,
      trigger: data.trigger,
      tools,
      approvalRule: data.approvalRule,
      autonomyLevel: data.autonomyLevel,
      riskLevel: data.riskLevel,
      workspaceName: ctx.workspace.name,
      customers: ctx.workspace.customerSegment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Amazon Bedrock automation design failed' },
      { status: 502 },
    );
  }

  const automationName = cleanTitle(design.automationName) || cleanTitle(data.task) || 'Task Automation';

  const [agent] = await db.insert(digitalFtes).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    departmentId,
    name: `${automationName} Agent`,
    role: design.agent.role,
    goal: design.agent.goal,
    tools: design.agent.tools,
    autonomyLevel: data.autonomyLevel,
    dailyBudget: String(data.dailyBudget),
    riskLevel: data.riskLevel,
    status: 'healthy',
    currentTask: design.agent.currentTask,
    successRate: design.agent.successRate,
    costToday: '0',
  }).returning();

  const [workflow] = await db.insert(workflows).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    ownerAgentId: agent.id,
    name: design.workflow.name,
    trigger: design.workflow.trigger,
    steps: design.workflow.steps,
    toolsUsed: design.workflow.toolsUsed,
    approvalPoints: requiresApproval ? design.workflow.approvalPoints : [],
    successMetric: design.workflow.successMetric,
    failurePath: design.workflow.failurePath,
  }).returning();

  const [policy] = await db.insert(policies).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    name: design.policy.name,
    description: design.policy.description,
    condition: design.policy.condition,
    action: design.policy.action,
    mode: design.policy.mode,
    riskLevel: data.riskLevel,
    enabled: true,
  }).returning();

  const [sop] = await db.insert(sops).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    workflowId: workflow.id,
    title: design.sop.title,
    objective: design.sop.objective,
    owner: agent.name,
    steps: design.sop.steps,
    requiredTools: design.sop.requiredTools,
    approvalRules: design.sop.approvalRules,
    failureHandling: design.sop.failureHandling,
    auditRequirements: design.sop.auditRequirements,
  }).returning();

  await db.insert(simulationEvents).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent.id,
    eventType: 'automation_created',
    title: design.event.title,
    description: design.event.description,
    severity: design.event.severity,
    status: 'open',
  });

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent.id,
    departmentId,
    action: design.ledger.action,
    policyMatched: design.ledger.policyMatched || policy.name,
    riskLevel: data.riskLevel,
    decision: requiresApproval ? 'pending' : 'executed',
    result: design.ledger.result,
    approvedBy: requiresApproval ? null : ctx.user.email,
    databaseReference: `aurora:automation:${workflow.id}`,
  });

  return NextResponse.json({ agent, workflow, policy, sop });
}
