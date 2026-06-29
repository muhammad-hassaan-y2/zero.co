import { ActivityActions, AddAccountForm, AddActivityForm, AddContactForm, AddCustomerQueryForm, AddLeadForm, CloseLeadAction, CrmAssistantPanel, CrmAutopilotPanel, CrmExportActions, CrmRealtimeRefresh, CustomerReplyActions, GoogleIntegrationPanel, LeadDiscoveryForm, LeadStageControl, SalesEmailActions } from '@/components/sales-execution';
import { Badge, Card, Metric } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function SalesExecutionPage() {
  const data = await getWorkspaceData();
  const salesAgents = data.agents.filter((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('sales'));
  const supportAgents = data.agents.filter((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('support'));

  return (
    <div>
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-tight">Lead & Customer CRM</h1>
        <p className="mt-3 max-w-3xl text-white/60">Manage leads, customer queries, Bedrock-drafted outreach/replies, approval gates, Amazon SES sending, and verified evidence.</p>
        <CrmRealtimeRefresh />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Leads" value={data.salesLeads.length} />
        <Metric label="Customers" value={data.customers.length} />
        <Metric label="Closed deals" value={data.salesDeals.filter((deal) => deal.stage === 'closed_won').length} />
        <Metric label="Open activities" value={data.crmActivities.filter((activity) => activity.status === 'open').length} />
        <Metric label="Agent memories" value={data.agentMemories.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <CrmAssistantPanel />
        <CrmAutopilotPanel />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <GoogleIntegrationPanel />
        <CrmExportActions />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <LeadDiscoveryForm agents={(salesAgents.length ? salesAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
        <AddLeadForm agents={(salesAgents.length ? salesAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
        <AddCustomerQueryForm agents={(supportAgents.length ? supportAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AddAccountForm agents={(salesAgents.length ? salesAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
        <AddContactForm accounts={data.crmAccounts.map((account) => ({ id: account.id, name: account.name }))} agents={(salesAgents.length ? salesAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
        <AddActivityForm leads={data.salesLeads.map((lead) => ({ id: lead.id, companyName: lead.companyName, contactName: lead.contactName, email: lead.email, score: lead.score, status: lead.status }))} contacts={data.crmContacts.map((contact) => ({ id: contact.id, name: contact.name, email: contact.email }))} agents={(salesAgents.length ? salesAgents : data.agents).map((agent) => ({ id: agent.id, name: agent.name }))} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <section>
            <h2 className="text-2xl font-semibold">Lead pipeline</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {['new', 'qualified', 'contacted', 'negotiating'].map((stage) => (
                <div key={stage} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="text-xs uppercase text-white/40">{stage}</p>
                  <p className="mt-1 text-2xl font-semibold">{data.salesLeads.filter((lead) => lead.status === stage).length}</p>
                </div>
              ))}
            </div>
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
                  <LeadStageControl lead={lead} />
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
                  <CloseLeadAction lead={lead} />
                </Card>
              );
            })}
            {!data.salesLeads.length && <Card><h3 className="text-xl font-semibold">No leads yet</h3><p className="mt-3 text-sm text-white/55">Add a lead to test sales outreach.</p></Card>}
          </div>
          </section>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">CRM command list</h2>
          <div className="mt-5 grid gap-5">
            <Card>
              <h3 className="text-lg font-semibold">Accounts</h3>
              <div className="mt-4 space-y-3 text-sm text-white/60">
                {data.crmAccounts.slice(0, 8).map((account) => <p key={account.id}><span className="text-white">{account.name}</span> - {account.status} - {account.industry || 'industry not set'}</p>)}
                {!data.crmAccounts.length && <p>No accounts yet.</p>}
              </div>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold">Contacts</h3>
              <div className="mt-4 space-y-3 text-sm text-white/60">
                {data.crmContacts.slice(0, 8).map((contact) => <p key={contact.id}><span className="text-white">{contact.name}</span> - {contact.email} - {contact.lifecycleStage}</p>)}
                {!data.crmContacts.length && <p>No contacts yet.</p>}
              </div>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold">Tasks and notes</h3>
              <div className="mt-4 space-y-3 text-sm text-white/60">
                {data.crmActivities.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p><span className="text-white">{activity.type}: {activity.title}</span> - {activity.status}</p>
                    {activity.body && <p className="mt-1 text-white/45">{String(activity.body).slice(0, 140)}</p>}
                    <ActivityActions activity={{ id: activity.id, type: activity.type, title: activity.title, status: activity.status, body: activity.body }} />
                  </div>
                ))}
                {!data.crmActivities.length && <p>No activities yet.</p>}
              </div>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold">Memory retrieval</h3>
              <div className="mt-4 space-y-3 text-sm text-white/60">
                {data.agentMemories.slice(0, 6).map((memory) => <p key={memory.id}><span className="text-white">{memory.sourceType}</span> - {String(memory.content || '').slice(0, 120)}</p>)}
                {!data.agentMemories.length && <p>No memories yet. Lead, email, account, contact, and task actions will create memories.</p>}
              </div>
            </Card>
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="text-2xl font-semibold">Customers and deals</h2>
          <div className="mt-5 grid gap-5">
            {data.customers.map((customer) => {
              const deal = data.salesDeals.find((item) => item.customerId === customer.id);
              return (
                <Card key={customer.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{customer.companyName}</h3>
                      <p className="mt-1 text-sm text-white/50">{customer.name} - {customer.email}</p>
                    </div>
                    <Badge value={customer.status} />
                  </div>
                  {deal && <p className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm text-emerald-100">{deal.currency} {deal.value} - {deal.closeReason}</p>}
                </Card>
              );
            })}
            {!data.customers.length && <Card><h3 className="text-xl font-semibold">No customers yet</h3><p className="mt-3 text-sm text-white/55">Close a lead to create a customer and deal.</p></Card>}
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
