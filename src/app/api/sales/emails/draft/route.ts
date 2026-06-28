import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, decisionLedger, outboundEmails, salesLeads } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';
import { draftSalesEmailWithBedrock } from '@/lib/bedrock';
import { searchAgentMemories, storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  leadId: z.string().min(1),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email draft request', details: parsed.error.flatten() }, { status: 400 });
  }

  const [lead] = await db.select().from(salesLeads).where(and(eq(salesLeads.id, parsed.data.leadId), eq(salesLeads.workspaceId, ctx.workspace.id))).limit(1);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const workspaceData = await getWorkspaceData();
  const salesAgent = workspaceData.agents.find((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('sales')) || workspaceData.agents[0];
  const memories = await searchAgentMemories(
    ctx.workspace.id,
    `${lead.companyName} ${lead.contactName} ${lead.segment || ''} ${lead.painPoint} ${lead.notes || ''}`,
    6,
  );

  let draft: Awaited<ReturnType<typeof draftSalesEmailWithBedrock>>;
  try {
    draft = await draftSalesEmailWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      lead,
      agents: workspaceData.agents,
      policies: workspaceData.policies,
      memories: memories.map((memory) => memory.content),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Sales email draft failed' }, { status: 502 });
  }

  const [updatedLead] = await db.update(salesLeads).set({
    score: draft.leadScore,
    status: draft.leadScore >= 60 ? 'qualified' : 'new',
    notes: [lead.notes, `Score reason: ${draft.scoreReason}`, `Follow-up: ${draft.followUpPlan.join(' | ')}`].filter(Boolean).join('\n'),
  }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id))).returning();

  const [email] = await db.insert(outboundEmails).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    leadId: lead.id,
    agentId: salesAgent?.id || lead.ownerAgentId || null,
    toEmail: lead.email,
    subject: draft.subject,
    body: draft.body,
    status: 'pending_approval',
    approvalReason: `${draft.approvalReason}\nPolicy checks: ${draft.policyChecks.join('; ')}`,
  }).returning();

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: email.agentId,
    departmentId: salesAgent?.departmentId || null,
    action: `Approve outbound sales email to ${lead.companyName}`,
    policyMatched: 'Customer-facing outreach approval policy',
    riskLevel: 'medium',
    decision: 'pending',
    result: `Draft ready for ${lead.contactName} at ${lead.email}. Expected outcome: ${draft.expectedOutcome}`,
    approvedBy: null,
    databaseReference: `aurora:outbound_email:${email.id}`,
  });

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: email.agentId,
    sourceType: 'sales_email_draft',
    sourceId: email.id,
    content: `Drafted sales email for ${lead.companyName}. Score ${draft.leadScore}. Reason: ${draft.scoreReason}. Subject: ${draft.subject}. Follow-up: ${draft.followUpPlan.join(' | ')}`,
    metadata: { leadId: lead.id, memoryMatches: memories.map((memory) => memory.id) },
  });

  return NextResponse.json({ lead: updatedLead, email, draft });
}
