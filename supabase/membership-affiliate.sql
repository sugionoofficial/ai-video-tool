-- =========================================================
-- GEN-Z.AI
-- MEMBERSHIP + AFFILIATE FOUNDATION
-- File: supabase/membership-affiliate.sql
--
-- Migration ini berdiri sendiri.
-- Tidak mengganti supabase/schema.sql.
-- =========================================================

create extension if not exists pgcrypto;


-- =========================================================
-- MEMBERSHIP PLANS
-- =========================================================

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),

  code text not null unique
    check (code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),

  name text not null,

  description text not null default '',

  price integer not null default 0
    check (price >= 0),

  credits integer not null default 0
    check (credits >= 0),

  duration_days integer not null default 30
    check (duration_days > 0),

  features jsonb not null default '[]'::jsonb,

  enabled boolean not null default true,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists membership_plans_enabled_idx
  on public.membership_plans(enabled, sort_order);


-- =========================================================
-- USER MEMBERSHIPS
-- =========================================================

create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  plan_id uuid not null
    references public.membership_plans(id)
    on delete restrict,

  status text not null default 'active'
    check (status in (
      'active',
      'expired',
      'cancelled'
    )),

  started_at timestamptz not null default now(),

  expires_at timestamptz not null,

  credits_granted integer not null default 0
    check (credits_granted >= 0),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists user_memberships_user_idx
  on public.user_memberships(user_id, created_at desc);

create index if not exists user_memberships_status_idx
  on public.user_memberships(status, expires_at);

create index if not exists user_memberships_expiry_idx
  on public.user_memberships(expires_at);


-- =========================================================
-- AFFILIATE ACCOUNTS
-- =========================================================

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

  referral_code text not null unique
    check (referral_code ~ '^[A-Za-z0-9_-]{3,32}$'),

  commission_percent numeric(5,2) not null default 10
    check (
      commission_percent >= 0
      and commission_percent <= 100
    ),

  status text not null default 'active'
    check (status in (
      'active',
      'inactive',
      'suspended'
    )),

  total_referrals integer not null default 0
    check (total_referrals >= 0),

  total_earnings numeric(14,2) not null default 0
    check (total_earnings >= 0),

  pending_earnings numeric(14,2) not null default 0
    check (pending_earnings >= 0),

  paid_earnings numeric(14,2) not null default 0
    check (paid_earnings >= 0),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists affiliates_status_idx
  on public.affiliates(status);

create index if not exists affiliates_referral_code_idx
  on public.affiliates(referral_code);


-- =========================================================
-- AFFILIATE REFERRALS
-- =========================================================

create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),

  affiliate_id uuid not null
    references public.affiliates(id)
    on delete cascade,

  referred_user_id uuid not null unique
    references auth.users(id)
    on delete cascade,

  referral_code text not null,

  first_seen_at timestamptz not null default now(),

  converted_at timestamptz,

  status text not null default 'registered'
    check (status in (
      'registered',
      'converted',
      'cancelled'
    )),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists affiliate_referrals_affiliate_idx
  on public.affiliate_referrals(
    affiliate_id,
    created_at desc
  );

create index if not exists affiliate_referrals_status_idx
  on public.affiliate_referrals(
    status,
    created_at desc
  );


-- =========================================================
-- AFFILIATE COMMISSIONS
-- =========================================================

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),

  affiliate_id uuid not null
    references public.affiliates(id)
    on delete restrict,

  referred_user_id uuid
    references auth.users(id)
    on delete set null,

  membership_id uuid
    references public.user_memberships(id)
    on delete set null,

  amount numeric(14,2) not null
    check (amount > 0),

  commission_percent numeric(5,2) not null
    check (
      commission_percent >= 0
      and commission_percent <= 100
    ),

  base_amount numeric(14,2) not null
    check (base_amount >= 0),

  status text not null default 'pending'
    check (status in (
      'pending',
      'approved',
      'paid',
      'rejected',
      'cancelled'
    )),

  admin_user_id uuid
    references auth.users(id)
    on delete set null,

  admin_note text not null default '',

  approved_at timestamptz,

  paid_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists affiliate_commissions_affiliate_idx
  on public.affiliate_commissions(
    affiliate_id,
    created_at desc
  );

create index if not exists affiliate_commissions_status_idx
  on public.affiliate_commissions(
    status,
    created_at desc
  );

create index if not exists affiliate_commissions_user_idx
  on public.affiliate_commissions(
    referred_user_id,
    created_at desc
  );


-- =========================================================
-- AFFILIATE PAYOUT REQUESTS
-- =========================================================

create table if not exists public.affiliate_payout_requests (
  id uuid primary key default gen_random_uuid(),

  affiliate_id uuid not null
    references public.affiliates(id)
    on delete cascade,

  amount numeric(14,2) not null
    check (amount > 0),

  payout_method text not null default '',

  payout_account text not null default '',

  status text not null default 'pending'
    check (status in (
      'pending',
      'approved',
      'paid',
      'rejected',
      'cancelled'
    )),

  admin_user_id uuid
    references auth.users(id)
    on delete set null,

  admin_note text not null default '',

  requested_at timestamptz not null default now(),

  reviewed_at timestamptz,

  paid_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists affiliate_payout_requests_affiliate_idx
  on public.affiliate_payout_requests(
    affiliate_id,
    created_at desc
  );

create index if not exists affiliate_payout_requests_status_idx
  on public.affiliate_payout_requests(
    status,
    created_at desc
  );


-- =========================================================
-- SAFETY: ONLY ONE ACTIVE MEMBERSHIP PER USER
-- =========================================================

create unique index if not exists
  user_memberships_one_active_idx
on public.user_memberships(user_id)
where status = 'active';


-- =========================================================
-- HELPER: UPDATE UPDATED_AT
-- =========================================================

create or replace function public.touch_membership_affiliate_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =========================================================
-- TRIGGERS
-- =========================================================

drop trigger if exists
  trg_membership_plans_updated_at
on public.membership_plans;

create trigger
  trg_membership_plans_updated_at
before update on public.membership_plans
for each row
execute function public.touch_membership_affiliate_updated_at();


drop trigger if exists
  trg_user_memberships_updated_at
on public.user_memberships;

create trigger
  trg_user_memberships_updated_at
before update on public.user_memberships
for each row
execute function public.touch_membership_affiliate_updated_at();


drop trigger if exists
  trg_affiliates_updated_at
on public.affiliates;

create trigger
  trg_affiliates_updated_at
before update on public.affiliates
for each row
execute function public.touch_membership_affiliate_updated_at();


drop trigger if exists
  trg_affiliate_referrals_updated_at
on public.affiliate_referrals;

create trigger
  trg_affiliate_referrals_updated_at
before update on public.affiliate_referrals
for each row
execute function public.touch_membership_affiliate_updated_at();


drop trigger if exists
  trg_affiliate_commissions_updated_at
on public.affiliate_commissions;

create trigger
  trg_affiliate_commissions_updated_at
before update on public.affiliate_commissions
for each row
execute function public.touch_membership_affiliate_updated_at();


drop trigger if exists
  trg_affiliate_payout_requests_updated_at
on public.affiliate_payout_requests;

create trigger
  trg_affiliate_payout_requests_updated_at
before update on public.affiliate_payout_requests
for each row
execute function public.touch_membership_affiliate_updated_at();


-- =========================================================
-- DEFAULT MEMBERSHIP PLANS
-- =========================================================

insert into public.membership_plans (
  code,
  name,
  description,
  price,
  credits,
  duration_days,
  features,
  enabled,
  sort_order
)
values
(
  'free',
  'Free',
  'Paket gratis GEN-Z.AI',
  0,
  0,
  30,
  '[]'::jsonb,
  true,
  0
),
(
  'pro',
  'Pro',
  'Paket Pro GEN-Z.AI',
  0,
  0,
  30,
  '[]'::jsonb,
  false,
  10
),
(
  'premium',
  'Premium',
  'Paket Premium GEN-Z.AI',
  0,
  0,
  30,
  '[]'::jsonb,
  false,
  20
)
on conflict (code) do nothing;


-- =========================================================
-- END
-- =========================================================
