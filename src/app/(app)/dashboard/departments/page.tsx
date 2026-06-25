import { AddDepartmentForm } from '@/components/builder-forms';
import { Badge, Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function DepartmentsPage() {
  const data = await getWorkspaceData();
  return <div><h1 className="text-4xl font-semibold tracking-tight">Departments</h1><p className="mt-3 text-white/60">Company functions that own digital FTEs, workflows, KPIs, budgets, and risk.</p><div className="mt-8"><AddDepartmentForm /></div><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.departments.map((dept) => <Card key={dept.id}><div className="flex items-start justify-between gap-4"><h2 className="text-xl font-semibold">{dept.name}</h2><Badge value={dept.riskLevel} /></div><p className="mt-4 text-white/60">{dept.purpose}</p><p className="mt-4 text-sm text-white/50">Budget: ${dept.budget}</p><h3 className="mt-5 text-sm font-medium text-white">KPIs</h3><ul className="mt-2 space-y-1 text-sm text-white/55">{dept.kpis.map((kpi) => <li key={kpi}>• {kpi}</li>)}</ul></Card>)}</div></div>;
}
