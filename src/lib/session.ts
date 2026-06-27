import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { pool } from '@/db';

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
  const result = await pool.query('select * from workspaces where user_id = $1 limit 1', [user.id]);
  const workspace = result.rows[0]
    ? {
        id: String(result.rows[0].id),
        userId: String(result.rows[0].user_id),
        name: String(result.rows[0].name),
        slug: String(result.rows[0].slug),
        businessType: result.rows[0].business_type ? String(result.rows[0].business_type) : null,
        customerSegment: result.rows[0].customer_segment ? String(result.rows[0].customer_segment) : null,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      }
    : null;
  return { user, workspace };
}

export async function requireWorkspace() {
  const result = await getCurrentWorkspace();
  if (!result.workspace) redirect('/onboarding');
  return result as typeof result & { workspace: NonNullable<typeof result.workspace> };
}
