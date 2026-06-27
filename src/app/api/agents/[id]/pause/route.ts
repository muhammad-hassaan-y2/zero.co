import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db, digitalFtes, decisionLedger } from '@/db';
import { requireWorkspace } from '@/lib/session';
import { getWorkspaceData } from '@/lib/data';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { workspace, user } = await requireWorkspace();
  const { id } = await params;
  const data = await getWorkspaceData();
  const existing = data.agents.find((agent) => agent.id === id);

  if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  await db
    .update(digitalFtes)
    .set({ status: 'paused' })
    .where(eq(digitalFtes.id, id));
  const agent = { ...existing, status: 'paused' };

  const entry = {
    id: nanoid(),
    workspaceId: workspace.id,
    agentId: agent.id,
    departmentId: agent.departmentId,
    action: `Paused ${agent.name}`,
    policyMatched: 'Manual operator control',
    riskLevel: (agent.riskLevel as 'low' | 'medium' | 'high' | 'critical') || 'medium',
    decision: 'paused' as const,
    result: 'Agent paused by human operator',
    approvedBy: user.name || user.email,
    databaseReference: `aurora:decision:${nanoid(8)}`,
  };
  await db.insert(decisionLedger).values(entry);

  return NextResponse.json({ agent, entry });
}
