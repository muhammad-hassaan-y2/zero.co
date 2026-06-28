import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  businessResults,
  db,
  decisionLedger,
  outboundEmails,
  salesLeads,
  simulationEvents,
} from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { sendSalesEmail } from '@/lib/ses';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const [email] = await db.select().from(outboundEmails).where(and(eq(outboundEmails.id, id), eq(outboundEmails.workspaceId, ctx.workspace.id))).limit(1);
  if (!email) return NextResponse.json({ error: 'Email draft not found' }, { status: 404 });
  if (email.status === 'sent') return NextResponse.json({ email });

  const [lead] = await db.select().from(salesLeads).where(and(eq(salesLeads.id, email.leadId), eq(salesLeads.workspaceId, ctx.workspace.id))).limit(1);
  if (!lead) return NextResponse.json({ error: 'Lead not found for email draft' }, { status: 404 });

  try {
    const providerMessageId = await sendSalesEmail({
      to: email.toEmail,
      subject: email.subject,
      body: email.body,
    });

    const [sentEmail] = await db.update(outboundEmails).set({
      status: 'sent',
      providerMessageId,
      sentAt: new Date(),
      failureReason: null,
    }).where(and(eq(outboundEmails.id, email.id), eq(outboundEmails.workspaceId, ctx.workspace.id))).returning();

    await db.update(salesLeads).set({
      status: 'contacted',
    }).where(and(eq(salesLeads.id, lead.id), eq(salesLeads.workspaceId, ctx.workspace.id)));

    await db.insert(businessResults).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      workflowRunId: null,
      agentId: email.agentId,
      name: 'Approved sales email sent',
      value: '1',
      unit: 'emails',
      proof: `SES message ${providerMessageId} sent to ${lead.companyName} (${email.toEmail}).`,
      status: 'verified',
    });

    await db.insert(simulationEvents).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: email.agentId,
      eventType: 'sales_email_sent',
      title: `Sales email sent to ${lead.companyName}`,
      description: `Approved outreach sent to ${email.toEmail} through Amazon SES.`,
      severity: 'info',
      status: 'closed',
    });

    await db.insert(decisionLedger).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: email.agentId,
      departmentId: null,
      action: `Sent approved sales email to ${lead.companyName}`,
      policyMatched: 'Customer-facing outreach approval policy',
      riskLevel: 'medium',
      decision: 'executed',
      result: `Amazon SES accepted message ${providerMessageId}.`,
      approvedBy: ctx.user.email,
      databaseReference: `ses:${providerMessageId}`,
    });

    return NextResponse.json({ email: sentEmail, providerMessageId });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'SES send failed';
    const [failedEmail] = await db.update(outboundEmails).set({
      status: reason.includes('not configured') ? 'blocked' : 'failed',
      failureReason: reason,
    }).where(and(eq(outboundEmails.id, email.id), eq(outboundEmails.workspaceId, ctx.workspace.id))).returning();

    await db.insert(decisionLedger).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: email.agentId,
      departmentId: null,
      action: `Attempted approved sales email send to ${lead.companyName}`,
      policyMatched: 'SES connector configuration policy',
      riskLevel: 'medium',
      decision: 'blocked',
      result: reason,
      approvedBy: ctx.user.email,
      databaseReference: `aurora:outbound_email:${email.id}`,
    });

    return NextResponse.json({ error: reason, email: failedEmail }, { status: 502 });
  }
}
