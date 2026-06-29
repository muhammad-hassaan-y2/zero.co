import { NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';
import { syncGmailToQueries } from '@/lib/google-integration';
import { storeAgentMemory } from '@/lib/agent-memory';

export async function POST() {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  try {
    const data = await getWorkspaceData();
    const supportAgent = data.agents.find((agent) => `${agent.name} ${agent.role}`.toLowerCase().includes('support')) || data.agents[0];
    const result = await syncGmailToQueries({ workspaceId: ctx.workspace.id, agentId: supportAgent?.id || null, limit: 10 });
    await storeAgentMemory({
      workspaceId: ctx.workspace.id,
      agentId: supportAgent?.id || null,
      sourceType: 'gmail_sync',
      sourceId: result.account.id,
      content: `Synced Gmail account ${result.account.email}. Created ${result.created.length} customer queries.`,
      metadata: { created: result.created.length },
    });
    return NextResponse.json({ created: result.created, account: { email: result.account.email, lastSyncAt: new Date() } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Gmail sync failed' }, { status: 502 });
  }
}
