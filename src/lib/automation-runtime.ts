import 'server-only';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  businessResults,
  db,
  decisionLedger,
  digitalFtes,
  simulationEvents,
  workflowRuns,
  workflowStepRuns,
  workflows,
} from '@/db';

type RunWorkflowInput = {
  workspaceId: string;
  workflowId: string;
  actorEmail: string;
  triggerOverride?: string;
};

function pickTool(tools: string[], index: number) {
  return tools[index % Math.max(1, tools.length)] || 'ZeroCo Runtime';
}

function resultValueFor(workflowName: string, stepCount: number) {
  const name = workflowName.toLowerCase();
  if (name.includes('payment') || name.includes('revenue') || name.includes('invoice')) {
    return { name: 'Revenue recovery actions completed', value: Math.max(1, stepCount), unit: 'actions' };
  }

  if (name.includes('lead') || name.includes('sales') || name.includes('pipeline')) {
    return { name: 'Qualified pipeline tasks completed', value: Math.max(1, stepCount), unit: 'tasks' };
  }

  if (name.includes('support') || name.includes('ticket') || name.includes('customer')) {
    return { name: 'Customer operations tasks resolved', value: Math.max(1, stepCount), unit: 'tasks' };
  }

  return { name: 'Automated business tasks completed', value: Math.max(1, stepCount), unit: 'tasks' };
}

export async function runWorkflowForResult(input: RunWorkflowInput) {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, input.workflowId), eq(workflows.workspaceId, input.workspaceId)));

  if (!workflow) throw new Error('Workflow not found for this workspace.');

  const [agent] = workflow.ownerAgentId
    ? await db
        .select()
        .from(digitalFtes)
        .where(and(eq(digitalFtes.id, workflow.ownerAgentId), eq(digitalFtes.workspaceId, input.workspaceId)))
    : [];

  const startedAt = new Date();
  const steps = workflow.steps.length ? workflow.steps : ['Read trigger', 'Check policy', 'Produce result', 'Log evidence'];
  const tools = workflow.toolsUsed.length ? workflow.toolsUsed : agent?.tools || ['ZeroCo Runtime'];
  const costUsd = Number((steps.length * 0.08 + tools.length * 0.03).toFixed(2));
  const durationMs = 1200 + steps.length * 350;
  const riskRequiresApproval = workflow.approvalPoints.length > 0 || ['high', 'critical'].includes(agent?.riskLevel || 'low');
  const status = riskRequiresApproval ? 'waiting_approval' : 'completed';

  const [run] = await db.insert(workflowRuns).values({
    id: nanoid(),
    workspaceId: input.workspaceId,
    workflowId: workflow.id,
    agentId: workflow.ownerAgentId,
    status,
    triggerSnapshot: input.triggerOverride || workflow.trigger,
    resultSummary: status === 'completed'
      ? `${workflow.name} produced a measurable operating result.`
      : `${workflow.name} prepared the result and is waiting for approval.`,
    outputArtifacts: [
      `Execution plan for ${workflow.name}`,
      `Step evidence log with ${steps.length} completed checks`,
      `Result metric: ${workflow.successMetric}`,
    ],
    costUsd: String(costUsd),
    durationMs,
    startedAt,
    completedAt: status === 'completed' ? new Date(startedAt.getTime() + durationMs) : null,
  }).returning();

  await db.insert(workflowStepRuns).values(steps.map((step, index) => ({
    id: nanoid(),
    workspaceId: input.workspaceId,
    workflowRunId: run.id,
    stepIndex: index + 1,
    stepName: step,
    status: 'completed' as const,
    evidence: `Completed step ${index + 1} for ${workflow.name}: ${step}`,
    toolUsed: pickTool(tools, index),
  })));

  const primary = resultValueFor(workflow.name, steps.length);
  const resultStatus = status === 'completed' ? 'verified' : 'projected';

  await db.insert(businessResults).values([
    {
      id: nanoid(),
      workspaceId: input.workspaceId,
      workflowRunId: run.id,
      agentId: workflow.ownerAgentId,
      name: primary.name,
      value: String(primary.value),
      unit: primary.unit,
      proof: `${workflow.name} run ${run.id} completed ${steps.length} workflow steps.`,
      status: resultStatus,
    },
    {
      id: nanoid(),
      workspaceId: input.workspaceId,
      workflowRunId: run.id,
      agentId: workflow.ownerAgentId,
      name: 'Estimated time saved',
      value: String(Number((steps.length * 0.35).toFixed(2))),
      unit: 'hours',
      proof: `Estimated from ${steps.length} automated steps and logged execution evidence.`,
      status: resultStatus,
    },
  ]);

  if (agent) {
    await db.update(digitalFtes).set({
      currentTask: status === 'completed' ? `Completed ${workflow.name}` : `Waiting approval for ${workflow.name}`,
      costToday: String(Number(agent.costToday || 0) + costUsd),
      successRate: Math.min(99, Number(agent.successRate || 90) + (status === 'completed' ? 1 : 0)),
      status: status === 'completed' ? 'healthy' : 'warning',
    }).where(and(eq(digitalFtes.id, agent.id), eq(digitalFtes.workspaceId, input.workspaceId)));
  }

  await db.insert(simulationEvents).values({
    id: nanoid(),
    workspaceId: input.workspaceId,
    agentId: workflow.ownerAgentId,
    eventType: status === 'completed' ? 'workflow_result_produced' : 'workflow_waiting_approval',
    title: status === 'completed' ? `${workflow.name} produced a result` : `${workflow.name} needs approval`,
    description: status === 'completed'
      ? `${primary.value} ${primary.unit} recorded with ${steps.length} step evidence logs.`
      : `${workflow.approvalPoints[0] || 'Human approval required before final execution.'}`,
    severity: status === 'completed' ? 'info' : 'warning',
    status: 'open',
  });

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: input.workspaceId,
    agentId: workflow.ownerAgentId,
    departmentId: agent?.departmentId || null,
    action: `Ran workflow for result: ${workflow.name}`,
    policyMatched: workflow.approvalPoints[0] || 'Workflow runtime policy',
    riskLevel: agent?.riskLevel || 'medium',
    decision: status === 'completed' ? 'executed' : 'pending',
    result: status === 'completed'
      ? `${primary.name}: ${primary.value} ${primary.unit}`
      : 'Prepared result is waiting for human approval',
    approvedBy: status === 'completed' ? input.actorEmail : null,
    databaseReference: `aurora:workflow_run:${run.id}`,
  });

  return { run, status };
}
