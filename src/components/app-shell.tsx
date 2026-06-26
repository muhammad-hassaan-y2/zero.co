import Link from 'next/link';
import { requireWorkspace } from '@/lib/session';
import { SignOutButton } from '@/app/(app)/dashboard/sign-out-button';

const nav = [
  ['Command Center', '/dashboard'],
  ['Company Builder', '/dashboard/company-builder'],
  ['Blueprint', '/dashboard/blueprint'],
  ['Digital FTEs', '/dashboard/digital-ftes'],
  ['Departments', '/dashboard/departments'],
  ['Workflows', '/dashboard/workflows'],
  ['Results', '/dashboard/results'],
  ['SOPs', '/dashboard/sops'],
  ['Policies', '/dashboard/policies'],
  ['Simulation', '/dashboard/simulation'],
  ['Decision Ledger', '/dashboard/decision-ledger'],
  ['Board Report', '/dashboard/board-report'],
  ['Settings', '/dashboard/settings'],
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { workspace, user } = await requireWorkspace();
  return (
    <main className="min-h-screen bg-[#05050a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,.13),transparent_30%)]" />
      <div className="relative flex">
        <aside className="hidden min-h-screen w-72 border-r border-white/10 bg-black/30 p-6 backdrop-blur-xl lg:block">
          <Link href="/" className="text-xl font-semibold tracking-tight">ZeroCo</Link>
          <p className="mt-1 text-xs text-white/45">AI-native company builder</p>
          <nav className="mt-10 space-y-1 text-sm text-white/65">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-xl px-4 py-3 hover:bg-white/8 hover:text-white">{label}</Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0 flex-1 p-5 lg:p-8">
          <header className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-cyan-300">{workspace.name}</p>
              <p className="mt-1 text-xs text-white/40">Signed in as {user.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5">Landing</Link>
              <Link href="/onboarding" className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15">Rebuild OS</Link>
              <SignOutButton />
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
