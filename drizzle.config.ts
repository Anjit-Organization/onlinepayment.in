import { defineConfig } from 'drizzle-kit'

/**
 * drizzle-kit reads `.env`, not `.env.local`, so load it explicitly. Node 20.12+
 * provides loadEnvFile with no dependency.
 */
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local (CI, or a fresh clone) — fall through to the ambient env.
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add the Supabase connection string to .env.local.\n' +
      'Dashboard -> Project Settings -> Database -> Connection string.\n' +
      'If the direct host (db.<ref>.supabase.co) is unreachable, use the Session pooler\n' +
      'string instead — the direct host is IPv6-only.',
  )
}

export default defineConfig({
  schema: './src/common/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
})
