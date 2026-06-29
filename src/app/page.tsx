import Link from 'next/link';
import { ArrowRight, Database, Orbit, ShieldCheck, Workflow } from 'lucide-react';

const orbitCards = ['Digital FTEs', 'Workflows', 'Policies', 'Budgets', 'Memory', 'Ledger'];
const workers = ['Revenue FTE', 'Support FTE', 'Refund FTE', 'QA FTE', 'Finance FTE', 'Research FTE', 'DevOps FTE'];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05050a] text-white">
      <div className="fixed inset-0 grid-bg opacity-40" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,.18),transparent_36%)]" />
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-semibold tracking-tight">ZeroCo</Link>
        <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <a href="#product">Product</a><a href="#company-os">Company OS</a><a href="#demo">Demo</a>
        </div>
        <Link href="/sign-up" className="rounded-full border border-white/10 bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90">Build from zero</Link>
      </nav>

      <section className="relative z-10 mx-auto grid min-h-[82vh] max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_.9fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            Autonomous CRM · Digital FTEs · Company OS
          </p>
          <h1 className="max-w-4xl text-6xl font-semibold leading-[0.92] tracking-tight md:text-8xl">
            Stop managing software. <span className="text-gradient">Direct the OS</span> that runs it.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/62 md:text-xl">
            ZeroCo turns your CRM into an AI-native operating layer where Digital FTEs organize leads, draft outreach, sync customer queries, prepare follow-ups, and escalate risky work with memory, policies, and an audit trail.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-white/90">Launch your company OS <ArrowRight size={18} /></Link>
            <a href="#demo" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-medium text-white hover:bg-white/10">See the agent layer</a>
          </div>
        </div>
        <div className="relative mx-auto h-[520px] w-full max-w-[520px] animate-float">
          <div className="absolute inset-16 rounded-[4rem] border border-white/10 bg-white/[.05] shadow-glow backdrop-blur-2xl" />
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-[3rem] border border-cyan-200/20 bg-gradient-to-br from-cyan-300/30 via-white/10 to-violet-500/30 p-8 shadow-glow">
            <Orbit className="h-full w-full text-cyan-100/70" />
          </div>
          {orbitCards.map((card, i) => {
            const pos = [[35, 10], [70, 24], [74, 63], [39, 82], [8, 63], [5, 24]][i];
            return <div key={card} className="absolute rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm shadow-2xl backdrop-blur-xl" style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}>{card}</div>;
          })}
        </div>
      </section>

      <section id="product" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[.05] p-8">
            <h2 className="text-4xl font-semibold tracking-tight">Not a passive CRM. An operating system.</h2>
            <p className="mt-5 text-white/60">Bring your business context. ZeroCo generates the digital workforce around it: agents, workflows, policies, memory, approvals, sales motions, and the decision ledger that keeps every action accountable.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Compare title="Old CRM" items={['records after the work', 'manual follow-ups', 'scattered SOPs', 'no agent memory', 'weak audit trail']} />
            <Compare title="ZeroCo OS" items={['agents before the work', 'drafts + next actions', 'policy-gated workflows', 'workspace memory', 'database-backed ledger']} />
          </div>
        </div>
      </section>

      <section id="company-os" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-5xl font-semibold tracking-tight">From customer chaos to governed autonomy.</h2>
          <p className="mt-4 text-white/60">Describe the operation once. ZeroCo turns it into agents, departments, workflows, approval rules, and CRM actions your team can inspect and run.</p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-2xl backdrop-blur-xl">
          <p className="rounded-2xl border border-white/10 bg-white/[.04] p-5 text-white/75">&quot;I run sales, support, and refund operations for ecommerce brands. I need agents that can manage leads, customer queries, follow-ups, and approval-heavy decisions.&quot;</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[['CRM Layer', 'Leads, accounts, contacts, queries, deals'], ['Digital FTEs', 'Sales, support, refund, QA, finance, DevOps'], ['Policies', 'Approval gates, blocked actions, spend controls'], ['Workflows', 'Outreach, inbox triage, replies, follow-ups'], ['Memory', 'Customer context, agent notes, prior decisions'], ['Ledger', 'Every decision stored for audit and replay']].map(([title, text]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.045] p-5"><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm text-white/55">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-5xl font-semibold tracking-tight">Digital FTEs that work inside your guardrails.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {workers.map((worker, index) => <div key={worker} className="rounded-3xl border border-white/10 bg-white/[.05] p-5"><p className="text-xs text-cyan-200">Agent {index + 1}</p><h3 className="mt-3 font-medium">{worker}</h3><p className="mt-3 text-sm text-white/50">A bounded AI worker with goals, tools, memory, approval rules, and audit evidence.</p></div>)}
        </div>
      </section>

      <section id="demo" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-5 lg:grid-cols-3">
          <Feature icon={<ShieldCheck />} title="Autonomy with brakes" text="Low-risk work moves quickly. High-risk work goes to approval. Blocked actions stop before damage." />
          <Feature icon={<Database />} title="Memory, not magic" text="CRM actions, customer queries, agent notes, workflow evidence, and decisions are persisted by workspace." />
          <Feature icon={<Workflow />} title="Generated for your business" text="Bedrock creates company-specific agents, workflows, SOPs, policies, sales motions, and software specs." />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="text-5xl font-semibold tracking-tight">Meet the CRM that starts doing the work.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-white/60">Start with your real business. ZeroCo turns it into a governed AI workforce that can manage CRM work, draft actions, sync context, and show its reasoning.</p>
        <div className="mt-9 flex justify-center gap-4">
          <Link href="/sign-up" className="rounded-full bg-white px-6 py-3 font-medium text-black">Build your OS</Link>
          <Link href="/dashboard" className="rounded-full border border-white/10 bg-white/5 px-6 py-3 font-medium text-white">View app</Link>
        </div>
      </section>
    </main>
  );
}

function Compare({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[.04] p-6"><h3 className="font-medium">{title}</h3><ul className="mt-4 space-y-2 text-sm text-white/55">{items.map((item) => <li key={item}>- {item}</li>)}</ul></div>;
}
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[.05] p-8"><div className="text-cyan-200">{icon}</div><h3 className="mt-6 text-2xl font-semibold">{title}</h3><p className="mt-3 text-white/55">{text}</p></div>;
}
