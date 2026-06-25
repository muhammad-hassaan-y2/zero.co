import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db, workspaces } from '@/db';
import { getSession } from '@/lib/session';
import { slugify } from '@/lib/slug';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || body.companyName || '').trim();
  if (!name) return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });

  const [existing] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, session.user.id))
    .limit(1);

  if (existing) return NextResponse.json({ workspace: existing });

  const [workspace] = await db
    .insert(workspaces)
    .values({
      id: nanoid(),
      userId: session.user.id,
      name,
      slug: slugify(name),
    })
    .returning();

  return NextResponse.json({ workspace });
}
