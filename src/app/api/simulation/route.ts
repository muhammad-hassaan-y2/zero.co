import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db, digitalFtes, simulationEvents, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

const eventTemplates = [
  { type: 'task_completed', title: 'Support Agent resolved 9 tickets', description: 'Routine customer tickets completed with SOP-backed responses.', severity: 'info' as const, status: 'closed' },
  { type: 'approval_requested', title: 'Refund Agent requested approval for a $920 refund', description: 'High-value financial action matched approval policy.', severity: 'high' as const, status: 'pending' },
  { type: 'cost_alert', title: 'Research Agent crossed 3x spend baseline', description: 'Cost circuit breaker opened and recommended throttling.', severity: 'warning' as const, status: 'open' },
  { type: 'risk_flagged', title: 'QA Agent blocked low-confidence output', description: 'A customer-facing response fell below the 85% confidence threshold.', severity: 'warning' as const, status: 'blocked' },
  { type: 'deploy_approval', title: 'DevOps Agent requested production deploy approval', description: 'Production change is waiting for human approval.', severity: 'critical' as const, status: 'pending' },
];

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const rows = await db.select().from(simulationEvents).where(eq(simulationEvents.workspaceId, ctx.workspace.id));
  return NextResponse.json({ events: rows });
}

export async function POST() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const agents = await db.select().from(digitalFtes).where(eq(digitalFtes.workspaceId, ctx.workspace.id));
  const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
  const agent = agents[Math.floor(Math.random() * Math.max(agents.length, 1))];
  const [event] = await db.insert(simulationEvents).values({ id: nanoid(), workspaceId: ctx.workspace.id, agentId: agent?.id, eventType: template.type, title: template.title, description: template.description, severity: template.severity, status: template.status }).returning();
  if (['approval_requested', 'cost_alert', 'risk_flagged', 'deploy_approval'].includes(template.type)) {
    await db.insert(decisionLedger).values({ id: nanoid(), workspaceId: ctx.workspace.id, agentId: agent?.id, departmentId: agent?.departmentId, action: template.title, policyMatched: template.type === 'cost_alert' ? 'Agent spend circuit breaker' : template.type === 'deploy_approval' ? 'Production deploy approval' : 'Bounded autonomy policy', riskLevel: template.severity === 'critical' ? 'critical' : template.severity === 'high' ? 'high' : 'medium', decision: template.status === 'blocked' ? 'blocked' : 'pending', result: template.status === 'blocked' ? 'Blocked before customer impact' : 'Waiting for human review', approvedBy: template.status === 'blocked' ? 'ZeroCo Policy Engine' : null, databaseReference: `aurora:decision:${nanoid(8)}` });
  }
  return NextResponse.json({ event });
}
