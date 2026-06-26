import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiWorkspace } from '@/lib/api-session';
import { runWorkflowForResult } from '@/lib/automation-runtime';

const schema = z.object({
  triggerOverride: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid workflow run request', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runWorkflowForResult({
      workspaceId: ctx.workspace.id,
      workflowId: id,
      actorEmail: ctx.user.email,
      triggerOverride: parsed.data.triggerOverride,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Workflow run failed' }, { status: 502 });
  }
}
