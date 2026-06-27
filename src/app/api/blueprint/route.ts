import { NextResponse } from 'next/server';
import { getWorkspaceData } from '@/lib/data';

export async function GET() {
  const data = await getWorkspaceData();
  return NextResponse.json({ blueprint: data.blueprint });
}
