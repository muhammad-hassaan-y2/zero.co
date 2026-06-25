import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspace } from '@/lib/session';
import { synthesizeSpeech } from '@/lib/aws-ai';

const speechSchema = z.object({
  text: z.string().min(1).max(3000),
  voiceId: z.string().min(1).max(40).optional(),
});

export async function POST(request: Request) {
  await requireWorkspace();
  const body = await request.json().catch(() => ({}));
  const parsed = speechSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid speech request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const audio = await synthesizeSpeech(parsed.data.text, parsed.data.voiceId);
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audio.length),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Amazon Polly failed' }, { status: 502 });
  }
}
