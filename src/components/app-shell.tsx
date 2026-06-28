import Link from 'next/link';
import { requireWorkspace } from '@/lib/session';
import { SignOutButton } from '@/app/(app)/dashboard/sign-out-button';
import { DashboardNav } from '@/components/dashboard-nav';

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { workspace, user } = await requireWorkspace();
  return (
    <main className="min-h-screen bg-[#05050a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,.08),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,.10),transparent_32%)]" />
      <div className="relative flex">
        <aside className="hidden min-h-screen w-80 border-r border-white/10 bg-black/40 p-5 backdrop-blur-xl lg:block">
          <Link href="/dashboard" className="block rounded-lg border border-white/10 bg-white/[.04] p-4 hover:bg-white/[.06]">
            <p className="text-xl font-semibold tracking-tight">ZeroCo</p>
            <p className="mt-1 text-xs text-white/45">AI-native company OS</p>
          </Link>
          <DashboardNav />
        </aside>
        <section className="min-w-0 flex-1 p-5 lg:p-8">
          <header className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm text-cyan-300">{workspace.name}</p>
              <p className="mt-1 text-xs text-white/40">Signed in as {user.email}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/company-builder" className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-400/15">Build FTE</Link>
              <Link href="/dashboard/workflows" className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-400/15">Run Workflow</Link>
              <a href="/api/export" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90">Download OS</a>
              <Link href="/onboarding" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5">Rebuild</Link>
              <SignOutButton />
            </div>
            <div className="md:col-span-2 md:hidden">
              <DashboardNav compact />
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
