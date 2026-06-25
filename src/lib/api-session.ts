import 'server-only';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, workspaces } from '@/db';

export async function getApiWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: 'Unauthorized' as const, status: 401 as const };

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, session.user.id))
    .limit(1);

  if (!workspace) return { error: 'Workspace not found' as const, status: 404 as const, user: session.user };
  return { user: session.user, workspace };
}
