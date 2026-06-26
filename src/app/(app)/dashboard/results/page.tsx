import { Badge, Card, Metric } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function ResultsPage() {
  const data = await getWorkspaceData();

  const verified = data.businessResults.filter((result) => result.status === 'verified');
  const projected = data.businessResults.filter((result) => result.status === 'projected');

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Results Center</h1>
          <p className="mt-3 max-w-3xl text-white/60">Proof that the AI-native company produced measurable work: workflow runs, step evidence, artifacts, spend, and verified business results.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Workflow Runs" value={data.workflowRuns.length} />
        <Metric label="Completed Runs" value={data.metrics.workflowRunsCompleted} />
        <Metric label="Verified Results" value={verified.length} />
        <Metric label="Projected Results" value={projected.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <h2 className="text-xl font-semibold">Business Results</h2>
          <div className="mt-5 space-y-3">
            {data.businessResults.map((result) => {
              const agent = data.agents.find((item) => item.id === result.agentId);
              return (
                <div key={result.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{result.name}</h3>
                      <p className="mt-1 text-sm text-white/45">{agent?.name || 'System result'}</p>
                    </div>
                    <Badge value={result.status} />
                  </div>
                  <p className="mt-3 text-2xl font-semibold">{Number(result.value).toFixed(2)} <span className="text-base text-white/45">{result.unit}</span></p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{result.proof}</p>
                </div>
              );
            })}
            {!data.businessResults.length && <p className="text-sm text-white/45">No results yet. Run a workflow from the Workflows page to generate proof of work.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Workflow Runs</h2>
          <div className="mt-5 space-y-4">
            {data.workflowRuns.map((run) => {
              const workflow = data.workflows.find((item) => item.id === run.workflowId);
              const agent = data.agents.find((item) => item.id === run.agentId);
              const steps = data.workflowStepRuns.filter((step) => step.workflowRunId === run.id).sort((a, b) => a.stepIndex - b.stepIndex);

              return (
                <div key={run.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{workflow?.name || 'Workflow run'}</h3>
                      <p className="mt-1 text-sm text-white/45">{agent?.name || 'Unassigned agent'}</p>
                    </div>
                    <Badge value={run.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/60">{run.resultSummary}</p>
                  <div className="mt-3 grid gap-2 text-sm text-white/55 md:grid-cols-3">
                    <p>Cost: <span className="text-white">${run.costUsd}</span></p>
                    <p>Duration: <span className="text-white">{run.durationMs}ms</span></p>
                    <p>Artifacts: <span className="text-white">{run.outputArtifacts.length}</span></p>
                  </div>
                  <div className="mt-4 space-y-2">
                    {steps.map((step) => (
                      <div key={step.id} className="rounded-md border border-white/10 bg-black/25 p-3 text-sm">
                        <p className="text-white">Step {step.stepIndex}: {step.stepName}</p>
                        <p className="mt-1 text-white/45">{step.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!data.workflowRuns.length && <p className="text-sm text-white/45">No workflow runs yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
