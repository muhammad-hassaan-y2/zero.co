import { SimulateButton } from '@/components/action-buttons';
import { Badge, Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function SimulationPage() {
  const data = await getWorkspaceData();
  return <div><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-4xl font-semibold tracking-tight">Company Simulation</h1><p className="mt-3 text-white/60">Run operating events to test your AI-native company before connecting real tools.</p></div><SimulateButton /></div><div className="mt-8 grid gap-5 lg:grid-cols-2">{data.events.map((event) => { const agent = data.agents.find((a) => a.id === event.agentId); return <Card key={event.id}><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{event.title}</h2><p className="mt-1 text-sm text-white/45">{agent?.name || 'System event'}</p></div><Badge value={event.status} /></div><p className="mt-4 text-white/60">{event.description}</p><div className="mt-4 flex gap-2"><Badge value={event.severity} /><Badge value={event.eventType} /></div></Card>; })}</div></div>;
}
