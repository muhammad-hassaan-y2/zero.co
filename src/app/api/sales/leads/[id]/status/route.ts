import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { crmActivities, db, decisionLedger, salesLeads } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { storeAgentMemory } from '@/lib/agent-memory';

const leadStatuses = ['new', 'qualified', 'contacted', 'replied', 'negotiating', 'closed_lost', 'disqualified'] as const;

const schema = z.object({
  status: z.enum(leadStatuses),
  reason: z.string().optional().default('Pipeline stage updated by CRM operator.'),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid lead status', details: parsed.error.flatten() }, { status: 400 });

  const [lead] = await db.select().from(salesLeads).where(and(eq(salesLeads.id, id), eq(salesLeads.workspaceId, ctx.workspace.id))).limit(1);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const [updatedLead] = await db.update(salesLeads).set({
    status: parsed.data.status,
    notes: [lead.notes, `Stage changed to ${parsed.data.status}: ${parsed.data.reason}`].filter(Boolean).join('\n'),
  }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id))).returning();

  const nextTaskTitle = parsed.data.status === 'qualified'
    ? `Draft outreach for ${lead.companyName}`
    : parsed.data.status === 'replied'
      ? `Review reply and prepare next step for ${lead.companyName}`
      : parsed.data.status === 'negotiating'
        ? `Prepare close plan for ${lead.companyName}`
        : '';

  if (nextTaskTitle) {
    await db.insert(crmActivities).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      leadId: lead.id,
      customerId: null,
      accountId: null,
      contactId: null,
      ownerAgentId: lead.ownerAgentId,
      type: 'task',
      title: nextTaskTitle,
      body: parsed.data.reason,
      status: 'open',
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });
  }

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: lead.ownerAgentId,
    departmentId: null,
    action: `Changed lead stage for ${lead.companyName} to ${parsed.data.status}`,
    policyMatched: 'CRM pipeline state policy',
    riskLevel: 'low',
    decision: 'executed',
    result: parsed.data.reason,
    approvedBy: ctx.user.email,
    databaseReference: `aurora:sales_lead:${lead.id}`,
  });

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: lead.ownerAgentId,
    sourceType: 'lead_stage_change',
    sourceId: lead.id,
    content: `Lead ${lead.companyName} moved from ${lead.status} to ${parsed.data.status}. Reason: ${parsed.data.reason}`,
    metadata: { previousStatus: lead.status, status: parsed.data.status },
  });

  return NextResponse.json({ lead: updatedLead });
}
