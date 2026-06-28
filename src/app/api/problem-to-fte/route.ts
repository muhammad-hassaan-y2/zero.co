import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  db,
  decisionLedger,
  departments,
  digitalFtes,
  policies,
  simulationEvents,
  sops,
  workflows,
} from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';
import { designProblemToFteWithBedrock } from '@/lib/bedrock';

const diagnoseSchema = z.object({
  action: z.literal('diagnose').default('diagnose'),
  problem: z.string().min(10),
  currentProcess: z.string().min(10),
  desiredOutcome: z.string().min(8),
  availableTools: z.array(z.string()).default([]),
  approvalLimits: z.string().min(6),
  riskTolerance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

const stringArray = z.array(z.string()).default([]);
const risk = z.enum(['low', 'medium', 'high', 'critical']);
const autonomy = z.enum(['observe', 'suggest', 'approval_required', 'auto_act']);
const policyMode = z.enum(['auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate']);

const packageSchema = z.object({
  diagnosis: z.object({
    classification: z.string(),
    reasoning: z.string(),
    objectiveDoneDefinition: z.string(),
    readinessScore: z.number(),
    missingInputs: stringArray,
    risks: stringArray,
  }),
  awsArchitecture: z.object({
    title: z.string(),
    summary: z.string(),
    services: z.array(z.object({
      service: z.string(),
      purpose: z.string(),
      dataHandled: z.string(),
      securityControl: z.string(),
    })).default([]),
    eventFlow: stringArray,
    identityAndAccess: stringArray,
    dataStores: stringArray,
    deploymentTargets: stringArray,
    observability: stringArray,
    costControls: stringArray,
  }),
  mode1Run: z.object({
    runName: z.string(),
    humanInputsNeeded: stringArray,
    steps: stringArray,
    testCases: z.array(z.object({
      name: z.string(),
      input: z.string(),
      expectedOutput: z.string(),
      passCriteria: z.string(),
    })).default([]),
    evidenceToCollect: stringArray,
    approvalGate: z.string(),
    successMetric: z.string(),
    failurePath: z.string(),
  }),
  mode2Package: z.object({
    department: z.object({
      name: z.string(),
      purpose: z.string(),
      kpis: stringArray,
      riskLevel: risk,
      budget: z.string(),
    }),
    agent: z.object({
      name: z.string(),
      role: z.string(),
      goal: z.string(),
      tools: stringArray,
      autonomyLevel: autonomy,
      dailyBudget: z.string(),
      riskLevel: risk,
      currentTask: z.string(),
      successRate: z.number(),
      costToday: z.string(),
    }),
    workflows: z.array(z.object({
      name: z.string(),
      trigger: z.string(),
      steps: stringArray,
      toolsUsed: stringArray,
      approvalPoints: stringArray,
      successMetric: z.string(),
      failurePath: z.string(),
    })).min(1),
    policies: z.array(z.object({
      name: z.string(),
      description: z.string(),
      condition: z.string(),
      action: z.string(),
      mode: policyMode,
      riskLevel: risk,
      enabled: z.boolean(),
    })).min(1),
    sops: z.array(z.object({
      workflowName: z.string(),
      title: z.string(),
      objective: z.string(),
      steps: stringArray,
      requiredTools: stringArray,
      approvalRules: stringArray,
      failureHandling: z.string(),
      auditRequirements: z.string(),
    })).min(1),
  }),
  implementationPlan: z.object({
    nextActions: stringArray,
    integrationChecklist: stringArray,
    downloadableArtifacts: stringArray,
    objectiveEvaluation: stringArray,
  }),
});

const promoteSchema = z.object({
  action: z.literal('promote'),
  design: packageSchema,
});

function architectureEvidence(design: z.infer<typeof packageSchema>) {
  const services = design.awsArchitecture.services.map((service) => `${service.service}: ${service.purpose}`);
  return [
    `AWS architecture: ${design.awsArchitecture.title}`,
    `Diagnosis: ${design.diagnosis.classification} (${design.diagnosis.readinessScore}/100)`,
    `Mode 1 run: ${design.mode1Run.runName}`,
    ...services.slice(0, 8),
  ];
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const body = await request.json().catch(() => ({}));

  if (body.action === 'promote') {
    const parsed = promoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid promotion package', details: parsed.error.flatten() }, { status: 400 });
    }

    const design = parsed.data.design;
    const department = {
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      name: design.mode2Package.department.name,
      purpose: design.mode2Package.department.purpose,
      kpis: design.mode2Package.department.kpis,
      riskLevel: design.mode2Package.department.riskLevel,
      budget: design.mode2Package.department.budget,
    };
    const agent = {
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      departmentId: department.id,
      name: design.mode2Package.agent.name,
      role: design.mode2Package.agent.role,
      goal: design.mode2Package.agent.goal,
      tools: design.mode2Package.agent.tools,
      autonomyLevel: design.mode2Package.agent.autonomyLevel,
      dailyBudget: design.mode2Package.agent.dailyBudget,
      riskLevel: design.mode2Package.agent.riskLevel,
      status: 'healthy' as const,
      currentTask: design.mode2Package.agent.currentTask,
      successRate: design.mode2Package.agent.successRate,
      costToday: design.mode2Package.agent.costToday,
    };
    const workflowRows = design.mode2Package.workflows.map((workflow) => ({
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
    const policyRows = design.mode2Package.policies.map((policy) => ({
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
    const sopRows = design.mode2Package.sops.map((sop, index) => ({
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

    await db.transaction(async (tx) => {
      await tx.insert(departments).values(department);
      await tx.insert(digitalFtes).values(agent);
      if (workflowRows.length) await tx.insert(workflows).values(workflowRows);
      if (policyRows.length) await tx.insert(policies).values(policyRows);
      if (sopRows.length) await tx.insert(sops).values(sopRows);
      await tx.insert(simulationEvents).values({
        id: nanoid(),
        workspaceId: ctx.workspace.id,
        agentId: agent.id,
        eventType: 'problem_promoted_to_digital_fte',
        title: `${agent.name} promoted from Mode 1 evidence`,
        description: `${design.diagnosis.objectiveDoneDefinition} Architecture and first-run test plan are stored for execution.`,
        severity: design.mode2Package.agent.riskLevel === 'critical' ? 'critical' : design.mode2Package.agent.riskLevel === 'high' ? 'high' : 'info',
        status: 'open',
      });
      await tx.insert(decisionLedger).values({
        id: nanoid(),
        workspaceId: ctx.workspace.id,
        agentId: agent.id,
        departmentId: department.id,
        action: `Promoted problem into Digital FTE: ${design.mode1Run.runName}`,
        policyMatched: policyRows[0]?.name || 'Problem-to-FTE promotion policy',
        riskLevel: design.mode2Package.agent.riskLevel,
        decision: ['high', 'critical'].includes(design.mode2Package.agent.riskLevel) ? 'pending' : 'executed',
        result: `${workflowRows.length} workflows, ${policyRows.length} policies, ${sopRows.length} SOPs created from Bedrock diagnosis.`,
        approvedBy: ['high', 'critical'].includes(design.mode2Package.agent.riskLevel) ? null : ctx.user.email,
        databaseReference: `aurora:problem_to_fte:${agent.id}`,
      });
    });

    return NextResponse.json({
      department,
      agent,
      workflows: workflowRows,
      policies: policyRows,
      sops: sopRows,
      evidence: architectureEvidence(design),
    });
  }

  const parsed = diagnoseSchema.safeParse({ action: 'diagnose', ...body });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid problem diagnosis request', details: parsed.error.flatten() }, { status: 400 });
  }

  const workspaceData = await getWorkspaceData();
  try {
    const design = await designProblemToFteWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      blueprint: workspaceData.blueprint,
      existingDepartments: workspaceData.departments,
      existingAgents: workspaceData.agents,
      existingWorkflows: workspaceData.workflows,
      problem: parsed.data.problem,
      currentProcess: parsed.data.currentProcess,
      desiredOutcome: parsed.data.desiredOutcome,
      availableTools: parsed.data.availableTools.length ? parsed.data.availableTools : ['Amazon Bedrock', 'Aurora PostgreSQL', 'Approval Queue', 'Decision Ledger'],
      approvalLimits: parsed.data.approvalLimits,
      riskTolerance: parsed.data.riskTolerance,
    });
    return NextResponse.json({ design });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Amazon Bedrock problem-to-FTE design failed' },
      { status: 502 },
    );
  }
}
