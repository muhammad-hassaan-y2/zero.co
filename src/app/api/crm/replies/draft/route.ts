import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { customerQueries, customerReplies, db, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';
import { draftCustomerReplyWithBedrock } from '@/lib/bedrock';

const schema = z.object({
  queryId: z.string().min(1),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reply draft request', details: parsed.error.flatten() }, { status: 400 });
  }

  const [query] = await db.select().from(customerQueries).where(and(eq(customerQueries.id, parsed.data.queryId), eq(customerQueries.workspaceId, ctx.workspace.id))).limit(1);
  if (!query) return NextResponse.json({ error: 'Customer query not found' }, { status: 404 });

  const workspaceData = await getWorkspaceData();
  const supportAgent = workspaceData.agents.find((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('support')) || workspaceData.agents[0];

  let draft: Awaited<ReturnType<typeof draftCustomerReplyWithBedrock>>;
  try {
    draft = await draftCustomerReplyWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      query,
      agents: workspaceData.agents,
      policies: workspaceData.policies,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Customer reply draft failed' }, { status: 502 });
  }

  const [updatedQuery] = await db.update(customerQueries).set({
    intent: draft.intent,
    priority: draft.priority,
    status: draft.approvalRequired ? 'pending_approval' : 'triaged',
    ownerAgentId: supportAgent?.id || query.ownerAgentId,
  }).where(and(eq(customerQueries.id, query.id), eq(customerQueries.workspaceId, ctx.workspace.id))).returning();

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

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: reply.agentId,
    departmentId: supportAgent?.departmentId || null,
    action: `Approve customer reply to ${query.customerName}`,
    policyMatched: 'Customer-facing reply approval policy',
    riskLevel: draft.priority,
    decision: 'pending',
    result: draft.resultRecord,
    approvedBy: null,
    databaseReference: `aurora:customer_reply:${reply.id}`,
  });

  return NextResponse.json({ query: updatedQuery, reply, draft });
}
