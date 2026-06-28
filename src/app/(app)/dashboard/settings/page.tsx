import { headers } from 'next/headers';
import Link from 'next/link';
import { Card } from '@/components/status';
import { requireWorkspace } from '@/lib/session';

export default async function SettingsPage() {
  const { workspace } = await requireWorkspace();
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const runUrl = `${protocol}://${host}/company/${workspace.slug}`;

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">Workspace</h1>
      <p className="mt-3 max-w-3xl text-white/60">Share, run, rebuild, and export this generated company OS.</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card>
          <h2 className="text-xl font-semibold">Company run link</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">This link opens a read-only operating portal for the generated company OS. Use it to show the generated blueprint, agents, workflows, and operating model without exposing setup details.</p>
          <div className="mt-5 rounded-lg border border-white/10 bg-black/35 p-4 text-sm text-cyan-100">{runUrl}</div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/company/${workspace.slug}`} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">Open run link</Link>
            <a href="/api/export" className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">Download OS package</a>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Rebuild operating system</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Run onboarding again when the business model, customers, tools, risk rules, or target outcomes change. ZeroCo will regenerate the OS and clear old runtime evidence for a fresh evaluation.</p>
          <Link href="/onboarding" className="mt-5 inline-flex rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">Rebuild OS</Link>
        </Card>
      </div>
    </div>
  );
}
