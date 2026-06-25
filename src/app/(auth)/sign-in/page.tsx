'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
      callbackURL: '/dashboard',
    });

    setLoading(false);
    if (error) return setError(error.message || 'Unable to sign in');
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#05050a] text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(100,120,255,.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,255,209,.14),transparent_30%)]" />
      <form onSubmit={onSubmit} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="text-sm text-white/70">ZeroCo</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-white/60">Sign in to your AI-native company operating system.</p>

        <label className="mt-8 block text-sm text-white/70">Email</label>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

        <div className="mt-5 flex items-center justify-between">
          <label className="block text-sm text-white/70">Password</label>
          <Link href="/forgot-password" className="text-xs text-cyan-300">Forgot?</Link>
        </div>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

        {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

        <button disabled={loading} className="mt-7 w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-60">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="mt-6 text-center text-sm text-white/60">
          New to ZeroCo? <Link className="text-cyan-300" href="/sign-up">Build from zero</Link>
        </p>
      </form>
    </main>
  );
}
