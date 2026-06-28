import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { db, digitalFtes, decisionLedger } from '@/db';
import { requireWorkspace } from '@/lib/session';
import { getWorkspaceData } from '@/lib/data';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireWorkspace();
  const { id } = await params;
  const data = await getWorkspaceData();
  const existing = data.agents.find((agent) => agent.id === id);

  if (!existing) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  await db
    .update(digitalFtes)
    .set({ status: 'throttled', costToday: '3.50' })
    .where(and(eq(digitalFtes.id, id), eq(digitalFtes.workspaceId, workspace.id)));
  const agent = { ...existing, status: 'throttled', costToday: '3.50' };

  const entry = {
    id: nanoid(),
    workspaceId: workspace.id,
    agentId: agent.id,
    departmentId: agent.departmentId,
    action: `Throttled ${agent.name}`,
    policyMatched: 'Agent spend circuit breaker',
    riskLevel: 'medium' as const,
    decision: 'throttled' as const,
    result: 'Spend capped and daily budget protected',
    approvedBy: 'ZeroCo Policy Engine',
    databaseReference: `aurora:decision:${nanoid(8)}`,
  };
  await db.insert(decisionLedger).values(entry);

  return NextResponse.json({ agent, entry });
}
