import 'server-only';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { InferInsertModel } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { companyBlueprints } from '@/db/schema';

type BlueprintInsert = InferInsertModel<typeof companyBlueprints>;
type AnyRecord = Record<string, unknown>;

type CompanyOS = {
  departments: AnyRecord[];
  digitalFtes: AnyRecord[];
  workflows: AnyRecord[];
  policies: AnyRecord[];
  decisions: AnyRecord[];
  events: AnyRecord[];
  blueprint: AnyRecord;
  sops: AnyRecord[];
  boardReport: AnyRecord;
};

type Profile = {
  businessDescription: string;
  customers: string;
  problemSolved?: string | null;
  customerOutcome?: string | null;
  coreDepartments?: string | null;
  currentTools?: string | null;
  aiAutomationGoals?: string | null;
  riskTolerance?: string | null;
  selectedFtes?: string[] | null;
};

function configured() {
  return process.env.AWS_REGION && process.env.AWS_BEDROCK_MODEL_ID;
}

function cleanJson(text: string) {
  const stripped = text.replace(/```json|```/g, '').trim();
  const firstObject = stripped.indexOf('{');
  const lastObject = stripped.lastIndexOf('}');
  const firstArray = stripped.indexOf('[');
  const lastArray = stripped.lastIndexOf(']');

  if (firstObject !== -1 && lastObject > firstObject) {
    return stripped.slice(firstObject, lastObject + 1);
  }

  if (firstArray !== -1 && lastArray > firstArray) {
    return stripped.slice(firstArray, lastArray + 1);
  }

  return stripped;
}

function asString(value: unknown, fallback: string, max = 1600) {
  const text = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return text.slice(0, max);
}

function asStringArray(value: unknown, fallback: unknown[] = [], max = 8) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => String(item).trim()).filter(Boolean).slice(0, max);
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return allowed.includes(value as T) ? value as T : fallback;
}

function requireObject(value: unknown, label: string): AnyRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Bedrock returned invalid ${label}.`);
  }
  return value as AnyRecord;
}

function requireItems(value: unknown, label: string, min: number) {
  if (!Array.isArray(value) || value.length < min) {
    throw new Error(`Bedrock must return at least ${min} ${label}.`);
  }
  return value as AnyRecord[];
}

function requireText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Bedrock returned missing ${label}.`);
  }
  return value.trim();
}

async function converseText(prompt: string, maxTokens: number, temperature = 0.25) {
  if (!configured()) {
    throw new Error('Amazon Bedrock is required. Set AWS_REGION and AWS_BEDROCK_MODEL_ID.');
  }

  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  const response = await client.send(new ConverseCommand({
    modelId: process.env.AWS_BEDROCK_MODEL_ID!,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { temperature, maxTokens },
  }));

  const text = response.output?.message?.content?.find((part) => 'text' in part)?.text;
  if (!text) throw new Error('Amazon Bedrock returned an empty response.');
  return text.trim();
}

function parseBedrockJson(text: string) {
  try {
    return JSON.parse(cleanJson(text));
  } catch (error) {
    throw new Error(`Amazon Bedrock returned invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`);
  }
}

async function runBedrockJson(prompt: string, maxTokens = 5500) {
  const text = await converseText(prompt, maxTokens);
  try {
    return parseBedrockJson(text);
  } catch (firstError) {
    const repairPrompt = `Repair the following model output into strict valid JSON only. Do not add markdown, comments, explanations, or new fields. Preserve all useful fields and arrays.

Original instruction:
${prompt.slice(0, 6000)}

Invalid output:
${text.slice(0, 12000)}`;

    const repaired = await converseText(repairPrompt, Math.min(maxTokens, 5500), 0);
    try {
      return parseBedrockJson(repaired);
    } catch {
      throw firstError;
    }
  }
}

export async function enhanceBlueprintWithBedrock(profile: Profile, current: BlueprintInsert): Promise<BlueprintInsert> {
  if (!configured()) {
    throw new Error('Amazon Bedrock is required. Set AWS_REGION and AWS_BEDROCK_MODEL_ID.');
  }

  const prompt = `You are designing an outcome-driven AI-native company operating system. Do not describe generic AI services. Design a system that delivers the concrete customer result and proves it with metrics, quality gates, workflows, policies, and digital FTE ownership. Return ONLY valid JSON with keys: companyName, valueProposition, revenueModel, operatingModel, coreKpis array, launchChecklist array. Do not include markdown.\n\nBusiness: ${profile.businessDescription}\nCustomers: ${profile.customers}\nProblem: ${profile.problemSolved || ''}\nPaid customer result: ${profile.customerOutcome || ''}\nDepartments: ${profile.coreDepartments || ''}\nTools: ${profile.currentTools || ''}\nAutomation goals: ${profile.aiAutomationGoals || ''}\nRisk tolerance: ${profile.riskTolerance || 'medium'}\nFounder-selected Digital FTE types: ${(profile.selectedFtes || []).join(', ')}`;
  const parsed = await runBedrockJson(prompt, 900);
  return {
    ...current,
    companyName: String(parsed.companyName || current.companyName).slice(0, 120),
    valueProposition: String(parsed.valueProposition || current.valueProposition),
    revenueModel: String(parsed.revenueModel || current.revenueModel),
    operatingModel: String(parsed.operatingModel || current.operatingModel),
    coreKpis: Array.isArray(parsed.coreKpis) ? parsed.coreKpis.map(String).slice(0, 8) : current.coreKpis,
    launchChecklist: Array.isArray(parsed.launchChecklist) ? parsed.launchChecklist.map(String).slice(0, 8) : current.launchChecklist,
  };
}

export async function enhanceCompanyOSWithBedrock(profile: Profile, current: CompanyOS): Promise<CompanyOS> {
  const prompt = `You are ZeroCo's operating-system generator. Generate a fully dynamic, business-specific AI-native company OS from the founder's exact inputs. Avoid generic placeholder names. Every department, digital FTE, workflow, policy, SOP, decision, KPI, and runbook item must be specific to this company, customer, tools, risks, and desired outcome.

Return ONLY valid JSON. Do not include markdown. Preserve these top-level keys:
{
  "blueprint": {"companyName": "", "valueProposition": "", "revenueModel": "", "operatingModel": "", "coreKpis": [], "launchChecklist": []},
  "departments": [{"name": "", "purpose": "", "kpis": [], "riskLevel": "low|medium|high|critical", "budget": "number"}],
  "digitalFtes": [{"name": "", "departmentName": "", "role": "", "goal": "", "tools": [], "autonomyLevel": "observe|suggest|approval_required|auto_act", "dailyBudget": "number", "riskLevel": "low|medium|high|critical", "status": "healthy|warning|blocked|throttled|paused", "currentTask": "", "successRate": 1, "costToday": "number"}],
  "workflows": [{"name": "", "ownerAgentName": "", "trigger": "", "steps": [], "toolsUsed": [], "approvalPoints": [], "successMetric": "", "failurePath": ""}],
  "policies": [{"name": "", "description": "", "condition": "", "action": "", "mode": "auto_approve|require_approval|block|throttle|pause|escalate", "riskLevel": "low|medium|high|critical", "enabled": true}],
  "decisions": [{"agentName": "", "departmentName": "", "action": "", "policyMatched": "", "riskLevel": "low|medium|high|critical", "decision": "pending|approved|rejected|blocked|executed|throttled|paused", "result": "", "approvedBy": ""}],
  "events": [{"agentName": "", "eventType": "", "title": "", "description": "", "severity": "info|warning|high|critical", "status": ""}],
  "sops": [{"workflowName": "", "title": "", "objective": "", "owner": "", "steps": [], "requiredTools": [], "approvalRules": [], "failureHandling": "", "auditRequirements": ""}],
  "boardReport": {"title": "", "summary": "", "tasksCompleted": 1, "moneySpent": "number", "hoursSaved": 1, "riskyActionsBlocked": 1, "recommendations": [], "auditSummary": ""}
}

Choose the artifact count based on the business. Use 3-10 departments, 4-16 digital FTEs, 4-14 workflows, 5-14 policies, 3-8 governance decisions, and one SOP per workflow. Do not force a fixed template. Do not create fake completed events, fake revenue, fake customers, fake reports, or fake runtime results.

If the founder mentions sales, leads, outreach, CRM, revenue, pipeline, growth, client acquisition, bookings, demos, or business development, include a full sales operating system: Sales/Revenue department, Sales Agent, ICP research workflow, lead sourcing workflow, lead qualification/scoring workflow, personalized outreach workflow, follow-up/objection workflow, demo booking/handoff workflow, CRM hygiene workflow, sales governance policies, and sales KPIs such as qualified leads, reply rate, meetings booked, pipeline value, conversion rate, and policy-compliant outreach.

Founder inputs:
Business: ${profile.businessDescription}
Customers: ${profile.customers}
Problem: ${profile.problemSolved || ''}
Paid customer result: ${profile.customerOutcome || ''}
Departments/functions: ${profile.coreDepartments || ''}
Tools: ${profile.currentTools || ''}
Automation goals: ${profile.aiAutomationGoals || ''}
Risk tolerance: ${profile.riskTolerance || 'medium'}
Founder-selected Digital FTE types: ${(profile.selectedFtes || []).join(', ')}`;

  const parsed = await runBedrockJson(prompt);
  const requiredBlueprint = requireObject(parsed.blueprint, 'company blueprint');
  requireText(requiredBlueprint.companyName, 'company name');
  requireText(requiredBlueprint.valueProposition, 'value proposition');
  requireText(requiredBlueprint.operatingModel, 'operating model');
  requireItems(parsed.departments, 'departments', 3);
  requireItems(parsed.digitalFtes, 'digital FTEs', 4);
  requireItems(parsed.workflows, 'workflows', 4);
  requireItems(parsed.policies, 'policies', 5);
  requireItems(parsed.sops, 'SOPs', 4);
  requireItems(parsed.decisions, 'governance decisions', 3);
  (parsed.departments as unknown[]).forEach((item, index) => {
    const row = requireObject(item, `department ${index + 1}`);
    requireText(row.name, `department ${index + 1} name`);
    requireText(row.purpose, `department ${index + 1} purpose`);
  });
  (parsed.digitalFtes as unknown[]).forEach((item, index) => {
    const row = requireObject(item, `digital FTE ${index + 1}`);
    requireText(row.name, `digital FTE ${index + 1} name`);
    requireText(row.role, `digital FTE ${index + 1} role`);
    requireText(row.goal, `digital FTE ${index + 1} goal`);
  });
  (parsed.workflows as unknown[]).forEach((item, index) => {
    const row = requireObject(item, `workflow ${index + 1}`);
    requireText(row.name, `workflow ${index + 1} name`);
    requireText(row.trigger, `workflow ${index + 1} trigger`);
    requireText(row.successMetric, `workflow ${index + 1} success metric`);
  });
  (parsed.policies as unknown[]).forEach((item, index) => {
    const row = requireObject(item, `policy ${index + 1}`);
    requireText(row.name, `policy ${index + 1} name`);
    requireText(row.condition, `policy ${index + 1} condition`);
    requireText(row.action, `policy ${index + 1} action`);
  });
  (parsed.sops as unknown[]).forEach((item, index) => {
    const row = requireObject(item, `SOP ${index + 1}`);
    requireText(row.title, `SOP ${index + 1} title`);
    requireText(row.objective, `SOP ${index + 1} objective`);
  });
  const risk = ['low', 'medium', 'high', 'critical'] as const;
  const autonomy = ['observe', 'suggest', 'approval_required', 'auto_act'] as const;
  const agentStatus = ['healthy', 'warning', 'blocked', 'throttled', 'paused'] as const;
  const policyMode = ['auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate'] as const;
  const decisionStatus = ['pending', 'approved', 'rejected', 'blocked', 'executed', 'throttled', 'paused'] as const;
  const severity = ['info', 'warning', 'high', 'critical'] as const;
  const workspaceId = String(current.blueprint.workspaceId || current.departments[0]?.workspaceId || '');
  const deptFallback = current.departments[0] || {};
  const agentFallback = current.digitalFtes[0] || {};
  const workflowFallback = current.workflows[0] || {};

  const blueprint = requiredBlueprint;
  const departmentItems = (Array.isArray(parsed.departments) && parsed.departments.length ? parsed.departments : current.departments) as AnyRecord[];
  const departments = departmentItems
    .slice(0, 12)
    .map((item: AnyRecord) => ({
      id: nanoid(),
      workspaceId,
      name: asString(item.name, String(deptFallback.name || 'Operations'), 120),
      purpose: asString(item.purpose, String(deptFallback.purpose || 'Own measurable operating outcomes.')),
      kpis: asStringArray(item.kpis, deptFallback.kpis as unknown[], 8),
      riskLevel: enumValue(item.riskLevel, risk, deptFallback.riskLevel as typeof risk[number] || 'medium'),
      budget: asString(item.budget, String(deptFallback.budget || '0'), 30),
    }));
  const departmentByName = new Map(departments.map((department) => [department.name.toLowerCase(), department.id]));
  const firstDepartmentId = departments[0]?.id;

  const digitalFteItems = (Array.isArray(parsed.digitalFtes) && parsed.digitalFtes.length ? parsed.digitalFtes : current.digitalFtes) as AnyRecord[];
  const digitalFtes = digitalFteItems
    .slice(0, 20)
    .map((item: AnyRecord) => {
      const departmentName = asString(item.departmentName, '', 120).toLowerCase();
      return {
        id: nanoid(),
        workspaceId,
        departmentId: departmentByName.get(departmentName) || firstDepartmentId,
        name: asString(item.name, String(agentFallback.name || 'Digital FTE'), 120),
        role: asString(item.role, String(agentFallback.role || 'Operator'), 240),
        goal: asString(item.goal, String(agentFallback.goal || 'Deliver a measurable business result.')),
        tools: asStringArray(item.tools, agentFallback.tools as unknown[], 10),
        autonomyLevel: enumValue(item.autonomyLevel, autonomy, agentFallback.autonomyLevel as typeof autonomy[number] || 'suggest'),
        dailyBudget: asString(item.dailyBudget, String(agentFallback.dailyBudget || '10'), 30),
        riskLevel: enumValue(item.riskLevel, risk, agentFallback.riskLevel as typeof risk[number] || 'medium'),
        status: enumValue(item.status, agentStatus, agentFallback.status as typeof agentStatus[number] || 'healthy'),
        currentTask: asString(item.currentTask, String(agentFallback.currentTask || 'Waiting for assigned workflow'), 260),
        successRate: Math.max(1, Math.min(99, Number(item.successRate || agentFallback.successRate || 90))),
        costToday: asString(item.costToday, String(agentFallback.costToday || '0'), 30),
      };
    });
  const agentByName = new Map(digitalFtes.map((agent) => [agent.name.toLowerCase(), agent.id]));
  const agentDepartmentByName = new Map(digitalFtes.map((agent) => [agent.name.toLowerCase(), agent.departmentId]));
  const firstAgentId = digitalFtes[0]?.id;

  const workflowItems = (Array.isArray(parsed.workflows) && parsed.workflows.length ? parsed.workflows : current.workflows) as AnyRecord[];
  const workflows = workflowItems
    .slice(0, 18)
    .map((item: AnyRecord) => {
      const ownerName = asString(item.ownerAgentName, '', 120).toLowerCase();
      return {
        id: nanoid(),
        workspaceId,
        name: asString(item.name, String(workflowFallback.name || 'Workflow'), 160),
        trigger: asString(item.trigger, String(workflowFallback.trigger || 'Business event')),
        ownerAgentId: agentByName.get(ownerName) || firstAgentId,
        steps: asStringArray(item.steps, workflowFallback.steps as unknown[], 10),
        toolsUsed: asStringArray(item.toolsUsed, workflowFallback.toolsUsed as unknown[], 10),
        approvalPoints: asStringArray(item.approvalPoints, workflowFallback.approvalPoints as unknown[], 8),
        successMetric: asString(item.successMetric, String(workflowFallback.successMetric || 'Measurable business result')),
        failurePath: asString(item.failurePath, String(workflowFallback.failurePath || 'Escalate to the founder.')),
      };
    });
  const workflowByName = new Map(workflows.map((workflow) => [workflow.name.toLowerCase(), workflow.id]));

  const policyItems = (Array.isArray(parsed.policies) && parsed.policies.length ? parsed.policies : current.policies) as AnyRecord[];
  const policies = policyItems.slice(0, 18).map((item: AnyRecord) => ({
    id: nanoid(),
    workspaceId,
    name: asString(item.name, 'Generated Policy', 160),
    description: asString(item.description, 'Govern a business-specific AI action.'),
    condition: asString(item.condition, 'risk > low'),
    action: asString(item.action, 'Require review'),
    mode: enumValue(item.mode, policyMode, 'require_approval'),
    riskLevel: enumValue(item.riskLevel, risk, 'medium'),
    enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
  }));

  const decisionItems = (Array.isArray(parsed.decisions) && parsed.decisions.length ? parsed.decisions : current.decisions) as AnyRecord[];
  const decisions = decisionItems.slice(0, 10).map((item: AnyRecord, index: number) => {
    const agentName = asString(item.agentName, '', 120).toLowerCase();
    const departmentName = asString(item.departmentName, '', 120).toLowerCase();
    const agentId = agentByName.get(agentName) || firstAgentId;
    return {
      id: nanoid(),
      workspaceId,
      agentId,
      departmentId: departmentByName.get(departmentName) || agentDepartmentByName.get(agentName) || firstDepartmentId,
      action: asString(item.action, 'Generated operating decision'),
      policyMatched: asString(item.policyMatched, policies[0]?.name || 'Generated policy'),
      riskLevel: enumValue(item.riskLevel, risk, 'medium'),
      decision: enumValue(item.decision, decisionStatus, index === 0 ? 'pending' : 'executed'),
      result: asString(item.result, 'Stored for audit'),
      approvedBy: asString(item.approvedBy, '', 120) || null,
      databaseReference: `aurora:decision:${nanoid(8)}`,
    };
  });

  const eventItems = (Array.isArray(parsed.events) && parsed.events.length ? parsed.events : current.events) as AnyRecord[];
  const events = eventItems.slice(0, 10).map((item: AnyRecord) => {
    const agentName = asString(item.agentName, '', 120).toLowerCase();
    return {
      id: nanoid(),
      workspaceId,
      agentId: agentByName.get(agentName) || firstAgentId,
      eventType: asString(item.eventType, 'generated_event', 120),
      title: asString(item.title, 'Generated operating event', 180),
      description: asString(item.description, 'Stored simulation event.'),
      severity: enumValue(item.severity, severity, 'info'),
      status: asString(item.status, 'open', 80),
    };
  });

  const sopItems = (Array.isArray(parsed.sops) && parsed.sops.length ? parsed.sops : workflows) as AnyRecord[];
  const sops = sopItems.slice(0, workflows.length).map((item: AnyRecord, index: number) => {
    const workflowName = asString(item.workflowName, workflows[index]?.name || '', 160).toLowerCase();
    const workflow = workflows[index];
    return {
      id: nanoid(),
      workspaceId,
      workflowId: workflowByName.get(workflowName) || workflow?.id || workflows[0]?.id,
      title: asString(item.title, `SOP: ${workflow?.name || 'Workflow'}`, 180),
      objective: asString(item.objective, `Run ${workflow?.name || 'the workflow'} consistently.`),
      owner: asString(item.owner, digitalFtes.find((agent) => agent.id === workflow?.ownerAgentId)?.name || digitalFtes[0]?.name || 'CEO Operator Agent', 160),
      steps: asStringArray(item.steps, workflow?.steps || [], 10),
      requiredTools: asStringArray(item.requiredTools, workflow?.toolsUsed || [], 10),
      approvalRules: asStringArray(item.approvalRules, workflow?.approvalPoints || [], 8),
      failureHandling: asString(item.failureHandling, workflow?.failurePath || 'Escalate failed runs.'),
      auditRequirements: asString(item.auditRequirements, 'Store every action, approval, result, cost, and evidence record in the decision ledger.'),
    };
  });

  return {
    ...current,
    blueprint: {
      ...current.blueprint,
      companyName: asString(blueprint.companyName, String(current.blueprint.companyName || 'AI-Native Company')).slice(0, 120),
      valueProposition: asString(blueprint.valueProposition, String(current.blueprint.valueProposition || '')),
      revenueModel: asString(blueprint.revenueModel, String(current.blueprint.revenueModel || '')),
      operatingModel: asString(blueprint.operatingModel, String(current.blueprint.operatingModel || '')),
      coreKpis: asStringArray(blueprint.coreKpis, current.blueprint.coreKpis as unknown[], 8),
      launchChecklist: asStringArray(blueprint.launchChecklist, current.blueprint.launchChecklist as unknown[], 8),
    },
    departments,
    digitalFtes,
    workflows,
    policies,
    decisions,
    events,
    sops,
    boardReport: {
      id: nanoid(),
      workspaceId,
      title: asString(parsed.boardReport?.title, String(current.boardReport.title || 'AI-Native Company Operating Report'), 180),
      summary: asString(parsed.boardReport?.summary, String(current.boardReport.summary || 'Generated company OS summary.')),
      tasksCompleted: Math.max(0, Number(parsed.boardReport?.tasksCompleted || current.boardReport.tasksCompleted || 0)),
      moneySpent: asString(parsed.boardReport?.moneySpent, String(current.boardReport.moneySpent || '0'), 30),
      hoursSaved: Math.max(0, Number(parsed.boardReport?.hoursSaved || current.boardReport.hoursSaved || 0)),
      riskyActionsBlocked: Math.max(0, Number(parsed.boardReport?.riskyActionsBlocked || current.boardReport.riskyActionsBlocked || 0)),
      recommendations: asStringArray(parsed.boardReport?.recommendations, current.boardReport.recommendations as unknown[], 8),
      auditSummary: asString(parsed.boardReport?.auditSummary, String(current.boardReport.auditSummary || 'Decision records created for audit.')),
    },
  };
}

export async function designAutomationWithBedrock(input: {
  task: string;
  outcome: string;
  trigger: string;
  tools: string[];
  approvalRule: string;
  autonomyLevel: string;
  riskLevel: string;
  customers?: string | null;
  workspaceName?: string | null;
}) {
  const prompt = `You are ZeroCo's automation architect. Convert this founder request into a concrete, executable, governed automation package. It must be specific to the task, customer, tools, approval rule, risk, and target outcome.

Return ONLY valid JSON with this shape:
{
  "automationName": "",
  "agent": {"name": "", "role": "", "goal": "", "tools": [], "currentTask": "", "successRate": 1},
  "workflow": {"name": "", "trigger": "", "steps": [], "toolsUsed": [], "approvalPoints": [], "successMetric": "", "failurePath": ""},
  "policy": {"name": "", "description": "", "condition": "", "action": "", "mode": "auto_approve|require_approval|block|throttle|pause|escalate"},
  "sop": {"title": "", "objective": "", "steps": [], "requiredTools": [], "approvalRules": [], "failureHandling": "", "auditRequirements": ""},
  "event": {"title": "", "description": "", "severity": "info|warning|high|critical"},
  "ledger": {"action": "", "policyMatched": "", "result": ""}
}

Workspace: ${input.workspaceName || 'ZeroCo workspace'}
Customers: ${input.customers || ''}
Task: ${input.task}
Target outcome: ${input.outcome}
Trigger: ${input.trigger}
Tools: ${input.tools.join(', ') || 'Bedrock, Company Memory, Decision Ledger'}
Approval rule: ${input.approvalRule}
Autonomy level: ${input.autonomyLevel}
Risk level: ${input.riskLevel}`;

  const parsed = await runBedrockJson(prompt, 2400);
  const policyMode = ['auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate'] as const;
  const severity = ['info', 'warning', 'high', 'critical'] as const;
  const fallbackTools = input.tools.length ? input.tools : ['Bedrock', 'Company Memory', 'Decision Ledger'];
  const requiresApproval = ['approval_required', 'auto_act'].includes(input.autonomyLevel) || ['high', 'critical'].includes(input.riskLevel);

  return {
    automationName: asString(parsed.automationName, input.task, 100),
    agent: {
      name: asString(parsed.agent?.name, `${input.task.split(/\s+/).slice(0, 4).join(' ')} Agent`, 120),
      role: asString(parsed.agent?.role, 'Business automation operator', 240),
      goal: asString(parsed.agent?.goal, `Own ${input.task} and produce ${input.outcome}.`),
      tools: asStringArray(parsed.agent?.tools, fallbackTools, 10),
      currentTask: asString(parsed.agent?.currentTask, `Preparing automation for ${input.task}`, 260),
      successRate: Math.max(1, Math.min(99, Number(parsed.agent?.successRate || 88))),
    },
    workflow: {
      name: asString(parsed.workflow?.name, `${input.task.split(/\s+/).slice(0, 5).join(' ')} Workflow`, 160),
      trigger: asString(parsed.workflow?.trigger, input.trigger),
      steps: asStringArray(parsed.workflow?.steps, [`Detect trigger: ${input.trigger}`, 'Check policy and required data', 'Prepare or execute approved action', `Measure outcome: ${input.outcome}`, 'Write evidence to ledger'], 10),
      toolsUsed: asStringArray(parsed.workflow?.toolsUsed, fallbackTools, 10),
      approvalPoints: requiresApproval ? asStringArray(parsed.workflow?.approvalPoints, [input.approvalRule], 8) : asStringArray(parsed.workflow?.approvalPoints, [], 8),
      successMetric: asString(parsed.workflow?.successMetric, input.outcome),
      failurePath: asString(parsed.workflow?.failurePath, 'Stop automation, store the failed step, and escalate to the workspace owner.'),
    },
    policy: {
      name: asString(parsed.policy?.name, `${input.task.split(/\s+/).slice(0, 4).join(' ')} Approval Policy`, 160),
      description: asString(parsed.policy?.description, `Controls when this automation can act without human review.`),
      condition: asString(parsed.policy?.condition, input.approvalRule),
      action: asString(parsed.policy?.action, requiresApproval ? 'Require owner approval before execution' : 'Auto-approve and log the action'),
      mode: enumValue(parsed.policy?.mode, policyMode, requiresApproval ? 'require_approval' : 'auto_approve'),
    },
    sop: {
      title: asString(parsed.sop?.title, `${input.task.split(/\s+/).slice(0, 5).join(' ')} SOP`, 180),
      objective: asString(parsed.sop?.objective, `Produce the result: ${input.outcome}`),
      steps: asStringArray(parsed.sop?.steps, parsed.workflow?.steps || [], 10),
      requiredTools: asStringArray(parsed.sop?.requiredTools, fallbackTools, 10),
      approvalRules: asStringArray(parsed.sop?.approvalRules, [input.approvalRule], 8),
      failureHandling: asString(parsed.sop?.failureHandling, 'Escalate failed or risky runs to the workspace owner.'),
      auditRequirements: asString(parsed.sop?.auditRequirements, 'Every run must store trigger, tools, approval status, result, cost, and evidence in the decision ledger.'),
    },
    event: {
      title: asString(parsed.event?.title, 'Automation package is ready', 180),
      description: asString(parsed.event?.description, `Automation created for ${input.task}.`),
      severity: enumValue(parsed.event?.severity, severity, input.riskLevel === 'critical' ? 'critical' : input.riskLevel === 'high' ? 'high' : 'info'),
    },
    ledger: {
      action: asString(parsed.ledger?.action, `Created automation package: ${input.task}`, 220),
      policyMatched: asString(parsed.ledger?.policyMatched, input.approvalRule, 180),
      result: asString(parsed.ledger?.result, `Created agent, workflow, policy, and SOP for: ${input.task}`),
    },
  };
}

export async function generateOperatingEventWithBedrock(input: {
  workspaceName: string;
  blueprint?: AnyRecord | null;
  agents: AnyRecord[];
  workflows: AnyRecord[];
  policies: AnyRecord[];
  recentResults: AnyRecord[];
}) {
  const prompt = `You are ZeroCo's runtime test engine. Generate one realistic operating event for this specific company OS. It must reference an actual agent/workflow/policy from the provided data and must be useful for testing the operating system. Do not use generic demo examples.

Return ONLY valid JSON:
{
  "agentName": "",
  "eventType": "",
  "title": "",
  "description": "",
  "severity": "info|warning|high|critical",
  "status": "",
  "ledger": {"action": "", "policyMatched": "", "riskLevel": "low|medium|high|critical", "decision": "pending|approved|rejected|blocked|executed|throttled|paused", "result": ""}
}

Workspace: ${input.workspaceName}
Blueprint: ${JSON.stringify(input.blueprint || {})}
Agents: ${JSON.stringify(input.agents.map((agent) => ({ name: agent.name, role: agent.role, riskLevel: agent.riskLevel, status: agent.status })).slice(0, 16))}
Workflows: ${JSON.stringify(input.workflows.map((workflow) => ({ name: workflow.name, trigger: workflow.trigger, approvalPoints: workflow.approvalPoints, successMetric: workflow.successMetric })).slice(0, 16))}
Policies: ${JSON.stringify(input.policies.map((policy) => ({ name: policy.name, mode: policy.mode, condition: policy.condition, action: policy.action })).slice(0, 16))}
Recent results: ${JSON.stringify(input.recentResults.slice(0, 8))}`;

  const parsed = await runBedrockJson(prompt, 1800);
  const severity = ['info', 'warning', 'high', 'critical'] as const;
  const risk = ['low', 'medium', 'high', 'critical'] as const;
  const decision = ['pending', 'approved', 'rejected', 'blocked', 'executed', 'throttled', 'paused'] as const;

  return {
    agentName: asString(parsed.agentName, '', 120),
    eventType: asString(parsed.eventType, 'runtime_test', 120),
    title: asString(parsed.title, 'Runtime test event', 180),
    description: asString(parsed.description, 'Generated operating event from current company OS.'),
    severity: enumValue(parsed.severity, severity, 'info'),
    status: asString(parsed.status, 'open', 80),
    ledger: {
      action: asString(parsed.ledger?.action, 'Generated runtime test event', 220),
      policyMatched: asString(parsed.ledger?.policyMatched, 'Runtime test policy', 180),
      riskLevel: enumValue(parsed.ledger?.riskLevel, risk, 'medium'),
      decision: enumValue(parsed.ledger?.decision, decision, 'pending'),
      result: asString(parsed.ledger?.result, 'Runtime test stored for review.'),
    },
  };
}

export async function generateBoardReportWithBedrock(input: {
  workspaceName: string;
  blueprint?: AnyRecord | null;
  metrics: AnyRecord;
  agents: AnyRecord[];
  workflowRuns: AnyRecord[];
  businessResults: AnyRecord[];
  decisions: AnyRecord[];
}) {
  const prompt = `You are ZeroCo's operating-review analyst. Generate a concise board-style operating report strictly from the runtime evidence provided. Do not invent customers, revenue, client wins, hours, or tasks beyond the records. If evidence is thin, say what needs to be tested next.

Return ONLY valid JSON:
{
  "title": "",
  "summary": "",
  "tasksCompleted": 0,
  "moneySpent": "0",
  "hoursSaved": 0,
  "riskyActionsBlocked": 0,
  "recommendations": [],
  "auditSummary": ""
}

Workspace: ${input.workspaceName}
Blueprint: ${JSON.stringify(input.blueprint || {})}
Metrics: ${JSON.stringify(input.metrics)}
Agents: ${JSON.stringify(input.agents.map((agent) => ({ name: agent.name, role: agent.role, status: agent.status, costToday: agent.costToday })).slice(0, 16))}
Workflow runs: ${JSON.stringify(input.workflowRuns.slice(0, 20))}
Business results: ${JSON.stringify(input.businessResults.slice(0, 20))}
Decision ledger: ${JSON.stringify(input.decisions.slice(0, 20))}`;

  const parsed = await runBedrockJson(prompt, 2200);
  return {
    title: asString(parsed.title, `${input.workspaceName} Operating Review`, 180),
    summary: asString(parsed.summary, 'Operating report generated from runtime evidence.'),
    tasksCompleted: Math.max(0, Math.round(Number(parsed.tasksCompleted || 0))),
    moneySpent: asString(parsed.moneySpent, '0', 30),
    hoursSaved: Math.max(0, Math.round(Number(parsed.hoursSaved || 0))),
    riskyActionsBlocked: Math.max(0, Math.round(Number(parsed.riskyActionsBlocked || 0))),
    recommendations: asStringArray(parsed.recommendations, [], 8),
    auditSummary: asString(parsed.auditSummary, 'Report generated from persisted workflow runs, results, and decision ledger records.'),
  };
}

export async function designSalesAgentWithBedrock(input: {
  workspaceName: string;
  blueprint?: AnyRecord | null;
  departments: AnyRecord[];
  agents: AnyRecord[];
  workflows: AnyRecord[];
  policies: AnyRecord[];
  customers?: string | null;
  businessType?: string | null;
}) {
  const prompt = `You are ZeroCo's revenue architect. Build a complete Sales Agent operating package for this specific company. It must be practical enough for a founder to test inside ZeroCo and later connect to CRM/email/calendar tools.

The package must include:
- one sales department or revenue department definition
- one high-quality Sales Agent with ICP, offer, pipeline ownership, daily tasks, tools, budget, risk, and current task
- 5 to 8 sales workflows covering ICP research, lead sourcing, qualification/scoring, personalized outreach, follow-up/objection handling, demo booking/handoff, CRM hygiene, and weekly pipeline review
- 5 to 8 sales policies covering spam/compliance, opt-out/unsubscribe, claims that need proof, discounts/contracts requiring approval, bulk outreach caps, PII handling, and CRM write safety
- one SOP per workflow
- starter ledger records and runtime events specific to this business
- concrete sales KPIs and success metrics, not vague advice

Return ONLY valid JSON:
{
  "department": {"name": "", "purpose": "", "kpis": [], "riskLevel": "low|medium|high|critical", "budget": "number"},
  "agent": {"name": "", "role": "", "goal": "", "tools": [], "autonomyLevel": "observe|suggest|approval_required|auto_act", "dailyBudget": "number", "riskLevel": "low|medium|high|critical", "currentTask": "", "successRate": 1, "costToday": "number"},
  "workflows": [{"name": "", "trigger": "", "steps": [], "toolsUsed": [], "approvalPoints": [], "successMetric": "", "failurePath": ""}],
  "policies": [{"name": "", "description": "", "condition": "", "action": "", "mode": "auto_approve|require_approval|block|throttle|pause|escalate", "riskLevel": "low|medium|high|critical", "enabled": true}],
  "sops": [{"workflowName": "", "title": "", "objective": "", "steps": [], "requiredTools": [], "approvalRules": [], "failureHandling": "", "auditRequirements": ""}],
  "events": [{"eventType": "", "title": "", "description": "", "severity": "info|warning|high|critical", "status": ""}],
  "decisions": [{"action": "", "policyMatched": "", "riskLevel": "low|medium|high|critical", "decision": "pending|approved|rejected|blocked|executed|throttled|paused", "result": ""}]
}

Workspace: ${input.workspaceName}
Business: ${input.businessType || ''}
Customers: ${input.customers || ''}
Blueprint: ${JSON.stringify(input.blueprint || {})}
Existing departments: ${JSON.stringify(input.departments.map((item) => ({ name: item.name, purpose: item.purpose })).slice(0, 12))}
Existing agents: ${JSON.stringify(input.agents.map((item) => ({ name: item.name, role: item.role })).slice(0, 16))}
Existing workflows: ${JSON.stringify(input.workflows.map((item) => ({ name: item.name, trigger: item.trigger })).slice(0, 16))}
Existing policies: ${JSON.stringify(input.policies.map((item) => ({ name: item.name, mode: item.mode })).slice(0, 16))}`;

  const parsed = await runBedrockJson(prompt, 4200);
  const risk = ['low', 'medium', 'high', 'critical'] as const;
  const autonomy = ['observe', 'suggest', 'approval_required', 'auto_act'] as const;
  const policyMode = ['auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate'] as const;
  const severity = ['info', 'warning', 'high', 'critical'] as const;
  const decision = ['pending', 'approved', 'rejected', 'blocked', 'executed', 'throttled', 'paused'] as const;

  const department = parsed.department || {};
  const agent = parsed.agent || {};
  const workflowItems = (Array.isArray(parsed.workflows) ? parsed.workflows : []) as AnyRecord[];
  const policyItems = (Array.isArray(parsed.policies) ? parsed.policies : []) as AnyRecord[];
  const sopItems = (Array.isArray(parsed.sops) ? parsed.sops : []) as AnyRecord[];
  const eventItems = (Array.isArray(parsed.events) ? parsed.events : []) as AnyRecord[];
  const decisionItems = (Array.isArray(parsed.decisions) ? parsed.decisions : []) as AnyRecord[];

  return {
    department: {
      name: asString(department.name, 'Sales', 120),
      purpose: asString(department.purpose, 'Own lead generation, qualification, pipeline creation, outreach governance, and revenue handoff.'),
      kpis: asStringArray(department.kpis, ['Qualified leads created', 'Reply rate', 'Meetings booked', 'Pipeline value', 'Policy-compliant outreach'], 8),
      riskLevel: enumValue(department.riskLevel, risk, 'medium'),
      budget: asString(department.budget, '750', 30),
    },
    agent: {
      name: asString(agent.name, `${input.workspaceName} Sales Agent`, 120),
      role: asString(agent.role, 'Revenue pipeline operator', 240),
      goal: asString(agent.goal, `Build qualified pipeline for ${input.customers || input.workspaceName} with compliant personalized outreach and clear human approval gates.`),
      tools: asStringArray(agent.tools, ['CRM', 'Email', 'Calendar', 'Lead Database', 'Company Memory', 'Decision Ledger'], 12),
      autonomyLevel: enumValue(agent.autonomyLevel, autonomy, 'approval_required'),
      dailyBudget: asString(agent.dailyBudget, '25', 30),
      riskLevel: enumValue(agent.riskLevel, risk, 'medium'),
      currentTask: asString(agent.currentTask, 'Building ICP, lead scoring rubric, and first outreach sequence.', 260),
      successRate: Math.max(1, Math.min(99, Number(agent.successRate || 88))),
      costToday: asString(agent.costToday, '0', 30),
    },
    workflows: workflowItems.slice(0, 8).map((item) => ({
      name: asString(item.name, 'Sales Workflow', 160),
      trigger: asString(item.trigger, 'New revenue task or lead source added'),
      steps: asStringArray(item.steps, ['Define ICP', 'Source leads', 'Score fit', 'Draft personalized outreach', 'Check policy', 'Queue approval or send', 'Update CRM'], 10),
      toolsUsed: asStringArray(item.toolsUsed, ['CRM', 'Email', 'Lead Database', 'Decision Ledger'], 10),
      approvalPoints: asStringArray(item.approvalPoints, ['Human approval before bulk sends, discounts, contract terms, or unverified claims'], 8),
      successMetric: asString(item.successMetric, 'Qualified pipeline created with compliant outreach and tracked replies'),
      failurePath: asString(item.failurePath, 'Stop outreach, preserve evidence, and request founder review.'),
    })),
    policies: policyItems.slice(0, 10).map((item) => ({
      name: asString(item.name, 'Sales Governance Policy', 160),
      description: asString(item.description, 'Controls safe sales automation behavior.'),
      condition: asString(item.condition, 'sales_action == external_send'),
      action: asString(item.action, 'Require approval and log the decision.'),
      mode: enumValue(item.mode, policyMode, 'require_approval'),
      riskLevel: enumValue(item.riskLevel, risk, 'medium'),
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    })),
    sops: sopItems.slice(0, 8).map((item) => ({
      workflowName: asString(item.workflowName, '', 160),
      title: asString(item.title, 'Sales SOP', 180),
      objective: asString(item.objective, 'Run sales workflow with measurable pipeline output and full policy compliance.'),
      steps: asStringArray(item.steps, ['Prepare inputs', 'Run workflow', 'Check approval gates', 'Record outcome'], 10),
      requiredTools: asStringArray(item.requiredTools, ['CRM', 'Email', 'Decision Ledger'], 10),
      approvalRules: asStringArray(item.approvalRules, ['Human approval before risky sales actions'], 8),
      failureHandling: asString(item.failureHandling, 'Stop, log the failed step, and request human review.'),
      auditRequirements: asString(item.auditRequirements, 'Store lead source, score, message, approval status, CRM update, cost, and result in the ledger.'),
    })),
    events: eventItems.slice(0, 6).map((item) => ({
      eventType: asString(item.eventType, 'sales_agent_ready', 120),
      title: asString(item.title, 'Sales Agent ready', 180),
      description: asString(item.description, 'Sales operating package generated.'),
      severity: enumValue(item.severity, severity, 'info'),
      status: asString(item.status, 'open', 80),
    })),
    decisions: decisionItems.slice(0, 6).map((item) => ({
      action: asString(item.action, 'Created sales operating capability', 220),
      policyMatched: asString(item.policyMatched, 'Sales governance policy', 180),
      riskLevel: enumValue(item.riskLevel, risk, 'medium'),
      decision: enumValue(item.decision, decision, 'pending'),
      result: asString(item.result, 'Sales capability stored for review.'),
    })),
  };
}

export async function designProblemToFteWithBedrock(input: {
  workspaceName: string;
  businessType?: string | null;
  customers?: string | null;
  blueprint?: AnyRecord | null;
  existingDepartments: AnyRecord[];
  existingAgents: AnyRecord[];
  existingWorkflows: AnyRecord[];
  problem: string;
  currentProcess: string;
  desiredOutcome: string;
  availableTools: string[];
  approvalLimits: string;
  riskTolerance: string;
}) {
  const prompt = `You are ZeroCo's core company-manufacturing engine.

Your job is to turn a founder's real business problem into an objective lifecycle:
Mode 1 = solve/test the problem once with human supervision.
Mode 2 = promote the proven workflow into a permanent Digital FTE.

Do not return generic templates. The architecture, tests, agent, workflows, policies, SOPs, and AWS services must be specific to the founder's problem, business, tools, customer, risks, and desired outcome.

Return ONLY valid JSON:
{
  "diagnosis": {
    "classification": "not_agent_problem|mode_1_only|mode_2_candidate|ready_for_digital_fte",
    "reasoning": "",
    "objectiveDoneDefinition": "",
    "readinessScore": 1,
    "missingInputs": [],
    "risks": []
  },
  "awsArchitecture": {
    "title": "",
    "summary": "",
    "services": [{"service": "", "purpose": "", "dataHandled": "", "securityControl": ""}],
    "eventFlow": [],
    "identityAndAccess": [],
    "dataStores": [],
    "deploymentTargets": [],
    "observability": [],
    "costControls": []
  },
  "mode1Run": {
    "runName": "",
    "humanInputsNeeded": [],
    "steps": [],
    "testCases": [{"name": "", "input": "", "expectedOutput": "", "passCriteria": ""}],
    "evidenceToCollect": [],
    "approvalGate": "",
    "successMetric": "",
    "failurePath": ""
  },
  "mode2Package": {
    "department": {"name": "", "purpose": "", "kpis": [], "riskLevel": "low|medium|high|critical", "budget": "number"},
    "agent": {"name": "", "role": "", "goal": "", "tools": [], "autonomyLevel": "observe|suggest|approval_required|auto_act", "dailyBudget": "number", "riskLevel": "low|medium|high|critical", "currentTask": "", "successRate": 1, "costToday": "number"},
    "workflows": [{"name": "", "trigger": "", "steps": [], "toolsUsed": [], "approvalPoints": [], "successMetric": "", "failurePath": ""}],
    "policies": [{"name": "", "description": "", "condition": "", "action": "", "mode": "auto_approve|require_approval|block|throttle|pause|escalate", "riskLevel": "low|medium|high|critical", "enabled": true}],
    "sops": [{"workflowName": "", "title": "", "objective": "", "steps": [], "requiredTools": [], "approvalRules": [], "failureHandling": "", "auditRequirements": ""}]
  },
  "implementationPlan": {
    "nextActions": [],
    "integrationChecklist": [],
    "downloadableArtifacts": [],
    "objectiveEvaluation": []
  }
}

AWS architecture requirements:
- Use real AWS service names where relevant: Amazon Bedrock, Amazon API Gateway, AWS Lambda, AWS Step Functions, Amazon EventBridge, Amazon SQS, Amazon RDS/Aurora PostgreSQL, Amazon S3, Amazon Cognito, AWS IAM, AWS Secrets Manager, Amazon CloudWatch, AWS X-Ray, Amazon SES, Amazon Transcribe, Amazon Polly.
- Only include services that fit the workflow. Explain exact purpose and security control for each service.
- Include approval gates for customer-facing actions, money movement, production changes, legal/financial claims, bulk sends, data deletion, credential changes, and risky tool writes.

Workspace: ${input.workspaceName}
Business: ${input.businessType || ''}
Customers: ${input.customers || ''}
Blueprint: ${JSON.stringify(input.blueprint || {})}
Existing departments: ${JSON.stringify(input.existingDepartments.map((item) => ({ name: item.name, purpose: item.purpose })).slice(0, 12))}
Existing agents: ${JSON.stringify(input.existingAgents.map((item) => ({ name: item.name, role: item.role })).slice(0, 16))}
Existing workflows: ${JSON.stringify(input.existingWorkflows.map((item) => ({ name: item.name, trigger: item.trigger })).slice(0, 16))}

Founder problem: ${input.problem}
Current process: ${input.currentProcess}
Desired outcome: ${input.desiredOutcome}
Available tools: ${input.availableTools.join(', ')}
Approval limits: ${input.approvalLimits}
Risk tolerance: ${input.riskTolerance}`;

  const parsed = await runBedrockJson(prompt, 5200);
  const risk = ['low', 'medium', 'high', 'critical'] as const;
  const autonomy = ['observe', 'suggest', 'approval_required', 'auto_act'] as const;
  const policyMode = ['auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate'] as const;
  const classification = ['not_agent_problem', 'mode_1_only', 'mode_2_candidate', 'ready_for_digital_fte'] as const;
  const diagnosis = requireObject(parsed.diagnosis, 'problem diagnosis');
  const architecture = requireObject(parsed.awsArchitecture, 'AWS architecture');
  const mode1Run = requireObject(parsed.mode1Run, 'Mode 1 run');
  const mode2Package = requireObject(parsed.mode2Package, 'Mode 2 package');
  const department = requireObject(mode2Package.department, 'Mode 2 department');
  const agent = requireObject(mode2Package.agent, 'Mode 2 agent');
  const implementationPlan = requireObject(parsed.implementationPlan, 'implementation plan');

  requireText(diagnosis.reasoning, 'diagnosis reasoning');
  requireText(diagnosis.objectiveDoneDefinition, 'done definition');
  requireText(architecture.summary, 'AWS architecture summary');
  requireText(mode1Run.runName, 'Mode 1 run name');
  requireText(mode1Run.successMetric, 'Mode 1 success metric');
  requireText(department.name, 'Mode 2 department name');
  requireText(agent.name, 'Mode 2 agent name');
  requireText(agent.goal, 'Mode 2 agent goal');
  requireItems(mode2Package.workflows, 'Mode 2 workflows', 1);
  requireItems(mode2Package.policies, 'Mode 2 policies', 2);
  requireItems(mode2Package.sops, 'Mode 2 SOPs', 1);

  const workflowItems = (mode2Package.workflows as AnyRecord[]).slice(0, 8);
  const policyItems = (mode2Package.policies as AnyRecord[]).slice(0, 10);
  const sopItems = (mode2Package.sops as AnyRecord[]).slice(0, 8);

  return {
    diagnosis: {
      classification: enumValue(diagnosis.classification, classification, 'mode_2_candidate'),
      reasoning: asString(diagnosis.reasoning, 'The problem can be tested once, then promoted after evidence is collected.'),
      objectiveDoneDefinition: asString(diagnosis.objectiveDoneDefinition, input.desiredOutcome),
      readinessScore: Math.max(1, Math.min(100, Math.round(Number(diagnosis.readinessScore || 65)))),
      missingInputs: asStringArray(diagnosis.missingInputs, [], 8),
      risks: asStringArray(diagnosis.risks, [], 8),
    },
    awsArchitecture: {
      title: asString(architecture.title, `${input.workspaceName} AWS agent runtime`, 180),
      summary: asString(architecture.summary, 'AWS architecture for running the requested agent workflow.'),
      services: (Array.isArray(architecture.services) ? architecture.services : []).slice(0, 12).map((service: AnyRecord) => ({
        service: asString(service.service, 'Amazon Bedrock', 120),
        purpose: asString(service.purpose, 'Generate and reason over workflow actions.'),
        dataHandled: asString(service.dataHandled, 'Founder-provided workflow context.'),
        securityControl: asString(service.securityControl, 'IAM least privilege and encrypted transport.'),
      })),
      eventFlow: asStringArray(architecture.eventFlow, [], 12),
      identityAndAccess: asStringArray(architecture.identityAndAccess, [], 10),
      dataStores: asStringArray(architecture.dataStores, [], 10),
      deploymentTargets: asStringArray(architecture.deploymentTargets, [], 10),
      observability: asStringArray(architecture.observability, [], 10),
      costControls: asStringArray(architecture.costControls, [], 10),
    },
    mode1Run: {
      runName: asString(mode1Run.runName, 'First supervised problem solve', 180),
      humanInputsNeeded: asStringArray(mode1Run.humanInputsNeeded, [], 10),
      steps: asStringArray(mode1Run.steps, [], 12),
      testCases: (Array.isArray(mode1Run.testCases) ? mode1Run.testCases : []).slice(0, 6).map((test: AnyRecord) => ({
        name: asString(test.name, 'Mode 1 test case', 140),
        input: asString(test.input, input.currentProcess),
        expectedOutput: asString(test.expectedOutput, input.desiredOutcome),
        passCriteria: asString(test.passCriteria, 'Output meets the done definition and approval gate.'),
      })),
      evidenceToCollect: asStringArray(mode1Run.evidenceToCollect, [], 10),
      approvalGate: asString(mode1Run.approvalGate, input.approvalLimits),
      successMetric: asString(mode1Run.successMetric, input.desiredOutcome),
      failurePath: asString(mode1Run.failurePath, 'Stop the run, preserve evidence, and revise the workflow.'),
    },
    mode2Package: {
      department: {
        name: asString(department.name, 'Operations', 120),
        purpose: asString(department.purpose, 'Own the promoted Digital FTE operating capability.'),
        kpis: asStringArray(department.kpis, ['Cycle time', 'Quality', 'Policy compliance'], 8),
        riskLevel: enumValue(department.riskLevel, risk, 'medium'),
        budget: asString(department.budget, '500', 30),
      },
      agent: {
        name: asString(agent.name, `${input.workspaceName} Digital FTE`, 120),
        role: asString(agent.role, 'Digital FTE operator', 240),
        goal: asString(agent.goal, input.desiredOutcome),
        tools: asStringArray(agent.tools, input.availableTools, 12),
        autonomyLevel: enumValue(agent.autonomyLevel, autonomy, 'approval_required'),
        dailyBudget: asString(agent.dailyBudget, '15', 30),
        riskLevel: enumValue(agent.riskLevel, risk, 'medium'),
        currentTask: asString(agent.currentTask, 'Waiting for first supervised Mode 1 run.', 260),
        successRate: Math.max(1, Math.min(99, Math.round(Number(agent.successRate || 85)))),
        costToday: asString(agent.costToday, '0', 30),
      },
      workflows: workflowItems.map((workflow) => ({
        name: asString(workflow.name, 'Promoted workflow', 160),
        trigger: asString(workflow.trigger, input.problem),
        steps: asStringArray(workflow.steps, mode1Run.steps as unknown[], 12),
        toolsUsed: asStringArray(workflow.toolsUsed, input.availableTools, 12),
        approvalPoints: asStringArray(workflow.approvalPoints, [input.approvalLimits], 8),
        successMetric: asString(workflow.successMetric, input.desiredOutcome),
        failurePath: asString(workflow.failurePath, 'Escalate to founder with evidence.'),
      })),
      policies: policyItems.map((policy) => ({
        name: asString(policy.name, 'Mode 2 governance policy', 160),
        description: asString(policy.description, 'Controls promoted Digital FTE execution.'),
        condition: asString(policy.condition, 'risk >= medium'),
        action: asString(policy.action, 'Require human approval and log decision.'),
        mode: enumValue(policy.mode, policyMode, 'require_approval'),
        riskLevel: enumValue(policy.riskLevel, risk, 'medium'),
        enabled: typeof policy.enabled === 'boolean' ? policy.enabled : true,
      })),
      sops: sopItems.map((sop) => ({
        workflowName: asString(sop.workflowName, workflowItems[0]?.name ? String(workflowItems[0].name) : '', 160),
        title: asString(sop.title, 'Promoted workflow SOP', 180),
        objective: asString(sop.objective, input.desiredOutcome),
        steps: asStringArray(sop.steps, mode1Run.steps as unknown[], 12),
        requiredTools: asStringArray(sop.requiredTools, input.availableTools, 12),
        approvalRules: asStringArray(sop.approvalRules, [input.approvalLimits], 8),
        failureHandling: asString(sop.failureHandling, 'Stop execution and escalate with evidence.'),
        auditRequirements: asString(sop.auditRequirements, 'Store trigger, inputs, tool outputs, approvals, result, cost, and evidence.'),
      })),
    },
    implementationPlan: {
      nextActions: asStringArray(implementationPlan.nextActions, [], 10),
      integrationChecklist: asStringArray(implementationPlan.integrationChecklist, [], 10),
      downloadableArtifacts: asStringArray(implementationPlan.downloadableArtifacts, [], 10),
      objectiveEvaluation: asStringArray(implementationPlan.objectiveEvaluation, [], 10),
    },
  };
}

export async function planLiveCompanyBuilderAction(input: {
  workspaceName: string;
  message: string;
  conversationContext?: string;
  blueprint?: AnyRecord | null;
  departments: AnyRecord[];
  agents: AnyRecord[];
  workflows: AnyRecord[];
  policies: AnyRecord[];
}) {
  const prompt = `You are ZeroCo's live company-builder operator. The founder is talking or chatting with you in real time. Decide whether to:
1. ask a useful follow-up question,
2. answer and guide,
3. create a new digital FTE,
4. create workflows/policies/SOPs for an existing or new agent,
5. create a complete automation package.

If the founder gives enough detail to create something, create it. If critical details are missing, ask a concise follow-up and do not create artifacts.

Return ONLY valid JSON:
{
  "mode": "answer|ask_followup|create_agent|create_workflow|create_automation",
  "reply": "",
  "createdSummary": "",
  "department": {"name": "", "purpose": "", "kpis": [], "riskLevel": "low|medium|high|critical", "budget": "number"},
  "agent": {"name": "", "role": "", "goal": "", "tools": [], "autonomyLevel": "observe|suggest|approval_required|auto_act", "dailyBudget": "number", "riskLevel": "low|medium|high|critical", "currentTask": "", "successRate": 1, "costToday": "number"},
  "workflows": [{"name": "", "trigger": "", "steps": [], "toolsUsed": [], "approvalPoints": [], "successMetric": "", "failurePath": ""}],
  "policies": [{"name": "", "description": "", "condition": "", "action": "", "mode": "auto_approve|require_approval|block|throttle|pause|escalate", "riskLevel": "low|medium|high|critical", "enabled": true}],
  "sops": [{"workflowName": "", "title": "", "objective": "", "steps": [], "requiredTools": [], "approvalRules": [], "failureHandling": "", "auditRequirements": ""}],
  "events": [{"eventType": "", "title": "", "description": "", "severity": "info|warning|high|critical", "status": ""}],
  "decisions": [{"action": "", "policyMatched": "", "riskLevel": "low|medium|high|critical", "decision": "pending|approved|rejected|blocked|executed|throttled|paused", "result": ""}]
}

Creation rules:
- For "I need an agent for X", generate a department if useful, one agent, at least 2 workflows, policies, SOPs, event, and ledger decision.
- For "workflow for X", generate workflow(s), policy gates, SOPs, and ledger/event records.
- For "automate X", generate a complete automation package.
- Include tools the founder mentions. If tools are unknown, include realistic placeholders like CRM, Email, Calendar, Database, Approval Queue, Decision Ledger.
- Always include approval gates for money, customer-facing messages, production changes, legal/financial claims, bulk sends, credential changes, and data deletion.
- Keep the reply short, human, and spoken-friendly.

Workspace: ${input.workspaceName}
Founder message: ${input.message}
Conversation context: ${input.conversationContext || ''}
Blueprint: ${JSON.stringify(input.blueprint || {})}
Departments: ${JSON.stringify(input.departments.map((item) => ({ name: item.name, purpose: item.purpose })).slice(0, 12))}
Agents: ${JSON.stringify(input.agents.map((item) => ({ name: item.name, role: item.role, goal: item.goal })).slice(0, 16))}
Workflows: ${JSON.stringify(input.workflows.map((item) => ({ name: item.name, trigger: item.trigger })).slice(0, 16))}
Policies: ${JSON.stringify(input.policies.map((item) => ({ name: item.name, mode: item.mode, condition: item.condition })).slice(0, 16))}`;

  const parsed = await runBedrockJson(prompt, 4200);
  const modes = ['answer', 'ask_followup', 'create_agent', 'create_workflow', 'create_automation'] as const;
  const risk = ['low', 'medium', 'high', 'critical'] as const;
  const autonomy = ['observe', 'suggest', 'approval_required', 'auto_act'] as const;
  const policyMode = ['auto_approve', 'require_approval', 'block', 'throttle', 'pause', 'escalate'] as const;
  const severity = ['info', 'warning', 'high', 'critical'] as const;
  const decision = ['pending', 'approved', 'rejected', 'blocked', 'executed', 'throttled', 'paused'] as const;
  const mode = enumValue(parsed.mode, modes, 'answer');
  const department = parsed.department || {};
  const agent = parsed.agent || {};
  const workflowItems = (Array.isArray(parsed.workflows) ? parsed.workflows : []) as AnyRecord[];
  const policyItems = (Array.isArray(parsed.policies) ? parsed.policies : []) as AnyRecord[];
  const sopItems = (Array.isArray(parsed.sops) ? parsed.sops : []) as AnyRecord[];
  const eventItems = (Array.isArray(parsed.events) ? parsed.events : []) as AnyRecord[];
  const decisionItems = (Array.isArray(parsed.decisions) ? parsed.decisions : []) as AnyRecord[];

  return {
    mode,
    shouldCreate: mode === 'create_agent' || mode === 'create_workflow' || mode === 'create_automation',
    reply: asString(parsed.reply, 'I can help design that agent and workflow. Tell me the task, tools, approval limits, and desired outcome.', 900),
    createdSummary: asString(parsed.createdSummary, 'Created workspace artifacts from the live operator request.', 500),
    department: {
      name: asString(department.name, 'Operations', 120),
      purpose: asString(department.purpose, 'Own the requested operating capability.'),
      kpis: asStringArray(department.kpis, ['Result quality', 'Cycle time', 'Policy compliance'], 8),
      riskLevel: enumValue(department.riskLevel, risk, 'medium'),
      budget: asString(department.budget, '500', 30),
    },
    agent: {
      name: asString(agent.name, 'Live Built Agent', 120),
      role: asString(agent.role, 'AI operating agent', 240),
      goal: asString(agent.goal, `Own the requested operating capability: ${input.message}`),
      tools: asStringArray(agent.tools, ['Company Memory', 'Decision Ledger', 'Approval Queue'], 12),
      autonomyLevel: enumValue(agent.autonomyLevel, autonomy, 'approval_required'),
      dailyBudget: asString(agent.dailyBudget, '15', 30),
      riskLevel: enumValue(agent.riskLevel, risk, 'medium'),
      currentTask: asString(agent.currentTask, 'Preparing first workflow run.', 260),
      successRate: Math.max(1, Math.min(99, Number(agent.successRate || 88))),
      costToday: asString(agent.costToday, '0', 30),
    },
    workflows: workflowItems.slice(0, 8).map((item) => ({
      name: asString(item.name, 'Live Built Workflow', 160),
      trigger: asString(item.trigger, 'Founder request or business event'),
      steps: asStringArray(item.steps, ['Capture trigger', 'Retrieve context', 'Check policy', 'Prepare action', 'Record result'], 10),
      toolsUsed: asStringArray(item.toolsUsed, ['Company Memory', 'Decision Ledger'], 10),
      approvalPoints: asStringArray(item.approvalPoints, ['Human approval before risky or external action'], 8),
      successMetric: asString(item.successMetric, 'Requested business outcome completed with evidence'),
      failurePath: asString(item.failurePath, 'Stop, log failed step, and ask founder for review.'),
    })),
    policies: policyItems.slice(0, 10).map((item) => ({
      name: asString(item.name, 'Live Built Policy', 160),
      description: asString(item.description, 'Controls the requested agent/workflow capability.'),
      condition: asString(item.condition, 'risk >= medium'),
      action: asString(item.action, 'Require approval and log decision.'),
      mode: enumValue(item.mode, policyMode, 'require_approval'),
      riskLevel: enumValue(item.riskLevel, risk, 'medium'),
      enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
    })),
    sops: sopItems.slice(0, 8).map((item) => ({
      workflowName: asString(item.workflowName, '', 160),
      title: asString(item.title, 'Live Built SOP', 180),
      objective: asString(item.objective, 'Run the requested workflow consistently.'),
      steps: asStringArray(item.steps, ['Prepare inputs', 'Run workflow', 'Check approval', 'Record outcome'], 10),
      requiredTools: asStringArray(item.requiredTools, ['Company Memory', 'Decision Ledger'], 10),
      approvalRules: asStringArray(item.approvalRules, ['Human approval before risky action'], 8),
      failureHandling: asString(item.failureHandling, 'Escalate failed or risky work to founder.'),
      auditRequirements: asString(item.auditRequirements, 'Store trigger, context, approvals, result, and evidence in the ledger.'),
    })),
    events: eventItems.slice(0, 6).map((item) => ({
      eventType: asString(item.eventType, 'live_builder_created', 120),
      title: asString(item.title, 'Live builder created artifacts', 180),
      description: asString(item.description, 'Artifacts created from live operator request.'),
      severity: enumValue(item.severity, severity, 'info'),
      status: asString(item.status, 'open', 80),
    })),
    decisions: decisionItems.slice(0, 6).map((item) => ({
      action: asString(item.action, 'Created artifacts from live builder request', 220),
      policyMatched: asString(item.policyMatched, 'Live builder governance policy', 180),
      riskLevel: enumValue(item.riskLevel, risk, 'medium'),
      decision: enumValue(item.decision, decision, 'pending'),
      result: asString(item.result, 'Created and stored for review.'),
    })),
  };
}

export async function generateLiveAgentReply(input: {
  message: string;
  workspaceName?: string;
  context?: string;
}) {
  if (!configured()) {
    throw new Error('Amazon Bedrock is required. Set AWS_REGION and AWS_BEDROCK_MODEL_ID.');
  }

  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  const prompt = `You are ZeroCo's live AI-native company operator. Speak conversationally, briefly, and practically. Help the founder design workflows, digital FTEs, departments, policies, and operating systems.\n\nWorkspace: ${input.workspaceName || 'ZeroCo workspace'}\nContext: ${input.context || 'No extra context'}\nFounder said: ${input.message}\n\nReturn only the spoken reply text.`;
  const response = await client.send(new ConverseCommand({
    modelId: process.env.AWS_BEDROCK_MODEL_ID!,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { temperature: 0.35, maxTokens: 500 },
  }));

  const text = response.output?.message?.content?.find((part) => 'text' in part)?.text;
  if (!text) throw new Error('Amazon Bedrock returned an empty live response.');
  return text.trim();
}
