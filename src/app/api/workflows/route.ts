import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, workflows, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

const schema = z.object({
  name: z.string().min(2), trigger: z.string().min(2), ownerAgentId: z.string().optional().nullable(),
  steps: z.array(z.string()).min(1), toolsUsed: z.array(z.string()).default([]), approvalPoints: z.array(z.string()).default([]),
  successMetric: z.string().min(2), failurePath: z.string().min(2),
});

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  return NextResponse.json({ workflows: await db.select().from(workflows).where(eq(workflows.workspaceId, ctx.workspace.id)) });
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workflow', details: parsed.error.flatten() }, { status: 400 });
  const [workflow] = await db.insert(workflows).values({ id: nanoid(), workspaceId: ctx.workspace.id, ...parsed.data }).returning();
  await db.insert(decisionLedger).values({ id: nanoid(), workspaceId: ctx.workspace.id, agentId: workflow.ownerAgentId, action: `Created workflow: ${workflow.name}`, policyMatched: 'Workflow version control', riskLevel: 'medium', decision: 'executed', result: 'Workflow added to company OS', approvedBy: ctx.user.email, databaseReference: `aurora:workflow:${workflow.id}` });
  return NextResponse.json({ workflow });
}
