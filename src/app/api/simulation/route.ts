import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db, simulationEvents, decisionLedger } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';
import { generateOperatingEventWithBedrock } from '@/lib/bedrock';

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({ events: data.events });
}

export async function POST() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const data = await getWorkspaceData();
  if (!data.workflows.length || !data.agents.length) {
    return NextResponse.json({ error: 'Generate a company OS before creating runtime test events.' }, { status: 400 });
  }

  let generated: Awaited<ReturnType<typeof generateOperatingEventWithBedrock>>;
  try {
    generated = await generateOperatingEventWithBedrock({
      workspaceName: ctx.workspace.name,
      blueprint: data.blueprint,
      agents: data.agents,
      workflows: data.workflows,
      policies: data.policies,
      recentResults: data.businessResults,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Runtime event generation failed' }, { status: 502 });
  }

  const agent = data.agents.find((item) => item.name.toLowerCase() === generated.agentName.toLowerCase()) || data.agents[0];
  const event = {
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent?.id,
    eventType: generated.eventType,
    title: generated.title,
    description: generated.description,
    severity: generated.severity,
    status: generated.status,
  };
  await db.insert(simulationEvents).values(event);
  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: agent?.id,
    departmentId: agent?.departmentId,
    action: generated.ledger.action,
    policyMatched: generated.ledger.policyMatched,
    riskLevel: generated.ledger.riskLevel,
    decision: generated.ledger.decision,
    result: generated.ledger.result,
    approvedBy: generated.ledger.decision === 'executed' ? 'ZeroCo Runtime Test' : null,
    databaseReference: `aurora:event:${event.id}`,
  });
  return NextResponse.json({ event });
}
