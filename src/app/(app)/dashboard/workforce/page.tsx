import Link from 'next/link';
import { AgentActions, BuildSalesAgentButton } from '@/components/action-buttons';
import { Badge, Card, Metric } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function WorkforcePage() {
  const data = await getWorkspaceData();
  const paused = data.agents.filter((agent) => agent.status === 'paused').length;
  const highRisk = data.agents.filter((agent) => ['high', 'critical'].includes(agent.riskLevel)).length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Workforce</h1>
          <p className="mt-3 max-w-3xl text-white/60">One operating view for departments, Digital FTEs, ownership, budgets, risk, and agent controls.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/digital-ftes" className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">Manage FTEs</Link>
          <Link href="/dashboard/departments" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70">Manage departments</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Digital FTEs" value={data.agents.length} />
        <Metric label="Departments" value={data.departments.length} />
        <Metric label="Paused" value={paused} />
        <Metric label="High-risk agents" value={highRisk} />
      </div>

      <Card className="mt-8 border-emerald-300/15 bg-emerald-400/[.06]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Revenue workforce</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">Create a sales operator with pipeline, outreach, CRM hygiene, governance policies, SOPs, and workflows.</p>
          </div>
          <BuildSalesAgentButton />
        </div>
      </Card>

      <div className="mt-8 grid gap-6 xl:grid-cols-[.75fr_1.25fr]">
        <Card>
          <h2 className="text-xl font-semibold">Departments</h2>
          <div className="mt-5 space-y-3">
            {data.departments.map((department) => (
              <div key={department.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{department.name}</h3>
                  <Badge value={department.riskLevel} />
                </div>
                <p className="mt-2 text-sm leading-6 text-white/55">{department.purpose}</p>
                <p className="mt-2 text-xs text-white/40">Budget: ${department.budget}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Digital FTEs</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {data.agents.map((agent) => {
              const department = data.departments.find((item) => item.id === agent.departmentId);
              return (
                <div key={agent.id} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{agent.name}</h3>
                      <p className="mt-1 text-sm text-white/45">{agent.role}</p>
                    </div>
                    <Badge value={agent.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">{agent.goal}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/55">
                    <p>Dept: <span className="text-white">{department?.name || 'Unassigned'}</span></p>
                    <p>Risk: <span className="text-white">{agent.riskLevel}</span></p>
                    <p>Autonomy: <span className="text-white">{agent.autonomyLevel.replaceAll('_', ' ')}</span></p>
                    <p>Daily budget: <span className="text-white">${agent.dailyBudget}</span></p>
                  </div>
                  <AgentActions id={agent.id} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
