import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getConnection, sqliteSchema, pgSchema, mysqlSchema } from '@qwenweaver/database';
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from './config.js';

const { db, dialect } = getConnection();

const adapterProvider = dialect === 'postgres' ? 'pg' : dialect;

const getSchema = () => {
  if (dialect === 'sqlite') return sqliteSchema;
  if (dialect === 'mysql') return mysqlSchema;
  return pgSchema;
};

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: adapterProvider,
    schema: getSchema(),
    usePlural: false,
    camelCase: true,
  }),
  emailAndPassword: {
    enabled: true,
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
