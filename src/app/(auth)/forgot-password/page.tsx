'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return setError(error.message || 'Unable to send reset link');
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#05050a] text-white flex items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="text-sm text-white/70">ZeroCo</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Recover your workspace</h1>
        <p className="mt-2 text-sm text-white/60">We’ll send a reset link if your email exists.</p>
        <label className="mt-8 block text-sm text-white/70">Email</label>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        {error && <p className="mt-4 text-sm text-red-200">{error}</p>}
        {sent && <p className="mt-4 text-sm text-cyan-200">Reset request created. In development, check your server console for the reset URL.</p>}
        <button className="mt-7 w-full rounded-xl bg-white px-4 py-3 font-medium text-black">Send reset link</button>
        <Link href="/sign-in" className="mt-6 block text-center text-sm text-cyan-300">Back to sign in</Link>
      </form>
    </main>
  );
}
