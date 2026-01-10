-- Add organization_accounts table
create table if not exists public.organization_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  subscription_id text,
  seat_count integer not null default 0,
  used_seats integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_organization_accounts_owner_id on public.organization_accounts (owner_id);

-- Add referral_tracking table
create table if not exists public.referral_tracking (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  referee_id uuid references auth.users (id) on delete set null,
  discount_code text not null,
  reward_amount numeric default 0,
  status text not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_tracking_referrer on public.referral_tracking (referrer_id);
create index if not exists idx_referral_tracking_referee on public.referral_tracking (referee_id);
alter table public.referral_tracking alter column referee_id drop not null;

-- Add invite_discounts table
create table if not exists public.invite_discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null,
  discount_percentage integer not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  valid_until timestamptz not null,
  used_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_invite_discounts_created_by on public.invite_discounts (created_by);
create index if not exists idx_invite_discounts_used_by on public.invite_discounts (used_by);

-- Extend subscriptions with period metadata
alter table if exists public.subscriptions
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz;

-- Function to manage organization seats (minimal implementation)
create or replace function public.manage_organization_seats(
  p_organization_id uuid,
  p_action text,
  p_user_id uuid default null
) returns boolean
language plpgsql
as $$
declare
  org record;
begin
  select * into org from public.organization_accounts where id = p_organization_id for update;
  if not found then
    return false;
  end if;

  if p_action = 'add' then
    update public.organization_accounts
      set seat_count = seat_count + 1
      where id = p_organization_id;
    return true;
  elsif p_action = 'remove' then
    update public.organization_accounts
      set seat_count = greatest(seat_count - 1, 1)
      where id = p_organization_id;
    return true;
  else
    return false;
  end if;
end;
$$;

-- Function to generate invite discount codes and persist them
create or replace function public.generate_invite_discount(
  p_created_by uuid,
  p_type text,
  p_discount_percentage integer,
  p_valid_days integer default 30
) returns text
language plpgsql
as $$
declare
  v_code text;
begin
  v_code := substring(encode(gen_random_bytes(8), 'hex') from 1 for 12);

  insert into public.invite_discounts (
    code,
    type,
    discount_percentage,
    created_by,
    valid_until,
    used_by
  ) values (
    v_code,
    p_type,
    p_discount_percentage,
    p_created_by,
    now() + (p_valid_days || ' days')::interval,
    null
  );

  return v_code;
end;
$$;

comment on function public.manage_organization_seats is 'Adjust organization seat counts or associate users; minimal no-op on user linkage.';
comment on function public.generate_invite_discount is 'Create and store invite discount codes with expiration.';

