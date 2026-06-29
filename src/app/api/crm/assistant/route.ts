import { NextResponse } from 'next/server';
import { and, eq, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { crmAccounts, crmActivities, crmContacts, customerQueries, customerReplies, db, decisionLedger, outboundEmails, salesLeads } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { searchAgentMemories, storeAgentMemory } from '@/lib/agent-memory';
import { draftCustomerReplyWithBedrock, draftSalesEmailWithBedrock, planCrmAssistantAction } from '@/lib/bedrock';
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

async function findContact(workspaceId: string, identifier: string) {
  if (!identifier) return null;
  const [contact] = await db.select().from(crmContacts).where(and(eq(crmContacts.workspaceId, workspaceId), ilike(crmContacts.email, `%${identifier}%`))).limit(1);
  if (contact) return contact;
  const [byName] = await db.select().from(crmContacts).where(and(eq(crmContacts.workspaceId, workspaceId), ilike(crmContacts.name, `%${identifier}%`))).limit(1);
  return byName || null;
}

async function findActivity(workspaceId: string, title: string) {
  if (!title) return null;
  const [activity] = await db.select().from(crmActivities).where(and(eq(crmActivities.workspaceId, workspaceId), ilike(crmActivities.title, `%${title}%`))).limit(1);
  return activity || null;
}

async function findCustomerQuery(workspaceId: string, identifier: string) {
  if (!identifier) return null;
  const [byEmail] = await db.select().from(customerQueries).where(and(eq(customerQueries.workspaceId, workspaceId), ilike(customerQueries.customerEmail, `%${identifier}%`))).limit(1);
  if (byEmail) return byEmail;
  const [bySubject] = await db.select().from(customerQueries).where(and(eq(customerQueries.workspaceId, workspaceId), ilike(customerQueries.subject, `%${identifier}%`))).limit(1);
  return bySubject || null;
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

  if (plan.action === 'update_lead') {
    const lead = await findLead(ctx.workspace.id, text(payload.leadCompany));
    if (!lead) return NextResponse.json({ action: plan.action, reply: 'I could not find that lead.' }, { status: 404 });
    const [updatedLead] = await db.update(salesLeads).set({
      contactName: text(payload.contactName, lead.contactName),
      email: text(payload.email, lead.email),
      website: text(payload.website, lead.website || '') || null,
      segment: text(payload.segment, lead.segment || '') || null,
      painPoint: text(payload.painPoint, lead.painPoint),
      notes: [lead.notes, text(payload.notes)].filter(Boolean).join('\n'),
    }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id))).returning();
    result = updatedLead;
    reply = `Updated lead ${lead.companyName}.`;
  }

  if (plan.action === 'update_account') {
    const account = await findAccount(ctx.workspace.id, text(payload.accountName));
    if (!account) return NextResponse.json({ action: plan.action, reply: 'I could not find that account.' }, { status: 404 });
    const [updatedAccount] = await db.update(crmAccounts).set({
      website: text(payload.website, account.website || '') || null,
      industry: text(payload.industry, account.industry || '') || null,
      status: text(payload.status, account.status),
      annualRevenue: numberValue(payload.annualRevenue, Number(account.annualRevenue || 0)).toFixed(2),
      notes: [account.notes, text(payload.notes)].filter(Boolean).join('\n'),
    }).where(and(eq(crmAccounts.id, account.id), eq(crmAccounts.workspaceId, ctx.workspace.id))).returning();
    result = updatedAccount;
    reply = `Updated account ${account.name}.`;
  }

  if (plan.action === 'update_contact') {
    const contact = await findContact(ctx.workspace.id, text(payload.contactEmail) || text(payload.name));
    if (!contact) return NextResponse.json({ action: plan.action, reply: 'I could not find that contact.' }, { status: 404 });
    const account = await findAccount(ctx.workspace.id, text(payload.accountName));
    const [updatedContact] = await db.update(crmContacts).set({
      accountId: account?.id || contact.accountId,
      name: text(payload.name, contact.name),
      email: text(payload.email, contact.email),
      phone: text(payload.phone, contact.phone || '') || null,
      title: text(payload.title, contact.title || '') || null,
      lifecycleStage: text(payload.lifecycleStage, contact.lifecycleStage),
    }).where(and(eq(crmContacts.id, contact.id), eq(crmContacts.workspaceId, ctx.workspace.id))).returning();
    result = updatedContact;
    reply = `Updated contact ${contact.name}.`;
  }

  if (plan.action === 'complete_activity') {
    const activity = await findActivity(ctx.workspace.id, text(payload.activityTitle));
    if (!activity) return NextResponse.json({ action: plan.action, reply: 'I could not find that activity.' }, { status: 404 });
    const status = text(payload.status, 'done');
    const [updatedActivity] = await db.update(crmActivities).set({
      status,
      body: [activity.body, text(payload.note, `Assistant marked ${status}.`)].filter(Boolean).join('\n'),
    }).where(and(eq(crmActivities.id, activity.id), eq(crmActivities.workspaceId, ctx.workspace.id))).returning();
    result = updatedActivity;
    reply = `Marked activity "${activity.title}" as ${status}.`;
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

  if (plan.action === 'draft_customer_reply') {
    const identifier = text(payload.customerEmail) || text(payload.subject);
    const query = await findCustomerQuery(ctx.workspace.id, identifier);
    if (!query) return NextResponse.json({ action: plan.action, reply: 'I could not find that customer query.' }, { status: 404 });
    const supportAgent = data.agents.find((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('support')) || data.agents[0];
    const draft = await draftCustomerReplyWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      query,
      agents: data.agents,
      policies: data.policies,
    });
    const [replyDraft] = await db.insert(customerReplies).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      queryId: query.id,
      agentId: supportAgent?.id || query.ownerAgentId || null,
      toEmail: query.customerEmail,
      subject: draft.subject,
      body: draft.body,
      status: 'pending_approval',
      approvalReason: `${draft.approvalReason}\nPolicy checks: ${draft.policyChecks.join('; ')}`,
    }).returning();
    await db.update(customerQueries).set({
      intent: draft.intent,
      priority: draft.priority,
      status: 'pending_approval',
    }).where(and(eq(customerQueries.id, query.id), eq(customerQueries.workspaceId, ctx.workspace.id)));
    result = { reply: replyDraft, draft };
    reply = `Drafted a customer reply for ${query.customerName}; it is waiting for approval.`;
  }

  if (plan.action === 'delete_record') {
    const recordType = text(payload.recordType);
    const identifier = text(payload.identifier);
    const reason = text(payload.reason, parsed.data.message);
    if (!recordType || !identifier) return NextResponse.json({ action: plan.action, reply: 'I need record type and identifier to delete safely.' }, { status: 400 });
    if (!/delete|remove|discard/i.test(parsed.data.message)) return NextResponse.json({ action: plan.action, reply: 'Deletion requires explicit delete/remove wording.' }, { status: 400 });
    if (recordType === 'lead') {
      const lead = await findLead(ctx.workspace.id, identifier);
      if (!lead) return NextResponse.json({ action: plan.action, reply: 'Lead not found.' }, { status: 404 });
      const [archivedLead] = await db.update(salesLeads).set({
        status: 'disqualified',
        notes: [lead.notes, `Assistant archived instead of hard-deleting. Reason: ${reason}`].filter(Boolean).join('\n'),
      }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id))).returning();
      result = { archived: 'lead', record: archivedLead };
      reply = `Archived lead ${lead.companyName} as disqualified.`;
    } else if (recordType === 'account') {
      const account = await findAccount(ctx.workspace.id, identifier);
      if (!account) return NextResponse.json({ action: plan.action, reply: 'Account not found.' }, { status: 404 });
      const [archivedAccount] = await db.update(crmAccounts).set({
        status: 'archived',
        notes: [account.notes, `Assistant archived instead of hard-deleting. Reason: ${reason}`].filter(Boolean).join('\n'),
      }).where(and(eq(crmAccounts.id, account.id), eq(crmAccounts.workspaceId, ctx.workspace.id))).returning();
      result = { archived: 'account', record: archivedAccount };
      reply = `Archived account ${account.name}.`;
    } else if (recordType === 'contact') {
      const contact = await findContact(ctx.workspace.id, identifier);
      if (!contact) return NextResponse.json({ action: plan.action, reply: 'Contact not found.' }, { status: 404 });
      const [archivedContact] = await db.update(crmContacts).set({
        lifecycleStage: 'archived',
      }).where(and(eq(crmContacts.id, contact.id), eq(crmContacts.workspaceId, ctx.workspace.id))).returning();
      result = { archived: 'contact', record: archivedContact };
      reply = `Archived contact ${contact.name}.`;
    } else if (recordType === 'activity') {
      const activity = await findActivity(ctx.workspace.id, identifier);
      if (!activity) return NextResponse.json({ action: plan.action, reply: 'Activity not found.' }, { status: 404 });
      const [archivedActivity] = await db.update(crmActivities).set({
        status: 'blocked',
        body: [activity.body, `Assistant archived instead of hard-deleting. Reason: ${reason}`].filter(Boolean).join('\n'),
      }).where(and(eq(crmActivities.id, activity.id), eq(crmActivities.workspaceId, ctx.workspace.id))).returning();
      result = { archived: 'activity', record: archivedActivity };
      reply = `Archived activity ${activity.title}.`;
    } else {
      return NextResponse.json({ action: plan.action, reply: 'Supported delete types are lead, account, contact, and activity.' }, { status: 400 });
    }
    await storeAgentMemory({
      workspaceId: ctx.workspace.id,
      agentId: salesAgent?.id || null,
      sourceType: 'crm_delete',
      sourceId: null,
      content: `Archived ${recordType} ${identifier}. Reason: ${reason}`,
      metadata: { recordType, identifier },
    });
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
