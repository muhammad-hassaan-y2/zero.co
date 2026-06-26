import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge, Card, Metric } from '@/components/status';
import { DecisionActions } from '@/components/action-buttons';
import { getWorkspaceData } from '@/lib/data';
import { LiveVoiceAgent } from './live/voice-agent';

export default async function DashboardPage() {
  const data = await getWorkspaceData();
  if (!data.agents.length) redirect('/onboarding');
  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">AI-Native Company Command Center</h1>
          <p className="mt-3 max-w-4xl text-white/60">Monitor your digital workforce, policies, spend, approvals, operating health, and live AI operator from database-backed records.</p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-white/40">Departments</p>
            <p className="mt-1 text-2xl font-semibold">{data.departments.length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-white/40">Workflows</p>
            <p className="mt-1 text-2xl font-semibold">{data.workflows.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Digital FTEs Active" value={data.metrics.digitalFtesActive} />
        <Metric label="Tasks Completed Today" value={data.metrics.tasksCompletedToday} />
        <Metric label="AI Spend Today" value={`$${data.metrics.aiSpendToday.toFixed(2)}`} />
        <Metric label="Risky Actions Blocked" value={data.metrics.riskyActionsBlocked} />
        <Metric label="Human Approvals Needed" value={data.metrics.humanApprovalsNeeded} />
        <Metric label="Estimated Hours Saved" value={Math.round(data.metrics.estimatedHoursSaved)} />
        <Metric label="Operating Health" value={`${data.metrics.operatingHealth}%`} />
        <Metric label="Agent ROI" value={`${data.metrics.agentRoi.toFixed(1)}x`} />
        <Metric label="Workflow Runs Completed" value={data.metrics.workflowRunsCompleted} />
        <Metric label="Verified Result Records" value={data.metrics.verifiedResults} />
      </div>

      <div className="mt-8">
        <Card>
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">Text + Live AI Call</h2>
              <p className="mt-1 text-sm text-white/50">Ask by text or use the talk button. Bedrock generates the answer and Polly speaks it back.</p>
            </div>
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">Live operator ready</div>
          </div>
          <LiveVoiceAgent />
        </Card>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Digital Workforce Status</h2>
            <Link href="/dashboard/digital-ftes" className="text-sm text-cyan-300">Manage FTEs →</Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.agents.slice(0, 8).map((agent) => (
              <div key={agent.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="font-medium">{agent.name}</h3><p className="text-sm text-white/50">{agent.role}</p></div>
                  <Badge value={agent.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/65">
                  <p>Autonomy: <span className="text-white">{agent.autonomyLevel.replaceAll('_', ' ')}</span></p>
                  <p>Risk: <span className="text-white">{agent.riskLevel}</span></p>
                  <p>Success: <span className="text-white">{agent.successRate}%</span></p>
                  <p>Cost: <span className="text-white">${agent.costToday}</span></p>
                </div>
                <p className="mt-3 text-sm text-white/50">{agent.currentTask}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Live Operating Feed</h2>
          <div className="mt-5 space-y-3">
            {data.events.slice(0, 7).map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-start justify-between gap-4"><p className="font-medium">{event.title}</p><Badge value={event.severity} /></div>
                <p className="mt-1 text-sm text-white/50">{event.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Recent Produced Results</h2>
            <p className="mt-1 text-sm text-white/50">Business outcomes generated by workflow runs, with proof stored in the runtime tables.</p>
          </div>
          <Link href="/dashboard/results" className="text-sm text-cyan-300">Open results</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.businessResults.slice(0, 6).map((result) => (
            <div key={result.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{result.name}</h3>
                <Badge value={result.status} />
              </div>
              <p className="mt-3 text-2xl font-semibold">{Number(result.value).toFixed(2)} <span className="text-base text-white/45">{result.unit}</span></p>
              <p className="mt-2 text-sm leading-6 text-white/50">{result.proof}</p>
            </div>
          ))}
          {!data.businessResults.length && <p className="text-sm text-white/45">No produced results yet. Run a workflow to generate result records.</p>}
        </div>
      </Card>

      <div className="mt-8 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <h2 className="text-xl font-semibold">Pending Approval Queue</h2>
          <div className="mt-5 space-y-3">
            {data.decisions.filter((d) => d.decision === 'pending').slice(0, 4).map((decision) => (
              <div key={decision.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="font-medium">{decision.action}</p>
                <p className="mt-1 text-sm text-white/50">Policy: {decision.policyMatched}</p>
                <DecisionActions id={decision.id} />
              </div>
            ))}
            {!data.decisions.some((d) => d.decision === 'pending') && <p className="text-sm text-white/45">No pending approvals. The policy engine is clear.</p>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Decision Ledger Preview</h2>
            <Link href="/dashboard/decision-ledger" className="text-sm text-cyan-300">Open ledger →</Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-white/40"><tr><th className="py-3">Agent</th><th>Action</th><th>Policy</th><th>Decision</th><th>DB Ref</th></tr></thead>
              <tbody>
                {data.decisions.slice(0, 8).map((decision) => {
                  const agent = data.agents.find((a) => a.id === decision.agentId);
                  return <tr key={decision.id} className="border-t border-white/10"><td className="py-4">{agent?.name || 'System'}</td><td>{decision.action}</td><td>{decision.policyMatched}</td><td><Badge value={decision.decision} /></td><td className="text-cyan-300">{decision.databaseReference}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="mt-8">
        <h2 className="text-xl font-semibold">Backend Architecture</h2>
        <p className="mt-3 text-white/60">Next.js API routes connect auth, workspace data, Bedrock generation, Polly voice, Transcribe jobs, automation creation, workflow runtime execution, step evidence, business result records, and the database-backed decision ledger.</p>
      </Card>
    </div>
  );
}
