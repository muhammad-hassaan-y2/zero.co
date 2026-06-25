import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signInWithCognito } from '@/lib/aws-auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Cognito sign-in request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await signInWithCognito(parsed.data);
    return NextResponse.json({
      accessToken: result.AuthenticationResult?.AccessToken,
      idToken: result.AuthenticationResult?.IdToken,
      refreshToken: result.AuthenticationResult?.RefreshToken,
      expiresIn: result.AuthenticationResult?.ExpiresIn,
      tokenType: result.AuthenticationResult?.TokenType,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Amazon Cognito sign-in failed' }, { status: 502 });
  }
}
