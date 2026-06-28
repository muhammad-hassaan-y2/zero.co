import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pool } from '@/db';
import { Badge, Card } from '@/components/status';

function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function mapRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camelKey(key), value])) as Record<string, unknown>;
}

async function workspaceRows(table: string, workspaceId: string, orderBy = 'created_at asc') {
  const result = await pool.query(`select * from ${table} where workspace_id = $1 order by ${orderBy}`, [workspaceId]);
  return result.rows.map(mapRow);
}

export default async function CompanyRunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const workspaceResult = await pool.query('select * from workspaces where slug = $1 limit 1', [slug]);
  const workspace = workspaceResult.rows[0] ? mapRow(workspaceResult.rows[0]) : null;
  if (!workspace) notFound();

  const workspaceId = String(workspace.id);
  const [blueprints, departments, agents, workflows, policies] = await Promise.all([
    workspaceRows('company_blueprints', workspaceId),
    workspaceRows('departments', workspaceId),
    workspaceRows('digital_ftes', workspaceId),
    workspaceRows('workflows', workspaceId),
    workspaceRows('policies', workspaceId),
  ]);
  const blueprint = blueprints[0];

  return (
    <main className="min-h-screen bg-[#05050a] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm text-cyan-300">ZeroCo company run link</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">{String(blueprint?.companyName || workspace.name)}</h1>
            <p className="mt-3 max-w-4xl text-white/60">{String(blueprint?.valueProposition || workspace.businessType || 'Generated company operating system')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">Open dashboard</Link>
          </div>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <Metric label="Departments" value={departments.length} />
          <Metric label="Digital FTEs" value={agents.length} />
          <Metric label="Workflows" value={workflows.length} />
          <Metric label="Policies" value={policies.length} />
        </section>

        {blueprint && (
          <Card className="mt-8">
            <h2 className="text-2xl font-semibold">Operating model</h2>
            <p className="mt-4 text-white/60">{String(blueprint.operatingModel)}</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <List title="Core KPIs" items={Array.isArray(blueprint.coreKpis) ? blueprint.coreKpis.map(String) : []} />
              <List title="Launch checklist" items={Array.isArray(blueprint.launchChecklist) ? blueprint.launchChecklist.map(String) : []} />
            </div>
          </Card>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold">Digital FTEs</h2>
            <div className="mt-5 space-y-4">
              {agents.slice(0, 10).map((agent) => (
                <div key={String(agent.id)} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{String(agent.name)}</h3>
                      <p className="mt-1 text-sm text-white/50">{String(agent.role)}</p>
                    </div>
                    <Badge value={String(agent.status)} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">{String(agent.goal)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Runnable workflows</h2>
            <div className="mt-5 space-y-4">
              {workflows.slice(0, 10).map((workflow) => (
                <div key={String(workflow.id)} className="rounded-lg border border-white/10 bg-black/25 p-4">
                  <h3 className="font-medium">{String(workflow.name)}</h3>
                  <p className="mt-1 text-sm text-cyan-200">Trigger: {String(workflow.trigger)}</p>
                  <p className="mt-3 text-sm leading-6 text-white/55">{String(workflow.successMetric)}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-white/10 bg-white/[.05] p-5"><p className="text-sm text-white/45">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="font-medium">{title}</h3><ul className="mt-3 space-y-2 text-sm text-white/55">{items.map((item) => <li key={item}>- {item}</li>)}</ul></div>;
}
