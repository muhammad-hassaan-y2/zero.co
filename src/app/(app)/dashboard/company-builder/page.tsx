import Link from 'next/link';
import { AddAutomationForm, ProblemToFteBuilder } from '@/components/builder-forms';
import { BuildSalesAgentButton } from '@/components/action-buttons';
import { Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function CompanyBuilderPage() {
  const data = await getWorkspaceData();
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">Company Builder</h1>
      <p className="mt-3 max-w-3xl text-white/60">Create new AI agents, workflows, policies, and SOPs around real tasks the user wants to automate.</p>

      <div className="mt-8">
        <ProblemToFteBuilder />
      </div>

      <Card className="mt-8 border-emerald-300/15 bg-emerald-400/[.06]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Revenue engine</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Generate a complete Sales Agent with ICP research, lead sourcing, qualification, outreach, follow-up, demo booking, CRM hygiene, sales policies, SOPs, and testable workflows.
            </p>
          </div>
          <BuildSalesAgentButton />
        </div>
      </Card>

      <div className="mt-8">
        <AddAutomationForm departments={data.departments.map((department) => ({ id: department.id, name: department.name }))} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Current workspace</h2>
          <p className="mt-4 text-white/60">{data.workspace.businessType || 'No business operation saved yet.'}</p>
          <p className="mt-2 text-white/45">Customers: {data.workspace.customerSegment || 'Not set'}</p>
          <Link href="/onboarding" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">Run onboarding again</Link>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Generated OS coverage</h2>
          <div className="mt-5 grid gap-3 text-sm text-white/70">
            <p>Departments: {data.departments.length}</p>
            <p>Digital FTEs: {data.agents.length}</p>
            <p>Workflows: {data.workflows.length}</p>
            <p>SOPs: {data.sops.length}</p>
            <p>Policies: {data.policies.length}</p>
            <p>Ledger records: {data.decisions.length}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
