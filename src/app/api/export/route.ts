import { NextResponse } from 'next/server';
import { getWorkspaceData } from '@/lib/data';

export async function GET() {
  const data = await getWorkspaceData();
  const generatedAt = new Date().toISOString();
  const packageName = `${data.workspace.slug || 'zeroco'}-operating-package`;

  const payload = {
    packageName,
    generatedAt,
    workspace: data.workspace,
    evaluationRunbook: [
      'Review the blueprint to understand the generated company model.',
      'Inspect digital FTEs, their tools, autonomy level, risk, and current tasks.',
      'Open workflows and run one workflow for result.',
      'Check Results Center for workflow run evidence and business result records.',
      'Check Decision Ledger for policy matches, approvals, blocks, and DB references.',
      'Use Company Builder to generate a new automation package from a fresh task.',
    ],
    integrationReadiness: {
      currentMode: 'Generated workflow and evidence runtime inside ZeroCo',
      nextStepForRealToolExecution: 'Connect the workflow tools listed in each workflow/toolsUsed array to provider credentials and replace simulated runtime steps with provider API calls.',
    },
    blueprint: data.blueprint,
    departments: data.departments,
    digitalFtes: data.agents,
    workflows: data.workflows,
    sops: data.sops,
    policies: data.policies,
    simulationEvents: data.events,
    decisionLedger: data.decisions,
    workflowRuns: data.workflowRuns,
    workflowStepRuns: data.workflowStepRuns,
    businessResults: data.businessResults,
    boardReports: data.reports,
    metrics: data.metrics,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${packageName}.json"`,
    },
  });
}
