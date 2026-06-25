import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const decisions = await db.select().from(decisionLedger).where(eq(decisionLedger.workspaceId, ctx.workspace.id)).orderBy(desc(decisionLedger.createdAt));
  return NextResponse.json({ decisions });
}
