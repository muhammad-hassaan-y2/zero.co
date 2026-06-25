import { AddWorkflowForm } from '@/components/builder-forms';
import { Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function WorkflowsPage() {
  const data = await getWorkspaceData();
  return <div><h1 className="text-4xl font-semibold tracking-tight">Workflows</h1><p className="mt-3 text-white/60">Operating workflows that connect triggers, digital FTEs, tools, approval points, and failure paths.</p><div className="mt-8"><AddWorkflowForm agents={data.agents.map((a) => ({ id: a.id, name: a.name }))} /></div><div className="mt-8 grid gap-5 lg:grid-cols-2">{data.workflows.map((workflow) => { const owner = data.agents.find((a) => a.id === workflow.ownerAgentId); return <Card key={workflow.id}><h2 className="text-xl font-semibold">{workflow.name}</h2><p className="mt-2 text-sm text-cyan-200">Trigger: {workflow.trigger}</p><p className="mt-2 text-sm text-white/50">Owner: {owner?.name || 'Unassigned'}</p><div className="mt-5 grid gap-5 md:grid-cols-2"><List title="Steps" items={workflow.steps} /><List title="Tools" items={workflow.toolsUsed} /><List title="Approval points" items={workflow.approvalPoints} /><div><h3 className="font-medium">Success / failure</h3><p className="mt-2 text-sm text-white/55">{workflow.successMetric}</p><p className="mt-2 text-sm text-white/35">Fallback: {workflow.failurePath}</p></div></div></Card>; })}</div></div>;
}
function List({ title, items }: { title: string; items: string[] }) { return <div><h3 className="font-medium">{title}</h3><ul className="mt-2 space-y-1 text-sm text-white/55">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>; }
