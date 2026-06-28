'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { FormEvent, useState } from 'react';

type Department = { id: string; name: string };

type Agent = { id: string; name: string };

type ProblemToFteDesign = {
  diagnosis: {
    classification: string;
    reasoning: string;
    objectiveDoneDefinition: string;
    readinessScore: number;
    missingInputs: string[];
    risks: string[];
  };
  awsArchitecture: {
    title: string;
    summary: string;
    services: { service: string; purpose: string; dataHandled: string; securityControl: string }[];
    eventFlow: string[];
    identityAndAccess: string[];
    dataStores: string[];
    deploymentTargets: string[];
    observability: string[];
    costControls: string[];
  };
  mode1Run: {
    runName: string;
    humanInputsNeeded: string[];
    steps: string[];
    testCases: { name: string; input: string; expectedOutput: string; passCriteria: string }[];
    evidenceToCollect: string[];
    approvalGate: string;
    successMetric: string;
    failurePath: string;
  };
  mode2Package: {
    department: { name: string; purpose: string; kpis: string[]; riskLevel: string; budget: string };
    agent: { name: string; role: string; goal: string; tools: string[]; autonomyLevel: string; dailyBudget: string; riskLevel: string; currentTask: string; successRate: number; costToday: string };
    workflows: { name: string; trigger: string; steps: string[]; toolsUsed: string[]; approvalPoints: string[]; successMetric: string; failurePath: string }[];
    policies: { name: string; description: string; condition: string; action: string; mode: string; riskLevel: string; enabled: boolean }[];
    sops: { workflowName: string; title: string; objective: string; steps: string[]; requiredTools: string[]; approvalRules: string[]; failureHandling: string; auditRequirements: string }[];
  };
  implementationPlan: {
    nextActions: string[];
    integrationChecklist: string[];
    downloadableArtifacts: string[];
    objectiveEvaluation: string[];
  };
};

type SoftwareFactorySpec = {
  product: { name: string; category: string; userProblem: string; targetUsers: string; successMetric: string };
  frontend: { pages: { name: string; purpose: string; keyComponents: string[]; dynamicData: string[] }[]; userFlows: string[]; designSystem: string[]; accessibility: string[] };
  backend: { apiRoutes: { method: string; path: string; purpose: string; auth: string; dataTouched: string[] }[]; dataModels: { name: string; fields: string[]; relationships: string[] }[]; jobsAndEvents: string[] };
  agents: { name: string; role: string; goal: string; tools: string[]; workflows: string[]; approvalGates: string[]; successMetric: string }[];
  automations: { name: string; trigger: string; steps: string[]; connectors: string[]; humanApproval: string; resultRecord: string }[];
  connectors: { name: string; purpose: string; authNeeded: string; readActions: string[]; writeActions: string[]; risk: string }[];
  awsArchitecture: { services: { service: string; purpose: string; securityControl: string }[]; eventFlow: string[]; observability: string[]; deployment: string[] };
  implementationPlan: { mvpMilestones: string[]; testPlan: string[]; envVars: string[]; downloadableArtifacts: string[]; limitationsUntilConnected: string[] };
  objectiveEvaluation: string[];
};

function splitList(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error || fallback;
}

export function ProblemToFteBuilder() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [design, setDesign] = useState<ProblemToFteDesign | null>(null);
  const [promoted, setPromoted] = useState<{ agent?: { name: string }; workflows?: unknown[]; policies?: unknown[]; sops?: unknown[] } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPromoted(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/problem-to-fte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'diagnose',
        problem: fd.get('problem'),
        currentProcess: fd.get('currentProcess'),
        desiredOutcome: fd.get('desiredOutcome'),
        availableTools: splitList(String(fd.get('availableTools') || '')),
        approvalLimits: fd.get('approvalLimits'),
        riskTolerance: fd.get('riskTolerance'),
      }),
    });

    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Problem-to-FTE design failed.'));
      return;
    }
    const payload = await response.json();
    setDesign(payload.design);
  }

  async function promote() {
    if (!design) return;
    setPromoting(true);
    setError(null);
    const response = await fetch('/api/problem-to-fte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'promote', design }),
    });
    setPromoting(false);
    if (!response.ok) {
      setError(await readError(response, 'Promotion failed.'));
      return;
    }
    const payload = await response.json();
    setPromoted(payload);
    router.refresh();
  }

  function downloadDesign() {
    if (!design) return;
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${design.mode2Package.agent.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-problem-to-fte.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border border-cyan-300/15 bg-cyan-400/[.06] p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-xl font-semibold">Problem-to-FTE core engine</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Diagnose a real task, design the AWS runtime, create a supervised Mode 1 test, then promote the proven work into a Digital FTE package.
          </p>
        </div>
        <span className="rounded-md border border-cyan-300/20 bg-black/25 px-3 py-1 text-xs text-cyan-100">Mode 1 to Mode 2</span>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2">
        <textarea name="problem" required placeholder="Business problem to solve" className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
        <textarea name="currentProcess" required placeholder="Current manual process, tools, handoffs, and pain points" className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <textarea name="desiredOutcome" required placeholder="Objective finished result and metric that proves success" className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <textarea name="availableTools" placeholder="Available tools or AWS services, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <textarea name="approvalLimits" required placeholder="Actions requiring human approval" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <Select name="riskTolerance" options={[["low","Low risk"],["medium","Medium risk"],["high","High risk"],["critical","Critical risk"]]} />
        <div className="md:col-span-2">
          <button disabled={loading} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Designing with Bedrock...' : 'Generate lifecycle design'}</button>
        </div>
      </form>

      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}

      {design && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Diagnosis">
              <p className="text-sm text-cyan-100">{design.diagnosis.classification.replaceAll('_', ' ')}</p>
              <p className="mt-2 text-3xl font-semibold">{design.diagnosis.readinessScore}/100</p>
              <p className="mt-3 text-sm text-white/55">{design.diagnosis.reasoning}</p>
            </Panel>
            <Panel title="Done Definition">
              <p className="text-sm text-white/65">{design.diagnosis.objectiveDoneDefinition}</p>
              <MiniList title="Risks" items={design.diagnosis.risks} />
            </Panel>
            <Panel title="Promoted FTE">
              <p className="text-sm font-medium text-white">{design.mode2Package.agent.name}</p>
              <p className="mt-2 text-sm text-white/55">{design.mode2Package.agent.goal}</p>
              <p className="mt-3 text-xs text-white/40">Autonomy: {design.mode2Package.agent.autonomyLevel.replaceAll('_', ' ')}</p>
            </Panel>
          </div>

          <Panel title={design.awsArchitecture.title}>
            <p className="text-sm text-white/60">{design.awsArchitecture.summary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {design.awsArchitecture.services.map((service) => (
                <div key={`${service.service}-${service.purpose}`} className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <p className="text-sm font-medium text-white">{service.service}</p>
                  <p className="mt-2 text-xs leading-5 text-white/55">{service.purpose}</p>
                  <p className="mt-2 text-xs text-cyan-100/70">{service.securityControl}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <MiniList title="Event flow" items={design.awsArchitecture.eventFlow} />
              <MiniList title="Identity and access" items={design.awsArchitecture.identityAndAccess} />
              <MiniList title="Observability" items={design.awsArchitecture.observability} />
              <MiniList title="Cost controls" items={design.awsArchitecture.costControls} />
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={`Mode 1 test: ${design.mode1Run.runName}`}>
              <MiniList title="Run steps" items={design.mode1Run.steps} />
              <MiniList title="Evidence to collect" items={design.mode1Run.evidenceToCollect} />
              <p className="mt-4 text-sm text-white/55">Approval gate: {design.mode1Run.approvalGate}</p>
            </Panel>
            <Panel title="Objective test cases">
              <div className="space-y-3">
                {design.mode1Run.testCases.map((test) => (
                  <div key={test.name} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    <p className="text-sm font-medium text-white">{test.name}</p>
                    <p className="mt-1 text-xs text-white/45">Input: {test.input}</p>
                    <p className="mt-1 text-xs text-white/55">Expected: {test.expectedOutput}</p>
                    <p className="mt-1 text-xs text-emerald-100/75">Pass: {test.passCriteria}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Mode 2 package to create">
            <div className="grid gap-4 lg:grid-cols-3">
              <MiniList title="Workflows" items={design.mode2Package.workflows.map((workflow) => workflow.name)} />
              <MiniList title="Policies" items={design.mode2Package.policies.map((policy) => policy.name)} />
              <MiniList title="SOPs" items={design.mode2Package.sops.map((sop) => sop.title)} />
            </div>
          </Panel>

          <Panel title="Implementation plan">
            <div className="grid gap-4 md:grid-cols-2">
              <MiniList title="Next actions" items={design.implementationPlan.nextActions} />
              <MiniList title="Integrations" items={design.implementationPlan.integrationChecklist} />
              <MiniList title="Downloadable artifacts" items={design.implementationPlan.downloadableArtifacts} />
              <MiniList title="Objective evaluation" items={design.implementationPlan.objectiveEvaluation} />
            </div>
          </Panel>

          <div className="flex flex-wrap gap-3">
            <button onClick={promote} disabled={promoting} className="rounded-xl bg-emerald-300 px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{promoting ? 'Promoting...' : 'Promote to Digital FTE'}</button>
            <button onClick={downloadDesign} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">Download lifecycle JSON</button>
          </div>

          {promoted && (
            <p className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
              Created {promoted.agent?.name || 'Digital FTE'} with {promoted.workflows?.length || 0} workflows, {promoted.policies?.length || 0} policies, and {promoted.sops?.length || 0} SOPs.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function SoftwareFactoryBuilder() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spec, setSpec] = useState<SoftwareFactorySpec | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/software-factory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: fd.get('request'),
        targetUsers: fd.get('targetUsers'),
        requiredCapabilities: splitList(String(fd.get('requiredCapabilities') || '')),
        preferredStack: splitList(String(fd.get('preferredStack') || '')),
        integrations: splitList(String(fd.get('integrations') || '')),
        riskControls: fd.get('riskControls'),
      }),
    });

    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Software factory spec failed.'));
      return;
    }

    const payload = await response.json();
    setSpec(payload.spec);
  }

  function downloadSpec() {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${spec.product.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-software-factory.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border border-emerald-300/15 bg-emerald-400/[.055] p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="text-xl font-semibold">Software + automation factory</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Generate a dynamic build spec for a frontend, backend, website, email automation, sales generator, finance agent, or custom AI workflow.
          </p>
        </div>
        <span className="rounded-md border border-emerald-300/20 bg-black/25 px-3 py-1 text-xs text-emerald-100">Spec + agents + connectors</span>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2">
        <textarea name="request" required placeholder="Describe the software, automation, website, agent, or backend to generate." className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
        <Input name="targetUsers" placeholder="Who will use this?" wide />
        <textarea name="requiredCapabilities" placeholder="Required capabilities, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <textarea name="preferredStack" placeholder="Preferred stack/tools, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <textarea name="integrations" placeholder="Connectors/integrations, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <textarea name="riskControls" required placeholder="Approval gates, blocked actions, compliance limits, and external write controls" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <div className="md:col-span-2">
          <button disabled={loading} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Generating spec...' : 'Generate software factory spec'}</button>
        </div>
      </form>

      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}

      {spec && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title={spec.product.name}>
              <p className="text-sm text-cyan-100">{spec.product.category.replaceAll('_', ' ')}</p>
              <p className="mt-2 text-sm text-white/60">{spec.product.userProblem}</p>
              <p className="mt-3 text-xs text-white/40">Success: {spec.product.successMetric}</p>
            </Panel>
            <Panel title="Frontend">
              <MiniList title="Pages" items={spec.frontend.pages.map((page) => page.name)} />
              <MiniList title="User flows" items={spec.frontend.userFlows} />
            </Panel>
            <Panel title="Backend">
              <MiniList title="API routes" items={spec.backend.apiRoutes.map((route) => `${route.method} ${route.path}`)} />
              <MiniList title="Data models" items={spec.backend.dataModels.map((model) => model.name)} />
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Agents and automations">
              <MiniList title="Agents" items={spec.agents.map((agent) => `${agent.name}: ${agent.goal}`)} />
              <MiniList title="Automations" items={spec.automations.map((automation) => `${automation.name}: ${automation.trigger}`)} />
            </Panel>
            <Panel title="Connectors and AWS">
              <MiniList title="Connectors" items={spec.connectors.map((connector) => `${connector.name} (${connector.risk})`)} />
              <MiniList title="AWS services" items={spec.awsArchitecture.services.map((service) => service.service)} />
            </Panel>
          </div>

          <Panel title="Implementation and objective evaluation">
            <div className="grid gap-4 md:grid-cols-2">
              <MiniList title="MVP milestones" items={spec.implementationPlan.mvpMilestones} />
              <MiniList title="Test plan" items={spec.implementationPlan.testPlan} />
              <MiniList title="Env vars" items={spec.implementationPlan.envVars} />
              <MiniList title="Limitations until connected" items={spec.implementationPlan.limitationsUntilConnected} />
            </div>
          </Panel>

          <button onClick={downloadSpec} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">Download software factory JSON</button>
        </div>
      )}
    </section>
  );
}

export function AddAgentForm({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: fd.get('name'), role: fd.get('role'), goal: fd.get('goal'), departmentId: fd.get('departmentId') || null,
      tools: splitList(String(fd.get('tools') || '')), autonomyLevel: fd.get('autonomyLevel'), dailyBudget: Number(fd.get('dailyBudget') || 10), riskLevel: fd.get('riskLevel'),
    }) });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Digital FTE could not be created.'));
      return;
    }
    router.refresh(); form.reset();
  }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add digital FTE</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="Growth Agent" /><Input name="role" placeholder="Pipeline operator" /><Input name="goal" placeholder="Qualify leads and prepare safe outreach" wide /><Select name="departmentId" options={[['', 'No department'], ...departments.map((d) => [d.id, d.name])]} /><Select name="autonomyLevel" options={[["observe","Observe"],["suggest","Suggest"],["approval_required","Approval required"],["auto_act","Auto act"]]} /><Select name="riskLevel" options={[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} /><Input name="dailyBudget" placeholder="10" type="number" /><textarea name="tools" placeholder="Tools, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" /></div>{error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}<button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading ? 'Adding...' : 'Add FTE'}</button></form>;
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
  const router = useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); setError(null); const form=e.currentTarget; const fd=new FormData(form); const response=await fetch('/api/departments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),purpose:fd.get('purpose'),kpis:splitList(String(fd.get('kpis')||'')),riskLevel:fd.get('riskLevel'),budget:Number(fd.get('budget')||0)})}); setLoading(false); if(!response.ok){setError(await readError(response,'Department could not be created.')); return;} router.refresh(); form.reset(); }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add department</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="Customer Success" /><Input name="budget" placeholder="500" type="number" /><Input name="purpose" placeholder="Own customer outcomes and escalations" wide /><Select name="riskLevel" options={[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} /><textarea name="kpis" placeholder="KPIs, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" /></div>{error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}<button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading?'Adding...':'Add department'}</button></form>;
}

export function AddPolicyForm() {
  const router = useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); setError(null); const form=e.currentTarget; const fd=new FormData(form); const response=await fetch('/api/policies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),description:fd.get('description'),condition:fd.get('condition'),action:fd.get('action'),mode:fd.get('mode'),riskLevel:fd.get('riskLevel'),enabled:true})}); setLoading(false); if(!response.ok){setError(await readError(response,'Policy could not be created.')); return;} router.refresh(); form.reset(); }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add governance policy</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="High confidence auto-reply" /><Input name="condition" placeholder="confidence >= 92 AND risk == low" /><Input name="description" placeholder="Allow safe high-confidence support replies" wide /><Input name="action" placeholder="Auto-approve response" /><Select name="mode" options={[["auto_approve","Auto approve"],["require_approval","Require approval"],["block","Block"],["throttle","Throttle"],["pause","Pause"],["escalate","Escalate"]]} /><Select name="riskLevel" options={[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]} /></div>{error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}<button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading?'Adding...':'Add policy'}</button></form>;
}

export function AddWorkflowForm({ agents }: { agents: Agent[] }) {
  const router = useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState<string | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); setError(null); const form=e.currentTarget; const fd=new FormData(form); const response=await fetch('/api/workflows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),trigger:fd.get('trigger'),ownerAgentId:fd.get('ownerAgentId')||null,steps:splitList(String(fd.get('steps')||'')),toolsUsed:splitList(String(fd.get('toolsUsed')||'')),approvalPoints:splitList(String(fd.get('approvalPoints')||'')),successMetric:fd.get('successMetric'),failurePath:fd.get('failurePath')})}); setLoading(false); if(!response.ok){setError(await readError(response,'Workflow could not be created.')); return;} router.refresh(); form.reset(); }
  return <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5"><h3 className="font-semibold">Add workflow</h3><div className="mt-4 grid gap-3 md:grid-cols-2"><Input name="name" placeholder="Customer escalation workflow" /><Input name="trigger" placeholder="Ticket sentiment is angry or urgent" /><Select name="ownerAgentId" options={[['','No owner'],...agents.map((a)=>[a.id,a.name])]} /><Input name="successMetric" placeholder="Escalation handled within SLA" /><Input name="failurePath" placeholder="Escalate to human operator" wide /><textarea name="steps" placeholder="Steps, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" /><textarea name="toolsUsed" placeholder="Tools, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" /><textarea name="approvalPoints" placeholder="Approval points, one per line" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" /></div>{error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}<button disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">{loading?'Adding...':'Add workflow'}</button></form>;
}

function Input({ name, placeholder, type = 'text', wide = false }: { name: string; placeholder: string; type?: string; wide?: boolean }) { return <input name={name} type={type} placeholder={placeholder} required className={`rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none ${wide ? 'md:col-span-2' : ''}`} />; }
function Select({ name, options }: { name: string; options: string[][] }) { return <select name={name} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">{options.map(([value,label])=><option className="bg-black" key={value} value={value}>{label}</option>)}</select>; }
function Panel({ title, children }: { title: string; children: ReactNode }) { return <div className="rounded-lg border border-white/10 bg-white/[.035] p-4"><h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/45">{title}</h3><div className="mt-3">{children}</div></div>; }
function MiniList({ title, items }: { title: string; items: string[] }) { return <div className="mt-4"><p className="text-sm font-medium text-white/80">{title}</p><ul className="mt-2 space-y-1 text-sm text-white/55">{items.length ? items.map((item) => <li key={item}>- {item}</li>) : <li>- None returned</li>}</ul></div>; }
