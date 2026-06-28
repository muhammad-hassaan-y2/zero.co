import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db, decisionLedger, departments, digitalFtes, policies, simulationEvents, sops, workflows } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';
import { designSalesAgentWithBedrock } from '@/lib/bedrock';

export async function POST() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const data = await getWorkspaceData();
  let design: Awaited<ReturnType<typeof designSalesAgentWithBedrock>>;
  try {
    design = await designSalesAgentWithBedrock({
      workspaceName: ctx.workspace.name,
      blueprint: data.blueprint,
      departments: data.departments,
      agents: data.agents,
      workflows: data.workflows,
      policies: data.policies,
      customers: ctx.workspace.customerSegment,
      businessType: ctx.workspace.businessType,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sales Agent generation failed' }, { status: 502 });
  }

  const department = {
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    name: design.department.name,
    purpose: design.department.purpose,
    kpis: design.department.kpis,
    riskLevel: design.department.riskLevel,
    budget: design.department.budget,
  };

  const agent = {
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    departmentId: department.id,
    name: design.agent.name,
    role: design.agent.role,
    goal: design.agent.goal,
    tools: design.agent.tools,
    autonomyLevel: design.agent.autonomyLevel,
    dailyBudget: design.agent.dailyBudget,
    riskLevel: design.agent.riskLevel,
    status: 'healthy' as const,
    currentTask: design.agent.currentTask,
    successRate: design.agent.successRate,
    costToday: design.agent.costToday,
  };

  const workflowRows = design.workflows.map((workflow) => ({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    ownerAgentId: agent.id,
    name: workflow.name,
    trigger: workflow.trigger,
    steps: workflow.steps,
    toolsUsed: workflow.toolsUsed,
    approvalPoints: workflow.approvalPoints,
    successMetric: workflow.successMetric,
    failurePath: workflow.failurePath,
  }));
  const workflowByName = new Map(workflowRows.map((workflow) => [workflow.name.toLowerCase(), workflow.id]));

  const policyRows = design.policies.map((policy) => ({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    name: policy.name,
    description: policy.description,
    condition: policy.condition,
    action: policy.action,
    mode: policy.mode,
    riskLevel: policy.riskLevel,
    enabled: policy.enabled,
  }));

  const sopRows = design.sops.map((sop, index) => ({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    workflowId: workflowByName.get(sop.workflowName.toLowerCase()) || workflowRows[index]?.id || workflowRows[0]?.id,
    title: sop.title,
    objective: sop.objective,
    owner: agent.name,
    steps: sop.steps,
    requiredTools: sop.requiredTools,
    approvalRules: sop.approvalRules,
    failureHandling: sop.failureHandling,
    auditRequirements: sop.auditRequirements,
  }));

  const eventRows = design.events.map((event) => ({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent.id,
    eventType: event.eventType,
    title: event.title,
    description: event.description,
    severity: event.severity,
    status: event.status,
  }));

  const decisionRows = design.decisions.map((decision) => ({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent.id,
    departmentId: department.id,
    action: decision.action,
    policyMatched: decision.policyMatched,
    riskLevel: decision.riskLevel,
    decision: decision.decision,
    result: decision.result,
    approvedBy: decision.decision === 'executed' ? 'ZeroCo Sales Engine' : null,
    databaseReference: `aurora:sales:${nanoid(8)}`,
  }));

  await db.transaction(async (tx) => {
    await tx.insert(departments).values(department);
    await tx.insert(digitalFtes).values(agent);
    if (workflowRows.length) await tx.insert(workflows).values(workflowRows);
    if (policyRows.length) await tx.insert(policies).values(policyRows);
    if (sopRows.length) await tx.insert(sops).values(sopRows);
    if (eventRows.length) await tx.insert(simulationEvents).values(eventRows);
    if (decisionRows.length) await tx.insert(decisionLedger).values(decisionRows);
  });

  return NextResponse.json({
    department,
    agent,
    workflows: workflowRows,
    policies: policyRows,
    sops: sopRows,
    events: eventRows,
    decisions: decisionRows,
  });
}
