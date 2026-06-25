'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05050a] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="text-sm text-white/70">ZeroCo</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-sm text-white/60">Loading reset form...</p>
      </div>
    </main>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(params.get('error'));
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return setError('Reset token is missing or expired.');
    setLoading(true);
    const { error } = await authClient.resetPassword({ token, newPassword: password });
    setLoading(false);
    if (error) return setError(error.message || 'Unable to reset password');
    router.push('/sign-in');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05050a] px-6 text-white">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="text-sm text-white/70">ZeroCo</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-sm text-white/60">Use the reset link from your email/server console.</p>
        <label className="mt-8 block text-sm text-white/70">New password</label>
        <input className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-white/30" value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
        {error && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading || !token} className="mt-7 w-full rounded-xl bg-white px-4 py-3 font-medium text-black disabled:opacity-60">{loading ? 'Resetting...' : 'Reset password'}</button>
      </form>
    </main>
  );
}
