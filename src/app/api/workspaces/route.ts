import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { pool } from '@/db';
import { getSession } from '@/lib/session';
import { slugify } from '@/lib/slug';

function mapWorkspace(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    slug: String(row.slug),
    businessType: row.business_type ? String(row.business_type) : null,
    customerSegment: row.customer_segment ? String(row.customer_segment) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || body.companyName || '').trim();
  if (!name) return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });

  const existingResult = await pool.query('select * from workspaces where user_id = $1 limit 1', [session.user.id]);
  const existing = existingResult.rows[0] ? mapWorkspace(existingResult.rows[0]) : null;

  if (existing) return NextResponse.json({ workspace: existing });

  const workspaceId = nanoid();
  const slug = slugify(name);
  const result = await pool.query(
    `insert into workspaces (id, user_id, name, slug) values ($1, $2, $3, $4) returning *`,
    [workspaceId, session.user.id, name, slug],
  );
  const workspace = mapWorkspace(result.rows[0]);

  return NextResponse.json({ workspace });
}
