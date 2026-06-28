import { NextResponse } from 'next/server';
import { and, eq, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { crmAccounts, crmActivities, crmContacts, db, decisionLedger, outboundEmails, salesLeads } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { searchAgentMemories, storeAgentMemory } from '@/lib/agent-memory';
import { draftSalesEmailWithBedrock, planCrmAssistantAction } from '@/lib/bedrock';
import { getWorkspaceData } from '@/lib/data';

const schema = z.object({
  message: z.string().min(3),
});

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function findLead(workspaceId: string, companyName: string) {
  if (!companyName) return null;
  const [lead] = await db.select().from(salesLeads).where(and(eq(salesLeads.workspaceId, workspaceId), ilike(salesLeads.companyName, `%${companyName}%`))).limit(1);
  return lead || null;
}

async function findAccount(workspaceId: string, name: string) {
  if (!name) return null;
  const [account] = await db.select().from(crmAccounts).where(and(eq(crmAccounts.workspaceId, workspaceId), ilike(crmAccounts.name, `%${name}%`))).limit(1);
  return account || null;
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid assistant command', details: parsed.error.flatten() }, { status: 400 });

  const data = await getWorkspaceData();
  const memories = await searchAgentMemories(ctx.workspace.id, parsed.data.message, 8);
  const salesAgent = data.agents.find((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('sales')) || data.agents[0];
  const plan = await planCrmAssistantAction({
    message: parsed.data.message,
    workspaceName: ctx.workspace.name,
    businessType: ctx.workspace.businessType,
    customers: ctx.workspace.customerSegment,
    leads: data.salesLeads,
    accounts: data.crmAccounts,
    contacts: data.crmContacts,
    activities: data.crmActivities,
    memories: memories.map((memory) => memory.content),
  });

  const payload = plan.data;
  let result: unknown = null;
  let reply = plan.reply;

  if (plan.action === 'create_lead') {
    const companyName = text(payload.companyName);
    const contactName = text(payload.contactName, 'Sales contact');
    const email = text(payload.email);
    const painPoint = text(payload.painPoint, 'Needs qualification and follow-up.');
    if (!companyName || !email) return NextResponse.json({ action: plan.action, reply: 'I need company name and email to create a lead.' }, { status: 400 });
    const [lead] = await db.insert(salesLeads).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      ownerAgentId: salesAgent?.id || null,
      companyName,
      contactName,
      email,
      website: text(payload.website) || null,
      segment: text(payload.segment, ctx.workspace.customerSegment || '') || null,
      painPoint,
      status: 'new',
      score: 0,
      source: 'assistant',
      notes: text(payload.notes, `Created from assistant command: ${parsed.data.message}`),
    }).returning();
    result = lead;
    reply = `Created lead ${lead.companyName} and added it to the CRM.`;
  }

  if (plan.action === 'create_account') {
    const name = text(payload.name);
    if (!name) return NextResponse.json({ action: plan.action, reply: 'I need an account name.' }, { status: 400 });
    const [account] = await db.insert(crmAccounts).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      ownerAgentId: salesAgent?.id || null,
      name,
      website: text(payload.website) || null,
      industry: text(payload.industry) || null,
      status: text(payload.status, 'prospect'),
      annualRevenue: numberValue(payload.annualRevenue).toFixed(2),
      notes: text(payload.notes),
    }).returning();
    result = account;
    reply = `Created account ${account.name}.`;
  }

  if (plan.action === 'create_contact') {
    const name = text(payload.name);
    const email = text(payload.email);
    if (!name || !email) return NextResponse.json({ action: plan.action, reply: 'I need contact name and email.' }, { status: 400 });
    const account = await findAccount(ctx.workspace.id, text(payload.accountName));
    const [contact] = await db.insert(crmContacts).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      accountId: account?.id || null,
      ownerAgentId: salesAgent?.id || null,
      name,
      email,
      phone: text(payload.phone) || null,
      title: text(payload.title) || null,
      lifecycleStage: text(payload.lifecycleStage, 'lead'),
    }).returning();
    result = contact;
    reply = `Created contact ${contact.name}.`;
  }

  if (plan.action === 'create_activity') {
    const lead = await findLead(ctx.workspace.id, text(payload.leadCompany));
    const [activity] = await db.insert(crmActivities).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      leadId: lead?.id || null,
      customerId: null,
      accountId: null,
      contactId: null,
      ownerAgentId: salesAgent?.id || null,
      type: text(payload.type, 'task'),
      title: text(payload.title, 'CRM follow-up'),
      body: text(payload.body),
      status: text(payload.status, 'open'),
      dueAt: null,
    }).returning();
    result = activity;
    reply = `Created ${activity.type} "${activity.title}".`;
  }

  if (plan.action === 'update_lead_status') {
    const lead = await findLead(ctx.workspace.id, text(payload.leadCompany));
    if (!lead) return NextResponse.json({ action: plan.action, reply: 'I could not find that lead.' }, { status: 404 });
    const status = text(payload.status, 'qualified') as typeof salesLeads.$inferSelect.status;
    const reason = text(payload.reason, parsed.data.message);
    const [updatedLead] = await db.update(salesLeads).set({
      status,
      notes: [lead.notes, `Assistant stage update to ${status}: ${reason}`].filter(Boolean).join('\n'),
    }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id))).returning();
    result = updatedLead;
    reply = `Moved ${lead.companyName} to ${status}.`;
  }

  if (plan.action === 'draft_sales_email') {
    const lead = await findLead(ctx.workspace.id, text(payload.leadCompany));
    if (!lead) return NextResponse.json({ action: plan.action, reply: 'I could not find that lead.' }, { status: 404 });
    const relevantMemories = await searchAgentMemories(ctx.workspace.id, `${lead.companyName} ${lead.painPoint} ${lead.notes || ''}`, 6);
    const draft = await draftSalesEmailWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      lead,
      agents: data.agents,
      policies: data.policies,
      memories: relevantMemories.map((memory) => memory.content),
    });
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
    result = { email, draft };
    reply = `Drafted an outreach email for ${lead.companyName}; it is waiting for approval.`;
  }

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: salesAgent?.id || null,
    departmentId: salesAgent?.departmentId || null,
    action: `CRM assistant command: ${parsed.data.message}`,
    policyMatched: 'CRM assistant execution policy',
    riskLevel: 'medium',
    decision: plan.action === 'answer' ? 'pending' : 'executed',
    result: reply,
    approvedBy: plan.action === 'answer' ? null : ctx.user.email,
    databaseReference: `crm_assistant:${plan.action}`,
  });

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: salesAgent?.id || null,
    sourceType: 'crm_assistant_command',
    sourceId: null,
    content: `User command: ${parsed.data.message}. Action: ${plan.action}. Reply: ${reply}`,
    metadata: { confidence: plan.confidence },
  });

  return NextResponse.json({ action: plan.action, reply, result, plan });
}
