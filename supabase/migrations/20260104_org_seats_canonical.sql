-- org-seats canonical schema v2026-01-04 (TEST lane first)
-- Do NOT apply in prod until verified in TEST.

-- Preflight: require canonical tables exist (stop early, no partial apply)
DO $$
BEGIN
  IF to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION 'preflight_failed: missing table public.organizations';
  END IF;
  IF to_regclass('public.organization_members') IS NULL THEN
    RAISE EXCEPTION 'preflight_failed: missing table public.organization_members';
  END IF;

  -- Ensure we are not overwriting an existing org-members updated_at scheme.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organization_members'
      AND column_name = 'updated_at'
  ) THEN
    RAISE EXCEPTION 'preflight_failed: public.organization_members.updated_at already exists';
  END IF;

  -- Ensure we do not clobber existing functions with these names.
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('is_org_member', 'is_org_admin', 'set_updated_at_org_members')
  ) THEN
    RAISE EXCEPTION 'preflight_failed: one of public.is_org_member / public.is_org_admin / public.set_updated_at_org_members already exists';
  END IF;

  -- Ensure we do not clobber an existing trigger name.
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgname = 'organization_members_set_updated_at'
      AND t.tgrelid = 'public.organization_members'::regclass
  ) THEN
    RAISE EXCEPTION 'preflight_failed: trigger organization_members_set_updated_at already exists on public.organization_members';
  END IF;
END$$;

-- 1) organizations: ensure seat columns + constraint + owner index
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS max_seats INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_seats INTEGER NOT NULL DEFAULT 0;

-- Ensure valid_seat_usage check exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_seat_usage'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT valid_seat_usage CHECK (used_seats <= max_seats);
  END IF;
END$$;

-- Ensure owner index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_organizations_owner'
  ) THEN
    CREATE INDEX idx_organizations_owner ON public.organizations(owner_id);
  END IF;
END$$;

-- 2) organization_members: add updated_at + trigger for update timestamp
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Dedicated updated_at trigger function for organization_members
CREATE OR REPLACE FUNCTION public.set_updated_at_org_members()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger (idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'organization_members_set_updated_at'
      AND tgrelid = 'public.organization_members'::regclass
  ) THEN
    CREATE TRIGGER organization_members_set_updated_at
      BEFORE UPDATE ON public.organization_members
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at_org_members();
  END IF;
END$$;

-- 3) RLS
-- Fix: remove RLS recursion and convert "member/admin" checks to SECURITY DEFINER helpers.
--
-- Rationale (ground truth):
-- Existing organization_members policies self-query organization_members, causing:
--   42P17 infinite recursion detected in policy for relation "organization_members"
-- which surfaces as HTTP 500 on anon/auth paths. This must become a clean 401/403.

-- Membership check (bypasses RLS; safe because it only checks auth.uid membership)
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
  );
$$;

-- Admin/owner check (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
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
      AND m.role = ANY (ARRAY['owner'::text, 'admin'::text])
  );
$$;

-- Rewrite organization_members policies to avoid self-recursion
DROP POLICY IF EXISTS org_members_read ON public.organization_members;
CREATE POLICY org_members_read
  ON public.organization_members
  FOR SELECT
  TO public
  USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS org_admin_write ON public.organization_members;
CREATE POLICY org_admin_write
  ON public.organization_members
  FOR ALL
  TO public
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

-- Rewrite organizations_policy to avoid direct subquery on organization_members inside policy
-- Keep org_owner_full (ALL) unchanged; this policy is for read access by members.
DROP POLICY IF EXISTS organizations_policy ON public.organizations;
CREATE POLICY organizations_policy
  ON public.organizations
  FOR SELECT
  TO public
  USING (owner_id = auth.uid() OR public.is_org_member(id));


