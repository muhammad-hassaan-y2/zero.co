import { NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/api-session';
import { buildGoogleAuthUrl, signGoogleState } from '@/lib/google-integration';

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));

  try {
    const state = signGoogleState({ userId: ctx.user.id, workspaceId: ctx.workspace.id });
    return NextResponse.redirect(buildGoogleAuthUrl(state));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Google OAuth could not start' }, { status: 500 });
  }
}
