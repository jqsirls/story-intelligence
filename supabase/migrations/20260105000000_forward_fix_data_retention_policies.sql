-- PR0 forward-fix: converge data_retention_policies constraints for existing DBs
--
-- Why: earlier migrations used ON CONFLICT (table_name) but data_retention_policies.table_name
-- was not unique, which breaks clean boot. Later migrations also use deletion_strategy='archive',
-- which must be allowed by the CHECK constraint.
--
-- This migration is idempotent and safe to run on DBs that already applied older migrations.

DO $$
BEGIN
  IF to_regclass('public.data_retention_policies') IS NULL THEN
    RAISE NOTICE 'public.data_retention_policies not present; skipping forward-fix';
    RETURN;
  END IF;
END $$;

-- Ensure uniqueness on table_name (required for ON CONFLICT (table_name))
DO $$
DECLARE
  dup_count bigint;
  has_unique boolean;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT table_name
    FROM public.data_retention_policies
    GROUP BY table_name
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce uniqueness on data_retention_policies.table_name: % duplicate table_name value(s) exist. Deduplicate before applying.', dup_count;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'data_retention_policies'
      AND i.indisunique
      AND a.attname = 'table_name'
      AND a.attnum = ANY (i.indkey)
  ) INTO has_unique;

  IF NOT has_unique THEN
    -- Unique index is sufficient for ON CONFLICT (table_name) to infer an arbiter.
    EXECUTE 'CREATE UNIQUE INDEX data_retention_policies_table_name_uidx ON public.data_retention_policies (table_name)';
  END IF;
END $$;

-- Ensure deletion_strategy CHECK allows 'archive'
DO $$
DECLARE
  c record;
  invalid_count bigint;
BEGIN
  -- Drop any existing CHECK constraints that reference deletion_strategy on this table.
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.data_retention_policies'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%deletion_strategy%'
  LOOP
    EXECUTE format('ALTER TABLE public.data_retention_policies DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;

  ALTER TABLE public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_deletion_strategy_check
    CHECK (deletion_strategy IN ('hard_delete', 'soft_delete', 'anonymize', 'archive')) NOT VALID;

  SELECT COUNT(*) INTO invalid_count
  FROM public.data_retention_policies
  WHERE deletion_strategy IS NULL OR deletion_strategy NOT IN ('hard_delete', 'soft_delete', 'anonymize', 'archive');

  IF invalid_count = 0 THEN
    ALTER TABLE public.data_retention_policies VALIDATE CONSTRAINT data_retention_policies_deletion_strategy_check;
  ELSE
    RAISE NOTICE 'data_retention_policies_deletion_strategy_check left NOT VALID due to % invalid existing row(s)', invalid_count;
  END IF;
END $$;

