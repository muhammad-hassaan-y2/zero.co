import { AddCustomerQueryForm, AddLeadForm, CustomerReplyActions, SalesEmailActions } from '@/components/sales-execution';
import { Badge, Card, Metric } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function SalesExecutionPage() {
  const data = await getWorkspaceData();
  const salesAgents = data.agents.filter((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('sales'));
  const supportAgents = data.agents.filter((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('support'));
  const sent = data.outboundEmails.filter((email) => email.status === 'sent');
  const pending = data.outboundEmails.filter((email) => email.status === 'pending_approval');
  const repliesSent = data.customerReplies.filter((reply) => reply.status === 'sent');
  const queryPending = data.customerReplies.filter((reply) => reply.status === 'pending_approval');

  return (
    <div>
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-tight">Lead & Customer CRM</h1>
        <p className="mt-3 max-w-3xl text-white/60">Manage leads, customer queries, Bedrock-drafted outreach/replies, approval gates, Amazon SES sending, and verified evidence.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Leads" value={data.salesLeads.length} />
        <Metric label="Customer queries" value={data.customerQueries.length} />
        <Metric label="Pending drafts" value={pending.length + queryPending.length} />
        <Metric label="Emails sent" value={sent.length + repliesSent.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <AddLeadForm agents={(salesAgents.length ? salesAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
        <AddCustomerQueryForm agents={(supportAgents.length ? supportAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="text-2xl font-semibold">Lead pipeline</h2>
          <div className="mt-5 grid gap-5">
            {data.salesLeads.map((lead) => {
              const latestEmail = data.outboundEmails.find((email) => email.leadId === lead.id);
              return (
                <Card key={lead.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{lead.companyName}</h3>
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
                        <h4 className="font-medium">{latestEmail.subject}</h4>
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
            {!data.salesLeads.length && <Card><h3 className="text-xl font-semibold">No leads yet</h3><p className="mt-3 text-sm text-white/55">Add a lead to test sales outreach.</p></Card>}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Customer query inbox</h2>
          <div className="mt-5 grid gap-5">
            {data.customerQueries.map((query) => {
              const latestReply = data.customerReplies.find((reply) => reply.queryId === query.id);
              return (
                <Card key={query.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{query.subject}</h3>
                      <p className="mt-1 text-sm text-white/50">{query.customerName} - {query.customerEmail}</p>
                    </div>
                    <Badge value={query.status} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-white/60 md:grid-cols-3">
                    <p>Intent: <span className="text-white">{query.intent}</span></p>
                    <p>Priority: <span className="text-white">{query.priority}</span></p>
                    <p>Source: <span className="text-white">{query.source}</span></p>
                  </div>
                  <p className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/60">{query.message}</p>
                  {latestReply && (
                    <div className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-medium">{latestReply.subject}</h4>
                        <Badge value={latestReply.status} />
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">{latestReply.body}</pre>
                      {latestReply.failureReason && <p className="mt-3 text-sm text-red-200">{latestReply.failureReason}</p>}
                    </div>
                  )}
                  <CustomerReplyActions query={query} reply={latestReply} />
                </Card>
              );
            })}
            {!data.customerQueries.length && <Card><h3 className="text-xl font-semibold">No customer queries yet</h3><p className="mt-3 text-sm text-white/55">Capture a query to test support reply drafting and SES replies.</p></Card>}
          </div>
        </section>
      </div>
    </div>
  );
}
