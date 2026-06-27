import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, digitalFtes, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';

const createAgentSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  goal: z.string().min(2),
  departmentId: z.string().optional().nullable(),
  tools: z.array(z.string()).default([]),
  autonomyLevel: z.enum(['observe', 'suggest', 'approval_required', 'auto_act']).default('suggest'),
  dailyBudget: z.coerce.number().default(10),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({ agents: data.agents });
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = createAgentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid agent', details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const agent = {
    id: nanoid(), workspaceId: ctx.workspace.id, departmentId: data.departmentId || null,
    name: data.name, role: data.role, goal: data.goal, tools: data.tools,
    autonomyLevel: data.autonomyLevel, dailyBudget: String(data.dailyBudget), riskLevel: data.riskLevel,
    status: 'healthy' as const, currentTask: 'Awaiting first assigned workflow', successRate: 90, costToday: '0',
  };
  await db.insert(digitalFtes).values(agent);
  await db.insert(decisionLedger).values({
    id: nanoid(), workspaceId: ctx.workspace.id, agentId: agent.id, departmentId: agent.departmentId,
    action: `Created digital FTE: ${agent.name}`, policyMatched: 'Workspace owner action', riskLevel: 'low', decision: 'executed',
    result: 'Digital FTE added to company OS', approvedBy: ctx.user.email, databaseReference: `aurora:agent:${agent.id}`,
  });
  return NextResponse.json({ agent });
}
