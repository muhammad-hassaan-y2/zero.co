import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { desc, eq } from 'drizzle-orm';
import { db, boardReports, digitalFtes, decisionLedger, simulationEvents } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({ reports: data.reports });
}

export async function POST() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { agents, decisions, events } = await getWorkspaceData();
  const spend = agents.reduce((sum, agent) => sum + Number(agent.costToday || 0), 0);
  const blocked = decisions.filter((decision) => ['blocked','throttled','paused'].includes(decision.decision)).length;
  const report = {
    id: nanoid(), workspaceId: ctx.workspace.id, title: `Board Report ${new Date().toLocaleDateString()}`,
    summary: `${agents.length} digital FTEs generated ${events.length} operating events with ${blocked} bounded-autonomy interventions.`,
    tasksCompleted: events.filter((event) => event.eventType === 'task_completed').length * 9,
    moneySpent: String(spend.toFixed(2)),
    hoursSaved: Math.max(agents.length * 2, 1),
    riskyActionsBlocked: blocked,
    recommendations: ['Increase autonomy for healthy low-risk agents', 'Keep refunds and production deploys approval-gated', 'Review throttled agents before raising budget'],
    auditSummary: `${decisions.length} decision ledger records stored for replay and audit.`,
  };
  await db.insert(boardReports).values(report);
  return NextResponse.json({ report });
}
