import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, workspaces } from '@/db';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect('/sign-in');
  return session.user;
}

export async function getCurrentWorkspace() {
  const user = await requireUser();
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, user.id))
    .limit(1);
  return { user, workspace };
}

export async function requireWorkspace() {
  const result = await getCurrentWorkspace();
  if (!result.workspace) redirect('/onboarding');
  return result as typeof result & { workspace: NonNullable<typeof result.workspace> };
}
