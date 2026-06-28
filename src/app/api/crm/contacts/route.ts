import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { crmContacts, db } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  accountId: z.string().optional().nullable(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  title: z.string().optional().default(''),
  lifecycleStage: z.string().optional().default('lead'),
  ownerAgentId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid contact data', details: parsed.error.flatten() }, { status: 400 });

  const [contact] = await db.insert(crmContacts).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    accountId: parsed.data.accountId || null,
    ownerAgentId: parsed.data.ownerAgentId || null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    title: parsed.data.title || null,
    lifecycleStage: parsed.data.lifecycleStage,
  }).returning();

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: contact.ownerAgentId,
    sourceType: 'crm_contact',
    sourceId: contact.id,
    content: `CRM contact ${contact.name} <${contact.email}>. Title: ${contact.title || 'unknown'}. Lifecycle stage: ${contact.lifecycleStage}.`,
  });

  return NextResponse.json({ contact });
}
