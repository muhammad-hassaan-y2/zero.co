import 'server-only';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { and, eq } from 'drizzle-orm';
import { customerQueries, db, integrationAccounts } from '@/db';

const GMAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

type TokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000';
}

export function googleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || `${appUrl()}/api/integrations/google/callback`;
}

function requireGoogleConfig() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
  }
}

function encryptionKey() {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'development-secret';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split('.');
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error('Encrypted token is malformed.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivRaw, 'base64'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, 'base64')), decipher.final()]).toString('utf8');
}

export function signGoogleState(input: { userId: string; workspaceId: string }) {
  const payload = Buffer.from(JSON.stringify({ ...input, nonce: nanoid(), createdAt: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', encryptionKey()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyGoogleState(state: string) {
  const [payload, signature] = state.split('.');
  if (!payload || !signature) throw new Error('Invalid Google OAuth state.');
  const expected = crypto.createHmac('sha256', encryptionKey()).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid Google OAuth state signature.');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId: string; workspaceId: string; createdAt: number };
  if (Date.now() - parsed.createdAt > 15 * 60 * 1000) throw new Error('Google OAuth state expired.');
  return parsed;
}

export function buildGoogleAuthUrl(state: string) {
  requireGoogleConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', googleRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', GMAIL_SCOPES);
  url.searchParams.set('state', state);
  return url.toString();
}

async function googleTokenRequest(params: Record<string, string>) {
  requireGoogleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error_description || payload?.error || 'Google token exchange failed.');
  return payload as TokenPayload;
}

export async function exchangeGoogleCode(code: string) {
  return googleTokenRequest({
    code,
    redirect_uri: googleRedirectUri(),
    grant_type: 'authorization_code',
  });
}

export async function refreshGoogleToken(refreshToken: string) {
  return googleTokenRequest({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
}

export async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || 'Gmail API request failed.');
  return payload as T;
}

export async function upsertGoogleIntegration(input: {
  workspaceId: string;
  userId: string;
  tokens: TokenPayload;
}) {
  const profile = await gmailFetch<{ emailAddress: string; messagesTotal?: number; threadsTotal?: number }>(input.tokens.access_token, 'users/me/profile');
  const expiresAt = input.tokens.expires_in ? new Date(Date.now() + input.tokens.expires_in * 1000) : null;
  const encryptedAccess = encryptSecret(input.tokens.access_token);
  const encryptedRefresh = input.tokens.refresh_token ? encryptSecret(input.tokens.refresh_token) : null;

  const existing = await db.select().from(integrationAccounts).where(and(
    eq(integrationAccounts.workspaceId, input.workspaceId),
    eq(integrationAccounts.provider, 'google'),
    eq(integrationAccounts.providerAccountId, profile.emailAddress),
  )).limit(1);

  if (existing[0]) {
    const [account] = await db.update(integrationAccounts).set({
      userId: input.userId,
      email: profile.emailAddress,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh || existing[0].refreshToken,
      expiresAt,
      scope: input.tokens.scope || GMAIL_SCOPES,
      status: 'connected',
      metadata: { messagesTotal: profile.messagesTotal || 0, threadsTotal: profile.threadsTotal || 0 },
      updatedAt: new Date(),
    }).where(eq(integrationAccounts.id, existing[0].id)).returning();
    return account;
  }

  const [account] = await db.insert(integrationAccounts).values({
    id: nanoid(),
    workspaceId: input.workspaceId,
    userId: input.userId,
    provider: 'google',
    providerAccountId: profile.emailAddress,
    email: profile.emailAddress,
    accessToken: encryptedAccess,
    refreshToken: encryptedRefresh,
    expiresAt,
    scope: input.tokens.scope || GMAIL_SCOPES,
    status: 'connected',
    metadata: { messagesTotal: profile.messagesTotal || 0, threadsTotal: profile.threadsTotal || 0 },
  }).returning();
  return account;
}

export async function getGoogleIntegration(workspaceId: string) {
  const [account] = await db.select().from(integrationAccounts).where(and(
    eq(integrationAccounts.workspaceId, workspaceId),
    eq(integrationAccounts.provider, 'google'),
    eq(integrationAccounts.status, 'connected'),
  )).limit(1);
  return account || null;
}

export async function getValidGoogleAccessToken(account: typeof integrationAccounts.$inferSelect) {
  if (account.expiresAt && account.expiresAt.getTime() > Date.now() + 60_000) return decryptSecret(account.accessToken);
  if (!account.refreshToken) return decryptSecret(account.accessToken);
  const refreshed = await refreshGoogleToken(decryptSecret(account.refreshToken));
  const expiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : account.expiresAt;
  await db.update(integrationAccounts).set({
    accessToken: encryptSecret(refreshed.access_token),
    expiresAt,
    updatedAt: new Date(),
  }).where(eq(integrationAccounts.id, account.id));
  return refreshed.access_token;
}

function decodeBase64Url(data?: string) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function findBody(payload: { body?: { data?: string }; parts?: unknown[] }): string {
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  for (const part of payload.parts || []) {
    const body = findBody(part as { body?: { data?: string }; parts?: unknown[] });
    if (body) return body;
  }
  return '';
}

export async function syncGmailToQueries(input: { workspaceId: string; agentId?: string | null; limit?: number }) {
  const account = await getGoogleIntegration(input.workspaceId);
  if (!account) throw new Error('Google Gmail is not connected.');
  const accessToken = await getValidGoogleAccessToken(account);
  const list = await gmailFetch<{ messages?: Array<{ id: string; threadId: string }> }>(
    accessToken,
    `users/me/messages?maxResults=${input.limit || 10}&q=${encodeURIComponent('newer_than:30d -from:me')}`,
  );

  const created = [];
  for (const messageRef of list.messages || []) {
    const message = await gmailFetch<{
      id: string;
      snippet?: string;
      payload?: { headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: unknown[] };
    }>(accessToken, `users/me/messages/${messageRef.id}?format=full`);
    const headers = message.payload?.headers || [];
    const from = headers.find((header) => header.name.toLowerCase() === 'from')?.value || account.email || 'unknown';
    const subject = headers.find((header) => header.name.toLowerCase() === 'subject')?.value || 'Gmail message';
    const emailMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const customerEmail = emailMatch?.[0] || account.email || 'unknown@example.com';
    const customerName = from.replace(/<.*?>/g, '').replace(/"/g, '').trim() || customerEmail;
    const body = findBody(message.payload || {}) || message.snippet || '';

    const [existing] = await db.select().from(customerQueries).where(and(
      eq(customerQueries.workspaceId, input.workspaceId),
      eq(customerQueries.source, `gmail:${message.id}`),
    )).limit(1);
    if (existing) continue;

    const [query] = await db.insert(customerQueries).values({
      id: nanoid(),
      workspaceId: input.workspaceId,
      ownerAgentId: input.agentId || null,
      customerName,
      customerEmail,
      companyName: null,
      subject,
      message: body.slice(0, 4000),
      intent: 'email',
      priority: 'medium',
      status: 'new',
      source: `gmail:${message.id}`,
    }).returning();
    created.push(query);
  }

  await db.update(integrationAccounts).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(integrationAccounts.id, account.id));
  return { account, created };
}

export function createRawEmail(input: { to: string; subject: string; body: string; from?: string | null }) {
  const raw = [
    input.from ? `From: ${input.from}` : '',
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    input.body,
  ].filter(Boolean).join('\r\n');
  return Buffer.from(raw).toString('base64url');
}
