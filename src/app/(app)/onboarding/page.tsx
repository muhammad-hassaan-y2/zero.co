'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const initial = {
  businessDescription: '',
  customers: '',
  problemSolved: '',
  customerOutcome: '',
  coreDepartments: '',
  existingHumanRoles: '',
  repetitiveWork: '',
  highRiskWork: '',
  currentTools: '',
  aiAutomationGoals: '',
  actionsRequiringApproval: '',
  blockedActions: '',
  autoApprovedActions: '',
  monthlyAiBudget: '',
  riskTolerance: '',
};

const placeholders: Record<keyof typeof initial, string> = {
  businessDescription: 'Describe the company, product, service, or internal operation.',
  customers: 'Describe the customer segment, users, buyers, or internal team served.',
  problemSolved: 'Describe the painful operating bottleneck or business problem.',
  customerOutcome: 'Describe the measurable result customers or operators pay for.',
  coreDepartments: 'List needed business functions, separated by commas.',
  existingHumanRoles: 'List current human roles or owners.',
  repetitiveWork: 'List repeated tasks, one sentence or comma-separated.',
  highRiskWork: 'List risky actions that need control or approval.',
  currentTools: 'List current tools, systems, databases, or channels.',
  aiAutomationGoals: 'Describe the results Digital FTEs should produce or improve.',
  actionsRequiringApproval: 'List actions that must pause for human approval.',
  blockedActions: 'List actions the system should never perform.',
  autoApprovedActions: 'List safe low-risk actions that can run automatically.',
  monthlyAiBudget: 'Enter monthly AI operating budget.',
  riskTolerance: '',
};

const formOneFields: [keyof typeof initial, string, boolean][] = [
  ['businessDescription', 'What company or operation are you building?', true],
  ['customers', 'Who are your customers?', true],
  ['problemSolved', 'What painful problem blocks that result today?', true],
  ['customerOutcome', 'What measurable result do customers pay for?', true],
  ['coreDepartments', 'What departments/functions exist or are needed?', false],
  ['existingHumanRoles', 'What human roles exist today?', false],
  ['currentTools', 'What tools does your team already use?', false],
];

const formTwoFields: [keyof typeof initial, string, boolean][] = [
  ['repetitiveWork', 'What work is repetitive?', true],
  ['highRiskWork', 'What work is high-risk?', true],
  ['aiAutomationGoals', 'What results should digital FTEs produce or improve?', true],
  ['actionsRequiringApproval', 'What actions always need human approval?', true],
  ['blockedActions', 'What actions should be blocked?', false],
  ['autoApprovedActions', 'What can be auto-approved?', false],
];

const fteOptions = [
  { id: 'support', name: 'Support Agent', role: 'Customer support digital FTE', recommended: true },
  { id: 'refund', name: 'Refund Agent', role: 'Refund policy operator', recommended: true },
  { id: 'sales', name: 'Sales Agent', role: 'Pipeline and outreach operator' },
  { id: 'finance', name: 'Finance Agent', role: 'Billing and spend operator' },
  { id: 'devops', name: 'DevOps Agent', role: 'Production operations operator' },
  { id: 'research', name: 'Research Agent', role: 'Market research operator' },
  { id: 'agent_developer', name: 'Agent Developer Agent', role: 'Digital FTE designer and evaluator', recommended: true },
  { id: 'tool_connector', name: 'Tool Connector Agent', role: 'Integration planner and tool health operator', recommended: true },
  { id: 'result_qa', name: 'Result QA Agent', role: 'Outcome evaluator and quality gate', recommended: true },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFtes, setSelectedFtes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(() => selectedFtes.length, [selectedFtes]);

  function update(key: keyof typeof initial, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFte(id: string) {
    setSelectedFtes((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function continueToGovernance() {
    if (!form.businessDescription.trim() || !form.customers.trim() || !form.problemSolved.trim() || !form.customerOutcome.trim()) {
      setError('Complete the required business result fields before selecting Digital FTEs.');
      return;
    }

    setError(null);
    setStep(2);
  }

  function goToStep(nextStep: 1 | 2) {
    if (nextStep === 2) {
      continueToGovernance();
      return;
    }
    setError(null);
    setStep(1);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.repetitiveWork.trim() || !form.highRiskWork.trim() || !form.aiAutomationGoals.trim() || !form.actionsRequiringApproval.trim()) {
      setError('Complete the required work, risk, results, and approval fields before generation.');
      return;
    }
    if (!form.monthlyAiBudget.trim() || Number(form.monthlyAiBudget) < 0) {
      setError('Enter a valid monthly AI budget.');
      return;
    }
    if (!['low', 'medium', 'high', 'critical'].includes(form.riskTolerance)) {
      setError('Select a risk tolerance.');
      return;
    }
    if (selectedFtes.length === 0) {
      setError('Select at least one Digital FTE to generate.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch('/api/onboarding/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, selectedFtes }),
    });

    setLoading(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      return setError(payload.error || 'Unable to generate company OS');
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#05050a] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-cyan-300">ZeroCo Onboarding</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight">Generate your AI-native operating system</h1>
            <p className="mt-3 max-w-3xl text-white/60">Two focused forms: first define the business result, then select the digital FTEs and operating guardrails ZeroCo should generate.</p>
          </div>

          <div className="flex min-w-64 gap-2 rounded-2xl border border-white/10 bg-white/[.05] p-2">
            {[1, 2].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => goToStep(item as 1 | 2)}
                className={`flex-1 rounded-xl px-4 py-3 text-sm transition ${step === item ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                Form {item}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} autoComplete="off" className="mt-10 rounded-3xl border border-white/10 bg-white/[.05] p-6 backdrop-blur-xl">
          {step === 1 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {formOneFields.map(([key, label, required]) => (
                <label key={key} className={key === 'businessDescription' || key === 'customerOutcome' ? 'block md:col-span-2' : 'block'}>
                  <span className="text-sm text-white/70">{label}{required ? ' *' : ''}</span>
                  <textarea
                    name={key}
                    required={required}
                    placeholder={placeholders[key]}
                    className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300/50"
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
              <section className="grid gap-5 md:grid-cols-2">
                {formTwoFields.map(([key, label, required]) => (
                  <label key={key} className={key === 'aiAutomationGoals' ? 'block md:col-span-2' : 'block'}>
                    <span className="text-sm text-white/70">{label}{required ? ' *' : ''}</span>
                    <textarea
                      name={key}
                      required={required}
                      placeholder={placeholders[key]}
                      className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300/50"
                      value={form[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="text-sm text-white/70">Monthly AI budget *</span>
                  <input name="monthlyAiBudget" required type="number" min="0" placeholder={placeholders.monthlyAiBudget} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" value={form.monthlyAiBudget} onChange={(e) => update('monthlyAiBudget', e.target.value)} />
                </label>

                <label className="block">
                  <span className="text-sm text-white/70">Risk tolerance *</span>
                  <select name="riskTolerance" required className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" value={form.riskTolerance} onChange={(e) => update('riskTolerance', e.target.value)}>
                    <option value="">Select risk tolerance</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
              </section>

              <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-cyan-300">Digital FTE selection</p>
                    <h2 className="mt-1 text-xl font-semibold">{selectedCount} selected</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFtes([])}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  {fteOptions.map((fte) => {
                    const checked = selectedFtes.includes(fte.id);
                    return (
                      <button
                        key={fte.id}
                        type="button"
                        onClick={() => toggleFte(fte.id)}
                        className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${checked ? 'border-cyan-300/60 bg-cyan-300/10' : 'border-white/10 bg-white/[.03] hover:bg-white/[.07]'}`}
                      >
                        <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs ${checked ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-white/25'}`}>
                          {checked ? 'on' : ''}
                        </span>
                        <span>
                          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
                            {fte.name}
                            {fte.recommended && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-normal text-white/60">recommended</span>}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-white/55">{fte.role}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {error && <p className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          {loading && (
            <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
              <p className="font-medium">Generating from your submitted inputs</p>
              <p className="mt-1 text-cyan-100/70">Bedrock is designing the company OS, Digital FTEs, workflows, guardrails, and SOPs for this request.</p>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step === 2 ? (
              <button type="button" onClick={() => setStep(1)} className="rounded-2xl border border-white/10 px-5 py-4 font-medium text-white/75 transition hover:bg-white/10 hover:text-white">
                Back to form 1
              </button>
            ) : (
              <span />
            )}

            {step === 1 ? (
              <button type="button" onClick={continueToGovernance} className="rounded-2xl bg-white px-5 py-4 font-medium text-black transition hover:bg-white/90">
                Continue to FTE selection
              </button>
            ) : (
              <button disabled={loading || selectedCount === 0} className="rounded-2xl bg-white px-5 py-4 font-medium text-black transition hover:bg-white/90 disabled:opacity-60">
                {loading ? 'Forging company OS...' : 'Generate AI-native operating system'}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
