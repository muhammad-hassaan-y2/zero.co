# ZeroCo Full-Stack AI-Native Company Builder

ZeroCo is a real end-to-end Next.js app for building and governing AI-native companies. It is not a static prototype and not a startup idea generator. The user brings an existing business or operation; ZeroCo generates and persists the company operating system around it.

## What is included

- Premium cinematic landing page
- Better Auth email/password authentication
- Workspace creation during sign-up
- Protected onboarding flow
- AWS Aurora PostgreSQL-ready database schema with Drizzle ORM
- Dynamic onboarding-to-company-OS generation
- Required Amazon Bedrock generation for the generated company blueprint
- Amazon Polly speech synthesis API
- Amazon Transcribe job API
- Amazon Cognito authentication API routes
- Database-backed dashboard pages:
  - Command Center
  - Company Builder
  - Company Blueprint
  - Digital FTEs
  - Departments
  - Workflows
  - SOPs
  - Policies
  - Simulation
  - Decision Ledger
  - Board Report
- Real persisted interactions:
  - create digital FTEs
  - create departments
  - create workflows
  - create policies
  - simulate company events
  - approve/reject decisions
  - throttle/pause agents
  - generate board reports

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Better Auth
- Drizzle ORM
- PostgreSQL / AWS Aurora PostgreSQL
- Amazon Bedrock, Polly, and Transcribe via AWS SDK v3
- Framer Motion + Lucide-ready UI

## Required environment variables

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-openssl-rand-base64-32
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@AURORA_CLUSTER_ENDPOINT:5432/zeroco?sslmode=require
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_SESSION_TOKEN=optional_if_using_temporary_credentials
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
AWS_POLLY_VOICE_ID=Joanna
AWS_POLLY_ENGINE=neural
AWS_TRANSCRIBE_LANGUAGE_CODE=en-US
AWS_TRANSCRIBE_OUTPUT_BUCKET=your-transcribe-output-bucket
AWS_COGNITO_USER_POOL_ID=your-user-pool-id
AWS_COGNITO_CLIENT_ID=your-user-pool-app-client-id
```

Generate the auth secret:

```bash
openssl rand -base64 32
```

## Amazon/AWS credentials needed

### Required for H0 MVP

Your Aurora PostgreSQL connection string is required by the app:

```env
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@AURORA_CLUSTER_ENDPOINT:5432/zeroco?sslmode=require
```

You get these values from AWS RDS/Aurora:

- Aurora cluster writer endpoint
- database name
- database username
- database password
- port, usually 5432

### Required Amazon AI services

ZeroCo requires Amazon Bedrock for onboarding-to-company-OS blueprint generation, Amazon Polly for speech synthesis, and Amazon Transcribe for transcription jobs:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_SESSION_TOKEN=optional_if_using_temporary_credentials
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
AWS_POLLY_VOICE_ID=Joanna
AWS_POLLY_ENGINE=neural
AWS_TRANSCRIBE_LANGUAGE_CODE=en-US
AWS_TRANSCRIBE_OUTPUT_BUCKET=your-transcribe-output-bucket
AWS_COGNITO_USER_POOL_ID=your-user-pool-id
AWS_COGNITO_CLIENT_ID=your-user-pool-app-client-id
```

If these are not set, onboarding generation and the AWS speech/transcription APIs return configuration errors instead of silently falling back.

### Amazon Cognito authentication

AWS-native authentication routes are available alongside the existing app auth flow:

- `POST /api/aws-auth/sign-up` accepts `{ "email": "...", "password": "...", "name": "..." }`.
- `POST /api/aws-auth/confirm` accepts `{ "email": "...", "code": "123456" }`.
- `POST /api/aws-auth/sign-in` accepts `{ "email": "...", "password": "..." }` and returns Cognito tokens.

Create a Cognito User Pool app client that supports `USER_PASSWORD_AUTH`, then set `AWS_COGNITO_CLIENT_ID`.

Never commit real keys to GitHub. Add them to `.env.local` locally and Vercel Environment Variables in production.

## Install

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local`, then push the schema:

```bash
npm run db:push
npm run dev
```

## User flow

1. Visit `/` landing page.
2. Sign up at `/sign-up`.
3. Workspace is created automatically.
4. Complete `/onboarding` with an existing business/operation.
5. ZeroCo generates departments, digital FTEs, workflows, SOPs, policies, simulation events, decision ledger entries, blueprint, and board report.
6. Dashboard loads all data dynamically from PostgreSQL.

## Amazon AI APIs

- `POST /api/speech` accepts `{ "text": "...", "voiceId": "Joanna" }` and returns MP3 audio from Amazon Polly.
- `POST /api/transcribe` accepts `{ "mediaUri": "s3://bucket/file.mp3", "languageCode": "en-US", "mediaFormat": "mp3" }` and starts an Amazon Transcribe job.
- `GET /api/transcribe?jobName=...` returns the current Amazon Transcribe job status and transcript metadata.
- `/dashboard/live` provides a live voice interface: microphone input, Bedrock response generation, and Polly voice playback.

## H0 database story

- AWS Aurora PostgreSQL stores users, sessions, workspaces, onboarding profiles, company blueprints, departments, digital FTEs, workflows, SOPs, policies, simulation events, decision ledger entries, and board reports.
- Every action in the product writes to the database, so the demo can show a real audit trail.
- Bedrock generates the AI-native blueprint, and Aurora PostgreSQL stores the generated operating system, audit trail, and reports.

## Notes

The app is intentionally production-shaped but still hackathon-scope. Add email delivery with Amazon SES or Resend before real password reset emails. Add real tool integrations after the H0 submission.
