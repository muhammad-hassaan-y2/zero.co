import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db, boardReports, companyBlueprints, decisionLedger, departments, digitalFtes, policies, simulationEvents, sops, workflows } from '@/db';
import { requireWorkspace } from '@/lib/session';

export async function getWorkspaceData() {
  const { user, workspace } = await requireWorkspace();
  const [deptRows, agentRows, workflowRows, policyRows, decisionRows, eventRows, blueprintRows, sopRows, reportRows] = await Promise.all([
    db.select().from(departments).where(eq(departments.workspaceId, workspace.id)),
    db.select().from(digitalFtes).where(eq(digitalFtes.workspaceId, workspace.id)),
    db.select().from(workflows).where(eq(workflows.workspaceId, workspace.id)),
    db.select().from(policies).where(eq(policies.workspaceId, workspace.id)),
    db.select().from(decisionLedger).where(eq(decisionLedger.workspaceId, workspace.id)).orderBy(desc(decisionLedger.createdAt)),
    db.select().from(simulationEvents).where(eq(simulationEvents.workspaceId, workspace.id)).orderBy(desc(simulationEvents.createdAt)),
    db.select().from(companyBlueprints).where(eq(companyBlueprints.workspaceId, workspace.id)).orderBy(desc(companyBlueprints.createdAt)),
    db.select().from(sops).where(eq(sops.workspaceId, workspace.id)).orderBy(desc(sops.createdAt)),
    db.select().from(boardReports).where(eq(boardReports.workspaceId, workspace.id)).orderBy(desc(boardReports.createdAt)),
  ]);

  const spendToday = agentRows.reduce((sum, agent) => sum + Number(agent.costToday || 0), 0);
  const riskyActionsBlocked = decisionRows.filter((decision) => ['blocked', 'throttled', 'paused'].includes(decision.decision)).length;
  const humanApprovalsNeeded = decisionRows.filter((decision) => decision.decision === 'pending').length;
  const tasksCompletedToday = eventRows.filter((event) => event.eventType === 'task_completed').length * 9 + decisionRows.filter((decision) => decision.decision === 'executed').length;
  const avgSuccess = agentRows.length ? Math.round(agentRows.reduce((sum, agent) => sum + agent.successRate, 0) / agentRows.length) : 0;
  const operatingHealth = Math.max(55, Math.min(99, avgSuccess - humanApprovalsNeeded * 2 + riskyActionsBlocked));

  return {
    user,
    workspace,
    departments: deptRows,
    agents: agentRows,
    workflows: workflowRows,
    policies: policyRows,
    decisions: decisionRows,
    events: eventRows,
    blueprint: blueprintRows[0],
    sops: sopRows,
    reports: reportRows,
    metrics: {
      digitalFtesActive: agentRows.filter((agent) => !['paused', 'blocked'].includes(agent.status)).length,
      tasksCompletedToday,
      aiSpendToday: spendToday,
      riskyActionsBlocked,
      humanApprovalsNeeded,
      estimatedHoursSaved: Math.max(1, tasksCompletedToday * 0.35 + agentRows.length),
      operatingHealth,
      agentRoi: spendToday > 0 ? Math.max(1.2, (tasksCompletedToday * 8) / spendToday) : 1,
    },
  };
}
