-- PR1: Canonicalize subscriptions table for commerce (Option A)
--
-- Goals:
-- - Converge existing databases via ALTER TABLE (no CREATE TABLE IF NOT EXISTS canonicalization)
-- - Make subscriptions.user_id FK schema-qualified to auth.users(id) ON DELETE CASCADE
-- - Ensure updated_at exists and is maintained by a trigger
-- - Standardize status allowed set (no "paused")
-- - Ensure uniqueness on stripe_subscription_id
-- - Ensure deterministic RLS: users can only access their own rows
--
-- Idempotency:
-- - Uses ADD COLUMN IF NOT EXISTS
-- - Drops/creates named constraints/policies deterministically
-- - Uses catalog checks before creating triggers/indexes
-- - Uses NOT VALID + conditional VALIDATE to avoid hard-failing on existing bad data

DO $$
BEGIN
  IF to_regclass('public.subscriptions') IS NULL THEN
    RAISE NOTICE 'public.subscriptions not present; skipping subscriptions canonicalization';
    RETURN;
  END IF;
END $$;

-- ============================================================================
-- Columns: ensure updated_at exists and is non-null with default
-- ============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.subscriptions
SET updated_at = COALESCE(updated_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.subscriptions
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.subscriptions
  ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================================
-- Constraints: status allowed set (canonical) + stripe_subscription_id uniqueness
-- ============================================================================

-- Drop any existing CHECK constraints that reference "status" on public.subscriptions so we end
-- with exactly one canonical constraint.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (
    status IN (
      'active',
      'canceled',
      'past_due',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'trialing'
    )
  ) NOT VALID;

DO $$
DECLARE
  invalid_status_count bigint;
BEGIN
  SELECT COUNT(*) INTO invalid_status_count
  FROM public.subscriptions
  WHERE status IS NULL OR status NOT IN (
    'active',
    'canceled',
    'past_due',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'trialing'
  );

  IF invalid_status_count = 0 THEN
    ALTER TABLE public.subscriptions VALIDATE CONSTRAINT subscriptions_status_check;
  ELSE
    RAISE NOTICE 'subscriptions_status_check left NOT VALID due to % invalid existing row(s)', invalid_status_count;
  END IF;
END $$;

-- Ensure uniqueness on stripe_subscription_id (covers both unique constraints and unique indexes)
DO $$
DECLARE
  has_unique boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'subscriptions'
      AND i.indisunique
      AND a.attname = 'stripe_subscription_id'
      AND a.attnum = ANY (i.indkey)
  ) INTO has_unique;

  IF NOT has_unique THEN
    -- Use a deterministic index name. Guarded by the has_unique check above to avoid creating
    -- redundant uniqueness when some other unique constraint/index already exists.
    CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_uidx
      ON public.subscriptions (stripe_subscription_id)
      WHERE stripe_subscription_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- Foreign key: force schema-qualified FK to auth.users(id)
-- ============================================================================

DO $$
DECLARE
  fk record;
  orphan_count bigint;
BEGIN
  -- Drop any existing FK constraints on subscriptions(user_id), regardless of constraint name.
  FOR fk IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.subscriptions'::regclass
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (user_id)%'
  LOOP
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS %I', fk.conname);
  END LOOP;

  -- Re-add canonical FK to auth.users(id). Use NOT VALID to avoid hard failure on legacy rows.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.subscriptions'::regclass
      AND c.contype = 'f'
      AND c.conname = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;

  -- Validate FK if all existing rows map to auth.users(id).
  SELECT COUNT(*) INTO orphan_count
  FROM public.subscriptions s
  LEFT JOIN auth.users u ON u.id = s.user_id
  WHERE u.id IS NULL;

  IF orphan_count = 0 THEN
    ALTER TABLE public.subscriptions VALIDATE CONSTRAINT subscriptions_user_id_fkey;
  ELSE
    RAISE NOTICE 'subscriptions_user_id_fkey left NOT VALID due to % row(s) not present in auth.users', orphan_count;
  END IF;
END $$;

-- ============================================================================
-- updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_subscriptions_updated_at'
      AND tgrelid = 'public.subscriptions'::regclass
  ) THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- RLS + deterministic policy
-- ============================================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on public.subscriptions to guarantee a single deterministic policy.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', p.policyname);
  END LOOP;
END $$;

CREATE POLICY subscriptions_user_owns_row
  ON public.subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Helpful index (idempotent)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

