'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Building2, CheckCircle2, ClipboardList, Download, Search, Send, Sparkles, UserPlus } from 'lucide-react';

type Agent = { id: string; name: string };
type Lead = { id: string; companyName: string; contactName: string; email: string; score: number; status: string };
type Email = { id: string; leadId?: string | null; subject: string; body: string; status: string; failureReason?: string | null };
type Query = { id: string; customerName: string; customerEmail: string; companyName?: string | null; subject: string; message: string; intent: string; priority: string; status: string; source: string };
type Reply = { id: string; queryId?: string | null; subject: string; body: string; status: string; failureReason?: string | null };
type Account = { id: string; name: string };
type Contact = { id: string; name: string; email: string };
type Activity = { id: string; type: string; title: string; status: string; body?: string | null };

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error || fallback;
}

export function CrmRealtimeRefresh() {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastRefresh(new Date());
      router.refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [router]);

  return <p className="mt-3 text-sm text-white/45">Live CRM refresh every 15s. Last sync: {lastRefresh.toLocaleTimeString()}</p>;
}

export function CrmAssistantPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setReply(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/crm/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: fd.get('message') }),
    });
    setLoading(false);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.reply || payload?.error || 'CRM assistant command failed.');
      return;
    }
    setReply(payload?.reply || 'Done.');
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Bot className="h-5 w-5" /> AI CRM operator</h2>
      <div className="mt-4 grid gap-2 text-xs text-cyan-50/75 md:grid-cols-2">
        <span className="rounded-lg border border-cyan-300/15 bg-black/20 px-3 py-2">Create, update, or delete leads/accounts/contacts</span>
        <span className="rounded-lg border border-cyan-300/15 bg-black/20 px-3 py-2">Move pipeline stages and complete tasks</span>
        <span className="rounded-lg border border-cyan-300/15 bg-black/20 px-3 py-2">Draft sales emails from memory</span>
        <span className="rounded-lg border border-cyan-300/15 bg-black/20 px-3 py-2">Draft customer query replies</span>
      </div>
      <div className="mt-4 grid gap-3">
        <textarea name="message" required placeholder="Examples: update Acme lead email to sara@acme.com. Mark follow-up with Acme done. Draft customer reply for ali@example.com. Delete contact old@example.com because duplicate." className="min-h-28 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
      </div>
      {reply && <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{reply}</p>}
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">
        <Sparkles className="h-4 w-4" />
        {loading ? 'Executing...' : 'Run CRM command'}
      </button>
    </form>
  );
}

export function CrmAutopilotPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [actions, setActions] = useState<Array<{ title: string; result: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function runAutopilot() {
    setLoading(true);
    setSummary(null);
    setActions([]);
    setError(null);
    const response = await fetch('/api/crm/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxActions: 8 }),
    });
    setLoading(false);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'CRM autopilot failed.');
      return;
    }
    setSummary(payload?.summary || 'Autopilot finished.');
    setActions(payload?.actions || []);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5" /> CRM autopilot</h2>
      <p className="mt-2 text-sm text-emerald-50/70">Runs bounded autonomous CRM work: dedupe leads, draft missing outreach, create follow-up tasks, and draft customer replies.</p>
      <button onClick={runAutopilot} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">
        <Bot className="h-4 w-4" />
        {loading ? 'Running...' : 'Run end-to-end autopilot'}
      </button>
      {summary && <p className="mt-4 rounded-lg border border-emerald-300/20 bg-black/20 px-3 py-2 text-sm text-emerald-100">{summary}</p>}
      {actions.length > 0 && (
        <div className="mt-3 space-y-2">
          {actions.map((action, index) => (
            <div key={`${action.title}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <p className="font-medium text-white">{action.title}</p>
              <p className="mt-1 text-white/55">{action.result}</p>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
    </div>
  );
}

export function CrmExportActions() {
  const sections = ['leads', 'accounts', 'contacts', 'customers', 'deals', 'activities'];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[.04] p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Download className="h-5 w-5" /> Export</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {sections.map((section) => (
          <a key={section} href={`/api/crm/export?format=csv&section=${section}`} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 hover:bg-white/10">{section}</a>
        ))}
      </div>
      <a href="/api/crm/export" className="mt-3 inline-block text-sm text-cyan-100">Download all as JSON</a>
    </div>
  );
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

export function LeadDiscoveryForm({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSummary(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/sales/leads/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seedUrls: fd.get('seedUrls'),
        importedLeads: fd.get('importedLeads'),
        ownerAgentId: fd.get('ownerAgentId') || null,
      }),
    });
    setLoading(false);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || 'Lead discovery failed.');
      return;
    }
    setSummary(`Created ${payload?.leads?.length || 0} leads. Skipped ${payload?.skipped?.length || 0}.`);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5">
      <h2 className="text-xl font-semibold">Discover or import leads</h2>
      <p className="mt-2 text-sm text-white/50">Creates CRM leads only from imported emails or visible emails on official company URLs.</p>
      <div className="mt-5 grid gap-3">
        <select name="ownerAgentId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="">Assign automatically</option>
          {agents.map((agent) => <option key={agent.id} className="bg-black" value={agent.id}>{agent.name}</option>)}
        </select>
        <textarea name="seedUrls" placeholder="Official company URLs, one per line" className="min-h-24 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <textarea name="importedLeads" placeholder="Company, contact, email, website, pain point - one lead per line" className="min-h-24 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
      </div>
      {summary && <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{summary}</p>}
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">
        <Search className="h-4 w-4" />
        {loading ? 'Discovering...' : 'Create CRM leads'}
      </button>
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

export function LeadStageControl({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(status: string) {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/sales/leads/${lead.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason: `Moved from ${lead.status} to ${status} from CRM pipeline.` }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Lead stage update failed.'));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      <select
        value={lead.status === 'closed_won' ? 'closed_won' : lead.status}
        disabled={loading || lead.status === 'closed_won'}
        onChange={(event) => changeStatus(event.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none disabled:opacity-60"
      >
        {['new', 'qualified', 'contacted', 'replied', 'negotiating', 'closed_lost', 'disqualified', 'closed_won'].map((status) => (
          <option key={status} className="bg-black" value={status} disabled={status === 'closed_won'}>{status}</option>
        ))}
      </select>
      {error && <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
    </div>
  );
}

export function CloseLeadAction({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch(`/api/sales/leads/${lead.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: fd.get('value'),
        currency: fd.get('currency'),
        closeReason: fd.get('closeReason'),
        nextStep: fd.get('nextStep'),
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Lead close failed.'));
      return;
    }
    setOpen(false);
    form.reset();
    router.refresh();
  }

  if (lead.status === 'closed_won') {
    return <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100"><CheckCircle2 className="h-4 w-4" /> Closed customer</p>;
  }

  return (
    <div className="mt-4">
      <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
        <CheckCircle2 className="h-4 w-4" />
        Close as customer
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-black/25 p-4 md:grid-cols-2">
          <input name="value" type="number" min="0" step="0.01" defaultValue="0" placeholder="Deal value" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
          <input name="currency" defaultValue="USD" placeholder="Currency" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
          <textarea name="closeReason" required placeholder="Why this customer is closed/won" className="min-h-20 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
          <input name="nextStep" defaultValue="Onboard customer" placeholder="Next step" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
          <button disabled={loading} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Closing...' : 'Confirm close'}</button>
        </form>
      )}
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

export function AddAccountForm({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/crm/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        website: fd.get('website'),
        industry: fd.get('industry'),
        status: fd.get('status'),
        annualRevenue: fd.get('annualRevenue'),
        notes: fd.get('notes'),
        ownerAgentId: fd.get('ownerAgentId') || null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Account could not be created.'));
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><Building2 className="h-5 w-5" /> Account</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input name="name" required placeholder="Account name" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="website" placeholder="Website" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="industry" placeholder="Industry" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <select name="status" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          {['prospect', 'active', 'at_risk', 'churned'].map((status) => <option key={status} className="bg-black" value={status}>{status}</option>)}
        </select>
        <input name="annualRevenue" type="number" min="0" step="0.01" placeholder="Annual revenue" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <select name="ownerAgentId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="">Assign automatically</option>
          {agents.map((agent) => <option key={agent.id} className="bg-black" value={agent.id}>{agent.name}</option>)}
        </select>
        <textarea name="notes" placeholder="Account notes" className="min-h-20 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Adding...' : 'Add account'}</button>
    </form>
  );
}

export function AddContactForm({ accounts, agents }: { accounts: Account[]; agents: Agent[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: fd.get('accountId') || null,
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        title: fd.get('title'),
        lifecycleStage: fd.get('lifecycleStage'),
        ownerAgentId: fd.get('ownerAgentId') || null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Contact could not be created.'));
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><UserPlus className="h-5 w-5" /> Contact</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input name="name" required placeholder="Contact name" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="email" required type="email" placeholder="Email" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="phone" placeholder="Phone" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <input name="title" placeholder="Title" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <select name="accountId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="">No account</option>
          {accounts.map((account) => <option key={account.id} className="bg-black" value={account.id}>{account.name}</option>)}
        </select>
        <select name="lifecycleStage" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          {['lead', 'marketing_qualified', 'sales_qualified', 'customer'].map((stage) => <option key={stage} className="bg-black" value={stage}>{stage}</option>)}
        </select>
        <select name="ownerAgentId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2">
          <option value="">Assign automatically</option>
          {agents.map((agent) => <option key={agent.id} className="bg-black" value={agent.id}>{agent.name}</option>)}
        </select>
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Adding...' : 'Add contact'}</button>
    </form>
  );
}

export function AddActivityForm({ leads, contacts, agents }: { leads: Lead[]; contacts: Contact[]; agents: Agent[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const fd = new FormData(form);
    const response = await fetch('/api/crm/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: fd.get('leadId') || null,
        contactId: fd.get('contactId') || null,
        ownerAgentId: fd.get('ownerAgentId') || null,
        type: fd.get('type'),
        title: fd.get('title'),
        body: fd.get('body'),
        status: fd.get('status'),
        dueAt: fd.get('dueAt') || null,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError(await readError(response, 'Activity could not be created.'));
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[.04] p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><ClipboardList className="h-5 w-5" /> Task or note</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <select name="type" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          {['task', 'note', 'call', 'meeting', 'email'].map((type) => <option key={type} className="bg-black" value={type}>{type}</option>)}
        </select>
        <select name="status" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          {['open', 'done', 'blocked'].map((status) => <option key={status} className="bg-black" value={status}>{status}</option>)}
        </select>
        <input name="title" required placeholder="Title" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
        <select name="leadId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="">No lead</option>
          {leads.map((lead) => <option key={lead.id} className="bg-black" value={lead.id}>{lead.companyName}</option>)}
        </select>
        <select name="contactId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="">No contact</option>
          {contacts.map((contact) => <option key={contact.id} className="bg-black" value={contact.id}>{contact.name}</option>)}
        </select>
        <input name="dueAt" type="datetime-local" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
        <select name="ownerAgentId" className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
          <option value="">Assign automatically</option>
          {agents.map((agent) => <option key={agent.id} className="bg-black" value={agent.id}>{agent.name}</option>)}
        </select>
        <textarea name="body" placeholder="Details" className="min-h-20 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none md:col-span-2" />
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      <button disabled={loading} className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60">{loading ? 'Adding...' : 'Add activity'}</button>
    </form>
  );
}

export function ActivityActions({ activity }: { activity: Activity }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: 'done' | 'blocked' | 'open') {
    setLoading(status);
    setError(null);
    const response = await fetch(`/api/crm/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, body: `Marked ${status} from CRM dashboard.` }),
    });
    setLoading(null);
    if (!response.ok) {
      setError(await readError(response, 'Activity update failed.'));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {activity.status !== 'done' && <button onClick={() => setStatus('done')} disabled={loading !== null} className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 disabled:opacity-60">{loading === 'done' ? 'Saving...' : 'Mark done'}</button>}
        {activity.status !== 'blocked' && <button onClick={() => setStatus('blocked')} disabled={loading !== null} className="rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs text-red-100 disabled:opacity-60">{loading === 'blocked' ? 'Saving...' : 'Block'}</button>}
        {activity.status !== 'open' && <button onClick={() => setStatus('open')} disabled={loading !== null} className="rounded-lg border border-white/10 bg-white/[.06] px-3 py-2 text-xs text-white disabled:opacity-60">{loading === 'open' ? 'Saving...' : 'Reopen'}</button>}
      </div>
      {error && <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</p>}
    </div>
  );
}
