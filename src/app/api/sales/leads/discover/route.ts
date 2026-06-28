import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db, decisionLedger, salesLeads } from '@/db';
import { getApiWorkspace } from '@/lib/api-session';

const schema = z.object({
  seedUrls: z.string().optional().default(''),
  importedLeads: z.string().optional().default(''),
  ownerAgentId: z.string().optional().nullable(),
});

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function cleanUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function textBetween(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

function inferPainPoint(pageText: string, customers: string | null) {
  const text = pageText.toLowerCase();
  if (text.includes('shopify') || text.includes('ecommerce')) return 'Likely needs faster ecommerce support, refund operations, and customer response automation.';
  if (text.includes('support') || text.includes('help')) return 'Likely needs support workload reduction and faster customer query handling.';
  if (text.includes('agency')) return 'Likely needs repeatable lead handling, customer operations, and automated follow-up workflows.';
  return `Potential fit for ${customers || 'the configured customer segment'} based on the submitted official source.`;
}

function parseImportedLead(line: string) {
  const email = line.match(emailPattern)?.[0];
  if (!email) return null;
  const parts = line.split(',').map((part) => part.trim()).filter(Boolean);
  const companyName = parts[0] && !parts[0].includes('@') ? parts[0] : email.split('@')[1].split('.')[0];
  const contactName = parts[1] && !parts[1].includes('@') ? parts[1] : 'Sales contact';
  const website = parts.find((part) => part.startsWith('http') || part.includes('.com')) || '';
  const painPoint = parts.slice(3).join(', ') || 'Imported lead requires qualification and sales follow-up.';
  return { companyName, contactName, email, website, painPoint, source: 'import' };
}

export async function POST(request: Request) {
  const ctx = await getApiWorkspace();
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid lead discovery request', details: parsed.error.flatten() }, { status: 400 });
  }

  const discovered: Array<{
    companyName: string;
    contactName: string;
    email: string;
    website: string;
    painPoint: string;
    source: string;
  }> = [];
  const skipped: string[] = [];

  for (const line of parsed.data.importedLeads.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const lead = parseImportedLead(line);
    if (lead) discovered.push(lead);
    else skipped.push(`Skipped imported line without email: ${line.slice(0, 80)}`);
  }

  for (const rawUrl of parsed.data.seedUrls.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const url = cleanUrl(rawUrl);
    if (!url) {
      skipped.push(`Invalid URL: ${rawUrl}`);
      continue;
    }
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'ZeroCo lead discovery agent' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        skipped.push(`${url.href} returned HTTP ${response.status}`);
        continue;
      }
      const html = await response.text();
      const emails = Array.from(new Set(html.match(emailPattern) || [])).filter((email) => !email.toLowerCase().endsWith('.png'));
      if (!emails.length) {
        skipped.push(`${url.href} had no visible email address`);
        continue;
      }
      const title = textBetween(html, /<title[^>]*>([^<]+)<\/title>/i);
      const description = textBetween(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const companyName = title.split('|')[0].split('-')[0].trim() || url.hostname.replace(/^www\./, '');
      discovered.push({
        companyName,
        contactName: 'Sales contact',
        email: emails[0],
        website: url.href,
        painPoint: inferPainPoint(`${title} ${description}`, ctx.workspace.customerSegment),
        source: 'official_url',
      });
    } catch (error) {
      skipped.push(`${url.href} could not be fetched: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  const created = [];
  for (const lead of discovered.slice(0, 25)) {
    const [createdLead] = await db.insert(salesLeads).values({
      id: nanoid(),
      workspaceId: ctx.workspace.id,
      ownerAgentId: parsed.data.ownerAgentId || null,
      companyName: lead.companyName,
      contactName: lead.contactName,
      email: lead.email,
      website: lead.website || null,
      segment: ctx.workspace.customerSegment || null,
      painPoint: lead.painPoint,
      status: 'new',
      score: 0,
      source: lead.source,
      notes: `Discovered by lead agent from ${lead.source}.`,
    }).returning();
    created.push(createdLead);
  }

  await db.insert(decisionLedger).values({
    id: nanoid(),
    workspaceId: ctx.workspace.id,
    agentId: parsed.data.ownerAgentId || null,
    departmentId: null,
    action: 'Discovered or imported sales leads into CRM',
    policyMatched: 'Official-source lead discovery policy',
    riskLevel: 'low',
    decision: 'executed',
    result: `Created ${created.length} leads. Skipped ${skipped.length}.`,
    approvedBy: ctx.user.email,
    databaseReference: `aurora:sales_leads:${created.map((lead) => lead.id).join(',')}`,
  });

  return NextResponse.json({ leads: created, skipped });
}
