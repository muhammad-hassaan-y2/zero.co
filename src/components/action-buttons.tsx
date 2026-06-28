'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function errorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error || fallback;
}

export function DecisionActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'approve' | 'reject') {
    setLoading(kind);
    setError(null);
    const response = await fetch(`/api/decisions/${id}/${kind}`, { method: 'POST' });
    setLoading(null);
    if (!response.ok) {
      setError(await errorMessage(response, `Unable to ${kind} decision.`));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => run('approve')} disabled={!!loading} className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60">{loading === 'approve' ? 'Approving...' : 'Approve'}</button>
        <button type="button" onClick={() => run('reject')} disabled={!!loading} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 disabled:opacity-60">{loading === 'reject' ? 'Rejecting...' : 'Reject'}</button>
      </div>
      {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </div>
  );
}

export function AgentActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function run(kind: 'throttle' | 'pause') {
    setLoading(kind);
    setError(null);
    const response = await fetch(`/api/agents/${id}/${kind}`, { method: 'POST' });
    setLoading(null);
    if (!response.ok) {
      setError(await errorMessage(response, `Unable to ${kind} agent.`));
      return;
    }
    router.refresh();
  }
  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button onClick={() => run('throttle')} disabled={!!loading} className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">Throttle</button>
        <button onClick={() => run('pause')} disabled={!!loading} className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">Pause</button>
      </div>
      {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </div>
  );
}

export function SimulateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function simulate() {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/simulation', { method: 'POST' });
    setLoading(false);
    if (!response.ok) {
      setError(await errorMessage(response, 'Simulation failed.'));
      return;
    }
    router.refresh();
  }
  return <div><button onClick={simulate} disabled={loading} className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 disabled:opacity-60">{loading ? 'Generating...' : 'Generate runtime event'}</button>{error && <p className="mt-2 text-sm text-red-200">{error}</p>}</div>;
}

export function BoardReportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function generate() {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/board-report', { method: 'POST' });
    setLoading(false);
    if (!response.ok) {
      setError(await errorMessage(response, 'Board report generation failed.'));
      return;
    }
    router.refresh();
  }
  return <div><button onClick={generate} disabled={loading} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Generating...' : 'Generate report'}</button>{error && <p className="mt-2 text-sm text-red-200">{error}</p>}</div>;
}

export function RunWorkflowButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/workflows/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await errorMessage(response, 'Workflow run failed.'));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button onClick={run} disabled={loading} className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 disabled:opacity-60">
        {loading ? 'Running...' : 'Run for result'}
      </button>
      {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
    </div>
  );
}

export function BuildSalesAgentButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    setLoading(true);
    setError(null);
    const response = await fetch('/api/sales-agent', { method: 'POST' });
    setLoading(false);
    if (!response.ok) {
      setError(await errorMessage(response, 'Sales Agent could not be generated.'));
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button onClick={build} disabled={loading} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">
        {loading ? 'Building sales engine...' : 'Build Sales Agent'}
      </button>
      {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
    </div>
  );
}
