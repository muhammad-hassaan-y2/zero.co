import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, decisionLedger, simulationEvents } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { designSoftwareFactoryWithBedrock } from '@/lib/bedrock';

const schema = z.object({
  request: z.string().min(12),
  targetUsers: z.string().min(3),
  requiredCapabilities: z.array(z.string()).default([]),
  preferredStack: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
  riskControls: z.string().min(6),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid software factory request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const spec = await designSoftwareFactoryWithBedrock({
      workspaceName: ctx.workspace.name,
      businessType: ctx.workspace.businessType,
      customers: ctx.workspace.customerSegment,
      request: parsed.data.request,
      targetUsers: parsed.data.targetUsers,
      requiredCapabilities: parsed.data.requiredCapabilities,
      preferredStack: parsed.data.preferredStack,
      integrations: parsed.data.integrations,
      riskControls: parsed.data.riskControls,
    });

    await db.insert(simulationEvents).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: null,
      eventType: 'software_factory_spec_generated',
      title: `${spec.product.name} software factory spec generated`,
      description: `${spec.product.category} plan with ${spec.frontend.pages.length} pages, ${spec.backend.apiRoutes.length} API routes, ${spec.agents.length} agents, and ${spec.connectors.length} connectors.`,
      severity: spec.connectors.some((connector) => ['high', 'critical'].includes(connector.risk)) ? 'warning' : 'info',
      status: 'open',
    });

    await db.insert(decisionLedger).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      agentId: null,
      departmentId: null,
      action: `Generated software and automation factory spec: ${spec.product.name}`,
      policyMatched: 'Software factory planning policy',
      riskLevel: spec.connectors.some((connector) => connector.risk === 'critical') ? 'critical' : spec.connectors.some((connector) => connector.risk === 'high') ? 'high' : 'medium',
      decision: 'pending',
      result: 'Spec generated. Human approval required before external connector writes or deployment.',
      approvedBy: null,
      databaseReference: `aurora:software_factory:${nanoid(8)}`,
    });

    return NextResponse.json({ spec });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Amazon Bedrock software factory design failed' },
      { status: 502 },
    );
  }
}
