import { DecisionActions } from '@/components/action-buttons';
import { Badge, Card } from '@/components/status';
import { getWorkspaceData } from '@/lib/data';

export default async function DecisionLedgerPage() {
  const data = await getWorkspaceData();
  return <div><h1 className="text-4xl font-semibold tracking-tight">Decision Ledger</h1><p className="mt-3 text-white/60">Database-backed audit trail for every agent action, policy match, approval, rejection, and autonomous execution.</p><Card className="mt-8 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-white/40"><tr><th className="py-3">Time</th><th>Agent</th><th>Action</th><th>Policy</th><th>Risk</th><th>Decision</th><th>Result</th><th>Approved by</th><th>DB ref</th><th>Actions</th></tr></thead><tbody>{data.decisions.map((decision) => { const agent = data.agents.find((a) => a.id === decision.agentId); return <tr key={decision.id} className="border-t border-white/10 align-top"><td className="py-4 text-white/50">{new Date(decision.createdAt).toLocaleString()}</td><td>{agent?.name || 'System'}</td><td>{decision.action}</td><td>{decision.policyMatched}</td><td><Badge value={decision.riskLevel} /></td><td><Badge value={decision.decision} /></td><td className="max-w-[240px] text-white/60">{decision.result}</td><td>{decision.approvedBy || '—'}</td><td className="text-cyan-300">{decision.databaseReference}</td><td>{decision.decision === 'pending' ? <DecisionActions id={decision.id} /> : null}</td></tr>; })}</tbody></table></Card></div>;
}
