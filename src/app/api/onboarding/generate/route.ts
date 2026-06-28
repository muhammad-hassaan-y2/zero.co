import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  db,
  onboardingProfiles,
  departments,
  digitalFtes,
  workflows,
  workflowRuns,
  workflowStepRuns,
  businessResults,
  policies,
  decisionLedger,
  simulationEvents,
  workspaces,
  companyBlueprints,
  sops,
  boardReports,
} from '@/db';
import { requireWorkspace } from '@/lib/session';
import { enhanceCompanyOSWithBedrock } from '@/lib/bedrock';
import { eq } from 'drizzle-orm';

const onboardingSchema = z.object({
  businessDescription: z.string().min(8),
  customers: z.string().min(3),
  problemSolved: z.string().optional().default(''),
  customerOutcome: z.string().optional().default(''),
  coreDepartments: z.string().optional().default(''),
  existingHumanRoles: z.string().optional().default(''),
  repetitiveWork: z.string().optional().default(''),
  highRiskWork: z.string().optional().default(''),
  currentTools: z.string().optional().default(''),
  aiAutomationGoals: z.string().optional().default(''),
  actionsRequiringApproval: z.string().optional().default(''),
  blockedActions: z.string().optional().default(''),
  autoApprovedActions: z.string().optional().default(''),
  monthlyAiBudget: z.coerce.number().min(0).default(500),
  riskTolerance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  selectedFtes: z.array(z.string()).min(1).default([]),
});

const fteLabels: Record<string, string> = {
  support: 'Support Agent',
  refund: 'Refund Agent',
  sales: 'Sales Agent',
  finance: 'Finance Agent',
  devops: 'DevOps Agent',
  research: 'Research Agent',
  agent_developer: 'Agent Developer Agent',
  tool_connector: 'Tool Connector Agent',
  result_qa: 'Result QA Agent',
};

export async function POST(request: Request) {
  const { workspace } = await requireWorkspace();
  const body = await request.json().catch(() => ({}));
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid onboarding data', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const profile = {
    id: nanoid(),
    workspaceId: workspace.id,
    businessDescription: data.businessDescription,
    customers: data.customers,
    problemSolved: data.problemSolved,
    customerOutcome: data.customerOutcome,
    coreDepartments: data.coreDepartments,
    existingHumanRoles: data.existingHumanRoles,
    repetitiveWork: data.repetitiveWork,
    highRiskWork: data.highRiskWork,
    currentTools: data.currentTools,
    aiAutomationGoals: data.aiAutomationGoals,
    actionsRequiringApproval: data.actionsRequiringApproval,
    blockedActions: data.blockedActions,
    autoApprovedActions: data.autoApprovedActions,
    monthlyAiBudget: String(data.monthlyAiBudget),
    riskTolerance: data.riskTolerance,
    onboardingCompleted: true,
  };

  const generationProfile = { ...profile, selectedFtes: data.selectedFtes.map((fte) => fteLabels[fte] || fte) };
  let generated = {
    departments: [],
    digitalFtes: [],
    workflows: [],
    policies: [],
    decisions: [],
    events: [],
    blueprint: {
      id: nanoid(),
      workspaceId: workspace.id,
      companyName: workspace.name,
      targetCustomer: data.customers,
      valueProposition: '',
      revenueModel: '',
      operatingModel: '',
      coreKpis: [],
      launchChecklist: [],
    },
    sops: [],
    boardReport: {
      id: nanoid(),
      workspaceId: workspace.id,
      title: '',
      summary: '',
      tasksCompleted: 0,
      moneySpent: '0',
      hoursSaved: 0,
      riskyActionsBlocked: 0,
      recommendations: [],
      auditSummary: '',
    },
  };

  try {
    generated = await enhanceCompanyOSWithBedrock(generationProfile, generated) as typeof generated;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Amazon Bedrock company OS generation failed' },
      { status: 502 },
    );
  }

  // Idempotent for demo/evaluation: clear generated rows before regenerating.
  await db.transaction(async (tx) => {
    await tx.delete(businessResults).where(eq(businessResults.workspaceId, workspace.id));
    await tx.delete(workflowStepRuns).where(eq(workflowStepRuns.workspaceId, workspace.id));
    await tx.delete(workflowRuns).where(eq(workflowRuns.workspaceId, workspace.id));
    await tx.delete(boardReports).where(eq(boardReports.workspaceId, workspace.id));
    await tx.delete(sops).where(eq(sops.workspaceId, workspace.id));
    await tx.delete(companyBlueprints).where(eq(companyBlueprints.workspaceId, workspace.id));
    await tx.delete(simulationEvents).where(eq(simulationEvents.workspaceId, workspace.id));
    await tx.delete(decisionLedger).where(eq(decisionLedger.workspaceId, workspace.id));
    await tx.delete(workflows).where(eq(workflows.workspaceId, workspace.id));
    await tx.delete(policies).where(eq(policies.workspaceId, workspace.id));
    await tx.delete(digitalFtes).where(eq(digitalFtes.workspaceId, workspace.id));
    await tx.delete(departments).where(eq(departments.workspaceId, workspace.id));
    await tx.delete(onboardingProfiles).where(eq(onboardingProfiles.workspaceId, workspace.id));

    await tx.insert(onboardingProfiles).values(profile);
    await tx.insert(departments).values(generated.departments);
    await tx.insert(digitalFtes).values(generated.digitalFtes);
    await tx.insert(workflows).values(generated.workflows);
    await tx.insert(policies).values(generated.policies);
    await tx.insert(decisionLedger).values(generated.decisions);
    await tx.insert(companyBlueprints).values(generated.blueprint);
    await tx.insert(sops).values(generated.sops);
    await tx.update(workspaces).set({
      businessType: data.businessDescription.slice(0, 120),
      customerSegment: data.customers.slice(0, 120),
      updatedAt: new Date(),
    }).where(eq(workspaces.id, workspace.id));
  });

  return NextResponse.json({ ok: true, profileId: profile.id });
}
