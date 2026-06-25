import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signUpWithCognito } from '@/lib/aws-auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Cognito sign-up request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await signUpWithCognito(parsed.data);
    return NextResponse.json({
      userSub: result.UserSub,
      confirmed: result.UserConfirmed,
      delivery: result.CodeDeliveryDetails,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Amazon Cognito sign-up failed' }, { status: 502 });
  }
}
