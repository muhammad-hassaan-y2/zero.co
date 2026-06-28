import Link from 'next/link';
import { DecisionActions } from '@/components/action-buttons';
import { Badge, Card, Metric } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function GovernancePage() {
  const data = await getWorkspaceData();
  const pending = data.decisions.filter((decision) => decision.decision === 'pending');
  const blocked = data.decisions.filter((decision) => ['blocked', 'throttled', 'paused'].includes(decision.decision));

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Governance</h1>
          <p className="mt-3 max-w-3xl text-white/60">Unified control room for policies, SOPs, approvals, blocked actions, and the decision ledger.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/policies" className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">Policy builder</Link>
          <Link href="/dashboard/sops" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70">SOP library</Link>
          <Link href="/dashboard/decision-ledger" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70">Full ledger</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Policies" value={data.policies.length} />
        <Metric label="SOPs" value={data.sops.length} />
        <Metric label="Pending approvals" value={pending.length} />
        <Metric label="Blocked / controlled" value={blocked.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <h2 className="text-xl font-semibold">Approval Queue</h2>
          <div className="mt-5 space-y-3">
            {pending.slice(0, 6).map((decision) => {
              const agent = data.agents.find((item) => item.id === decision.agentId);
              return (
                <div key={decision.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{decision.action}</h3>
                      <p className="mt-1 text-sm text-white/45">{agent?.name || 'System'} - {decision.policyMatched}</p>
                    </div>
                    <Badge value={decision.riskLevel} />
                  </div>
                  <p className="mt-3 text-sm text-white/55">{decision.result}</p>
                  <DecisionActions id={decision.id} />
                </div>
              );
            })}
            {!pending.length && <p className="rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-white/45">No pending approvals.</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold">Active Policies</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.policies.slice(0, 8).map((policy) => (
                <div key={policy.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{policy.name}</h3>
                    <Badge value={policy.mode} />
                  </div>
                  <p className="mt-2 text-sm text-white/55">{policy.condition}</p>
                  <p className="mt-2 text-xs text-white/40">{policy.action}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">SOP Coverage</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {data.sops.slice(0, 6).map((sop) => (
                <div key={sop.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <h3 className="font-medium">{sop.title}</h3>
                  <p className="mt-2 text-sm text-white/55">{sop.objective}</p>
                  <p className="mt-2 text-xs text-cyan-100/70">Owner: {sop.owner}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
