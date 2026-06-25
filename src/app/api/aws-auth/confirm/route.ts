import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmCognitoSignUp } from '@/lib/aws-auth';

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Cognito confirmation request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await confirmCognitoSignUp(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Amazon Cognito confirmation failed' }, { status: 502 });
  }
}
