-- Rollback for: 20260104_org_seats_canonical.sql
-- Idempotent. Undoes ONLY what the migration does:
-- IMPORTANT: Do NOT restore prior recursive policies (they cause 42P17 recursion).
-- Rollback is "safe degraded":
-- - Keeps RLS enabled and keeps the non-recursive policy shape (SECURITY DEFINER helpers).
-- - ONLY removes the updated_at trigger + function (non-destructive; does NOT drop the column).

-- 1) Drop updated_at trigger/function introduced by migration (idempotent)
DO $$
BEGIN
  IF to_regclass('public.organization_members') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS organization_members_set_updated_at ON public.organization_members;
  END IF;
END$$;

DROP FUNCTION IF EXISTS public.set_updated_at_org_members();


