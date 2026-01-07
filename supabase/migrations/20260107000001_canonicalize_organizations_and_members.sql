-- PR2: Canonicalize organizations + organization_members (audit-grade, deterministic)
-- Goals:
-- - Schema-qualified FKs to auth.users(id) for entitlement/seat-critical identities
-- - Canonical owner column: organizations.owner_id
-- - Deterministic, non-recursive RLS policies (no self-referential policy recursion)
-- - Seat columns + constraint live in canonical migration path
-- - Idempotent (safe to re-run)

-- ---------------------------------------------------------------------------
-- Preflight: require baseline tables exist (created earlier in the chain)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION 'preflight_failed: missing table public.organizations';
  END IF;
  IF to_regclass('public.organization_members') IS NULL THEN
    RAISE EXCEPTION 'preflight_failed: missing table public.organization_members';
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger helper (used by multiple tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- public.organizations convergence
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS max_seats integer,
  ADD COLUMN IF NOT EXISTS used_seats integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Fill + enforce metadata
UPDATE public.organizations
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

-- Fill + enforce status
UPDATE public.organizations
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL;

-- Fill + enforce type (handler requires it; keep a safe default for existing rows)
UPDATE public.organizations
SET type = 'organization'
WHERE type IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN type SET DEFAULT 'organization',
  ALTER COLUMN type SET NOT NULL;

-- Fill + enforce seat columns
UPDATE public.organizations
SET max_seats = 1
WHERE max_seats IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN max_seats SET DEFAULT 1,
  ALTER COLUMN max_seats SET NOT NULL;

UPDATE public.organizations
SET used_seats = 0
WHERE used_seats IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN used_seats SET DEFAULT 0,
  ALTER COLUMN used_seats SET NOT NULL;

-- Fill + enforce updated_at
UPDATE public.organizations
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- Enforce owner_id is present before adding FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations WHERE owner_id IS NULL) THEN
    RAISE EXCEPTION 'preflight_failed: public.organizations.owner_id has NULLs';
  END IF;
END$$;

ALTER TABLE public.organizations
  ALTER COLUMN owner_id SET NOT NULL;

-- Enforce seat usage constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.organizations'::regclass
      AND conname = 'valid_seat_usage'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT valid_seat_usage CHECK (used_seats <= max_seats);
  END IF;
END$$;

-- Helpful index (idempotent)
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- Convert organizations.owner_id FK to auth.users(id) (schema-qualified)
DO $$
DECLARE
  con record;
BEGIN
  -- Preflight: if there is data, ensure every owner exists in auth.users before FK pinning
  IF EXISTS (
    SELECT 1
    FROM public.organizations o
    LEFT JOIN auth.users u ON u.id = o.owner_id
    WHERE u.id IS NULL
  ) THEN
    RAISE EXCEPTION 'preflight_failed: public.organizations.owner_id contains values not present in auth.users(id)';
  END IF;

  -- Drop any existing FK(s) on owner_id (could point to public.users or unqualified users)
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.organizations'::regclass
      AND c.contype = 'f'
      AND a.attname = 'owner_id'
  LOOP
    EXECUTE format('ALTER TABLE public.organizations DROP CONSTRAINT %I', con.conname);
  END LOOP;

  -- Add canonical FK
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END$$;

-- Attach organizations updated_at trigger (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_organizations_updated_at'
      AND tgrelid = 'public.organizations'::regclass
  ) THEN
    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- public.organization_members convergence
-- ---------------------------------------------------------------------------
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Fill + enforce status
UPDATE public.organization_members
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.organization_members
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL;

-- Fill + enforce updated_at
UPDATE public.organization_members
SET updated_at = now()
WHERE updated_at IS NULL;

ALTER TABLE public.organization_members
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- Fill + enforce role
UPDATE public.organization_members
SET role = 'member'
WHERE role IS NULL;

ALTER TABLE public.organization_members
  ALTER COLUMN role SET DEFAULT 'member',
  ALTER COLUMN role SET NOT NULL;

-- Canonical role + status checks (drop-and-recreate to converge)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.organization_members'::regclass
      AND conname = 'organization_members_role_check'
  ) THEN
    ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_role_check;
  END IF;

  ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'member'));
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.organization_members'::regclass
      AND conname = 'organization_members_status_check'
  ) THEN
    ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_status_check;
  END IF;

  ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_status_check CHECK (status IN ('active', 'pending', 'inactive', 'removed'));
END$$;

-- Pin organization_members.organization_id FK to public.organizations(id)
DO $$
DECLARE
  con record;
BEGIN
  -- Preflight: if there is data, ensure every organization_id exists in public.organizations
  IF EXISTS (
    SELECT 1
    FROM public.organization_members m
    LEFT JOIN public.organizations o ON o.id = m.organization_id
    WHERE o.id IS NULL
  ) THEN
    RAISE EXCEPTION 'preflight_failed: public.organization_members.organization_id contains values not present in public.organizations(id)';
  END IF;

  -- Drop any existing FK(s) on organization_id (could point to organization_accounts)
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.organization_members'::regclass
      AND c.contype = 'f'
      AND a.attname = 'organization_id'
  LOOP
    EXECUTE format('ALTER TABLE public.organization_members DROP CONSTRAINT %I', con.conname);
  END LOOP;

  ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
END$$;

-- Pin organization_members.user_id FK to auth.users(id)
DO $$
DECLARE
  con record;
BEGIN
  -- Preflight: if there is data, ensure every user_id exists in auth.users
  IF EXISTS (
    SELECT 1
    FROM public.organization_members m
    LEFT JOIN auth.users u ON u.id = m.user_id
    WHERE u.id IS NULL
  ) THEN
    RAISE EXCEPTION 'preflight_failed: public.organization_members.user_id contains values not present in auth.users(id)';
  END IF;

  -- Drop any existing FK(s) on user_id (could point to public.users or unqualified users)
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.organization_members'::regclass
      AND c.contype = 'f'
      AND a.attname = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE public.organization_members DROP CONSTRAINT %I', con.conname);
  END LOOP;

  ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END$$;

-- Converge uniqueness for (organization_id, user_id)
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.organization_members'::regclass
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname::text ORDER BY a.attname::text)
        FROM unnest(c.conkey) k(attnum)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = k.attnum
      ) = ARRAY['organization_id', 'user_id']::text[]
  LOOP
    EXECUTE format('ALTER TABLE public.organization_members DROP CONSTRAINT %I', con.conname);
  END LOOP;

  ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_org_user_key UNIQUE (organization_id, user_id);
END$$;

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);

-- Attach organization_members updated_at trigger (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_organization_members_updated_at'
      AND tgrelid = 'public.organization_members'::regclass
  ) THEN
    CREATE TRIGGER update_organization_members_updated_at
      BEFORE UPDATE ON public.organization_members
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers to avoid RLS recursion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security = off
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = p_org_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = p_org_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role = ANY (ARRAY['owner'::text, 'admin'::text])
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies (drop all existing, then create deterministic set)
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', p.policyname);
  END LOOP;
END$$;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organization_members', p.policyname);
  END LOOP;
END$$;

-- organizations: owners can write; members can read
CREATE POLICY organizations_select
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_member(id));

CREATE POLICY organizations_insert
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY organizations_update
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY organizations_delete
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- organization_members: members can read; org admins can manage membership
CREATE POLICY organization_members_select
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_org_admin(organization_id));

CREATE POLICY organization_members_insert
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY organization_members_update
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY organization_members_delete
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (public.is_org_admin(organization_id));


