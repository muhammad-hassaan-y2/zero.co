import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, departments, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

const schema = z.object({ name: z.string().min(2), purpose: z.string().min(3), kpis: z.array(z.string()).default([]), riskLevel: z.enum(['low','medium','high','critical']).default('medium'), budget: z.coerce.number().default(0) });

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  return NextResponse.json({ departments: await db.select().from(departments).where(eq(departments.workspaceId, ctx.workspace.id)) });
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid department', details: parsed.error.flatten() }, { status: 400 });
  const [department] = await db.insert(departments).values({ id: nanoid(), workspaceId: ctx.workspace.id, ...parsed.data, budget: String(parsed.data.budget) }).returning();
  await db.insert(decisionLedger).values({ id: nanoid(), workspaceId: ctx.workspace.id, departmentId: department.id, action: `Created department: ${department.name}`, policyMatched: 'Workspace owner action', riskLevel: department.riskLevel, decision: 'executed', result: 'Department added to operating model', approvedBy: ctx.user.email, databaseReference: `aurora:department:${department.id}` });
  return NextResponse.json({ department });
}
