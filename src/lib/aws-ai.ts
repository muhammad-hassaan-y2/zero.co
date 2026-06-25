import 'server-only';
import { PollyClient, SynthesizeSpeechCommand, type Engine, type VoiceId } from '@aws-sdk/client-polly';
import {
  GetTranscriptionJobCommand,
  type LanguageCode,
  type MediaFormat,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from '@aws-sdk/client-transcribe';
import { nanoid } from 'nanoid';

function awsRegion() {
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION is required for Amazon AI services.');
  }
  return process.env.AWS_REGION;
}

export async function synthesizeSpeech(text: string, voiceId = process.env.AWS_POLLY_VOICE_ID || 'Joanna') {
  const client = new PollyClient({ region: awsRegion() });
  const response = await client.send(new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: voiceId as VoiceId,
    Engine: (process.env.AWS_POLLY_ENGINE === 'standard' ? 'standard' : 'neural') as Engine,
  }));

  if (!response.AudioStream) {
    throw new Error('Amazon Polly returned no audio stream.');
  }

  const stream = response.AudioStream as unknown as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };

  if (stream.transformToByteArray) {
    return Buffer.from(await stream.transformToByteArray());
  }

  const chunks: Buffer[] = [];
  for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function startTranscriptionJob(input: {
  mediaUri: string;
  languageCode?: string;
  mediaFormat?: string;
  jobName?: string;
  outputBucketName?: string;
}) {
  const client = new TranscribeClient({ region: awsRegion() });
  const jobName = input.jobName || `zeroco-${nanoid(12)}`;

  const response = await client.send(new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    LanguageCode: (input.languageCode || process.env.AWS_TRANSCRIBE_LANGUAGE_CODE || 'en-US') as LanguageCode,
    MediaFormat: input.mediaFormat as MediaFormat | undefined,
    Media: { MediaFileUri: input.mediaUri },
    OutputBucketName: input.outputBucketName || process.env.AWS_TRANSCRIBE_OUTPUT_BUCKET,
  }));

  return response.TranscriptionJob;
}

export async function getTranscriptionJob(jobName: string) {
  const client = new TranscribeClient({ region: awsRegion() });
  const response = await client.send(new GetTranscriptionJobCommand({
    TranscriptionJobName: jobName,
  }));
  return response.TranscriptionJob;
}
