import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { crmActivities, db } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  status: z.enum(['open', 'done', 'blocked']),
  body: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid activity update', details: parsed.error.flatten() }, { status: 400 });

  const [activity] = await db.select().from(crmActivities).where(and(eq(crmActivities.id, id), eq(crmActivities.workspaceId, ctx.workspace.id))).limit(1);
  if (!activity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });

  const [updatedActivity] = await db.update(crmActivities).set({
    status: parsed.data.status,
    body: parsed.data.body ? `${activity.body}\n${parsed.data.body}`.trim() : activity.body,
  }).where(and(eq(crmActivities.id, id), eq(crmActivities.workspaceId, ctx.workspace.id))).returning();

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: activity.ownerAgentId,
    sourceType: 'crm_activity_update',
    sourceId: activity.id,
    content: `CRM activity ${activity.title} changed from ${activity.status} to ${parsed.data.status}. ${parsed.data.body || ''}`,
    metadata: { previousStatus: activity.status, status: parsed.data.status },
  });

  return NextResponse.json({ activity: updatedActivity });
}
