import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, policies, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

const schema = z.object({ name: z.string().min(2), description: z.string().min(3), condition: z.string().min(2), action: z.string().min(2), mode: z.enum(['auto_approve','require_approval','block','throttle','pause','escalate']), riskLevel: z.enum(['low','medium','high','critical']).default('medium'), enabled: z.boolean().default(true) });

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  return NextResponse.json({ policies: await db.select().from(policies).where(eq(policies.workspaceId, ctx.workspace.id)) });
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid policy', details: parsed.error.flatten() }, { status: 400 });
  const [policy] = await db.insert(policies).values({ id: nanoid(), workspaceId: ctx.workspace.id, ...parsed.data }).returning();
  await db.insert(decisionLedger).values({ id: nanoid(), workspaceId: ctx.workspace.id, action: `Created policy: ${policy.name}`, policyMatched: 'Policy builder', riskLevel: policy.riskLevel, decision: 'executed', result: `Policy mode set to ${policy.mode}`, approvedBy: ctx.user.email, databaseReference: `aurora:policy:${policy.id}` });
  return NextResponse.json({ policy });
}
