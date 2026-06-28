import { BoardReportButton } from '@/components/action-buttons';
import { Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function BoardReportPage() {
  const data = await getWorkspaceData();
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Operating Reports</h1>
          <p className="mt-3 max-w-3xl text-white/60">Generate a report only after workflows have run, so the report is based on runtime evidence instead of sample activity.</p>
        </div>
        <BoardReportButton />
      </div>

      {!data.workflowRuns.length && (
        <Card className="mt-8">
          <h2 className="text-xl font-semibold">No runtime evidence yet</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">Run a workflow first. ZeroCo will create workflow runs, step evidence, business results, and decision ledger records. Reports are generated from those records.</p>
        </Card>
      )}

      <div className="mt-8 grid gap-5">
        {data.workflowRuns.length > 0 && data.reports.map((report) => (
          <Card key={report.id}>
            <div className="flex flex-col justify-between gap-3 md:flex-row">
              <div>
                <h2 className="text-2xl font-semibold">{report.title}</h2>
                <p className="mt-2 text-sm text-white/40">{new Date(report.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right text-sm text-white/50">report/{report.id}</div>
            </div>
            <p className="mt-5 text-white/65">{report.summary}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Mini label="Tasks" value={report.tasksCompleted} />
              <Mini label="Spent" value={`$${report.moneySpent}`} />
              <Mini label="Hours saved" value={report.hoursSaved} />
              <Mini label="Risk blocked" value={report.riskyActionsBlocked} />
            </div>
            <h3 className="mt-6 font-medium">Recommendations</h3>
            <ul className="mt-3 space-y-2 text-white/60">{report.recommendations.map((item) => <li key={item}>- {item}</li>)}</ul>
            <p className="mt-5 rounded-lg border border-white/10 bg-black/25 p-4 text-sm text-white/55">{report.auditSummary}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-white/10 bg-black/25 p-4"><p className="text-xs text-white/40">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
