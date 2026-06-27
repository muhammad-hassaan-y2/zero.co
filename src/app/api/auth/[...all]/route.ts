import { NextResponse } from 'next/server';
import {
  clearSessionCookie,
  createSessionCookie,
  requestPasswordReset,
  resetPassword,
  signInEmail,
  signOut,
  signUpEmail,
} from '@/lib/auth';

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

function getRequestHeaders(request: Request) {
  return request.headers;
}

function cookieToken(request: Request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('zeroco_session='));
  return match ? decodeURIComponent(match.slice('zeroco_session='.length)) : null;
}

export async function GET(request: Request) {
  if (new URL(request.url).pathname.endsWith('/session')) {
    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({ headers: getRequestHeaders(request) });
    return json({ data: session });
  }

  return json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const headers = getRequestHeaders(request);

  try {
    if (path.endsWith('/sign-up/email')) {
      const body = await request.json();
      const session = await signUpEmail({
        name: String(body.name || ''),
        email: String(body.email || ''),
        password: String(body.password || ''),
      }, headers);

      const response = json({ data: session });
      response.headers.set('set-cookie', createSessionCookie(session.sessionToken));
      return response;
    }

    if (path.endsWith('/sign-in/email')) {
      const body = await request.json();
      const session = await signInEmail({
        email: String(body.email || ''),
        password: String(body.password || ''),
      }, headers);

      const response = json({ data: session });
      response.headers.set('set-cookie', createSessionCookie(session.sessionToken));
      return response;
    }

    if (path.endsWith('/sign-out')) {
      await signOut(cookieToken(request));
      const response = json({ data: { success: true } });
      response.headers.set('set-cookie', clearSessionCookie());
      return response;
    }

    if (path.endsWith('/request-password-reset')) {
      const body = await request.json();
      const result = await requestPasswordReset({
        email: String(body.email || ''),
        redirectTo: body.redirectTo ? String(body.redirectTo) : undefined,
      });
      return json({ data: result });
    }

    if (path.endsWith('/reset-password')) {
      const body = await request.json();
      const result = await resetPassword({
        token: String(body.token || ''),
        newPassword: String(body.newPassword || ''),
      });
      return json({ data: result });
    }

    return json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected authentication error';
    const status =
      message.includes('already exists') ? 409 :
      message.includes('Invalid email or password') ? 401 :
      message.includes('missing or expired') ? 400 :
      400;
    return json({ error: { message } }, { status });
  }
}
