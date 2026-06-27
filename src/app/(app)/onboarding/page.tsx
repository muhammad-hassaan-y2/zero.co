'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const initial = {
  businessDescription: 'I run a customer support and refund operations agency for ecommerce stores.',
  customers: 'Shopify stores doing $50k+/month in revenue',
  problemSolved: 'Customer support tickets, refunds, and repetitive operations are slow and expensive.',
  customerOutcome: 'Reduce support workload by 70% while keeping risky refunds under human approval.',
  coreDepartments: 'Support, Refund Operations, Sales, QA, Finance, DevOps',
  existingHumanRoles: 'Founder, support reps, ops manager, sales rep',
  repetitiveWork: 'Answering common tickets, checking refund policy, qualifying leads, follow-up emails',
  highRiskWork: 'Refunds, deleting customer data, bulk emails, production deploys, legal/financial decisions',
  currentTools: 'Shopify, Gmail, Helpdesk, Stripe, Notion, Vercel',
  aiAutomationGoals: 'Create digital FTEs for support, refunds, QA, sales, finance, and DevOps operations.',
  actionsRequiringApproval: 'Refunds over $500, production deployments, bulk outreach, deleting customer data',
  blockedActions: 'Deleting customer data, issuing refunds over $2000, legal commitments',
  autoApprovedActions: 'Low-risk ticket drafts, invoice follow-up reminders, knowledge base updates',
  monthlyAiBudget: '500',
  riskTolerance: 'medium',
};

const formOneFields: [keyof typeof initial, string][] = [
  ['businessDescription', 'What company or operation are you building?'],
  ['customers', 'Who are your customers?'],
  ['problemSolved', 'What painful problem blocks that result today?'],
  ['customerOutcome', 'What measurable result do customers pay for?'],
  ['coreDepartments', 'What departments/functions exist or are needed?'],
  ['existingHumanRoles', 'What human roles exist today?'],
  ['currentTools', 'What tools does your team already use?'],
];

const formTwoFields: [keyof typeof initial, string][] = [
  ['repetitiveWork', 'What work is repetitive?'],
  ['highRiskWork', 'What work is high-risk?'],
  ['aiAutomationGoals', 'What results should digital FTEs produce or improve?'],
  ['actionsRequiringApproval', 'What actions always need human approval?'],
  ['blockedActions', 'What actions should be blocked?'],
  ['autoApprovedActions', 'What can be auto-approved?'],
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

const defaultSelectedFtes = fteOptions.filter((fte) => fte.recommended).map((fte) => fte.id);

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFtes, setSelectedFtes] = useState(defaultSelectedFtes);
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
    if (form.businessDescription.trim().length < 8 || form.customers.trim().length < 3) {
      setError('Add the company and customer context before selecting FTEs.');
      return;
    }

    setError(null);
    setStep(2);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
                onClick={() => setStep(item as 1 | 2)}
                className={`flex-1 rounded-xl px-4 py-3 text-sm transition ${step === item ? 'bg-white text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                Form {item}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-10 rounded-3xl border border-white/10 bg-white/[.05] p-6 backdrop-blur-xl">
          {step === 1 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {formOneFields.map(([key, label]) => (
                <label key={key} className={key === 'businessDescription' || key === 'customerOutcome' ? 'block md:col-span-2' : 'block'}>
                  <span className="text-sm text-white/70">{label}</span>
                  <textarea
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
                {formTwoFields.map(([key, label]) => (
                  <label key={key} className={key === 'aiAutomationGoals' ? 'block md:col-span-2' : 'block'}>
                    <span className="text-sm text-white/70">{label}</span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300/50"
                      value={form[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </label>
                ))}

                <label className="block">
                  <span className="text-sm text-white/70">Monthly AI budget</span>
                  <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" value={form.monthlyAiBudget} onChange={(e) => update('monthlyAiBudget', e.target.value)} />
                </label>

                <label className="block">
                  <span className="text-sm text-white/70">Risk tolerance</span>
                  <select className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-cyan-300/50" value={form.riskTolerance} onChange={(e) => update('riskTolerance', e.target.value)}>
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
                    onClick={() => setSelectedFtes(defaultSelectedFtes)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    Reset
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
                          {checked ? 'x' : ''}
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
