import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, pool, decisionLedger } from '@/db';
import { requireWorkspace } from '@/lib/session';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, workspace } = await requireWorkspace();
  const { id } = await params;

  const existing = await pool.query('select * from decision_ledger where id = $1 and workspace_id = $2 limit 1', [id, workspace.id]);
  if (!existing.rows[0]) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });

  await db
    .update(decisionLedger)
    .set({
      decision: 'rejected',
      result: 'Rejected by human operator',
      approvedBy: user.name || user.email,
    })
    .where(and(eq(decisionLedger.id, id), eq(decisionLedger.workspaceId, workspace.id)));

  const decision = { ...existing.rows[0], decision: 'rejected', result: 'Rejected by human operator', approved_by: user.name || user.email };
  return NextResponse.json({ decision });
}
