import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  businessResults,
  customerQueries,
  customerReplies,
  db,
  decisionLedger,
  simulationEvents,
} from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { sendSalesEmail } from '@/lib/ses';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const [reply] = await db.select().from(customerReplies).where(and(eq(customerReplies.id, id), eq(customerReplies.workspaceId, ctx.workspace.id))).limit(1);
  if (!reply) return NextResponse.json({ error: 'Reply draft not found' }, { status: 404 });
  if (reply.status === 'sent') return NextResponse.json({ reply });

  const [query] = await db.select().from(customerQueries).where(and(eq(customerQueries.id, reply.queryId), eq(customerQueries.workspaceId, ctx.workspace.id))).limit(1);
  if (!query) return NextResponse.json({ error: 'Customer query not found for reply' }, { status: 404 });

  try {
    const providerMessageId = await sendSalesEmail({
      to: reply.toEmail,
      subject: reply.subject,
      body: reply.body,
    });

    const [sentReply] = await db.update(customerReplies).set({
      status: 'sent',
      providerMessageId,
      sentAt: new Date(),
      failureReason: null,
    }).where(and(eq(customerReplies.id, reply.id), eq(customerReplies.workspaceId, ctx.workspace.id))).returning();

    await db.update(customerQueries).set({
      status: 'replied',
    }).where(and(eq(customerQueries.id, query.id), eq(customerQueries.workspaceId, ctx.workspace.id)));

    await db.insert(businessResults).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      workflowRunId: null,
      agentId: reply.agentId,
      name: 'Approved customer reply sent',
      value: '1',
      unit: 'emails',
      proof: `SES message ${providerMessageId} sent to ${query.customerName} (${reply.toEmail}).`,
      status: 'verified',
    });

    await db.insert(simulationEvents).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: reply.agentId,
      eventType: 'customer_reply_sent',
      title: `Customer reply sent to ${query.customerName}`,
      description: `Approved reply sent to ${reply.toEmail} through Amazon SES.`,
      severity: 'info',
      status: 'closed',
    });

    await db.insert(decisionLedger).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: reply.agentId,
      departmentId: null,
      action: `Sent approved customer reply to ${query.customerName}`,
      policyMatched: 'Customer-facing reply approval policy',
      riskLevel: query.priority,
      decision: 'executed',
      result: `Amazon SES accepted message ${providerMessageId}.`,
      approvedBy: ctx.user.email,
      databaseReference: `ses:${providerMessageId}`,
    });

    return NextResponse.json({ reply: sentReply, providerMessageId });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'SES send failed';
    const [failedReply] = await db.update(customerReplies).set({
      status: reason.includes('not configured') ? 'blocked' : 'failed',
      failureReason: reason,
    }).where(and(eq(customerReplies.id, reply.id), eq(customerReplies.workspaceId, ctx.workspace.id))).returning();

    await db.insert(decisionLedger).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: reply.agentId,
      departmentId: null,
      action: `Attempted customer reply send to ${query.customerName}`,
      policyMatched: 'SES connector configuration policy',
      riskLevel: query.priority,
      decision: 'blocked',
      result: reason,
      approvedBy: ctx.user.email,
      databaseReference: `aurora:customer_reply:${reply.id}`,
    });

    return NextResponse.json({ error: reason, reply: failedReply }, { status: 502 });
  }
}
