-- Make all columns nullable that are not needed for friend referrals
-- Friend referrals only need: type, from_user_id, to_email, invite_code, invite_url, personal_message, discount_percentage, status, expires_at
-- Columns that should be nullable for friend referrals: organization_id, email, role, library_id, token

DO $$
BEGIN
  -- Make organization_id nullable (already done, but idempotent)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations' 
    AND column_name = 'organization_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN organization_id DROP NOT NULL;
  END IF;

  -- Make email nullable (already done, but idempotent)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations' 
    AND column_name = 'email'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN email DROP NOT NULL;
  END IF;

  -- Make role nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations' 
    AND column_name = 'role'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN role DROP NOT NULL;
  END IF;

  -- Make library_id nullable (if it exists and is NOT NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations' 
    AND column_name = 'library_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN library_id DROP NOT NULL;
  END IF;

  -- Make token nullable (if it exists and is NOT NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invitations' 
    AND column_name = 'token'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.invitations ALTER COLUMN token DROP NOT NULL;
  END IF;
END $$;

