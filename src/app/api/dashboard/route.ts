import { NextResponse } from 'next/server';
import { getWorkspaceData } from '@/lib/data';

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({
    workspace: data.workspace,
    metrics: data.metrics,
    departments: data.departments,
    agents: data.agents,
    workflows: data.workflows,
    sops: data.sops,
    policies: data.policies,
    decisions: data.decisions,
    events: data.events,
    blueprint: data.blueprint,
    reports: data.reports,
  });
}
