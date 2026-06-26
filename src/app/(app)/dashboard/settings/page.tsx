import { Card } from '@/components/status';

const coreEnv = [
  'NEXT_PUBLIC_APP_URL',
  'BETTER_AUTH_URL',
  'BETTER_AUTH_SECRET',
  'DATABASE_URL',
];

const awsEnv = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_BEDROCK_MODEL_ID',
  'AWS_POLLY_VOICE_ID',
  'AWS_POLLY_ENGINE',
  'AWS_TRANSCRIBE_LANGUAGE_CODE',
  'AWS_TRANSCRIBE_OUTPUT_BUCKET',
  'AWS_COGNITO_USER_POOL_ID',
  'AWS_COGNITO_CLIENT_ID',
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-3 max-w-3xl text-white/60">Environment and integration checklist for running ZeroCo as a real AI-native company builder.</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Core app</h2>
          <p className="mt-2 text-sm text-white/50">Required for auth, sessions, workspace data, and deployment URLs.</p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-cyan-100">{coreEnv.join('\n')}</pre>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">AWS AI and auth</h2>
          <p className="mt-2 text-sm text-white/50">Required for Bedrock generation, Polly speech, Transcribe jobs, and Cognito API routes.</p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-cyan-100">{awsEnv.join('\n')}</pre>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-xl font-semibold">Local development note</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          `USE_PG_MEM=1` runs the app with an in-memory database for local demos. Production should use PostgreSQL or Aurora through `DATABASE_URL`, otherwise workspace data resets when the local server restarts.
        </p>
      </Card>
    </div>
  );
}
