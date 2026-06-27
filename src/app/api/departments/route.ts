import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, departments, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';

const schema = z.object({ name: z.string().min(2), purpose: z.string().min(3), kpis: z.array(z.string()).default([]), riskLevel: z.enum(['low','medium','high','critical']).default('medium'), budget: z.coerce.number().default(0) });

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({ departments: data.departments });
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid department', details: parsed.error.flatten() }, { status: 400 });
  const department = { id: nanoid(), workspaceId: ctx.workspace.id, ...parsed.data, budget: String(parsed.data.budget) };
  await db.insert(departments).values(department);
  await db.insert(decisionLedger).values({ id: nanoid(), workspaceId: ctx.workspace.id, departmentId: department.id, action: `Created department: ${department.name}`, policyMatched: 'Workspace owner action', riskLevel: department.riskLevel, decision: 'executed', result: 'Department added to operating model', approvedBy: ctx.user.email, databaseReference: `aurora:department:${department.id}` });
  return NextResponse.json({ department });
}
