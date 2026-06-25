'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: '/onboarding',
    });

    if (result.error) {
      setLoading(false);
      return setError(result.error.message || 'Unable to create account');
    }

    const workspaceRes = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: companyName || `${name}'s Company` }),
    });

    setLoading(false);
    if (!workspaceRes.ok) return setError('Account created, but workspace creation failed. Try signing in.');

    router.push('/onboarding');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#05050a] text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,80,255,.24),transparent_35%),radial-gradient(circle_at_bottom,rgba(0,255,209,.10),transparent_30%)]" />
      <form onSubmit={onSubmit} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="text-sm text-white/70">ZeroCo</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Build your AI-native company</h1>
        <p className="mt-2 text-sm text-white/60">Create a workspace, then generate your company operating system.</p>

        <label className="mt-8 block text-sm text-white/70">Name</label>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={name} onChange={(e) => setName(e.target.value)} required />

        <label className="mt-5 block text-sm text-white/70">Work email</label>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

        <label className="mt-5 block text-sm text-white/70">Workspace / company name</label>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />

        <label className="mt-5 block text-sm text-white/70">Password</label>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />

        {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

        <button disabled={loading} className="mt-7 w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-60">
          {loading ? 'Creating workspace...' : 'Create workspace'}
        </button>

        <p className="mt-6 text-center text-sm text-white/60">
          Already have an account? <Link className="text-cyan-300" href="/sign-in">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
