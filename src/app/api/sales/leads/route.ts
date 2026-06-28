import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, salesLeads } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().min(2),
  email: z.string().email(),
  website: z.string().optional().default(''),
  segment: z.string().optional().default(''),
  painPoint: z.string().min(6),
  notes: z.string().optional().default(''),
  ownerAgentId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid lead data', details: parsed.error.flatten() }, { status: 400 });
  }

  const [lead] = await db.insert(salesLeads).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    ownerAgentId: parsed.data.ownerAgentId || null,
    companyName: parsed.data.companyName,
    contactName: parsed.data.contactName,
    email: parsed.data.email,
    website: parsed.data.website || null,
    segment: parsed.data.segment || null,
    painPoint: parsed.data.painPoint,
    notes: parsed.data.notes,
    status: 'new',
    score: 0,
    source: 'manual',
  }).returning();

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: lead.ownerAgentId,
    sourceType: 'sales_lead',
    sourceId: lead.id,
    content: `Sales lead ${lead.companyName}. Contact: ${lead.contactName} <${lead.email}>. Segment: ${lead.segment || 'unknown'}. Pain point: ${lead.painPoint}. Notes: ${lead.notes}`,
  });

  return NextResponse.json({ lead });
}
