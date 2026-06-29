import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getConnection, sqliteSchema, pgSchema, mysqlSchema } from '@qwenweaver/database';
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  CORS_ORIGINS,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  BREVO_API_KEY,
} from './config.js';
import { sendVerificationEmail } from './mail.js';

const { db, dialect } = getConnection();

const adapterProvider = dialect === 'postgres' ? 'pg' : dialect;

const getTables = () => {
  const s = dialect === 'sqlite' ? sqliteSchema : dialect === 'mysql' ? mysqlSchema : pgSchema;
  return { user: s.user, session: s.session, account: s.account, verification: s.verification };
};

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: CORS_ORIGINS,
  database: drizzleAdapter(db, {
    provider: adapterProvider,
    schema: getTables(),
    usePlural: false,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !!BREVO_API_KEY,
  },
  emailVerification: {
    sendOnSignUp: !!BREVO_API_KEY,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders: {
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: GITHUB_CLIENT_ID,
            clientSecret: GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
