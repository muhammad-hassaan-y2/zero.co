import 'server-only';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { InferInsertModel } from 'drizzle-orm';
import { companyBlueprints } from '@/db/schema';

type BlueprintInsert = InferInsertModel<typeof companyBlueprints>;

type Profile = {
  businessDescription: string;
  customers: string;
  problemSolved?: string | null;
  customerOutcome?: string | null;
  coreDepartments?: string | null;
  currentTools?: string | null;
  aiAutomationGoals?: string | null;
  riskTolerance?: string | null;
};

function configured() {
  return process.env.AWS_REGION && process.env.AWS_BEDROCK_MODEL_ID;
}

export async function enhanceBlueprintWithBedrock(profile: Profile, current: BlueprintInsert): Promise<BlueprintInsert> {
  if (!configured()) {
    throw new Error('Amazon Bedrock is required. Set AWS_REGION and AWS_BEDROCK_MODEL_ID.');
  }

  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
    const prompt = `You are designing an outcome-driven AI-native company operating system. Do not describe generic AI services. Design a system that delivers the concrete customer result and proves it with metrics, quality gates, workflows, policies, and digital FTE ownership. Return ONLY valid JSON with keys: companyName, valueProposition, revenueModel, operatingModel, coreKpis array, launchChecklist array. Do not include markdown.\n\nBusiness: ${profile.businessDescription}\nCustomers: ${profile.customers}\nProblem: ${profile.problemSolved || ''}\nPaid customer result: ${profile.customerOutcome || ''}\nDepartments: ${profile.coreDepartments || ''}\nTools: ${profile.currentTools || ''}\nAutomation goals: ${profile.aiAutomationGoals || ''}\nRisk tolerance: ${profile.riskTolerance || 'medium'}`;
  const res = await client.send(new ConverseCommand({
    modelId: process.env.AWS_BEDROCK_MODEL_ID!,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { temperature: 0.2, maxTokens: 900 },
  }));
  const text = res.output?.message?.content?.find((part) => 'text' in part)?.text;
  if (!text) throw new Error('Amazon Bedrock returned an empty response.');

  const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
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
