import Link from 'next/link';
import { ArrowRight, Database, Orbit, ShieldCheck, Workflow, WalletCards, Zap } from 'lucide-react';

const orbitCards = ['Digital FTEs', 'Workflows', 'Policies', 'Budgets', 'Memory', 'Ledger'];
const workers = ['CEO Operator Agent', 'Sales Agent', 'Support Agent', 'Refund Agent', 'QA Agent', 'Research Agent', 'DevOps Agent'];

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
          <p className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">H0 track 2 · Monetizable B2B AI-native company builder</p>
          <h1 className="max-w-4xl text-6xl font-semibold leading-[0.92] tracking-tight md:text-8xl">
            Build your <span className="text-gradient">AI-native company</span> from zero.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/62 md:text-xl">
            ZeroCo transforms your real business operation into digital FTEs, workflows, SOPs, approval policies, budgets, simulations, and a database-backed operating ledger.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-white/90">Build from zero <ArrowRight size={18} /></Link>
            <a href="#demo" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 font-medium text-white hover:bg-white/10">Watch demo</a>
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
            <h2 className="text-4xl font-semibold tracking-tight">Not an idea generator. A company builder.</h2>
            <p className="mt-5 text-white/60">Bring your business. ZeroCo builds the AI-native operating system around it: roles, workflows, policies, cost controls, approvals, simulations, and the decision memory.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Compare title="Old way" items={['scattered SOPs', 'manual hiring', 'unclear workflows', 'no cost control', 'no decision memory']} />
            <Compare title="ZeroCo way" items={['digital FTE org chart', 'structured workflows', 'approval policies', 'budgets + autonomy', 'database-backed ledger']} />
          </div>
        </div>
      </section>

      <section id="company-os" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="mb-10 max-w-3xl">
          <h2 className="text-5xl font-semibold tracking-tight">From operation to operating system.</h2>
          <p className="mt-4 text-white/60">ZeroCo converts your current company/workflow into a living AI-native company OS.</p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-2xl backdrop-blur-xl">
          <p className="rounded-2xl border border-white/10 bg-white/[.04] p-5 text-white/75">“I run a customer support and refund operations agency for ecommerce stores.”</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[['Departments', 'Support, Refund Ops, QA, Finance'], ['Digital FTEs', 'Support Agent, Refund Agent, QA Agent'], ['Policies', 'Refund limits, spend throttles, data deletion blocks'], ['Workflows', 'Ticket handling, refund processing, QA review'], ['Budgets', 'Daily FTE limits and cost circuit breakers'], ['Ledger', 'Every decision stored for audit and replay']].map(([title, text]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.045] p-5"><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm text-white/55">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <h2 className="text-5xl font-semibold tracking-tight">Digital FTE workforce.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {workers.map((worker, index) => <div key={worker} className="rounded-3xl border border-white/10 bg-white/[.05] p-5"><p className="text-xs text-cyan-200">Level {index + 1}</p><h3 className="mt-3 font-medium">{worker}</h3><p className="mt-3 text-sm text-white/50">Budgeted, policy-gated, auditable digital worker with bounded autonomy.</p></div>)}
        </div>
      </section>

      <section id="demo" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-5 lg:grid-cols-3">
          <Feature icon={<ShieldCheck />} title="Governed autonomy" text="Approval gates, blocked actions, human review, and cost circuit breakers built into every FTE." />
          <Feature icon={<Database />} title="Database-backed ledger" text="Every policy match, approval, rejection, and simulation event is persisted in Aurora PostgreSQL." />
          <Feature icon={<Workflow />} title="Dynamic company OS" text="Onboarding generates real departments, workflows, SOPs, policies, agents, and board reports." />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="text-5xl font-semibold tracking-tight">Build the operating system for your AI-native company.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-white/60">Start with your real business. ZeroCo turns it into a governed AI workforce.</p>
        <div className="mt-9 flex justify-center gap-4">
          <Link href="/sign-up" className="rounded-full bg-white px-6 py-3 font-medium text-black">Launch ZeroCo</Link>
          <Link href="/dashboard" className="rounded-full border border-white/10 bg-white/5 px-6 py-3 font-medium text-white">View app</Link>
        </div>
      </section>
    </main>
  );
}

function Compare({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[.04] p-6"><h3 className="font-medium">{title}</h3><ul className="mt-4 space-y-2 text-sm text-white/55">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[.05] p-8"><div className="text-cyan-200">{icon}</div><h3 className="mt-6 text-2xl font-semibold">{title}</h3><p className="mt-3 text-white/55">{text}</p></div>;
}
