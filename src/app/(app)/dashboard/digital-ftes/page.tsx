import { AgentActions } from '@/components/action-buttons';
import { AddAgentForm } from '@/components/builder-forms';
import { Badge, Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function DigitalFtesPage() {
  const data = await getWorkspaceData();
  return <div><h1 className="text-4xl font-semibold tracking-tight">Digital FTEs</h1><p className="mt-3 text-white/60">Build, throttle, pause, and govern your AI workforce from database-backed records.</p><div className="mt-8"><AddAgentForm departments={data.departments.map((d) => ({ id: d.id, name: d.name }))} /></div><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.agents.map((agent) => { const dept = data.departments.find((d) => d.id === agent.departmentId); return <Card key={agent.id}><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{agent.name}</h2><p className="text-sm text-white/50">{agent.role}</p></div><Badge value={agent.status} /></div><p className="mt-4 text-sm text-white/60">{agent.goal}</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/65"><p>Dept: <span className="text-white">{dept?.name || '—'}</span></p><p>Risk: <span className="text-white">{agent.riskLevel}</span></p><p>Autonomy: <span className="text-white">{agent.autonomyLevel.replaceAll('_',' ')}</span></p><p>Budget: <span className="text-white">${agent.dailyBudget}/day</span></p><p>Success: <span className="text-white">{agent.successRate}%</span></p><p>Cost: <span className="text-white">${agent.costToday}</span></p></div><p className="mt-4 text-sm text-white/50">Current task: {agent.currentTask}</p><AgentActions id={agent.id} /></Card>; })}</div></div>;
}
