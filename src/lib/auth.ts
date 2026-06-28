import 'server-only';

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, pool, account, session, user, verification } from '@/db';

const SESSION_COOKIE = 'zeroco_session';
const SESSION_DAYS = 7;
const PASSWORD_RESET_MINUTES = 30;

const globalForAuth = globalThis as unknown as {
  zerocoSessionCache?: Map<string, { user: SafeUser; session: SessionRecord }>;
};

type HeaderSource = Headers | { get(name: string): string | null } | null | undefined;

type SafeUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SessionRecord = {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

type AccountRecord = {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  password: string | null;
};

function sessionCache() {
  globalForAuth.zerocoSessionCache ??= new Map();
  return globalForAuth.zerocoSessionCache;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

function verifyPassword(password: string, hash: string | null) {
  if (!hash) return false;
  const parts = hash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, encoded] = parts;
  const candidate = scryptSync(password, salt, 64) as Buffer;
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

function passwordResetExpiresAt() {
  return new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);
}

async function selectUserById(id: string) {
  const result = await pool.query('select * from "user" where id = $1 limit 1', [id]);
  return result.rows[0] ? rawUser(result.rows[0]) : null;
}

async function selectUserByEmail(email: string) {
  const result = await pool.query('select * from "user" where email = $1 limit 1', [normalizeEmail(email)]);
  return result.rows[0] ? rawUser(result.rows[0]) : null;
}

async function selectAccountByUserId(userId: string) {
  const result = await pool.query('select * from account where user_id = $1 and provider_id = $2 limit 1', [userId, 'credentials']);
  return result.rows[0] ? rawAccount(result.rows[0]) : null;
}

async function selectSessionByToken(token: string) {
  const result = await pool.query('select * from session where token = $1 limit 1', [token]);
  return result.rows[0] ? rawSession(result.rows[0]) : null;
}

function rawDate(value: unknown) {
  return value instanceof Date ? value : new Date(String(value));
}

function rawUser(row: Record<string, unknown>): typeof user.$inferSelect {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    emailVerified: Boolean(row.email_verified),
    image: row.image ? String(row.image) : null,
    createdAt: rawDate(row.created_at),
    updatedAt: rawDate(row.updated_at),
  };
}

function rawSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    token: String(row.token),
    expiresAt: rawDate(row.expires_at),
    createdAt: rawDate(row.created_at),
    updatedAt: rawDate(row.updated_at),
    userId: String(row.user_id),
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
  };
}

function rawAccount(row: Record<string, unknown>): AccountRecord {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    providerId: String(row.provider_id),
    userId: String(row.user_id),
    password: row.password ? String(row.password) : null,
  };
}

function toSafeUser(row: typeof user.$inferSelect): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createSessionRow(userId: string, headers?: HeaderSource) {
  const token = nanoid(48);
  const expiresAt = sessionExpiresAt();
  const id = nanoid();
  const userAgent = headers?.get?.('user-agent') ?? null;
  const forwardedFor = headers?.get?.('x-forwarded-for') ?? null;
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || headers?.get?.('x-real-ip') || null;

  await db.insert(session).values({
    id,
    token,
    expiresAt,
    userId,
    ipAddress,
    userAgent,
  });

  return {
    session: {
      id,
      token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      ipAddress,
      userAgent,
    },
    token,
  };
}

async function createCredentialAccount(userId: string, password: string) {
  const passwordHash = hashPassword(password);
  await db.insert(account).values({
    id: nanoid(),
    accountId: userId,
    providerId: 'credentials',
    userId,
    password: passwordHash,
  });
}

async function getCredentialAccount(userId: string) {
  const row = await selectAccountByUserId(userId);
  return row;
}

async function createOrSelectUser(input: { name: string; email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const existingUser = await selectUserByEmail(email);
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  const now = new Date();
  const createdUser = {
    id: nanoid(),
    name: input.name.trim() || 'Founder',
    email,
    emailVerified: false,
    image: null,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof user.$inferInsert;

  await db.insert(user).values(createdUser);
  await createCredentialAccount(createdUser.id, input.password);
  return createdUser;
}

async function authenticateUser(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const foundUser = await selectUserByEmail(email);
  if (!foundUser) return null;

  const credentialAccount = await getCredentialAccount(foundUser.id);
  if (!credentialAccount || !verifyPassword(input.password, credentialAccount.password)) {
    return null;
  }

  return foundUser;
}

async function createPasswordResetToken(email: string) {
  const normalized = normalizeEmail(email);
  const foundUser = await selectUserByEmail(normalized);
  if (!foundUser) return null;

  await db.delete(verification).where(eq(verification.identifier, normalized));

  const token = nanoid(48);
  await db.insert(verification).values({
    id: nanoid(),
    identifier: normalized,
    value: token,
    expiresAt: passwordResetExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return token;
}

async function resetPasswordByToken(token: string, newPassword: string) {
  const [entry] = await db.select().from(verification).where(eq(verification.value, token)).limit(1);
  if (!entry || entry.expiresAt.getTime() < Date.now()) {
    throw new Error('Reset token is missing or expired');
  }

  const foundUser = await selectUserByEmail(entry.identifier);
  if (!foundUser) {
    throw new Error('Reset token is missing or expired');
  }

  const passwordHash = hashPassword(newPassword);
  const accountRow = await getCredentialAccount(foundUser.id);
  if (accountRow) {
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(account.id, accountRow.id));
  } else {
    await createCredentialAccount(foundUser.id, newPassword);
  }

  await db.delete(verification).where(eq(verification.value, token));
  return foundUser;
}

function getCookieToken(headers?: HeaderSource) {
  const cookie = headers?.get?.('cookie');
  if (!cookie) return null;
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null;
}

async function resolveSession(headers?: HeaderSource) {
  const token = getCookieToken(headers);
  if (!token) return null;

  const cached = sessionCache().get(token);
  if (cached) {
    if (cached.session.expiresAt.getTime() < Date.now()) {
      sessionCache().delete(token);
      await db.delete(session).where(eq(session.token, token));
      return null;
    }
    return cached;
  }

  const currentSession = await selectSessionByToken(token);
  if (!currentSession) {
    return null;
  }

  const expiresAt = currentSession.expiresAt instanceof Date ? currentSession.expiresAt : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    await db.delete(session).where(eq(session.id, currentSession.id));
    return null;
  }

  const foundUser = await selectUserById(currentSession.userId);
  if (!foundUser) return null;

  return {
    user: toSafeUser(foundUser),
    session: currentSession,
  };
}

export const auth = {
  api: {
    async getSession({ headers }: { headers?: HeaderSource }) {
      return resolveSession(headers);
    },
  },
};

export async function signUpEmail(input: { name: string; email: string; password: string }, headers?: HeaderSource) {
  const createdUser = await createOrSelectUser(input);
  const authSession = await createSessionRow(createdUser.id, headers);
  const result = {
    user: toSafeUser(createdUser),
    session: authSession.session,
    sessionToken: authSession.token,
  };
  sessionCache().set(authSession.token, { user: result.user, session: authSession.session });
  return result;
}

export async function signInEmail(input: { email: string; password: string }, headers?: HeaderSource) {
  const foundUser = await authenticateUser(input);
  if (!foundUser) {
    throw new Error('Invalid email or password');
  }

  const authSession = await createSessionRow(foundUser.id, headers);
  const result = {
    user: toSafeUser(foundUser),
    session: authSession.session,
    sessionToken: authSession.token,
  };
  sessionCache().set(authSession.token, { user: result.user, session: authSession.session });
  return result;
}

export async function signOut(token: string | null | undefined) {
  if (!token) return;
  sessionCache().delete(token);
  await db.delete(session).where(eq(session.token, token));
}

export async function requestPasswordReset(input: { email: string; redirectTo?: string }) {
  const token = await createPasswordResetToken(input.email);
  if (!token) {
    return { resetUrl: null };
  }

  const redirectTo = input.redirectTo || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`;
  const resetUrl = new URL(redirectTo);
  resetUrl.searchParams.set('token', token);

  console.info(`Password reset URL for ${normalizeEmail(input.email)}: ${resetUrl.toString()}`);

  return { resetUrl: resetUrl.toString() };
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const userRow = await resetPasswordByToken(input.token, input.newPassword);
  return { user: toSafeUser(userRow) };
}

export function createSessionCookie(token: string) {
  const secure = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60};${secure ? ' Secure;' : ''}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure ? ' Secure;' : ''}`;
}
