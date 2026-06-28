'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  FileJson,
  GitBranch,
  LayoutDashboard,
  Mail,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

const groups = [
  {
    title: 'Build',
    items: [
      { label: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
      { label: 'AI Company Builder', href: '/dashboard/company-builder', icon: BrainCircuit },
    ],
  },
  {
    title: 'Operate',
    items: [
      { label: 'Workforce', href: '/dashboard/workforce', icon: Bot },
      { label: 'Lead CRM', href: '/dashboard/sales', icon: Mail },
      { label: 'Workflows', href: '/dashboard/workflows', icon: GitBranch },
    ],
  },
  {
    title: 'Govern',
    items: [
      { label: 'Governance', href: '/dashboard/governance', icon: ShieldCheck },
      { label: 'Evaluation', href: '/dashboard/evaluation', icon: BarChart3 },
      { label: 'Workspace', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function DashboardNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {groups.flatMap((group) => group.items).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                active
                  ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-50'
                  : 'border-white/10 bg-black/25 text-white/60 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="mt-8 space-y-6 text-sm">
      {groups.map((group) => (
        <section key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">{group.title}</p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                    active
                      ? 'border border-cyan-300/25 bg-cyan-300/12 text-cyan-50'
                      : 'text-white/62 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function DashboardFeatureMap() {
  const cards = [
    { title: 'Build company OS', text: 'Chat, talk, diagnose, or use structured Problem-to-FTE creation from one AI Company Builder.', href: '/dashboard/company-builder', icon: BrainCircuit },
    { title: 'Operate workforce', text: 'Manage departments, Digital FTEs, ownership, risk, budget, and agent controls from one workforce view.', href: '/dashboard/workforce', icon: Bot },
    { title: 'Lead and customer CRM', text: 'Manage leads and customer queries, draft emails with Bedrock, approve them, and send through Amazon SES.', href: '/dashboard/sales', icon: Mail },
    { title: 'Govern safely', text: 'Review policies, SOPs, approval queues, blocked actions, and decision ledger coverage in one place.', href: '/dashboard/governance', icon: ShieldCheck },
    { title: 'Evaluate evidence', text: 'Run workflows, inspect step evidence and results, then generate operating reports from records.', href: '/dashboard/evaluation', icon: FileJson },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.href} href={card.href} className="rounded-lg border border-white/10 bg-white/[.04] p-5 transition hover:border-cyan-300/30 hover:bg-white/[.07]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-semibold">{card.title}</h2>
            <p className="mt-2 min-h-20 text-sm leading-6 text-white/55">{card.text}</p>
            <p className="mt-4 text-sm text-cyan-300">Open</p>
          </Link>
        );
      })}
    </div>
  );
}

export function WorkspaceSummaryStrip({ counts }: { counts: { departments: number; agents: number; workflows: number; policies: number; sops: number; results: number } }) {
  const items = [
    ['Departments', counts.departments, Users],
    ['Digital FTEs', counts.agents, Bot],
    ['Workflows', counts.workflows, GitBranch],
    ['Policies', counts.policies, ShieldCheck],
    ['SOPs', counts.sops, ClipboardCheck],
    ['Results', counts.results, BarChart3],
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map(([label, value, Icon]) => (
        <div key={label} className="rounded-lg border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/45">{label}</p>
            <Icon className="h-4 w-4 text-cyan-200/70" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}
