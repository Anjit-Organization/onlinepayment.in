-- Subscribers for the UPI MDR tracker notification list.
--
-- SECURITY MODEL
--
-- This table holds email addresses and must never be publicly readable.
-- Two deployment shapes are supported:
--
--   * Postgres-direct (Neon, plain Postgres): the app connects as the owner
--     over a server-only connection. There is no public key that can reach the
--     table at all, and the app exposes no read endpoint. This is the stronger
--     posture and the one in use.
--
--   * PostgREST-fronted (Supabase): a public `anon` role can reach the table
--     over HTTP, so it gets an INSERT-only policy and no SELECT policy. The
--     guarded block at the bottom applies that only when the role exists.
--
-- Portable DDL first, provider-specific hardening after.

CREATE TABLE IF NOT EXISTS "subscribers" (
  "id"              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "email"           text NOT NULL,
  "topic"           text NOT NULL,
  "source"          text,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "confirmed_at"    timestamptz,
  "unsubscribed_at" timestamptz,
  CONSTRAINT "subscribers_email_shape" CHECK (
    "email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND length("email") <= 254
  ),
  CONSTRAINT "subscribers_topic_allowed" CHECK ("topic" IN ('upi-mdr'))
);

-- Case-insensitive uniqueness: Foo@x.com and foo@x.com are one subscriber.
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_topic_uq"
  ON "subscribers" (lower("email"), "topic");

CREATE INDEX IF NOT EXISTS "subscribers_topic_idx"
  ON "subscribers" ("topic", "created_at" DESC)
  WHERE "unsubscribed_at" IS NULL;

ALTER TABLE "subscribers" ENABLE ROW LEVEL SECURITY;

-- Supabase-only hardening. Skipped silently on Neon and plain Postgres, where
-- the `anon` role does not exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_can_subscribe" ON "subscribers"';
    EXECUTE $pol$
      CREATE POLICY "anon_can_subscribe"
        ON "subscribers"
        FOR INSERT
        TO anon
        WITH CHECK (
          "topic" = 'upi-mdr'
          AND "confirmed_at" IS NULL
          AND "unsubscribed_at" IS NULL
        )
    $pol$;
    EXECUTE 'REVOKE SELECT, UPDATE, DELETE ON "subscribers" FROM anon';
    EXECUTE 'GRANT INSERT ON "subscribers" TO anon';
  END IF;
END
$$;
