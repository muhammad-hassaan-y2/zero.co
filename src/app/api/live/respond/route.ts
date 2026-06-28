import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, decisionLedger, departments, digitalFtes, policies, simulationEvents, sops, workflows } from '@/db';
import { requireWorkspace } from '@/lib/session';
import { planLiveCompanyBuilderAction } from '@/lib/bedrock';
import { synthesizeSpeech } from '@/lib/aws-ai';
import { getWorkspaceData } from '@/lib/data';

const schema = z.object({
  message: z.string().min(1).max(3000),
  context: z.string().max(6000).optional(),
  voiceId: z.string().min(1).max(40).optional(),
});

export async function POST(request: Request) {
  const { workspace } = await requireWorkspace();
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid live response request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = await getWorkspaceData();
    const plan = await planLiveCompanyBuilderAction({
      message: parsed.data.message,
      conversationContext: parsed.data.context,
      workspaceName: workspace.name,
      blueprint: data.blueprint,
      departments: data.departments,
      agents: data.agents,
      workflows: data.workflows,
      policies: data.policies,
    });
    const created = plan.shouldCreate ? await persistLiveBuilderPlan(workspace.id, plan) : null;
    const reply = created
      ? `${plan.reply} ${plan.createdSummary} I added ${created.agent ? 'an agent, ' : ''}${created.workflows} workflow${created.workflows === 1 ? '' : 's'}, ${created.policies} polic${created.policies === 1 ? 'y' : 'ies'}, and ${created.sops} SOP${created.sops === 1 ? '' : 's'} to your company OS.`
      : plan.reply;
    const audio = await synthesizeSpeech(reply, parsed.data.voiceId);

    return NextResponse.json({
      reply,
      mode: plan.mode,
      created,
      audioBase64: audio.toString('base64'),
      contentType: 'audio/mpeg',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Live AWS voice response failed' }, { status: 502 });
  }
}

async function persistLiveBuilderPlan(workspaceId: string, plan: Awaited<ReturnType<typeof planLiveCompanyBuilderAction>>) {
  const department = {
    id: nanoid(),
    workspaceId,
    name: plan.department.name,
    purpose: plan.department.purpose,
    kpis: plan.department.kpis,
    riskLevel: plan.department.riskLevel,
    budget: plan.department.budget,
  };

  const agent = plan.mode === 'create_agent' || plan.mode === 'create_automation'
    ? {
        id: nanoid(),
        workspaceId,
        departmentId: department.id,
        name: plan.agent.name,
        role: plan.agent.role,
        goal: plan.agent.goal,
        tools: plan.agent.tools,
        autonomyLevel: plan.agent.autonomyLevel,
        dailyBudget: plan.agent.dailyBudget,
        riskLevel: plan.agent.riskLevel,
        status: 'healthy' as const,
        currentTask: plan.agent.currentTask,
        successRate: plan.agent.successRate,
        costToday: plan.agent.costToday,
      }
    : null;

  const workflowRows = plan.workflows.map((workflow) => ({
    id: nanoid(),
    workspaceId,
    ownerAgentId: agent?.id ?? null,
    name: workflow.name,
    trigger: workflow.trigger,
    steps: workflow.steps,
    toolsUsed: workflow.toolsUsed,
    approvalPoints: workflow.approvalPoints,
    successMetric: workflow.successMetric,
    failurePath: workflow.failurePath,
  }));
  const workflowByName = new Map(workflowRows.map((workflow) => [workflow.name.toLowerCase(), workflow.id]));

  const policyRows = plan.policies.map((policy) => ({
    id: nanoid(),
    workspaceId,
    name: policy.name,
    description: policy.description,
    condition: policy.condition,
    action: policy.action,
    mode: policy.mode,
    riskLevel: policy.riskLevel,
    enabled: policy.enabled,
  }));

  const sopRows = plan.sops.map((sop, index) => ({
    id: nanoid(),
    workspaceId,
    workflowId: workflowByName.get(sop.workflowName.toLowerCase()) || workflowRows[index]?.id || workflowRows[0]?.id,
    title: sop.title,
    objective: sop.objective,
    owner: agent?.name || 'Live Company Operator',
    steps: sop.steps,
    requiredTools: sop.requiredTools,
    approvalRules: sop.approvalRules,
    failureHandling: sop.failureHandling,
    auditRequirements: sop.auditRequirements,
  }));

  const eventRows = plan.events.map((event) => ({
    id: nanoid(),
    workspaceId,
    agentId: agent?.id ?? null,
    eventType: event.eventType,
    title: event.title,
    description: event.description,
    severity: event.severity,
    status: event.status,
  }));

  const decisionRows = plan.decisions.map((decision) => ({
    id: nanoid(),
    workspaceId,
    agentId: agent?.id ?? null,
    departmentId: agent ? department.id : null,
    action: decision.action,
    policyMatched: decision.policyMatched,
    riskLevel: decision.riskLevel,
    decision: decision.decision,
    result: decision.result,
    approvedBy: decision.decision === 'executed' ? 'ZeroCo Live Operator' : null,
    databaseReference: `aurora:live:${nanoid(8)}`,
  }));

  await db.transaction(async (tx) => {
    if (agent) {
      await tx.insert(departments).values(department);
      await tx.insert(digitalFtes).values(agent);
    }
    if (workflowRows.length) await tx.insert(workflows).values(workflowRows);
    if (policyRows.length) await tx.insert(policies).values(policyRows);
    if (sopRows.length) await tx.insert(sops).values(sopRows);
    if (eventRows.length) await tx.insert(simulationEvents).values(eventRows);
    if (decisionRows.length) await tx.insert(decisionLedger).values(decisionRows);
  });

  return {
    agent: agent ? { id: agent.id, name: agent.name } : null,
    workflows: workflowRows.length,
    policies: policyRows.length,
    sops: sopRows.length,
    events: eventRows.length,
    decisions: decisionRows.length,
  };
}
