'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DecisionActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(kind: 'approve' | 'reject') {
    setLoading(kind);
    await fetch(`/api/decisions/${id}/${kind}`, { method: 'POST' });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="mt-4 flex gap-2">
      <button type="button" onClick={() => run('approve')} disabled={!!loading} className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60">{loading === 'approve' ? 'Approving...' : 'Approve'}</button>
      <button type="button" onClick={() => run('reject')} disabled={!!loading} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 disabled:opacity-60">{loading === 'reject' ? 'Rejecting...' : 'Reject'}</button>
    </div>
  );
}

export function AgentActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  async function run(kind: 'throttle' | 'pause') {
    setLoading(kind);
    await fetch(`/api/agents/${id}/${kind}`, { method: 'POST' });
    setLoading(null);
    router.refresh();
  }
  return (
    <div className="mt-4 flex gap-2">
      <button onClick={() => run('throttle')} disabled={!!loading} className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">Throttle</button>
      <button onClick={() => run('pause')} disabled={!!loading} className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">Pause</button>
    </div>
  );
}

export function SimulateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function simulate() {
    setLoading(true);
    await fetch('/api/simulation', { method: 'POST' });
    setLoading(false);
    router.refresh();
  }
  return <button onClick={simulate} disabled={loading} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Simulating...' : 'Simulate event'}</button>;
}

export function BoardReportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true);
    await fetch('/api/board-report', { method: 'POST' });
    setLoading(false);
    router.refresh();
  }
  return <button onClick={generate} disabled={loading} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Generating...' : 'Generate board report'}</button>;
}
