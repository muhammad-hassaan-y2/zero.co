import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiWorkspace } from '@/lib/api-session';
import { createRawEmail, getGoogleIntegration, getValidGoogleAccessToken, gmailFetch } from '@/lib/google-integration';
import { storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Gmail send payload', details: parsed.error.flatten() }, { status: 400 });

  try {
    const account = await getGoogleIntegration(ctx.workspace.id);
    if (!account) return NextResponse.json({ error: 'Google Gmail is not connected.' }, { status: 400 });
    const accessToken = await getValidGoogleAccessToken(account);
    const payload = await gmailFetch<{ id: string; threadId: string }>(accessToken, 'users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: createRawEmail({ ...parsed.data, from: account.email }) }),
    });
    await storeAgentMemory({
      workspaceId: ctx.workspace.id,
      agentId: null,
      sourceType: 'gmail_send',
      sourceId: payload.id,
      content: `Sent Gmail message to ${parsed.data.to}. Subject: ${parsed.data.subject}.`,
      metadata: { threadId: payload.threadId },
    });
    return NextResponse.json({ messageId: payload.id, threadId: payload.threadId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gmail send failed' }, { status: 502 });
  }
}
