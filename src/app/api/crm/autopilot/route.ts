import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  crmActivities,
  customerQueries,
  customerReplies,
  db,
  decisionLedger,
  outboundEmails,
  salesLeads,
} from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { searchAgentMemories, storeAgentMemory } from '@/lib/agent-memory';
import { draftCustomerReplyWithBedrock, draftSalesEmailWithBedrock } from '@/lib/bedrock';
import { getWorkspaceData } from '@/lib/data';

const schema = z.object({
  maxActions: z.coerce.number().min(1).max(12).default(8),
});

type AutopilotAction = {
  type: string;
  title: string;
  result: string;
  reference?: string;
};

function hasOpenActivityForLead(activities: Array<{ leadId?: string | null; status: string; title: string }>, leadId: string) {
  return activities.some((activity) => activity.leadId === leadId && activity.status === 'open');
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid autopilot request', details: parsed.error.flatten() }, { status: 400 });

  const data = await getWorkspaceData();
  const salesAgent = data.agents.find((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('sales')) || data.agents[0];
  const supportAgent = data.agents.find((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('support')) || data.agents[0];
  const actions: AutopilotAction[] = [];

  const recordAction = async (action: AutopilotAction, agentId?: string | null) => {
    actions.push(action);
    await db.insert(decisionLedger).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: agentId || null,
      departmentId: null,
      action: action.title,
      policyMatched: 'CRM autopilot bounded autonomy policy',
      riskLevel: 'medium',
      decision: 'executed',
      result: action.result,
      approvedBy: ctx.user.email,
      databaseReference: action.reference || `crm_autopilot:${action.type}`,
    });
    await storeAgentMemory({
      workspaceId: ctx.workspace.id,
      agentId: agentId || null,
      sourceType: `crm_autopilot_${action.type}`,
      sourceId: action.reference || null,
      content: `${action.title}. ${action.result}`,
      metadata: { type: action.type },
    });
  };

  const seenEmails = new Map<string, string>();
  for (const lead of data.salesLeads) {
    if (actions.length >= parsed.data.maxActions) break;
    const email = String(lead.email || '').toLowerCase();
    if (!email) continue;
    const firstLeadId = seenEmails.get(email);
    if (firstLeadId && !['disqualified', 'closed_won'].includes(lead.status)) {
      const notes = [lead.notes, `Autopilot marked duplicate of lead ${firstLeadId}.`].filter(Boolean).join('\n');
      await db.update(salesLeads).set({ status: 'disqualified', notes }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id)));
      await recordAction({
        type: 'dedupe',
        title: `Marked duplicate lead ${lead.companyName}`,
        result: `${lead.email} already exists on lead ${firstLeadId}.`,
        reference: `aurora:sales_lead:${lead.id}`,
      }, lead.ownerAgentId);
    } else {
      seenEmails.set(email, lead.id);
    }
  }

  const emailLeadIds = new Set(data.outboundEmails.map((email) => email.leadId).filter(Boolean));
  for (const lead of data.salesLeads) {
    if (actions.length >= parsed.data.maxActions) break;
    if (emailLeadIds.has(lead.id) || ['disqualified', 'closed_won', 'closed_lost'].includes(lead.status)) continue;
    const memories = await searchAgentMemories(ctx.workspace.id, `${lead.companyName} ${lead.painPoint} ${lead.notes || ''}`, 6);
    const draft = await draftSalesEmailWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      lead,
      agents: data.agents,
      policies: data.policies,
      memories: memories.map((memory) => memory.content),
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
    const nextStatus: typeof salesLeads.$inferSelect.status = draft.leadScore >= 60 ? 'qualified' : lead.status as typeof salesLeads.$inferSelect.status;
    await db.update(salesLeads).set({
      score: draft.leadScore,
      status: nextStatus,
      notes: [lead.notes, `Autopilot score: ${draft.leadScore}. ${draft.scoreReason}`].filter(Boolean).join('\n'),
    }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id)));
    await recordAction({
      type: 'sales_draft',
      title: `Drafted sales email for ${lead.companyName}`,
      result: `Lead scored ${draft.leadScore}; draft is pending approval.`,
      reference: `aurora:outbound_email:${email.id}`,
    }, email.agentId);
  }

  for (const lead of data.salesLeads) {
    if (actions.length >= parsed.data.maxActions) break;
    if (!['contacted', 'replied', 'negotiating', 'qualified'].includes(lead.status)) continue;
    if (hasOpenActivityForLead(data.crmActivities, lead.id)) continue;
    const [activity] = await db.insert(crmActivities).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      leadId: lead.id,
      customerId: null,
      accountId: null,
      contactId: null,
      ownerAgentId: lead.ownerAgentId || salesAgent?.id || null,
      type: 'task',
      title: `Next best action for ${lead.companyName}`,
      body: `Autopilot created a follow-up task because the lead is ${lead.status}.`,
      status: 'open',
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    }).returning();
    await recordAction({
      type: 'follow_up_task',
      title: `Created follow-up task for ${lead.companyName}`,
      result: `Task is open and due in 2 days.`,
      reference: `aurora:crm_activity:${activity.id}`,
    }, activity.ownerAgentId);
  }

  const replyQueryIds = new Set(data.customerReplies.map((reply) => reply.queryId).filter(Boolean));
  for (const query of data.customerQueries) {
    if (actions.length >= parsed.data.maxActions) break;
    if (replyQueryIds.has(query.id) || ['closed', 'blocked'].includes(query.status)) continue;
    const draft = await draftCustomerReplyWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      query,
      agents: data.agents,
      policies: data.policies,
    });
    const [reply] = await db.insert(customerReplies).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      queryId: query.id,
      agentId: supportAgent?.id || query.ownerAgentId || null,
      toEmail: query.customerEmail,
      subject: draft.subject,
      body: draft.body,
      status: 'pending_approval',
      approvalReason: `${draft.approvalReason}\nPolicy checks: ${draft.policyChecks.join('; ')}\nNext actions: ${draft.nextActions.join('; ')}`,
    }).returning();
    await db.update(customerQueries).set({
      intent: draft.intent,
      priority: draft.priority,
      status: 'pending_approval',
      ownerAgentId: reply.agentId,
    }).where(and(eq(customerQueries.id, query.id), eq(customerQueries.workspaceId, ctx.workspace.id)));
    await recordAction({
      type: 'customer_reply_draft',
      title: `Drafted customer reply for ${query.customerName}`,
      result: `Reply is pending approval. Intent: ${draft.intent}; priority: ${draft.priority}.`,
      reference: `aurora:customer_reply:${reply.id}`,
    }, reply.agentId);
  }

  return NextResponse.json({
    summary: actions.length ? `Autopilot executed ${actions.length} CRM actions.` : 'Autopilot found no safe actions to run.',
    actions,
  });
}
