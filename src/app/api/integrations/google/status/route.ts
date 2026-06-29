import { NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/api-session';
import { getGoogleIntegration } from '@/lib/google-integration';

export async function GET() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const account = await getGoogleIntegration(ctx.workspace.id);
  return NextResponse.json({
    connected: Boolean(account),
    email: account?.email || null,
    status: account?.status || 'not_connected',
    lastSyncAt: account?.lastSyncAt || null,
    scope: account?.scope || '',
  });
}
