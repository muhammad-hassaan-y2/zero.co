import { AgentActions, BuildSalesAgentButton } from '@/components/action-buttons';
import { AddAgentForm } from '@/components/builder-forms';
import { Badge, Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function DigitalFtesPage() {
  const data = await getWorkspaceData();

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Digital FTEs</h1>
          <p className="mt-3 max-w-3xl text-white/60">
            Govern the AI workforce behind the company OS: architects, live voice operators, model routers, workflow designers, policy reviewers, and domain agents.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-white/40">Agents</p>
            <p className="mt-1 text-2xl font-semibold">{data.agents.length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-white/40">Paused</p>
            <p className="mt-1 text-2xl font-semibold">{data.agents.filter((agent) => agent.status === 'paused').length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="text-white/40">High risk</p>
            <p className="mt-1 text-2xl font-semibold">{data.agents.filter((agent) => ['high', 'critical'].includes(agent.riskLevel)).length}</p>
          </div>
        </div>
      </div>

      <Card className="mt-8 border-emerald-300/15 bg-emerald-400/[.06]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Need a stronger sales operator?</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">Generate a dedicated Sales Agent with complete pipeline, outreach, CRM, approval, and SOP coverage for this workspace.</p>
          </div>
          <BuildSalesAgentButton />
        </div>
      </Card>

      <div className="mt-8">
        <AddAgentForm departments={data.departments.map((department) => ({ id: department.id, name: department.name }))} />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.agents.map((agent) => {
          const dept = data.departments.find((department) => department.id === agent.departmentId);

          return (
            <Card key={agent.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{agent.name}</h2>
                  <p className="mt-1 text-sm text-white/50">{agent.role}</p>
                </div>
                <Badge value={agent.status} />
              </div>

              <p className="mt-4 text-sm leading-6 text-white/65">{agent.goal}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/65">
                <p>Dept: <span className="text-white">{dept?.name || 'Unassigned'}</span></p>
                <p>Risk: <span className="text-white capitalize">{agent.riskLevel}</span></p>
                <p>Autonomy: <span className="text-white">{agent.autonomyLevel.replaceAll('_', ' ')}</span></p>
                <p>Budget: <span className="text-white">${agent.dailyBudget}/day</span></p>
                <p>Success: <span className="text-white">{agent.successRate}%</span></p>
                <p>Cost: <span className="text-white">${agent.costToday}</span></p>
              </div>

              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Tools</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {agent.tools.map((tool) => (
                    <span key={tool} className="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-xs text-white/60">{tool}</span>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Current task</p>
                <p className="mt-2 text-sm text-white/65">{agent.currentTask}</p>
              </div>

              <AgentActions id={agent.id} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
