import { Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function SopsPage() {
  const data = await getWorkspaceData();
  return <div><h1 className="text-4xl font-semibold tracking-tight">SOPs</h1><p className="mt-3 text-white/60">Operational documents generated from workflows and stored as part of the company OS.</p><div className="mt-8 grid gap-5 lg:grid-cols-2">{data.sops.map((sop) => <Card key={sop.id}><h2 className="text-xl font-semibold">{sop.title}</h2><p className="mt-3 text-white/60">{sop.objective}</p><p className="mt-3 text-sm text-cyan-200">Owner: {sop.owner}</p><div className="mt-5 grid gap-5 md:grid-cols-2"><List title="Steps" items={sop.steps} /><List title="Required tools" items={sop.requiredTools} /><List title="Approval rules" items={sop.approvalRules} /><div><h3 className="font-medium">Failure handling</h3><p className="mt-2 text-sm text-white/55">{sop.failureHandling}</p><p className="mt-3 text-sm text-white/35">Audit: {sop.auditRequirements}</p></div></div></Card>)}</div></div>;
}
function List({ title, items }: { title: string; items: string[] }) { return <div><h3 className="font-medium">{title}</h3><ul className="mt-2 space-y-1 text-sm text-white/55">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>; }
