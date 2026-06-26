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
  problemSolved?: string | null;
  customerOutcome?: string | null;
  coreDepartments?: string | null;
  existingHumanRoles?: string | null;
  repetitiveWork?: string | null;
  highRiskWork?: string | null;
  currentTools?: string | null;
  aiAutomationGoals?: string | null;
  actionsRequiringApproval?: string | null;
  blockedActions?: string | null;
  autoApprovedActions?: string | null;
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

function customerResult(profile: Profile) {
  return (profile.customerOutcome || profile.problemSolved || profile.businessDescription).trim();
}

function splitInput(value?: string | null) {
  return (value || '')
    .split(/\n|,|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function shortPhrase(value: string, fallback: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.split(' ').slice(0, 5).join(' ') : fallback;
}

function inferDomain(text: string) {
  if (includesAny(text, ['shopify', 'ecommerce', 'store', 'cart', 'order', 'refund', 'return'])) return 'commerce';
  if (includesAny(text, ['saas', 'subscription', 'churn', 'activation', 'trial', 'product'])) return 'saas';
  if (includesAny(text, ['agency', 'client', 'deliverable', 'project', 'proposal'])) return 'agency';
  if (includesAny(text, ['clinic', 'patient', 'appointment', 'intake', 'healthcare'])) return 'healthcare';
  if (includesAny(text, ['real estate', 'property', 'listing', 'broker', 'tenant'])) return 'real-estate';
  if (includesAny(text, ['finance', 'invoice', 'payment', 'billing', 'revenue'])) return 'finance';
  return 'general';
}

function defaultToolStack(domain: string) {
  const common = ['Amazon Bedrock', 'Decision Ledger', 'Company Memory'];
  if (domain === 'commerce') return ['Shopify', 'Stripe', 'Gmail', 'Slack', ...common];
  if (domain === 'saas') return ['Stripe', 'HubSpot', 'Intercom', 'Product Analytics', ...common];
  if (domain === 'agency') return ['Notion', 'Linear', 'Gmail', 'Slack', ...common];
  if (domain === 'healthcare') return ['Intake Forms', 'Calendar', 'Secure Notes', ...common];
  if (domain === 'real-estate') return ['CRM', 'Email', 'Property Database', ...common];
  if (domain === 'finance') return ['Stripe', 'QuickBooks', 'Spreadsheet', ...common];
  return common;
}

function uniqueList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 10);
}

function successMetricFor(result: string, domain: string) {
  if (domain === 'commerce') return `Completed commerce outcome: ${result}, measured by recovered orders, refund leakage, and customer response time`;
  if (domain === 'saas') return `Completed SaaS outcome: ${result}, measured by activation, churn risk reduction, and expansion signals`;
  if (domain === 'agency') return `Completed client outcome: ${result}, measured by deliverable cycle time, approval rate, and client satisfaction`;
  if (domain === 'finance') return `Completed finance outcome: ${result}, measured by recovered payments, invoice cycle time, and spend variance`;
  return `Completed customer outcome: ${result}, measured by finished tasks, time saved, quality score, and blocked risk`;
}

function approvalItems(profile: Profile) {
  const explicit = splitInput(profile.actionsRequiringApproval);
  if (explicit.length) return explicit;
  const highRisk = splitInput(profile.highRiskWork);
  if (highRisk.length) return highRisk.map((item) => `Human approval before ${item}`);
  return ['Human approval before financial, legal, production, or customer-impacting actions'];
}

export function generateCompanyOS(profile: Profile): GeneratedCompanyOS {
  const source = [
    profile.businessDescription,
    profile.customers,
    profile.coreDepartments,
    profile.existingHumanRoles,
    profile.repetitiveWork,
    profile.highRiskWork,
    profile.currentTools,
    profile.aiAutomationGoals,
    profile.actionsRequiringApproval,
    profile.blockedActions,
    profile.autoApprovedActions,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const monthlyBudget = Number(profile.monthlyAiBudget ?? 500) || 500;
  const dailyBudgetBase = Math.max(8, Math.round(monthlyBudget / 30 / 4));
  const workspaceId = profile.workspaceId;
  const result = customerResult(profile);
  const domain = inferDomain(source);
  const userTools = splitInput(profile.currentTools);
  const automationGoals = splitInput(profile.aiAutomationGoals);
  const repetitiveWork = splitInput(profile.repetitiveWork);
  const approvalRules = approvalItems(profile);
  const blockedActions = splitInput(profile.blockedActions);
  const autoApprovedActions = splitInput(profile.autoApprovedActions);
  const toolStack = uniqueList([...userTools, ...defaultToolStack(domain)]);
  const resultName = shortPhrase(result, 'Customer Outcome');

  const departmentSpecs: {
    key: string;
    name: string;
    purpose: string;
    kpis: string[];
    riskLevel: RiskLevel;
  }[] = [
    { key: 'executive', name: 'Executive Ops', purpose: 'Coordinate the AI-native company around measurable customer results and board-level proof.', kpis: ['Outcome delivery health', 'Policy compliance', 'Weekly result velocity'], riskLevel: 'medium' as const },
    { key: 'operations', name: 'Operations', purpose: 'Run day-to-day workflows that deliver the promised customer result.', kpis: ['Results delivered', 'Cycle time', 'Escalation rate'], riskLevel: 'medium' as const },
    { key: 'strategy', name: 'Strategy & Architecture', purpose: 'Convert founder intent into outcome maps, operating models, and agent roadmaps.', kpis: ['Outcome map quality', 'Roadmap clarity', 'Assumption coverage'], riskLevel: 'medium' as const },
    { key: 'ai-systems', name: 'AI Systems', purpose: 'Own model routing, voice interactions, tool execution, and AI service reliability.', kpis: ['Live response success', 'Model latency', 'Tool error rate'], riskLevel: 'high' as const },
    { key: 'knowledge', name: 'Knowledge & Data', purpose: 'Maintain source-of-truth memory, metrics, transcripts, and reusable company context.', kpis: ['Knowledge freshness', 'Data quality', 'Retrieval accuracy'], riskLevel: 'medium' as const },
    { key: 'qa', name: 'QA / Risk', purpose: 'Review outputs, detect risky behavior, and enforce governance policies.', kpis: ['Risky actions blocked', 'Review accuracy', 'Low-confidence catches'], riskLevel: 'high' as const },
  ];

  departmentSpecs.push({
    key: 'outcome-delivery',
    name: `${resultName} Delivery`,
    purpose: `Own the end-to-end delivery loop for ${result} across customer-facing and back-office workflows.`,
    kpis: [successMetricFor(result, domain), 'Proof records created', 'Customer handoff quality'],
    riskLevel: profile.riskTolerance === 'critical' ? 'critical' : 'medium',
  });

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
      goal: `Keep the company OS aligned to the customer result: ${result}.`,
      tools: ['Company OS', 'Board Report', 'Decision Ledger'],
      autonomyLevel: 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'medium',
      status: 'healthy',
      currentTask: 'Preparing result delivery health summary',
      successRate: 92,
      costToday: '3.80',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('Strategy & Architecture'),
      name: 'Company Architect Agent',
      role: 'AI-native company designer',
      goal: `Translate "${result}" for ${profile.customers} into departments, agents, workflows, policies, KPIs, proof points, and launch sequencing.`,
      tools: uniqueList(['Bedrock', 'Outcome Map', 'Company Blueprint', 'Operating Model Canvas', 'Roadmap Planner', ...toolStack]),
      autonomyLevel: 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'medium',
      status: 'healthy',
      currentTask: 'Mapping customer outcomes to agent-owned delivery loops',
      successRate: 91,
      costToday: '5.60',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('Operations'),
      name: 'Workflow Architect Agent',
      role: 'Process mining and automation designer',
      goal: `Convert ${repetitiveWork.length ? repetitiveWork.join(', ') : 'manual work'} into auditable workflows that produce ${result}.`,
      tools: uniqueList(['Workflow Builder', 'SOP Generator', 'Decision Ledger', 'Process Map', ...toolStack]),
      autonomyLevel: 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'medium',
      status: 'healthy',
      currentTask: 'Designing result delivery workflows',
      successRate: 90,
      costToday: '4.90',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('AI Systems'),
      name: 'Live Voice Operator Agent',
      role: 'Real-time voice and text operator',
      goal: `Let the founder create, inspect, and run ${resultName.toLowerCase()} automations by voice or text while respecting approval rules.`,
      tools: uniqueList(['Browser Speech Recognition', 'Amazon Bedrock', 'Amazon Polly', 'Transcript Memory', ...toolStack]),
      autonomyLevel: 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'medium',
      status: 'healthy',
      currentTask: 'Standing by for live dashboard conversations',
      successRate: 87,
      costToday: '6.45',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('AI Systems'),
      name: 'Model Router Agent',
      role: 'AI service reliability operator',
      goal: 'Route work across Bedrock, Polly, Transcribe, deterministic generators, and future tools with traceable failures.',
      tools: ['Bedrock Runtime', 'Polly', 'Transcribe', 'AWS Metrics', 'API Logs'],
      autonomyLevel: 'approval_required',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'high',
      status: 'warning',
      currentTask: 'Checking AWS configuration coverage',
      successRate: 84,
      costToday: '3.35',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('Knowledge & Data'),
      name: 'Knowledge Steward Agent',
      role: 'Company memory curator',
      goal: 'Keep onboarding answers, transcripts, SOPs, policies, decisions, and board reports usable as company memory.',
      tools: ['Aurora PostgreSQL', 'Decision Ledger', 'Transcript Store', 'Source Quality Checks'],
      autonomyLevel: 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'medium',
      status: 'healthy',
      currentTask: 'Indexing generated SOPs and policy decisions',
      successRate: 93,
      costToday: '2.75',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('Knowledge & Data'),
      name: 'Metrics Analyst Agent',
      role: 'Operating analytics agent',
      goal: 'Calculate result delivery rate, operating health, spend, ROI, approval latency, risky actions, and human hours saved.',
      tools: ['Outcome Metrics', 'Dashboard Metrics', 'Board Report', 'Aurora Queries', 'Cost Tracker'],
      autonomyLevel: 'suggest',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'low',
      status: 'healthy',
      currentTask: 'Reconciling result delivery, agent ROI, and daily spend',
      successRate: 95,
      costToday: '1.80',
    },
    {
      id: nanoid(),
      workspaceId,
      departmentId: byName.get('QA / Risk'),
      name: 'Policy Guardian Agent',
      role: 'Risk reviewer and governance operator',
      goal: 'Flag low-confidence outputs, risky autonomous actions, PII exposure, and policy violations before they affect customers.',
      tools: ['Policy Engine', 'Evaluation Rubrics', 'Decision Ledger', 'PII Redaction'],
      autonomyLevel: 'approval_required',
      dailyBudget: String(dailyBudgetBase),
      riskLevel: 'high',
      status: 'healthy',
      currentTask: 'Reviewing critical autonomy boundaries',
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

  addAgent(
    `${resultName} Owner Agent`,
    `${resultName} Delivery`,
    'Outcome delivery owner',
    `Own the measurable delivery of "${result}" for ${profile.customers}. This agent turns workflow runs into verified business result records.`,
    uniqueList([...toolStack, 'Workflow Runtime', 'Results Center', 'Customer Context']),
    profile.riskTolerance === 'critical' ? 'critical' : 'medium',
    `Preparing the first proof-backed delivery loop for ${result}`,
    91,
    '4.10',
  );

  addAgent(
    'Agent Developer Agent',
    'AI Systems',
    'Digital FTE designer and evaluator',
    `Design new agents from user tasks with role, goal, tools, memory scope, allowed actions, blocked actions, approval gates, success metrics, and failure modes personalized to ${profile.customers}.`,
    uniqueList(['Agent Spec Builder', 'Policy Engine', 'Workflow Runtime', 'Evaluation Rubrics', ...toolStack]),
    'high',
    'Generating stricter agent specs with permission boundaries and result metrics',
    89,
    '5.25',
  );

  addAgent(
    'Tool Connector Agent',
    'AI Systems',
    'Integration planner and tool health operator',
    `Map the user's tools (${toolStack.join(', ')}) into safe workflow steps, permission scopes, webhooks, and fallback behavior.`,
    uniqueList(['Integration Registry', 'Webhook Tester', 'Credential Scope Review', ...toolStack]),
    'high',
    'Checking which tools are ready for executable workflows',
    86,
    '3.70',
  );

  addAgent(
    'Result QA Agent',
    'QA / Risk',
    'Outcome evaluator and quality gate',
    `Evaluate whether outputs actually create "${result}" instead of generic activity. Block weak, risky, or unproven results.`,
    uniqueList(['Result Rubric', 'Evidence Review', 'Policy Engine', 'Decision Ledger']),
    'high',
    'Defining quality gates and proof requirements for generated workflows',
    90,
    '3.95',
  );

  automationGoals.slice(0, 3).forEach((goal, index) => {
    addAgent(
      `${shortPhrase(goal, `Automation ${index + 1}`)} Agent`,
      `${resultName} Delivery`,
      'Personalized automation operator',
      `Automate "${goal}" for ${profile.customers} and prove impact against: ${result}.`,
      uniqueList([...toolStack, 'Workflow Runtime', 'Approval Queue']),
      profile.riskTolerance === 'low' ? 'medium' : profile.riskTolerance || 'medium',
      `Designing execution steps for ${goal}`,
      88 - index,
      String((3.2 + index).toFixed(2)),
    );
  });

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
      name: 'Weekly Result Board Report Workflow',
      trigger: 'Every Friday or on-demand founder request',
      ownerAgentId: agentByName.get('CEO Operator Agent'),
      steps: ['Collect agent scorecards', 'Summarize delivered results', 'Summarize risk', 'Calculate spend', 'Recommend autonomy changes'],
      toolsUsed: ['Decision Ledger', 'Outcome Metrics', 'Company Metrics', 'Policy Engine'],
      approvalPoints: ['Founder approves recommended autonomy changes'],
      successMetric: 'Board report generated with results delivered, risk, cost, and ROI summary',
      failurePath: 'Escalate missing data to human operator',
    },
    {
      id: nanoid(),
      workspaceId,
      name: 'Risk Review Workflow',
      trigger: 'Low confidence, high-risk action, or blocked policy event',
      ownerAgentId: agentByName.get('Policy Guardian Agent'),
      steps: ['Review proposed action', 'Match policy', 'Score risk', 'Approve, block, or escalate'],
      toolsUsed: ['Policy Engine', 'Decision Ledger'],
      approvalPoints: ['Human approval for high or critical risk'],
      successMetric: 'Risky action prevented before customer impact',
      failurePath: 'Block action and create incident review',
    },
    {
      id: nanoid(),
      workspaceId,
      name: 'Outcome-to-Company OS Design Loop',
      trigger: 'Founder updates business model, customer segment, or automation goals',
      ownerAgentId: agentByName.get('Company Architect Agent'),
      steps: ['Parse promised customer result', 'Update outcome map', 'Update company blueprint', 'Map departments and agent ownership', 'Propose launch sequence', 'Write changes to board report'],
      toolsUsed: ['Amazon Bedrock', 'Outcome Map', 'Company Blueprint', 'Board Report', 'Decision Ledger'],
      approvalPoints: ['Founder approval before replacing core operating model'],
      successMetric: 'Updated blueprint with clear result owners, KPIs, proof points, and operating assumptions',
      failurePath: 'Keep prior blueprint and create review task',
    },
    {
      id: nanoid(),
      workspaceId,
      name: 'Workflow Mining and Automation',
      trigger: 'Repetitive work, bottleneck, or manual handoff identified',
      ownerAgentId: agentByName.get('Workflow Architect Agent'),
      steps: ['Capture current process', 'Find automation candidates', 'Define trigger and owner agent', 'Add approval checkpoints', 'Generate SOP'],
      toolsUsed: ['Workflow Builder', 'SOP Generator', 'Policy Engine'],
      approvalPoints: ['Human approval before auto-act autonomy is enabled'],
      successMetric: 'Workflow is executable, governed, linked to an SOP, and tied to a customer result',
      failurePath: 'Route unclear workflow to founder clarification',
    },
    {
      id: nanoid(),
      workspaceId,
      name: 'Live Founder Voice Session',
      trigger: 'Founder clicks Talk live in dashboard',
      ownerAgentId: agentByName.get('Live Voice Operator Agent'),
      steps: ['Capture speech in browser', 'Send text to Bedrock', 'Speak reply with Polly', 'Store useful operating context', 'Escalate risky requests'],
      toolsUsed: ['Browser Speech Recognition', 'Amazon Bedrock', 'Amazon Polly', 'Decision Ledger'],
      approvalPoints: ['Policy Guardian review for financial, legal, production, or customer-impacting actions'],
      successMetric: 'Founder receives a useful spoken answer with traceable context',
      failurePath: 'Return typed fallback and log AWS service failure',
    },
    {
      id: nanoid(),
      workspaceId,
      name: 'Knowledge Memory Refresh',
      trigger: 'New onboarding answer, transcript, SOP, decision, or board report',
      ownerAgentId: agentByName.get('Knowledge Steward Agent'),
      steps: ['Normalize source record', 'Tag business context', 'Check source freshness', 'Attach to workspace memory', 'Expose to live operator context'],
      toolsUsed: ['Aurora PostgreSQL', 'Transcript Store', 'Decision Ledger'],
      approvalPoints: ['Human review before retaining sensitive customer data'],
      successMetric: 'Relevant company context is available to agents without leaking sensitive data',
      failurePath: 'Quarantine questionable source and request review',
    },
    {
      id: nanoid(),
      workspaceId,
      name: 'AI Service Reliability Check',
      trigger: 'AWS error, model timeout, high latency, or failed speech response',
      ownerAgentId: agentByName.get('Model Router Agent'),
      steps: ['Classify service failure', 'Check AWS configuration', 'Retry safe requests', 'Open incident event', 'Recommend fallback'],
      toolsUsed: ['AWS Metrics', 'API Logs', 'Bedrock Runtime', 'Polly', 'Transcribe'],
      approvalPoints: ['Human approval before changing model IDs or credential scope'],
      successMetric: 'AI service failures are visible, explainable, and recoverable',
      failurePath: 'Pause affected live interactions and notify founder',
    },
  ];

  workflowRows.push({
    id: nanoid(),
    workspaceId,
    name: `${resultName} Result Delivery Loop`,
    trigger: `New customer, request, account, or task related to: ${result}`,
    ownerAgentId: agentByName.get(`${resultName} Owner Agent`),
    steps: [
      `Identify customer context for ${profile.customers}`,
      `Classify the desired result: ${result}`,
      `Select the right agent and tool path from ${toolStack.slice(0, 4).join(', ')}`,
      'Check policy, risk, and approval requirements',
      'Execute or prepare the workflow run',
      'Create proof record in Results Center',
      'Write decision, cost, and next action to ledger',
    ],
    toolsUsed: uniqueList([...toolStack, 'Workflow Runtime', 'Results Center']),
    approvalPoints: approvalRules,
    successMetric: successMetricFor(result, domain),
    failurePath: 'Stop execution, store failed step evidence, and ask the founder for the missing data or approval.',
  });

  workflowRows.push({
    id: nanoid(),
    workspaceId,
    name: 'Personalized Agent Development Workflow',
    trigger: 'User asks to create or improve an AI agent',
    ownerAgentId: agentByName.get('Agent Developer Agent'),
    steps: [
      'Parse requested business task and customer outcome',
      'Infer agent role, tools, memory scopes, allowed actions, and blocked actions',
      'Generate approval gates from risk and user preferences',
      'Attach measurable success metrics and failure modes',
      'Create matching workflow, policy, SOP, and ledger record',
      'Run quality review against the result rubric',
    ],
    toolsUsed: uniqueList(['Agent Spec Builder', 'Policy Engine', 'SOP Generator', 'Workflow Runtime', ...toolStack]),
    approvalPoints: approvalRules,
    successMetric: 'Agent spec includes result ownership, tool permissions, blocked actions, approvals, metrics, and proof requirements',
    failurePath: 'Reject generic agent spec and ask for sharper task/outcome context.',
  });

  workflowRows.push({
    id: nanoid(),
    workspaceId,
    name: 'Tool-to-Result Integration Workflow',
    trigger: 'User lists tools or requests task automation with external systems',
    ownerAgentId: agentByName.get('Tool Connector Agent'),
    steps: [
      'Map each tool to required workflow capability',
      'Define minimum permission scope',
      'Create webhook or API action plan',
      'Add fallback if the tool is unavailable',
      'Route risky tool actions through approval',
      'Attach tool evidence to workflow run',
    ],
    toolsUsed: uniqueList(['Integration Registry', 'Webhook Tester', 'Credential Scope Review', ...toolStack]),
    approvalPoints: ['Human approval before credential changes, external sends, financial changes, or production mutations'],
    successMetric: 'Every external tool has a clear permission scope, action plan, fallback, and evidence record',
    failurePath: 'Keep workflow in simulation mode until integration requirements are complete.',
  });

  repetitiveWork.slice(0, 4).forEach((task) => {
    workflowRows.push({
      id: nanoid(),
      workspaceId,
      name: `${shortPhrase(task, 'Manual Task')} Automation Workflow`,
      trigger: `Manual or recurring task detected: ${task}`,
      ownerAgentId: agentByName.get(`${resultName} Owner Agent`) || agentByName.get('Workflow Architect Agent'),
      steps: [
        `Capture inputs needed for: ${task}`,
        'Retrieve customer and company context',
        `Use available tools: ${toolStack.slice(0, 4).join(', ')}`,
        'Check blocked actions and approval gates',
        'Execute safe steps or prepare approval package',
        `Measure contribution to: ${result}`,
        'Record proof, cost, and next action',
      ],
      toolsUsed: uniqueList([...toolStack, 'Decision Ledger']),
      approvalPoints: approvalRules,
      successMetric: `Reduced manual work for "${task}" while producing ${result}`,
      failurePath: 'Escalate incomplete inputs or policy conflict to the founder.',
    });
  });

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
    { id: nanoid(), workspaceId, name: 'Low confidence human review', description: 'Human review required if response confidence is below 85%.', condition: 'confidence < 85', action: 'Escalate to Policy Guardian Agent', mode: 'require_approval', riskLevel: 'medium', enabled: true },
    { id: nanoid(), workspaceId, name: 'Production deploy approval', description: 'Any production deployment requires explicit approval.', condition: 'action == deploy_production', action: 'Require founder approval', mode: 'require_approval', riskLevel: 'critical', enabled: true },
    { id: nanoid(), workspaceId, name: 'Customer data deletion block', description: 'Agents cannot delete customer data autonomously.', condition: 'action == delete_customer_data', action: 'Block action', mode: 'block', riskLevel: 'critical', enabled: true },
    { id: nanoid(), workspaceId, name: 'Live voice sensitive action guardrail', description: 'Live voice conversations cannot execute financial, legal, production, or customer-impacting actions directly.', condition: 'channel == live_voice AND risk >= high', action: 'Escalate to Policy Guardian Agent', mode: 'require_approval', riskLevel: 'high', enabled: true },
    { id: nanoid(), workspaceId, name: 'PII memory retention review', description: 'Transcripts and documents containing customer PII must be reviewed before becoming reusable company memory.', condition: 'source_contains_pii == true', action: 'Quarantine source and request review', mode: 'require_approval', riskLevel: 'high', enabled: true },
    { id: nanoid(), workspaceId, name: 'AWS credential scope policy', description: 'Agents may inspect AWS service health but cannot expand credential permissions.', condition: 'action == modify_aws_permissions', action: 'Block and notify founder', mode: 'block', riskLevel: 'critical', enabled: true },
    { id: nanoid(), workspaceId, name: 'Auto-act readiness gate', description: 'Agents require three successful simulations and explicit founder approval before auto-act autonomy.', condition: 'autonomy == auto_act AND simulations_passed < 3', action: 'Keep approval-required mode', mode: 'block', riskLevel: 'high', enabled: true },
  ];

  approvalRules.slice(0, 5).forEach((rule) => {
    policyRows.push({
      id: nanoid(),
      workspaceId,
      name: `${shortPhrase(rule, 'Approval')} Approval Rule`,
      description: `Personalized approval rule from onboarding: ${rule}`,
      condition: rule,
      action: 'Route to owner approval before execution',
      mode: 'require_approval',
      riskLevel: profile.riskTolerance === 'low' ? 'medium' : profile.riskTolerance || 'high',
      enabled: true,
    });
  });

  blockedActions.slice(0, 5).forEach((action) => {
    policyRows.push({
      id: nanoid(),
      workspaceId,
      name: `${shortPhrase(action, 'Blocked Action')} Block`,
      description: `Personalized blocked action from onboarding: ${action}`,
      condition: action,
      action: 'Block action and write decision ledger record',
      mode: 'block',
      riskLevel: 'critical',
      enabled: true,
    });
  });

  autoApprovedActions.slice(0, 5).forEach((action) => {
    policyRows.push({
      id: nanoid(),
      workspaceId,
      name: `${shortPhrase(action, 'Auto Approved')} Auto Approval`,
      description: `Personalized low-risk action allowed by the founder: ${action}`,
      condition: action,
      action: 'Auto-approve and log the action',
      mode: 'auto_approve',
      riskLevel: 'low',
      enabled: true,
    });
  });

  const refundAgent = ftes.find((a) => a.name === 'Refund Agent') ?? ftes[0];
  const researchAgent = ftes.find((a) => a.name === 'Research Agent') ?? ftes[0];
  const qaAgent = ftes.find((a) => a.name === 'Policy Guardian Agent') ?? ftes[0];
  const modelRouterAgent = ftes.find((a) => a.name === 'Model Router Agent') ?? ftes[0];
  const voiceAgent = ftes.find((a) => a.name === 'Live Voice Operator Agent') ?? ftes[0];

  const decisions: InferInsertModel<typeof decisionLedger>[] = [
    { id: nanoid(), workspaceId, agentId: refundAgent.id, departmentId: refundAgent.departmentId ?? undefined, action: 'Requested $1,200 refund', policyMatched: 'High-value financial action approval', riskLevel: 'high', decision: 'pending', result: 'Waiting for human approval', approvedBy: null, databaseReference: `aurora:decision:${nanoid(8)}` },
    { id: nanoid(), workspaceId, agentId: researchAgent.id, departmentId: researchAgent.departmentId ?? undefined, action: 'Exceeded spend baseline', policyMatched: 'Agent spend circuit breaker', riskLevel: 'medium', decision: 'throttled', result: 'Agent throttled; estimated savings $312/day', approvedBy: 'ZeroCo Policy Engine', databaseReference: `aurora:decision:${nanoid(8)}` },
    { id: nanoid(), workspaceId, agentId: qaAgent.id, departmentId: qaAgent.departmentId ?? undefined, action: 'Flagged risky response', policyMatched: 'Low confidence human review', riskLevel: 'medium', decision: 'blocked', result: 'Response sent for review', approvedBy: 'Policy Guardian Agent', databaseReference: `aurora:decision:${nanoid(8)}` },
    { id: nanoid(), workspaceId, agentId: voiceAgent.id, departmentId: voiceAgent.departmentId ?? undefined, action: 'Founder asked live voice agent to approve a high-risk action', policyMatched: 'Live voice sensitive action guardrail', riskLevel: 'high', decision: 'pending', result: 'Live request converted into approval task', approvedBy: null, databaseReference: `aurora:decision:${nanoid(8)}` },
    { id: nanoid(), workspaceId, agentId: modelRouterAgent.id, departmentId: modelRouterAgent.departmentId ?? undefined, action: 'Detected missing AWS service configuration', policyMatched: 'AWS credential scope policy', riskLevel: 'critical', decision: 'blocked', result: 'Agent blocked credential changes and requested human setup', approvedBy: 'Policy Guardian Agent', databaseReference: `aurora:decision:${nanoid(8)}` },
  ];

  const events: InferInsertModel<typeof simulationEvents>[] = [
    { id: nanoid(), workspaceId, agentId: agentByName.get('Support Agent'), eventType: 'task_completed', title: 'Support Agent resolved 18 tickets', description: 'Resolved routine tickets using SOP-backed responses.', severity: 'info', status: 'closed' },
    { id: nanoid(), workspaceId, agentId: refundAgent.id, eventType: 'approval_requested', title: 'Refund Agent requested approval', description: 'A $1,200 refund matched high-value financial approval policy.', severity: 'high', status: 'pending' },
    { id: nanoid(), workspaceId, agentId: researchAgent.id, eventType: 'cost_alert', title: 'Research Agent exceeded spend limit', description: 'Spend rose above 3x baseline with low useful-output rate; agent was throttled.', severity: 'warning', status: 'throttled' },
    { id: nanoid(), workspaceId, agentId: qaAgent.id, eventType: 'risk_flagged', title: 'Policy Guardian Agent flagged 3 risky responses', description: 'Low-confidence outputs were blocked before customer delivery.', severity: 'warning', status: 'open' },
    { id: nanoid(), workspaceId, agentId: voiceAgent.id, eventType: 'live_voice_ready', title: 'Live Voice Operator is ready', description: 'Dashboard can accept text or microphone input and respond through Bedrock plus Polly.', severity: 'info', status: 'open' },
    { id: nanoid(), workspaceId, agentId: modelRouterAgent.id, eventType: 'aws_config_check', title: 'Model Router checked AWS service readiness', description: 'Bedrock, Polly, Transcribe, and Cognito settings are monitored before live operations.', severity: 'warning', status: 'open' },
  ];

  const companyName = `${profile.businessDescription.split(/\s+/).slice(0, 3).join(' ') || 'AI-Native'} OS`.replace(/[^a-zA-Z0-9 &-]/g, '').trim();

  const blueprint: InferInsertModel<typeof companyBlueprints> = {
    id: nanoid(),
    workspaceId,
    companyName,
    targetCustomer: profile.customers,
    valueProposition: `Deliver ${result} through a governed AI-native operation with digital FTEs, quality gates, proof of work, and measurable ROI.`,
    revenueModel: includesAny(source, ['agency', 'client']) ? 'Outcome-based retainer plus usage-based automation fee' : 'Subscription plus outcome-based expansion',
    operatingModel: 'Human-led, AI-operated result delivery system with policy-bounded digital FTEs, quality gates, and database-backed decision memory.',
    coreKpis: ['Results delivered', 'Outcome quality', 'Agent ROI', 'Human hours saved', 'Risky actions blocked', 'Approval latency'],
    launchChecklist: ['Define paid customer result', 'Review generated digital FTE owners', 'Approve result quality gates', 'Run first result simulation', 'Export board report'],
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
    summary: `ZeroCo generated ${ftes.length} digital FTEs, ${workflowRows.length} workflows, ${policyRows.length} governance policies, and a starter decision ledger to deliver: ${result}.`,
    tasksCompleted: events.filter((event) => event.eventType === 'task_completed').length * 18,
    moneySpent: String(ftes.reduce((sum, agent) => sum + Number(agent.costToday || 0), 0).toFixed(2)),
    hoursSaved: Math.max(8, ftes.length * 3),
    riskyActionsBlocked: decisions.filter((decision) => ['blocked', 'throttled', 'paused'].includes(decision.decision as string)).length,
    recommendations: ['Tie every agent to a measurable customer result', 'Review quality gates before enabling auto-act autonomy', 'Keep financial and production actions approval-required', 'Run 3 result simulations before connecting real tools'],
    auditSummary: 'Starter ledger created in Aurora PostgreSQL with result delivery decisions, approval requests, and cost-control actions.',
  };

  return { departments: deptRows, digitalFtes: ftes, workflows: workflowRows, policies: policyRows, decisions, events, blueprint, sops: sopRows, boardReport };
}
