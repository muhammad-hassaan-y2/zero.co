import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { businessResults, customers, db, decisionLedger, salesDeals, salesLeads, simulationEvents } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  value: z.coerce.number().min(0).default(0),
  currency: z.string().min(3).max(8).default('USD'),
  closeReason: z.string().min(6),
  nextStep: z.string().optional().default('Onboard customer'),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid close request', details: parsed.error.flatten() }, { status: 400 });
  }

  const [lead] = await db.select().from(salesLeads).where(and(eq(salesLeads.id, id), eq(salesLeads.workspaceId, ctx.workspace.id))).limit(1);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const [customer] = await db.insert(customers).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    leadId: lead.id,
    name: lead.contactName,
    companyName: lead.companyName,
    email: lead.email,
    source: 'sales',
    status: 'active',
    notes: `Closed from lead ${lead.id}. ${parsed.data.nextStep}`,
  }).returning();

  const [deal] = await db.insert(salesDeals).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    leadId: lead.id,
    customerId: customer.id,
    ownerAgentId: lead.ownerAgentId,
    stage: 'closed_won',
    value: parsed.data.value.toFixed(2),
    currency: parsed.data.currency.toUpperCase(),
    closeReason: parsed.data.closeReason,
    nextStep: parsed.data.nextStep,
  }).returning();

  const [updatedLead] = await db.update(salesLeads).set({
    status: 'closed_won',
    notes: [lead.notes, `Closed won: ${parsed.data.closeReason}`, `Next step: ${parsed.data.nextStep}`].filter(Boolean).join('\n'),
  }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id))).returning();

  await db.insert(businessResults).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    workflowRunId: null,
    agentId: lead.ownerAgentId,
    name: 'Lead converted to customer',
    value: parsed.data.value.toFixed(2),
    unit: parsed.data.currency.toUpperCase(),
    proof: `${lead.companyName} closed as customer. Deal ${deal.id}. Reason: ${parsed.data.closeReason}`,
    status: 'verified',
  });

  await db.insert(simulationEvents).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: lead.ownerAgentId,
    eventType: 'sales_deal_closed',
    title: `Closed customer: ${lead.companyName}`,
    description: `Lead converted into customer with ${parsed.data.currency.toUpperCase()} ${parsed.data.value.toFixed(2)} deal value.`,
    severity: 'high',
    status: 'closed',
  });

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: lead.ownerAgentId,
    departmentId: null,
    action: `Closed sales deal for ${lead.companyName}`,
    policyMatched: 'Human-confirmed customer close policy',
    riskLevel: 'medium',
    decision: 'executed',
    result: `Customer ${customer.id} and deal ${deal.id} created.`,
    approvedBy: ctx.user.email,
    databaseReference: `aurora:sales_deal:${deal.id}`,
  });

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: lead.ownerAgentId,
    sourceType: 'sales_deal_closed',
    sourceId: deal.id,
    content: `Closed won customer ${lead.companyName}. Contact: ${lead.contactName} <${lead.email}>. Value: ${deal.currency} ${deal.value}. Reason: ${deal.closeReason}. Next step: ${deal.nextStep}.`,
    metadata: { leadId: lead.id, customerId: customer.id, dealId: deal.id },
  });

  return NextResponse.json({ lead: updatedLead, customer, deal });
}
