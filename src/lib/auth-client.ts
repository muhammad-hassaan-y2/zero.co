'use client';

type ApiError = { message: string };
type ApiResult<T> = Promise<{ data: T | null; error: ApiError | null }>;

async function post<T>(path: string, body: unknown): ApiResult<T> {
  try {
    const response = await fetch(`/api/auth${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error || 'Authentication request failed';
      return { data: null, error: { message } };
    }

    return { data: payload?.data ?? null, error: null };
  } catch {
    return { data: null, error: { message: 'Network error' } };
  }
}

export const authClient = {
  signUp: {
    email(input: { name: string; email: string; password: string; callbackURL?: string }) {
      return post('/sign-up/email', input);
    },
  },
  signIn: {
    email(input: { email: string; password: string; rememberMe?: boolean; callbackURL?: string }) {
      return post('/sign-in/email', input);
    },
  },
  signOut() {
    return post('/sign-out', {});
  },
  requestPasswordReset(input: { email: string; redirectTo?: string }) {
    return post('/request-password-reset', input);
  },
  resetPassword(input: { token: string; newPassword: string }) {
    return post('/reset-password', input);
  },
};
