import { AddWorkflowForm } from '@/components/builder-forms';
import { RunWorkflowButton } from '@/components/action-buttons';
import { Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function WorkflowsPage() {
  const data = await getWorkspaceData();

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">Workflows</h1>
      <p className="mt-3 max-w-3xl text-white/60">Operating workflows that connect triggers, digital FTEs, tools, approval points, and failure paths.</p>

      <div className="mt-8">
        <AddWorkflowForm agents={data.agents.map((agent) => ({ id: agent.id, name: agent.name }))} />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {data.workflows.map((workflow) => {
          const owner = data.agents.find((agent) => agent.id === workflow.ownerAgentId);
          const latestRun = data.workflowRuns.find((run) => run.workflowId === workflow.id);
          const resultCount = data.businessResults.filter((result) => result.workflowRunId === latestRun?.id).length;

          return (
            <Card key={workflow.id}>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h2 className="text-xl font-semibold">{workflow.name}</h2>
                  <p className="mt-2 text-sm text-cyan-200">Trigger: {workflow.trigger}</p>
                </div>
                <RunWorkflowButton id={workflow.id} />
              </div>
              <p className="mt-2 text-sm text-white/50">Owner: {owner?.name || 'Unassigned'}</p>
              {latestRun && (
                <div className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                  Latest run: {latestRun.status.replaceAll('_', ' ')} - {latestRun.resultSummary} {resultCount ? `(${resultCount} result records)` : ''}
                </div>
              )}

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <List title="Steps" items={workflow.steps} />
                <List title="Tools" items={workflow.toolsUsed} />
                <List title="Approval points" items={workflow.approvalPoints} />
                <div>
                  <h3 className="font-medium">Success / failure</h3>
                  <p className="mt-2 text-sm text-white/55">{workflow.successMetric}</p>
                  <p className="mt-2 text-sm text-white/35">Fallback: {workflow.failurePath}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-white/55">
        {items.length ? items.map((item) => <li key={item}>- {item}</li>) : <li>- None</li>}
      </ul>
    </div>
  );
}
