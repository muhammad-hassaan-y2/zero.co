'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Sparkles } from 'lucide-react';

type Agent = { id: string; name: string };
type Lead = { id: string; companyName: string; contactName: string; email: string; score: number; status: string };
type Email = { id: string; leadId?: string | null; subject: string; body: string; status: string; failureReason?: string | null };
type Query = { id: string; customerName: string; customerEmail: string; companyName?: string | null; subject: string; message: string; intent: string; priority: string; status: string; source: string };
type Reply = { id: string; queryId?: string | null; subject: string; body: string; status: string; failureReason?: string | null };

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error || fallback;
}

export function AddLeadForm({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/sales/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: fd.get('companyName'),
        contactName: fd.get('contactName'),
        email: fd.get('email'),
        website: fd.get('website'),
        segment: fd.get('segment'),
        painPoint: fd.get('painPoint'),
        notes: fd.get('notes'),
        ownerAgentId: fd.get('ownerAgentId') || null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Lead could not be created.'));
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5">
      <h2 className="text-xl font-semibold">Add sales lead</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input name="companyName" required placeholder="Company name" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="contactName" required placeholder="Contact name" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="email" required type="email" placeholder="Contact email" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="website" placeholder="Website" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="segment" placeholder="Segment / ICP fit" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <select name="ownerAgentId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="">Assign automatically</option>
          {agents.map((agent) => <option key={agent.id} className="bg-black" value={agent.id}>{agent.name}</option>)}
        </select>
        <textarea name="painPoint" required placeholder="Lead pain point or reason to contact" className="min-h-24 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
        <textarea name="notes" placeholder="Notes, context, or personalization facts" className="min-h-20 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Adding...' : 'Add lead'}</button>
    </form>
  );
}

export function SalesEmailActions({ lead, email }: { lead: Lead; email?: Email }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setLoading('draft');
    setError(null);
    const response = await fetch('/api/sales/emails/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id }),
    });
    setLoading(null);
    if (!response.ok) {
      setError(await readError(response, 'Email draft failed.'));
      return;
    }
    router.refresh();
  }

  async function send() {
    if (!email) return;
    setLoading('send');
    setError(null);
    const response = await fetch(`/api/sales/emails/${email.id}/send`, { method: 'POST' });
    setLoading(null);
    if (!response.ok) {
      setError(await readError(response, 'Email send failed.'));
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={draft} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 disabled:opacity-60">
          <Sparkles className="h-4 w-4" />
          {loading === 'draft' ? 'Drafting...' : email ? 'Regenerate draft' : 'Draft with Bedrock'}
        </button>
        {email && email.status !== 'sent' && (
          <button onClick={send} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60">
            <Send className="h-4 w-4" />
            {loading === 'send' ? 'Sending...' : 'Approve and send via SES'}
          </button>
        )}
      </div>
      {error && <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
    </div>
  );
}

export function AddCustomerQueryForm({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/crm/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: fd.get('customerName'),
        customerEmail: fd.get('customerEmail'),
        companyName: fd.get('companyName'),
        subject: fd.get('subject'),
        message: fd.get('message'),
        source: fd.get('source'),
        ownerAgentId: fd.get('ownerAgentId') || null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Customer query could not be added.'));
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5">
      <h2 className="text-xl font-semibold">Capture customer query</h2>
      <p className="mt-2 text-sm text-white/50">Use this for manual entry now. SES/Gmail inbound can post into the same query API later.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input name="customerName" required placeholder="Customer name" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="customerEmail" required type="email" placeholder="Customer email" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="companyName" placeholder="Company / account" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <select name="source" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option className="bg-black" value="manual">Manual</option>
          <option className="bg-black" value="email">Email</option>
          <option className="bg-black" value="form">Form</option>
          <option className="bg-black" value="api">API</option>
        </select>
        <select name="ownerAgentId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2">
          <option value="">Assign automatically</option>
          {agents.map((agent) => <option key={agent.id} className="bg-black" value={agent.id}>{agent.name}</option>)}
        </select>
        <input name="subject" required placeholder="Query subject" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
        <textarea name="message" required placeholder="Customer message" className="min-h-28 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Adding...' : 'Add query'}</button>
    </form>
  );
}

export function CustomerReplyActions({ query, reply }: { query: Query; reply?: Reply }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    setLoading('draft');
    setError(null);
    const response = await fetch('/api/crm/replies/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queryId: query.id }),
    });
    setLoading(null);
    if (!response.ok) {
      setError(await readError(response, 'Reply draft failed.'));
      return;
    }
    router.refresh();
  }

  async function send() {
    if (!reply) return;
    setLoading('send');
    setError(null);
    const response = await fetch(`/api/crm/replies/${reply.id}/send`, { method: 'POST' });
    setLoading(null);
    if (!response.ok) {
      setError(await readError(response, 'Reply send failed.'));
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={draft} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 disabled:opacity-60">
          <Sparkles className="h-4 w-4" />
          {loading === 'draft' ? 'Drafting...' : reply ? 'Regenerate reply' : 'Draft reply'}
        </button>
        {reply && reply.status !== 'sent' && (
          <button onClick={send} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-60">
            <Send className="h-4 w-4" />
            {loading === 'send' ? 'Sending...' : 'Approve and reply via SES'}
          </button>
        )}
      </div>
      {error && <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
    </div>
  );
}
