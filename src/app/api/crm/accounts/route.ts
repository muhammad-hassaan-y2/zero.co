import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { crmAccounts, db } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';
import { storeAgentMemory } from '@/lib/agent-memory';

const schema = z.object({
  name: z.string().min(2),
  website: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  status: z.string().optional().default('prospect'),
  annualRevenue: z.coerce.number().min(0).default(0),
  notes: z.string().optional().default(''),
  ownerAgentId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid account data', details: parsed.error.flatten() }, { status: 400 });

  const [account] = await db.insert(crmAccounts).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    ownerAgentId: parsed.data.ownerAgentId || null,
    name: parsed.data.name,
    website: parsed.data.website || null,
    industry: parsed.data.industry || null,
    status: parsed.data.status,
    annualRevenue: parsed.data.annualRevenue.toFixed(2),
    notes: parsed.data.notes,
  }).returning();

  await storeAgentMemory({
    workspaceId: ctx.workspace.id,
    agentId: account.ownerAgentId,
    sourceType: 'crm_account',
    sourceId: account.id,
    content: `CRM account ${account.name}. Industry: ${account.industry || 'unknown'}. Status: ${account.status}. Notes: ${account.notes}`,
  });

  return NextResponse.json({ account });
}
