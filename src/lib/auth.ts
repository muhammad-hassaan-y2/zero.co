import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  schema: {
    user: {
      fields: {
        emailVerified: 'emailVerified',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    },
    session: {
      fields: {
        userId: 'userId',
        expiresAt: 'expiresAt',
        ipAddress: 'ipAddress',
        userAgent: 'userAgent',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    },
    account: {
      fields: {
        accountId: 'accountId',
        providerId: 'providerId',
        userId: 'userId',
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
        idToken: 'idToken',
        accessTokenExpiresAt: 'accessTokenExpiresAt',
        refreshTokenExpiresAt: 'refreshTokenExpiresAt',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // MVP: log reset URL. Replace with Resend/Amazon SES before production.
      console.log(`[ZeroCo password reset] ${user.email}: ${url}`);
    },
  },
});
