import { NextResponse } from 'next/server';
import { getApiWorkspace } from '@/lib/api-session';
import { getWorkspaceData } from '@/lib/data';

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

export async function GET(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const data = await getWorkspaceData();
  const payload = {
    leads: data.salesLeads,
    accounts: data.crmAccounts,
    contacts: data.crmContacts,
    customers: data.customers,
    deals: data.salesDeals,
    activities: data.crmActivities,
    customerQueries: data.customerQueries,
  };

  if (format === 'csv') {
    const section = url.searchParams.get('section') || 'leads';
    const rows = payload[section as keyof typeof payload] || payload.leads;
    return new Response(toCsv(rows as Record<string, unknown>[]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="zeroco-${section}.csv"`,
      },
    });
  }

  return NextResponse.json(payload);
}
