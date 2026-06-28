import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db, boardReports } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';
import { generateBoardReportWithBedrock } from '@/lib/bedrock';

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({ reports: data.reports });
}

export async function POST() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const data = await getWorkspaceData();
  if (!data.workflowRuns.length && !data.businessResults.length) {
    return NextResponse.json({ error: 'Run at least one workflow before generating an operating report.' }, { status: 400 });
  }

  let generated: Awaited<ReturnType<typeof generateBoardReportWithBedrock>>;
  try {
    generated = await generateBoardReportWithBedrock({
      workspaceName: ctx.workspace.name,
      blueprint: data.blueprint,
      metrics: data.metrics,
      agents: data.agents,
      workflowRuns: data.workflowRuns,
      businessResults: data.businessResults,
      decisions: data.decisions,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Operating report generation failed' }, { status: 502 });
  }

  const report = {
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    ...generated,
  };
  await db.insert(boardReports).values(report);
  return NextResponse.json({ report });
}
