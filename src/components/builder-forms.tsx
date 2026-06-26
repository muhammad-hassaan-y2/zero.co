'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type Department = { id: string; name: string };

type Agent = { id: string; name: string };

function splitList(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

export function AddAgentForm({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: fd.get('name'), role: fd.get('role'), goal: fd.get('goal'), departmentId: fd.get('departmentId') || null,
      tools: splitList(String(fd.get('tools') || '')), autonomyLevel: fd.get('autonomyLevel'), dailyBudget: Number(fd.get('dailyBudget') || 10), riskLevel: fd.get('riskLevel'),
    }) });
    setLoading(false); router.refresh(); e.currentTarget.reset();
  }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add digital FTE</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="Growth Agent" /><Input name="role" placeholder="Pipeline operator" /><Input name="goal" placeholder="Qualify leads and prepare safe outreach" wide /><Select name="departmentId" options={[['', 'No department'], ...departments.map((d) => [d.id, d.name])]} /><Select name="autonomyLevel" options={[["observe","Observe"],["suggest","Suggest"],["approval_required","Approval required"],["auto_act","Auto act"]]} /><Select name="riskLevel" options={[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} /><Input name="dailyBudget" placeholder="10" type="number" /><textarea name="tools" placeholder="Tools, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" /></div><button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading ? 'Adding...' : 'Add FTE'}</button></form>;
}

export function AddAutomationForm({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: fd.get('task'),
        outcome: fd.get('outcome'),
        trigger: fd.get('trigger'),
        departmentId: fd.get('departmentId') || null,
        tools: splitList(String(fd.get('tools') || '')),
        approvalRule: fd.get('approvalRule'),
        autonomyLevel: fd.get('autonomyLevel'),
        riskLevel: fd.get('riskLevel'),
        dailyBudget: Number(fd.get('dailyBudget') || 15),
      }),
    });

    setLoading(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error || 'Automation could not be created.');
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-cyan-300/15 bg-cyan-400/[.06] p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h3 className="text-lg font-semibold">Automate a task</h3>
          <p className="mt-1 max-w-2xl text-sm text-white/55">Describe the task once. ZeroCo creates the agent, workflow, policy, SOP, and audit record together.</p>
        </div>
        <span className="rounded-md border border-cyan-300/20 bg-black/25 px-3 py-1 text-xs text-cyan-100">Agent + workflow + guardrails</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Input name="task" placeholder="Monitor failed Stripe payments and recover revenue" wide />
        <Input name="outcome" placeholder="Recover 15% more failed payments within 7 days" />
        <Input name="trigger" placeholder="Stripe payment_failed event or daily failed invoice report" />
        <Select name="departmentId" options={[['', 'No department'], ...departments.map((d) => [d.id, d.name])]} />
        <Select name="autonomyLevel" options={[["observe","Observe"],["suggest","Suggest"],["approval_required","Approval required"],["auto_act","Auto act"]]} />
        <Select name="riskLevel" options={[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} />
        <Input name="dailyBudget" placeholder="15" type="number" />
        <Input name="approvalRule" placeholder="Require approval before customer refund, discount, or account change" wide />
        <textarea name="tools" placeholder="Tools to connect, one per line&#10;Stripe&#10;Slack&#10;HubSpot&#10;Gmail" className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Creating automation...' : 'Create automation'}</button>
    </form>
  );
}

export function AddDepartmentForm() {
  const router = useRouter(); const [loading,setLoading]=useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); const fd=new FormData(e.currentTarget); await fetch('/api/departments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),purpose:fd.get('purpose'),kpis:splitList(String(fd.get('kpis')||'')),riskLevel:fd.get('riskLevel'),budget:Number(fd.get('budget')||0)})}); setLoading(false); router.refresh(); e.currentTarget.reset(); }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add department</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="Customer Success" /><Input name="budget" placeholder="500" type="number" /><Input name="purpose" placeholder="Own customer outcomes and escalations" wide /><Select name="riskLevel" options={[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} /><textarea name="kpis" placeholder="KPIs, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" /></div><button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading?'Adding...':'Add department'}</button></form>;
}

export function AddPolicyForm() {
  const router = useRouter(); const [loading,setLoading]=useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); const fd=new FormData(e.currentTarget); await fetch('/api/policies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),description:fd.get('description'),condition:fd.get('condition'),action:fd.get('action'),mode:fd.get('mode'),riskLevel:fd.get('riskLevel'),enabled:true})}); setLoading(false); router.refresh(); e.currentTarget.reset(); }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add governance policy</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="High confidence auto-reply" /><Input name="condition" placeholder="confidence >= 92 AND risk == low" /><Input name="description" placeholder="Allow safe high-confidence support replies" wide /><Input name="action" placeholder="Auto-approve response" /><Select name="mode" options={[["auto_approve","Auto approve"],["require_approval","Require approval"],["block","Block"],["throttle","Throttle"],["pause","Pause"],["escalate","Escalate"]]} /><Select name="riskLevel" options={[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} /></div><button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading?'Adding...':'Add policy'}</button></form>;
}

export function AddWorkflowForm({ agents }: { agents: Agent[] }) {
  const router = useRouter(); const [loading,setLoading]=useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); const fd=new FormData(e.currentTarget); await fetch('/api/workflows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),trigger:fd.get('trigger'),ownerAgentId:fd.get('ownerAgentId')||null,steps:splitList(String(fd.get('steps')||'')),toolsUsed:splitList(String(fd.get('toolsUsed')||'')),approvalPoints:splitList(String(fd.get('approvalPoints')||'')),successMetric:fd.get('successMetric'),failurePath:fd.get('failurePath')})}); setLoading(false); router.refresh(); e.currentTarget.reset(); }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add workflow</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="Customer escalation workflow" /><Input name="trigger" placeholder="Ticket sentiment is angry or urgent" /><Select name="ownerAgentId" options={[['','No owner'],...agents.map((a)=>[a.id,a.name])]} /><Input name="successMetric" placeholder="Escalation handled within SLA" /><Input name="failurePath" placeholder="Escalate to human operator" wide /><textarea name="steps" placeholder="Steps, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" /><textarea name="toolsUsed" placeholder="Tools, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" /><textarea name="approvalPoints" placeholder="Approval points, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" /></div><button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading?'Adding...':'Add workflow'}</button></form>;
}

function Input({ name, placeholder, type = 'text', wide = false }: { name: string; placeholder: string; type?: string; wide?: boolean }) { return <input name={name} type={type} placeholder={placeholder} required className={`rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none ${wide ? 'md:col-span-2' : ''}`} />; }
function Select({ name, options }: { name: string; options: string[][] }) { return <select name={name} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">{options.map(([value,label])=><option className="bg-black" key={value} value={value}>{label}</option>)}</select>; }
