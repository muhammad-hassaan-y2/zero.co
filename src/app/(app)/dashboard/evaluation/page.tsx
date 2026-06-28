import Link from 'next/link';
import { BoardReportButton, RunWorkflowButton, SimulateButton } from '@/components/action-buttons';
import { Badge, Card, Metric } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function EvaluationPage() {
  const data = await getWorkspaceData();
  const verified = data.businessResults.filter((result) => result.status === 'verified');
  const projected = data.businessResults.filter((result) => result.status === 'projected');

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Evaluation</h1>
          <p className="mt-3 max-w-3xl text-white/60">Run the OS, collect evidence, inspect results, and generate operating reports from stored runtime data.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SimulateButton />
          <BoardReportButton />
          <Link href="/dashboard/results" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70">Full results</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Workflow runs" value={data.workflowRuns.length} />
        <Metric label="Completed runs" value={data.metrics.workflowRunsCompleted} />
        <Metric label="Verified results" value={verified.length} />
        <Metric label="Projected results" value={projected.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Run Workflows</h2>
            <Link href="/dashboard/workflows" className="text-sm text-cyan-300">Open workflow page</Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.workflows.slice(0, 8).map((workflow) => {
              const owner = data.agents.find((agent) => agent.id === workflow.ownerAgentId);
              const latestRun = data.workflowRuns.find((run) => run.workflowId === workflow.id);
              return (
                <div key={workflow.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <h3 className="font-medium">{workflow.name}</h3>
                      <p className="mt-1 text-sm text-white/45">{owner?.name || 'Unassigned'} - {workflow.trigger}</p>
                    </div>
                    <RunWorkflowButton id={workflow.id} />
                  </div>
                  {latestRun && (
                    <p className="mt-3 rounded-md border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                      Latest: {latestRun.status.replaceAll('_', ' ')} - {latestRun.resultSummary}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Evidence and Reports</h2>
          <div className="mt-5 space-y-4">
            {data.businessResults.slice(0, 6).map((result) => (
              <div key={result.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{result.name}</h3>
                  <Badge value={result.status} />
                </div>
                <p className="mt-3 text-2xl font-semibold">{Number(result.value).toFixed(2)} <span className="text-base text-white/45">{result.unit}</span></p>
                <p className="mt-2 text-sm text-white/55">{result.proof}</p>
              </div>
            ))}
            {!data.businessResults.length && <p className="rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-white/45">No evidence yet. Run a workflow to generate result records.</p>}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-semibold">Operating Reports</h3>
              <Link href="/dashboard/board-report" className="text-sm text-cyan-300">Open reports</Link>
            </div>
            <div className="mt-3 space-y-3">
              {data.reports.slice(0, 3).map((report) => (
                <div key={report.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <h4 className="font-medium">{report.title}</h4>
                  <p className="mt-2 text-sm text-white/55">{report.summary}</p>
                </div>
              ))}
              {!data.reports.length && <p className="text-sm text-white/45">No operating reports yet.</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
