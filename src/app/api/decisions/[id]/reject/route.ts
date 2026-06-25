import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, decisionLedger } from '@/db';
import { requireUser } from '@/lib/session';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const [decision] = await db
    .update(decisionLedger)
    .set({
      decision: 'rejected',
      result: 'Rejected by human operator',
      approvedBy: user.name || user.email,
    })
    .where(eq(decisionLedger.id, id))
    .returning();

  if (!decision) return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
  return NextResponse.json({ decision });
}
