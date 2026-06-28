# ZeroCo

ZeroCo is a Next.js full-stack app for generating and operating an AI-native company OS from a founder's real business context. It is built for hackathon evaluation around one objective: a user can sign up, describe a business, use an LLM to generate company structure, create automations, run workflows, and inspect the resulting audit trail in the dashboard.

## What Is End To End

ZeroCo now has two LLM-driven generation paths:

1. **Company OS generation**
   - User completes onboarding with business, customers, tools, risk boundaries, desired outcomes, and selected digital FTEs.
   - Amazon Bedrock generates the operating system content: company blueprint, departments, digital FTEs, workflows, policies, SOPs, and starter governance decisions.
   - Artifact counts are not fixed templates. Bedrock decides how many departments, FTEs, workflows, policies, and SOPs are needed for the submitted business. The app assigns IDs and maps returned names into database relationships.
   - The app persists the generated OS to PostgreSQL through Drizzle.
   - Dashboard pages read the persisted records dynamically.

2. **Automation package generation**
   - User describes a business task, desired outcome, trigger, tools, approval rule, autonomy level, and risk level.
   - Amazon Bedrock designs the automation package: agent, workflow, policy, SOP, event, and ledger entry.
   - The app persists all generated artifacts together.
   - The workflow can then be run from the dashboard, producing workflow run records, step evidence, business results, runtime events, and decision ledger records.

This means the core hackathon flow is not static copy. The LLM creates the company operating content and automation content from the user's inputs, and the dashboard displays database-backed results.

## Dashboard Functionality

- **Command Center**: shows metrics from live workspace data.
- **Live Builder Call**: lets the user talk or chat with a Bedrock-powered operator that can create agents, workflows, policies, SOPs, events, and ledger records in real time.
- **Company Builder**: creates LLM-designed automation packages.
- **Sales Agent Builder**: creates a complete LLM-designed sales engine with ICP research, lead sourcing, qualification, outreach, follow-up, demo booking, CRM hygiene, policies, SOPs, and testable workflows.
- **Company Blueprint**: shows the generated company model.
- **Digital FTEs**: lists agents and supports pause/throttle actions with audit entries.
- **Departments**: creates and lists company departments.
- **Workflows**: creates workflows and runs them for measurable results.
- **Results Center**: shows workflow runs, step evidence, artifacts, costs, and business results.
- **SOPs**: shows generated SOPs linked to workflows.
- **Policies**: creates and lists governance policies.
- **Runtime Tests**: runs generated workflows and can create LLM-generated operating events from the current OS.
- **Decision Ledger**: approves/rejects pending decisions and stores the result.
- **Operating Reports**: generates reports only after workflow runtime evidence exists.
- **Live Voice**: uses Bedrock for reply generation and Polly for speech output.
- **Download OS**: exports the generated company OS, workflows, policies, evidence, results, ledger, reports, metrics, and evaluation runbook as JSON.

## Objective Evaluation Flow

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`.

3. Push the database schema:

   ```bash
   npm run db:push
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

6. Sign up and create a workspace.

7. Complete onboarding.

   Expected result: Bedrock generates a company OS and the dashboard loads generated departments, FTEs, workflows, policies, SOPs, blueprint, and ledger records.

8. Go to **Company Builder** and create a new automation.

   Expected result: Bedrock generates a task-specific agent, workflow, policy, SOP, event, and ledger record.

9. Go to **Live Builder Call** and describe an agent or workflow in chat or by microphone.

   Expected result: Bedrock decides whether to ask a follow-up or create artifacts. If enough detail is provided, the app persists the generated agent, workflows, policies, SOPs, events, and ledger records.

10. Click **Build Sales Agent**.

   Expected result: Bedrock generates a dedicated Sales Agent, Sales/Revenue department, sales workflows, sales governance policies, SOPs, runtime events, and decision records.

11. Go to **Workflows** and click **Run for result**.

   Expected result: the app creates a workflow run, step evidence, business result records, event records, and decision ledger entries.

12. Go to **Results Center** and **Decision Ledger**.

    Expected result: generated artifacts are visible as persisted records, not hardcoded UI data.

13. Click **Download OS**.

    Expected result: the browser downloads a JSON package containing the generated company operating system, runtime evidence, and integration runbook.

## Configuration

Configure `.env.local` with the app URL, auth secret, PostgreSQL/Aurora database URL, and AWS credentials for Bedrock. Bedrock is required for company OS generation and automation package generation. If Bedrock is not configured, those routes return a visible error instead of silently falling back to static content.

## Scripts

```bash
npm run dev        # Start local development server
npm run build      # Production build
npm run lint       # ESLint quality gate
npm run start      # Start production server
npm run db:push    # Push Drizzle schema
npm run db:studio  # Open Drizzle Studio
```

Current verification status:

```bash
npm run lint
npm run build
```

Both pass.

## Architecture

- **Frontend**: Next.js App Router, React, Tailwind CSS, Lucide icons.
- **Backend**: Next.js route handlers.
- **Database**: PostgreSQL/Aurora-ready schema with Drizzle ORM.
- **LLM**: Amazon Bedrock Converse API.
- **Voice**: Amazon Polly speech synthesis.
- **Transcription**: Amazon Transcribe job APIs.
- **Auth**: local email/password session flow using the app's auth tables, plus optional Cognito API routes.

## Data Model

The database stores:

- users, accounts, sessions, password reset verification records
- workspaces
- onboarding profiles
- company blueprints
- departments
- digital FTEs
- workflows
- workflow runs
- workflow step evidence
- business results
- SOPs
- policies
- simulation events
- decision ledger records
- board reports

## Production Notes

This is a hackathon-ready MVP, not yet a fully production-hardened SaaS. Before production use:

- add automated tests for auth, workspace isolation, onboarding generation, automation generation, and workflow execution
- add email delivery for password resets
- add rate limiting to LLM and voice routes
- add structured observability for Bedrock/Polly/Transcribe failures
- add real external tool connectors for one or more workflows
- add role-based team permissions if workspaces become multi-user

## Win Readiness

ZeroCo has a credible hackathon story because it demonstrates a complete loop:

business input -> LLM-generated company OS -> persisted dashboard -> LLM-generated automation -> workflow run -> evidence/results/ledger/report.

The strongest demo path is to show two different businesses during judging and prove that the generated departments, agents, workflows, policies, SOPs, and automation packages change based on the user input.
