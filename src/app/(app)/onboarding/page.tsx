'use client';

import { FormEvent, useState } from 'react';
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

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof initial, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/onboarding/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-cyan-300">ZeroCo Onboarding</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Generate your AI-native operating system</h1>
        <p className="mt-3 max-w-2xl text-white/60">This is not a generic service generator. Bring the result your customer pays for. ZeroCo creates the digital FTEs, workflows, policies, metrics, and proof ledger around delivering it.</p>

        <form onSubmit={onSubmit} className="mt-10 grid gap-5 rounded-3xl border border-white/10 bg-white/[.05] p-6 backdrop-blur-xl md:grid-cols-2">
          {[
            ['businessDescription', 'What company or operation are you building?'],
            ['customers', 'Who are your customers?'],
            ['problemSolved', 'What painful problem blocks that result today?'],
            ['customerOutcome', 'What measurable result do customers pay for?'],
            ['coreDepartments', 'What departments/functions exist or are needed?'],
            ['existingHumanRoles', 'What human roles exist today?'],
            ['repetitiveWork', 'What work is repetitive?'],
            ['highRiskWork', 'What work is high-risk?'],
            ['currentTools', 'What tools does your team already use?'],
            ['aiAutomationGoals', 'What results should digital FTEs produce or improve?'],
            ['actionsRequiringApproval', 'What actions always need human approval?'],
            ['blockedActions', 'What actions should be blocked?'],
            ['autoApprovedActions', 'What can be auto-approved?'],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm text-white/70">{label}</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300/50"
                value={form[key as keyof typeof initial]}
                onChange={(e) => update(key as keyof typeof initial, e.target.value)}
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

          {error && <p className="md:col-span-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

          <button disabled={loading} className="md:col-span-2 rounded-2xl bg-white px-5 py-4 font-medium text-black transition hover:bg-white/90 disabled:opacity-60">
            {loading ? 'Forging company OS...' : 'Generate AI-native operating system'}
          </button>
        </form>
      </div>
    </main>
  );
}
