-- GEN-Z.AI Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.user_roles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null default 'user' check(role in ('user','admin')));
create table if not exists public.user_credits (user_id uuid primary key references auth.users(id) on delete cascade, credits integer not null default 0 check(credits>=0), updated_at timestamptz not null default now());

-- Dynamic provider registry. API keys are server-side only and never exposed by the Worker.
create table if not exists public.providers (
  id text primary key check(id ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  name text not null,
  adapter text not null,
  api_key text not null default '',
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Legacy compatibility: migrate existing provider keys if the old table exists.
create table if not exists public.admin_provider_keys (provider text primary key, api_key text not null, updated_at timestamptz not null default now());
insert into public.providers(id,name,adapter,api_key,enabled)
select p.provider,
       case p.provider when 'veo' then 'Gemini / Veo' when 'minimax' then 'MiniMax' when 'luma' then 'Luma' else p.provider end,
       p.provider,p.api_key,true
from public.admin_provider_keys p
on conflict(id) do update set api_key=case when public.providers.api_key='' then excluded.api_key else public.providers.api_key end,
                              updated_at=now();

create table if not exists public.app_settings (setting_key text primary key, setting_value text not null default '', updated_at timestamptz not null default now());
create table if not exists public.video_jobs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, provider text not null, external_id text, status text not null default 'reserved', credit_cost integer not null default 1, refunded boolean not null default false, model text, video_url text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider,external_id));

-- Remove the legacy fixed-provider constraint if this schema is being applied to an existing database.
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.video_jobs'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%provider%' loop
    execute format('alter table public.video_jobs drop constraint %I',c.conname);
  end loop;
exception when undefined_table then null; end $$;

create or replace function public.start_video_job(p_user_id uuid,p_provider text,p_credit_cost integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_credits integer; v_job uuid;
begin
  if p_credit_cost<1 then raise exception 'Invalid credit cost'; end if;
  if not exists(select 1 from providers where id=p_provider and enabled=true and api_key<>'') then raise exception 'Provider tidak tersedia'; end if;
  update user_credits set credits=credits-p_credit_cost,updated_at=now() where user_id=p_user_id and credits>=p_credit_cost returning credits into v_credits;
  if v_credits is null then raise exception 'Credit tidak mencukupi'; end if;
  insert into video_jobs(user_id,provider,credit_cost) values(p_user_id,p_provider,p_credit_cost) returning id into v_job;
  return jsonb_build_object('job_id',v_job,'credits_remaining',v_credits);
end; $$;

create or replace function public.refund_video_job(p_job_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_credits integer; v_amount integer; v_user uuid;
begin
  select user_id,credit_cost into v_user,v_amount from video_jobs where id=p_job_id and refunded=false for update;
  if v_user is null then return jsonb_build_object('refunded',false); end if;
  update user_credits set credits=credits+v_amount,updated_at=now() where user_id=v_user returning credits into v_credits;
  update video_jobs set refunded=true,status='failed',updated_at=now() where id=p_job_id;
  return jsonb_build_object('refunded',true,'credits_remaining',v_credits);
end; $$;

create or replace function public.admin_adjust_credit(p_admin_user_id uuid,p_user_id uuid,p_amount integer,p_note text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_credits integer;
begin
  select role into v_role from user_roles where user_id=p_admin_user_id;
  if v_role<>'admin' then raise exception 'Admin required'; end if;
  insert into user_credits(user_id,credits) values(p_user_id,0) on conflict(user_id) do nothing;
  update user_credits set credits=credits+p_amount,updated_at=now() where user_id=p_user_id returning credits into v_credits;
  if v_credits<0 then raise exception 'Credit tidak boleh negatif'; end if;
  return jsonb_build_object('credits',v_credits);
end; $$;

alter table public.user_roles enable row level security;
alter table public.user_credits enable row level security;
alter table public.providers enable row level security;
alter table public.admin_provider_keys enable row level security;
alter table public.video_jobs enable row level security;
alter table public.app_settings enable row level security;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_credits' and policyname='user_credits_self_select') then create policy user_credits_self_select on public.user_credits for select to authenticated using(auth.uid()=user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='video_jobs' and policyname='video_jobs_self_select') then create policy video_jobs_self_select on public.video_jobs for select to authenticated using(auth.uid()=user_id); end if; end $$;
-- No browser policy is created for providers/admin_provider_keys. Service-role Worker access only.

revoke all on function public.start_video_job(uuid,text,integer) from public;
revoke all on function public.refund_video_job(uuid) from public;
revoke all on function public.admin_adjust_credit(uuid,uuid,integer,text) from public;
