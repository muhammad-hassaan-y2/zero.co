import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, onboardingProfiles, departments, digitalFtes, workflows, policies, decisionLedger, simulationEvents, workspaces, companyBlueprints, sops, boardReports } from '@/db';
import { requireWorkspace } from '@/lib/session';
import { generateCompanyOS } from '@/lib/generator';
import { enhanceBlueprintWithBedrock } from '@/lib/bedrock';
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
});

export async function POST(request: Request) {
  const { workspace } = await requireWorkspace();
  const body = await request.json().catch(() => ({}));
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid onboarding data', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const [profile] = await db
    .insert(onboardingProfiles)
    .values({
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
    })
    .returning();

  const generated = generateCompanyOS(profile);
  generated.blueprint = await enhanceBlueprintWithBedrock(profile, generated.blueprint);

  // Idempotent for hackathon/dev: clear generated rows before regenerating.
  await db.transaction(async (tx) => {
    await tx.delete(boardReports).where(eq(boardReports.workspaceId, workspace.id));
    await tx.delete(sops).where(eq(sops.workspaceId, workspace.id));
    await tx.delete(companyBlueprints).where(eq(companyBlueprints.workspaceId, workspace.id));
    await tx.delete(simulationEvents).where(eq(simulationEvents.workspaceId, workspace.id));
    await tx.delete(decisionLedger).where(eq(decisionLedger.workspaceId, workspace.id));
    await tx.delete(workflows).where(eq(workflows.workspaceId, workspace.id));
    await tx.delete(policies).where(eq(policies.workspaceId, workspace.id));
    await tx.delete(digitalFtes).where(eq(digitalFtes.workspaceId, workspace.id));
    await tx.delete(departments).where(eq(departments.workspaceId, workspace.id));

    await tx.insert(departments).values(generated.departments);
    await tx.insert(digitalFtes).values(generated.digitalFtes);
    await tx.insert(workflows).values(generated.workflows);
    await tx.insert(policies).values(generated.policies);
    await tx.insert(decisionLedger).values(generated.decisions);
    await tx.insert(companyBlueprints).values(generated.blueprint);
    await tx.insert(sops).values(generated.sops);
    await tx.insert(boardReports).values(generated.boardReport);
    await tx.insert(simulationEvents).values(generated.events);

    await tx.update(workspaces).set({
      businessType: data.businessDescription.slice(0, 120),
      customerSegment: data.customers.slice(0, 120),
      updatedAt: new Date(),
    }).where(eq(workspaces.id, workspace.id));
  });

  return NextResponse.json({ ok: true, profileId: profile.id });
}
