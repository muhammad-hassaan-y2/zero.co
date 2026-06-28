import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { customerQueries, db } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

const schema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  companyName: z.string().optional().default(''),
  subject: z.string().min(3),
  message: z.string().min(8),
  source: z.enum(['manual', 'email', 'form', 'api']).default('manual'),
  ownerAgentId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid customer query', details: parsed.error.flatten() }, { status: 400 });
  }

  const [query] = await db.insert(customerQueries).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    ownerAgentId: parsed.data.ownerAgentId || null,
    customerName: parsed.data.customerName,
    customerEmail: parsed.data.customerEmail,
    companyName: parsed.data.companyName || null,
    subject: parsed.data.subject,
    message: parsed.data.message,
    intent: 'general',
    priority: 'medium',
    status: 'new',
    source: parsed.data.source,
  }).returning();

  return NextResponse.json({ query });
}
