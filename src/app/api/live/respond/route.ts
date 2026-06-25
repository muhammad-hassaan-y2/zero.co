import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspace } from '@/lib/session';
import { generateLiveAgentReply } from '@/lib/bedrock';
import { synthesizeSpeech } from '@/lib/aws-ai';

const schema = z.object({
  message: z.string().min(1).max(3000),
  context: z.string().max(6000).optional(),
  voiceId: z.string().min(1).max(40).optional(),
});

export async function POST(request: Request) {
  const { workspace } = await requireWorkspace();
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid live response request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const reply = await generateLiveAgentReply({
      message: parsed.data.message,
      context: parsed.data.context,
      workspaceName: workspace.name,
    });
    const audio = await synthesizeSpeech(reply, parsed.data.voiceId);

    return NextResponse.json({
      reply,
      audioBase64: audio.toString('base64'),
      contentType: 'audio/mpeg',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Live AWS voice response failed' }, { status: 502 });
  }
}
