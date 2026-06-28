import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { crmActivities, db } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  leadId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  ownerAgentId: z.string().optional().nullable(),
  type: z.enum(['task', 'note', 'call', 'meeting', 'email']).default('task'),
  title: z.string().min(2),
  body: z.string().optional().default(''),
  status: z.string().optional().default('open'),
  dueAt: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid activity data', details: parsed.error.flatten() }, { status: 400 });

  const [activity] = await db.insert(crmActivities).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    leadId: parsed.data.leadId || null,
    customerId: parsed.data.customerId || null,
    accountId: parsed.data.accountId || null,
    contactId: parsed.data.contactId || null,
    ownerAgentId: parsed.data.ownerAgentId || null,
    type: parsed.data.type,
    title: parsed.data.title,
    body: parsed.data.body,
    status: parsed.data.status,
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
  }).returning();

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: activity.ownerAgentId,
    sourceType: `crm_${activity.type}`,
    sourceId: activity.id,
    content: `${activity.type.toUpperCase()}: ${activity.title}. ${activity.body}`,
    metadata: { status: activity.status, dueAt: activity.dueAt },
  });

  return NextResponse.json({ activity });
}
