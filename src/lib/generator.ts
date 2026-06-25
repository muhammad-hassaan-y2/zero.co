import { nanoid } from 'nanoid';
import type { InferInsertModel } from 'drizzle-orm';
import {
  departments,
  digitalFtes,
  workflows,
  policies,
  decisionLedger,
  simulationEvents,
  companyBlueprints,
  sops,
  boardReports,
} from '@/db/schema';

type Profile = {
  workspaceId: string;
  businessDescription: string;
  customers: string;
  coreDepartments?: string | null;
  existingHumanRoles?: string | null;
  currentTools?: string | null;
  aiAutomationGoals?: string | null;
  actionsRequiringApproval?: string | null;
  monthlyAiBudget?: string | number | null;
  riskTolerance?: 'low' | 'medium' | 'high' | 'critical';
};

type GeneratedCompanyOS = {
  departments: InferInsertModel<typeof departments>[];
  digitalFtes: InferInsertModel<typeof digitalFtes>[];
  workflows: InferInsertModel<typeof workflows>[];
  policies: InferInsertModel<typeof policies>[];
  decisions: InferInsertModel<typeof decisionLedger>[];
  events: InferInsertModel<typeof simulationEvents>[];
  blueprint: InferInsertModel<typeof companyBlueprints>;
  sops: InferInsertModel<typeof sops>[];
  boardReport: InferInsertModel<typeof boardReports>;
};

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

export function generateCompanyOS(profile: Profile): GeneratedCompanyOS {
  const source = [
    profile.businessDescription,
    profile.customers,
    profile.coreDepartments,
    profile.existingHumanRoles,
    profile.currentTools,
    profile.aiAutomationGoals,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const monthlyBudget = Number(profile.monthlyAiBudget ?? 500) || 500;
  const dailyBudgetBase = Math.max(8, Math.round(monthlyBudget / 30 / 4));
  const workspaceId = profile.workspaceId;

  const departmentSpecs: {
    key: string;
    name: string;
    purpose: string;
    kpis: string[];
    riskLevel: RiskLevel;
  }[] = [
    { key: 'executive', name: 'Executive Ops', purpose: 'Coordinate the AI-native company operating rhythm and board-level reporting.', kpis: ['Operating health', 'Policy compliance', 'Weekly execution velocity'], riskLevel: 'medium' as const },
    { key: 'operations', name: 'Operations', purpose: 'Run day-to-day workflows and keep handoffs moving between digital FTEs.', kpis: ['Tasks completed', 'Cycle time', 'Escalation rate'], riskLevel: 'medium' as const },
    { key: 'qa', name: 'QA / Risk', purpose: 'Review outputs, detect risky behavior, and enforce governance policies.', kpis: ['Risky actions blocked', 'Review accuracy', 'Low-confidence catches'], riskLevel: 'high' as const },
  ];

  if (includesAny(source, ['support', 'ticket', 'customer service', 'helpdesk'])) {
    departmentSpecs.push({ key: 'support', name: 'Customer Support', purpose: 'Resolve customer issues with monitored autonomy.', kpis: ['Tickets resolved', 'CSAT', 'First response time'], riskLevel: 'medium' as const });
  }
  if (includesAny(source, ['refund', 'return', 'claim', 'warranty'])) {
    departmentSpecs.push({ key: 'refund', name: 'Refund Operations', purpose: 'Evaluate refunds and returns under strict approval policy.', kpis: ['Refund cycle time', 'Policy adherence', 'Disputes prevented'], riskLevel: 'high' as const });
  }
  if (includesAny(source, ['sales', 'lead', 'outreach', 'crm', 'growth'])) {
    departmentSpecs.push({ key: 'sales', name: 'Sales', purpose: 'Qualify leads, prepare outreach, and maintain pipeline hygiene.', kpis: ['Qualified leads', 'Reply rate', 'Pipeline value'], riskLevel: 'medium' as const });
  }
  if (includesAny(source, ['finance', 'invoice', 'billing', 'payment', 'revenue'])) {
    departmentSpecs.push({ key: 'finance', name: 'Finance', purpose: 'Track invoices, payments, follow-ups, and spend controls.', kpis: ['Outstanding invoices', 'Follow-ups sent', 'Spend variance'], riskLevel: 'high' as const });
  }
  if (includesAny(source, ['devops', 'deploy', 'software', 'saas', 'engineering', 'api'])) {
    departmentSpecs.push({ key: 'devops', name: 'DevOps', purpose: 'Monitor deployments, incidents, and production approval gates.', kpis: ['Incidents resolved', 'Rollback time', 'Change failure rate'], riskLevel: 'critical' as const });
  }
  if (includesAny(source, ['research', 'market', 'content', 'analysis'])) {
    departmentSpecs.push({ key: 'research', name: 'Research', purpose: 'Research markets, competitors, and customer context with spend limits.', kpis: ['Useful outputs', 'Cost per insight', 'Source quality'], riskLevel: 'medium' as const });
  }

  const deptRows = departmentSpecs.map((d, idx) => ({
    id: nanoid(),
    workspaceId,
    name: d.name,
    purpose: d.purpose,
    kpis: d.kpis,
    riskLevel: d.riskLevel,
    budget: String(Math.round(monthlyBudget / Math.max(departmentSpecs.length, 1))),
  }));

  const byName = new Map(deptRows.map((d) => [d.name, d.id]));
  const ftes: InferInsertModel<typeof digitalFtes>[] = [
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('Executive Ops'),
      name: 'CEO Operator Agent',
      role: 'Operating coordinator',
      goal: 'Keep the company OS aligned across departments, policies, and weekly board reporting.',
      tools: ['Company OS', 'Board Report', 'Decision Ledger'],
      autonomyLevel: 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'medium',
      status: 'healthy',
      currentTask: 'Preparing operating health summary',
      successRate: 92,
      costToday: '3.80',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('QA / Risk'),
      name: 'QA Agent',
      role: 'Risk reviewer',
      goal: 'Flag low-confidence outputs and risky autonomous actions before they affect customers.',
      tools: ['Policy Engine', 'Evaluation Rubrics', 'Decision Ledger'],
      autonomyLevel: 'approval_required',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'high',
      status: 'healthy',
      currentTask: 'Reviewing 3 low-confidence responses',
      successRate: 88,
      costToday: '4.25',
    },
  ];

  const addAgent = (name: string, dept: string, role: string, goal: string, tools: string[], risk: 'low'|'medium'|'high'|'critical', currentTask: string, successRate = 90, cost = '2.40') => {
    ftes.push({
      id: nanoid(),
      workspaceId,
      departmentId: byName.get(dept),
      name,
      role,
      goal,
      tools,
      autonomyLevel: risk === 'high' || risk === 'critical' ? 'approval_required' : 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: risk,
      status: 'healthy',
      currentTask,
      successRate,
      costToday: cost,
    });
  };

  if (byName.has('Customer Support')) addAgent('Support Agent', 'Customer Support', 'Customer support digital FTE', 'Resolve customer issues using SOPs and escalation policies.', ['Helpdesk', 'Knowledge Base', 'CRM'], 'medium', 'Resolving customer ticket queue', 94, '6.20');
  if (byName.has('Refund Operations')) addAgent('Refund Agent', 'Refund Operations', 'Refund policy operator', 'Evaluate refund requests and request approval for high-risk refunds.', ['Order System', 'Refund Policy', 'Approval Queue'], 'high', 'Waiting on $1,200 refund approval', 81, '5.40');
  if (byName.has('Sales')) addAgent('Sales Agent', 'Sales', 'Pipeline and outreach operator', 'Qualify leads and draft compliant outreach sequences.', ['CRM', 'Email', 'Lead Database'], 'medium', 'Generating 12 qualified lead briefs', 86, '7.15');
  if (byName.has('Finance')) addAgent('Finance Agent', 'Finance', 'Billing follow-up operator', 'Track invoice follow-ups and spending variance.', ['Billing System', 'Spreadsheet', 'Email'], 'high', 'Detecting unpaid invoice follow-up', 89, '2.95');
  if (byName.has('DevOps')) addAgent('DevOps Agent', 'DevOps', 'Production operations operator', 'Monitor deployment risk and request approval for production changes.', ['Vercel', 'Logs', 'Incident Board'], 'critical', 'Requesting production deploy approval', 78, '8.80');
  if (byName.has('Research')) addAgent('Research Agent', 'Research', 'Market research operator', 'Produce sourced research under cost circuit-breaker limits.', ['Web Research', 'Docs', 'Source Checker'], 'medium', 'Throttled after spend spike', 62, '18.20');

  const agentByName = new Map(ftes.map((a) => [a.name, a.id]));
  const workflowRows: InferInsertModel<typeof workflows>[] = [
    {
      id: nanoid(),
      workspaceId,
      name: 'Weekly Board Report Workflow',
      trigger: 'Every Friday or on-demand founder request',
      ownerAgentId: agentByName.get('CEO Operator Agent'),
      steps: ['Collect agent scorecards', 'Summarize risk', 'Calculate spend', 'Recommend autonomy changes'],
      toolsUsed: ['Decision Ledger', 'Company Metrics', 'Policy Engine'],
      approvalPoints: ['Founder approves recommended autonomy changes'],
      successMetric: 'Board report generated with risk, cost, and ROI summary',
      failurePath: 'Escalate missing data to human operator',
    },
    {
      id: nanoid(),
      workspaceId,
      name: 'Risk Review Workflow',
      trigger: 'Low confidence, high-risk action, or blocked policy event',
      ownerAgentId: agentByName.get('QA Agent'),
      steps: ['Review proposed action', 'Match policy', 'Score risk', 'Approve, block, or escalate'],
      toolsUsed: ['Policy Engine', 'Decision Ledger'],
      approvalPoints: ['Human approval for high or critical risk'],
      successMetric: 'Risky action prevented before customer impact',
      failurePath: 'Block action and create incident review',
    },
  ];

  if (agentByName.has('Support Agent')) workflowRows.push({
    id: nanoid(), workspaceId, name: 'Support Ticket Resolution', trigger: 'New customer support ticket', ownerAgentId: agentByName.get('Support Agent'),
    steps: ['Classify issue', 'Retrieve SOP', 'Draft response', 'Check confidence', 'Send or escalate'], toolsUsed: ['Helpdesk', 'Knowledge Base'], approvalPoints: ['Human review if confidence < 85%'], successMetric: 'Ticket resolved with high confidence', failurePath: 'Escalate to human support lead',
  });
  if (agentByName.has('Refund Agent')) workflowRows.push({
    id: nanoid(), workspaceId, name: 'Refund Processing', trigger: 'Customer refund request', ownerAgentId: agentByName.get('Refund Agent'),
    steps: ['Verify order', 'Check refund policy', 'Calculate risk', 'Request approval if threshold exceeded'], toolsUsed: ['Order System', 'Refund Policy', 'Approval Queue'], approvalPoints: ['Refunds over $500 require approval'], successMetric: 'Refund handled within policy', failurePath: 'Block and escalate suspicious refund',
  });
  if (agentByName.has('Sales Agent')) workflowRows.push({
    id: nanoid(), workspaceId, name: 'Sales Outreach', trigger: 'New lead list uploaded', ownerAgentId: agentByName.get('Sales Agent'),
    steps: ['Score leads', 'Draft personalized outreach', 'Check compliance', 'Queue for review or send'], toolsUsed: ['CRM', 'Email'], approvalPoints: ['Bulk emails over 100 require approval'], successMetric: 'Qualified replies generated', failurePath: 'Pause campaign if complaints exceed threshold',
  });

  const policyRows: InferInsertModel<typeof policies>[] = [
    { id: nanoid(), workspaceId, name: 'High-value financial action approval', description: 'Refunds or financial actions over $500 require human approval.', condition: 'amount > 500', action: 'Send to approval queue', mode: 'require_approval', riskLevel: 'high', enabled: true },
    { id: nanoid(), workspaceId, name: 'Agent spend circuit breaker', description: 'Throttle agents when spend exceeds 3x baseline and success rate falls below 30%.', condition: 'spend > 3x_baseline AND success_rate < 30', action: 'Throttle agent and write ledger entry', mode: 'throttle', riskLevel: 'medium', enabled: true },
    { id: nanoid(), workspaceId, name: 'Low confidence human review', description: 'Human review required if response confidence is below 85%.', condition: 'confidence < 85', action: 'Escalate to QA Agent', mode: 'require_approval', riskLevel: 'medium', enabled: true },
    { id: nanoid(), workspaceId, name: 'Production deploy approval', description: 'Any production deployment requires explicit approval.', condition: 'action == deploy_production', action: 'Require founder approval', mode: 'require_approval', riskLevel: 'critical', enabled: true },
    { id: nanoid(), workspaceId, name: 'Customer data deletion block', description: 'Agents cannot delete customer data autonomously.', condition: 'action == delete_customer_data', action: 'Block action', mode: 'block', riskLevel: 'critical', enabled: true },
  ];

  const refundAgent = ftes.find((a) => a.name === 'Refund Agent') ?? ftes[0];
  const researchAgent = ftes.find((a) => a.name === 'Research Agent') ?? ftes[0];
  const qaAgent = ftes.find((a) => a.name === 'QA Agent') ?? ftes[0];

  const decisions: InferInsertModel<typeof decisionLedger>[] = [
    { id: nanoid(), workspaceId, agentId: refundAgent.id, departmentId: refundAgent.departmentId ?? undefined, action: 'Requested $1,200 refund', policyMatched: 'High-value financial action approval', riskLevel: 'high', decision: 'pending', result: 'Waiting for human approval', approvedBy: null, databaseReference: `aurora:decision:${nanoid(8)}` },
    { id: nanoid(), workspaceId, agentId: researchAgent.id, departmentId: researchAgent.departmentId ?? undefined, action: 'Exceeded spend baseline', policyMatched: 'Agent spend circuit breaker', riskLevel: 'medium', decision: 'throttled', result: 'Agent throttled; estimated savings $312/day', approvedBy: 'ZeroCo Policy Engine', databaseReference: `aurora:decision:${nanoid(8)}` },
    { id: nanoid(), workspaceId, agentId: qaAgent.id, departmentId: qaAgent.departmentId ?? undefined, action: 'Flagged risky response', policyMatched: 'Low confidence human review', riskLevel: 'medium', decision: 'blocked', result: 'Response sent for review', approvedBy: 'QA Agent', databaseReference: `aurora:decision:${nanoid(8)}` },
  ];

  const events: InferInsertModel<typeof simulationEvents>[] = [
    { id: nanoid(), workspaceId, agentId: agentByName.get('Support Agent'), eventType: 'task_completed', title: 'Support Agent resolved 18 tickets', description: 'Resolved routine tickets using SOP-backed responses.', severity: 'info', status: 'closed' },
    { id: nanoid(), workspaceId, agentId: refundAgent.id, eventType: 'approval_requested', title: 'Refund Agent requested approval', description: 'A $1,200 refund matched high-value financial approval policy.', severity: 'high', status: 'pending' },
    { id: nanoid(), workspaceId, agentId: researchAgent.id, eventType: 'cost_alert', title: 'Research Agent exceeded spend limit', description: 'Spend rose above 3x baseline with low useful-output rate; agent was throttled.', severity: 'warning', status: 'throttled' },
    { id: nanoid(), workspaceId, agentId: qaAgent.id, eventType: 'risk_flagged', title: 'QA Agent flagged 3 risky responses', description: 'Low-confidence outputs were blocked before customer delivery.', severity: 'warning', status: 'open' },
  ];

  const companyName = `${profile.businessDescription.split(/\s+/).slice(0, 3).join(' ') || 'AI-Native'} OS`.replace(/[^a-zA-Z0-9 &-]/g, '').trim();

  const blueprint: InferInsertModel<typeof companyBlueprints> = {
    id: nanoid(),
    workspaceId,
    companyName,
    targetCustomer: profile.customers,
    valueProposition: `Turn ${profile.businessDescription} into a governed AI-native operation with digital FTEs, policies, and measurable ROI.`,
    revenueModel: includesAny(source, ['agency', 'service', 'client']) ? 'Monthly retainer plus usage-based automation fee' : 'Subscription plus outcome-based expansion',
    operatingModel: 'Human-led, AI-operated company OS with policy-bounded digital FTEs and database-backed decision memory.',
    coreKpis: ['Operating health', 'Agent ROI', 'Human hours saved', 'Risky actions blocked', 'Approval latency'],
    launchChecklist: ['Complete onboarding', 'Review generated digital FTEs', 'Approve core policies', 'Run first simulation', 'Export board report'],
  };

  const sopRows: InferInsertModel<typeof sops>[] = workflowRows.map((workflow) => ({
    id: nanoid(),
    workspaceId,
    workflowId: workflow.id,
    title: `SOP: ${workflow.name}`,
    objective: `Run ${workflow.name.toLowerCase()} consistently with clear approval boundaries and full auditability.`,
    owner: ftes.find((a) => a.id === workflow.ownerAgentId)?.name || 'CEO Operator Agent',
    steps: workflow.steps,
    requiredTools: workflow.toolsUsed,
    approvalRules: workflow.approvalPoints,
    failureHandling: workflow.failurePath,
    auditRequirements: 'Every agent action, policy match, approval, rejection, and autonomous execution must be written to the Decision Ledger.',
  }));

  const boardReport: InferInsertModel<typeof boardReports> = {
    id: nanoid(),
    workspaceId,
    title: 'Initial AI-Native Company Board Report',
    summary: `ZeroCo generated ${ftes.length} digital FTEs, ${workflowRows.length} workflows, ${policyRows.length} governance policies, and a starter decision ledger for ${profile.businessDescription}.`,
    tasksCompleted: events.filter((event) => event.eventType === 'task_completed').length * 18,
    moneySpent: String(ftes.reduce((sum, agent) => sum + Number(agent.costToday || 0), 0).toFixed(2)),
    hoursSaved: Math.max(8, ftes.length * 3),
    riskyActionsBlocked: decisions.filter((decision) => ['blocked', 'throttled', 'paused'].includes(decision.decision as string)).length,
    recommendations: ['Review approval thresholds before enabling auto-act autonomy', 'Keep financial and production actions approval-required', 'Run 3 simulations before connecting real tools'],
    auditSummary: 'Starter ledger created in Aurora PostgreSQL with policy decisions, approval requests, and cost-control actions.',
  };

  return { departments: deptRows, digitalFtes: ftes, workflows: workflowRows, policies: policyRows, decisions, events, blueprint, sops: sopRows, boardReport };
}
