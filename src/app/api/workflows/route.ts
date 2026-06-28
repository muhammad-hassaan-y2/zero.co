import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, workflows, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';

const schema = z.object({
  name: z.string().min(2), trigger: z.string().min(2), ownerAgentId: z.string().optional().nullable(),
  steps: z.array(z.string()).min(1), toolsUsed: z.array(z.string()).default([]), approvalPoints: z.array(z.string()).default([]),
  successMetric: z.string().min(2), failurePath: z.string().min(2),
});

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({ workflows: data.workflows });
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workflow', details: parsed.error.flatten() }, { status: 400 });
  const workflow = { id: nanoid(), workspaceId: ctx.workspace.id, ...parsed.data };
  await db.insert(workflows).values(workflow);
  await db.insert(decisionLedger).values({ id: nanoid(), workspaceId: ctx.workspace.id, agentId: workflow.ownerAgentId, action: `Created workflow: ${workflow.name}`, policyMatched: 'Workflow version control', riskLevel: 'medium', decision: 'executed', result: 'Workflow added to company OS', approvedBy: ctx.user.email, databaseReference: `aurora:workflow:${workflow.id}` });
  return NextResponse.json({ workflow });
}
