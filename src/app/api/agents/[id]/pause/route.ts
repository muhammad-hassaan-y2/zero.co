import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db, digitalFtes, decisionLedger } from '@/db';
import { requireWorkspace } from '@/lib/session';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { workspace, user } = await requireWorkspace();
  const { id } = await params;

  const [agent] = await db
    .update(digitalFtes)
    .set({ status: 'paused' })
    .where(eq(digitalFtes.id, id))
    .returning();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const [entry] = await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: workspace.id,
    agentId: agent.id,
    departmentId: agent.departmentId,
    action: `Paused ${agent.name}`,
    policyMatched: 'Manual operator control',
    riskLevel: agent.riskLevel,
    decision: 'paused',
    result: 'Agent paused by human operator',
    approvedBy: user.name || user.email,
    databaseReference: `aurora:decision:${nanoid(8)}`,
  }).returning();

  return NextResponse.json({ agent, entry });
}
