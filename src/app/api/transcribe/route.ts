import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireWorkspace } from '@/lib/session';
import { getTranscriptionJob, startTranscriptionJob } from '@/lib/aws-ai';

const startSchema = z.object({
  mediaUri: z.string().url(),
  languageCode: z.string().min(2).max(12).optional(),
  mediaFormat: z.string().min(2).max(12).optional(),
  jobName: z.string().min(1).max(200).optional(),
  outputBucketName: z.string().min(3).max(63).optional(),
});

export async function POST(request: Request) {
  await requireWorkspace();
  const body = await request.json().catch(() => ({}));
  const parsed = startSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid transcription request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const job = await startTranscriptionJob(parsed.data);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Amazon Transcribe failed' }, { status: 502 });
  }
}

export async function GET(request: Request) {
  await requireWorkspace();
  const { searchParams } = new URL(request.url);
  const jobName = searchParams.get('jobName');

  if (!jobName) {
    return NextResponse.json({ error: 'jobName is required' }, { status: 400 });
  }

  try {
    const job = await getTranscriptionJob(jobName);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Amazon Transcribe failed' }, { status: 502 });
  }
}
