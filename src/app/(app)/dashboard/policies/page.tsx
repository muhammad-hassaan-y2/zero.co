import { AddPolicyForm } from '@/components/builder-forms';
import { Badge, Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function PoliciesPage() {
  const data = await getWorkspaceData();
  return <div><h1 className="text-4xl font-semibold tracking-tight">Policy Builder</h1><p className="mt-3 text-white/60">Bounded autonomy rules that control what agents may auto-approve, escalate, block, throttle, or pause.</p><div className="mt-8"><AddPolicyForm /></div><div className="mt-8 grid gap-5 lg:grid-cols-2">{data.policies.map((policy) => <Card key={policy.id}><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-semibold">{policy.name}</h2><Badge value={policy.mode} /></div><p className="mt-3 text-white/60">{policy.description}</p><div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/65"><p><b className="text-white">Condition:</b> {policy.condition}</p><p className="mt-2"><b className="text-white">Action:</b> {policy.action}</p></div><div className="mt-4 flex gap-2"><Badge value={policy.riskLevel} /><Badge value={policy.enabled ? 'enabled' : 'disabled'} /></div></Card>)}</div></div>;
}
