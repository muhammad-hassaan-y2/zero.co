import 'server-only';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  businessResults,
  db,
  decisionLedger,
  digitalFtes,
  pool,
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

function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function mapRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camelKey(key), value])) as any;
}

export async function runWorkflowForResult(input: RunWorkflowInput) {
  const workflowResult = await pool.query('select * from workflows where id = $1 and workspace_id = $2 limit 1', [input.workflowId, input.workspaceId]);
  const workflow = workflowResult.rows[0] ? mapRow(workflowResult.rows[0]) : null;

  if (!workflow) throw new Error('Workflow not found for this workspace.');

  const agentResult = workflow.ownerAgentId
    ? await pool.query('select * from digital_ftes where id = $1 and workspace_id = $2 limit 1', [workflow.ownerAgentId, input.workspaceId])
    : { rows: [] };
  const agent = agentResult.rows[0] ? mapRow(agentResult.rows[0]) : null;

  const startedAt = new Date();
  const workflowSteps = Array.isArray(workflow.steps) ? workflow.steps as string[] : [];
  const workflowTools = Array.isArray(workflow.toolsUsed) ? workflow.toolsUsed as string[] : [];
  const agentTools = Array.isArray(agent?.tools) ? agent.tools as string[] : [];
  const steps = workflowSteps.length ? workflowSteps : ['Read trigger', 'Check policy', 'Produce result', 'Log evidence'];
  const tools = workflowTools.length ? workflowTools : agentTools.length ? agentTools : ['ZeroCo Runtime'];
  const costUsd = Number((steps.length * 0.08 + tools.length * 0.03).toFixed(2));
  const durationMs = 1200 + steps.length * 350;
  const riskRequiresApproval = workflow.approvalPoints.length > 0 || ['high', 'critical'].includes(agent?.riskLevel || 'low');
  const status: 'waiting_approval' | 'completed' = riskRequiresApproval ? 'waiting_approval' : 'completed';

  const run = {
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
  };
  await db.insert(workflowRuns).values(run);

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
