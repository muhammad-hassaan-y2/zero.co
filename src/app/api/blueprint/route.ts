import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, companyBlueprints } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const [blueprint] = await db.select().from(companyBlueprints).where(eq(companyBlueprints.workspaceId, ctx.workspace.id)).orderBy(desc(companyBlueprints.createdAt)).limit(1);
  return NextResponse.json({ blueprint });
}
