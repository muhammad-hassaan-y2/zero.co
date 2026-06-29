import { NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/api-session';
import { exchangeGoogleCode, upsertGoogleIntegration, verifyGoogleState } from '@/lib/google-integration';

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return NextResponse.redirect(`${appUrl}/dashboard/sales?google=error&reason=${encodeURIComponent(error)}`);
  if (!code || !state) return NextResponse.redirect(`${appUrl}/dashboard/sales?google=missing_code`);

  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.redirect(`${appUrl}/sign-in`);

  try {
    const verified = verifyGoogleState(state);
    if (verified.userId !== ctx.user.id || verified.workspaceId !== ctx.workspace.id) {
      throw new Error('Google OAuth state does not match current workspace.');
    }
    const tokens = await exchangeGoogleCode(code);
    await upsertGoogleIntegration({ workspaceId: ctx.workspace.id, userId: ctx.user.id, tokens });
    return NextResponse.redirect(`${appUrl}/dashboard/sales?google=connected`);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Google OAuth callback failed';
    return NextResponse.redirect(`${appUrl}/dashboard/sales?google=error&reason=${encodeURIComponent(message)}`);
  }
}
