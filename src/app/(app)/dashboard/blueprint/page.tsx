import { Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function BlueprintPage() {
  const { blueprint } = await getWorkspaceData();
  if (!blueprint) return <Card><h1 className="text-3xl font-semibold">No blueprint yet</h1><p className="mt-3 text-white/60">Complete onboarding to generate your AI-native company blueprint.</p></Card>;
  return <div><h1 className="text-4xl font-semibold tracking-tight">Company Blueprint</h1><p className="mt-3 text-white/60">The generated operating model for your AI-native company.</p><div className="mt-8 grid gap-6 lg:grid-cols-2"><Card><h2 className="text-2xl font-semibold">{blueprint.companyName}</h2><p className="mt-4 text-white/60">{blueprint.valueProposition}</p><div className="mt-6 space-y-3 text-sm text-white/65"><p><b className="text-white">Target customer:</b> {blueprint.targetCustomer}</p><p><b className="text-white">Revenue model:</b> {blueprint.revenueModel}</p><p><b className="text-white">Operating model:</b> {blueprint.operatingModel}</p></div></Card><Card><h2 className="text-xl font-semibold">Core KPIs</h2><ul className="mt-4 space-y-2 text-white/65">{blueprint.coreKpis.map((kpi) => <li key={kpi}>• {kpi}</li>)}</ul><h2 className="mt-8 text-xl font-semibold">Launch checklist</h2><ul className="mt-4 space-y-2 text-white/65">{blueprint.launchChecklist.map((item) => <li key={item}>• {item}</li>)}</ul></Card></div></div>;
}
