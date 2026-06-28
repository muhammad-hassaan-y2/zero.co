import { AddLeadForm, SalesEmailActions } from '@/components/sales-execution';
import { Badge, Card, Metric } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function SalesExecutionPage() {
  const data = await getWorkspaceData();
  const salesAgents = data.agents.filter((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('sales'));
  const sent = data.outboundEmails.filter((email) => email.status === 'sent');
  const pending = data.outboundEmails.filter((email) => email.status === 'pending_approval');

  return (
    <div>
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-tight">Sales Execution</h1>
        <p className="mt-3 max-w-3xl text-white/60">Real lead-to-email loop: add a lead, let Bedrock score and draft outreach, approve it, send with Amazon SES, and store evidence in Results and Governance.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Leads" value={data.salesLeads.length} />
        <Metric label="Drafts pending" value={pending.length} />
        <Metric label="Emails sent" value={sent.length} />
        <Metric label="Sales agents" value={salesAgents.length} />
      </div>

      <div className="mt-8">
        <AddLeadForm agents={(salesAgents.length ? salesAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {data.salesLeads.map((lead) => {
          const latestEmail = data.outboundEmails.find((email) => email.leadId === lead.id);
          return (
            <Card key={lead.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{lead.companyName}</h2>
                  <p className="mt-1 text-sm text-white/50">{lead.contactName} - {lead.email}</p>
                </div>
                <Badge value={lead.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-white/60 md:grid-cols-3">
                <p>Score: <span className="text-white">{lead.score}/100</span></p>
                <p>Source: <span className="text-white">{lead.source}</span></p>
                <p>Segment: <span className="text-white">{lead.segment || 'Not set'}</span></p>
              </div>
              <p className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/60">{lead.painPoint}</p>
              {latestEmail && (
                <div className="mt-4 rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">{latestEmail.subject}</h3>
                    <Badge value={latestEmail.status} />
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">{latestEmail.body}</pre>
                  {latestEmail.failureReason && <p className="mt-3 text-sm text-red-200">{latestEmail.failureReason}</p>}
                </div>
              )}
              <SalesEmailActions lead={lead} email={latestEmail} />
            </Card>
          );
        })}
        {!data.salesLeads.length && (
          <Card>
            <h2 className="text-xl font-semibold">No leads yet</h2>
            <p className="mt-3 text-sm text-white/55">Add a lead to test the first real external execution loop.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
