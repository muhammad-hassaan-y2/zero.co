import 'server-only';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { pool } from '@/db';

export async function getApiWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: 'Unauthorized' as const, status: 401 as const };

  const result = await pool.query('select * from workspaces where user_id = $1 limit 1', [session.user.id]);
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

  if (!workspace) return { error: 'Workspace not found' as const, status: 404 as const, user: session.user };
  return { user: session.user, workspace };
}
