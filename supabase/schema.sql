-- GEN-Z.AI Supabase schema
create extension if not exists pgcrypto;

create table if not exists public.user_roles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null default 'user' check(role in ('user','admin')));
create table if not exists public.user_credits (user_id uuid primary key references auth.users(id) on delete cascade, credits integer not null default 0 check(credits>=0), updated_at timestamptz not null default now());

create table if not exists public.credit_transactions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, amount integer not null check(amount<>0), balance_after integer, type text not null check(type in ('generation','refund','admin_adjustment','topup')), note text not null default '', job_id uuid, admin_user_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now());
create index if not exists credit_transactions_user_created_idx on public.credit_transactions(user_id,created_at desc);
create index if not exists credit_transactions_job_idx on public.credit_transactions(job_id);

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
create table if not exists public.video_jobs (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, provider text not null, external_id text, status text not null default 'reserved', credit_cost integer not null default 1, refunded boolean not null default false, model text, video_url text, metadata jsonb not null default '{}'::jsonb, idempotency_key text, request_fingerprint text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider,external_id));
alter table public.video_jobs add column if not exists idempotency_key text;
alter table public.video_jobs add column if not exists request_fingerprint text;
create unique index if not exists video_jobs_user_idempotency_idx on public.video_jobs(user_id,idempotency_key) where idempotency_key is not null;

-- Operational metadata and audit trail for generation reliability.
alter table public.video_jobs add column if not exists attempt_count integer not null default 0;
alter table public.video_jobs add column if not exists last_error text;
alter table public.video_jobs add column if not exists last_error_code text;
alter table public.video_jobs add column if not exists provider_status text;
create index if not exists video_jobs_status_updated_idx on public.video_jobs(status,updated_at desc);

-- Strict lifecycle: jobs may only move forward through the supported states.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.video_jobs'::regclass and conname='video_jobs_status_check') then
    alter table public.video_jobs add constraint video_jobs_status_check check(status in ('reserved','processing','completed','failed'));
  end if;
end $$;

create or replace function public.enforce_video_job_state() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.status is distinct from old.status then
    if old.status='reserved' and new.status not in ('processing','failed') then raise exception 'Invalid video job transition'; end if;
    if old.status='processing' and new.status not in ('processing','completed','failed') then raise exception 'Invalid video job transition'; end if;
    if old.status in ('completed','failed') and new.status<>old.status then raise exception 'Video job is terminal'; end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_video_job_state on public.video_jobs;
create trigger trg_video_job_state before update of status on public.video_jobs
for each row execute function public.enforce_video_job_state();

create table if not exists public.video_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.video_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check(event_type in ('created','provider_submitted','poll_processing','completed','failed','refunded','recovery','error')),
  provider_status text,
  error_code text,
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists video_job_events_job_created_idx on public.video_job_events(job_id,created_at desc);
create index if not exists video_job_events_user_created_idx on public.video_job_events(user_id,created_at desc);


-- Remove the legacy fixed-provider constraint if this schema is being applied to an existing database.
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.video_jobs'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%provider%' loop
    execute format('alter table public.video_jobs drop constraint %I',c.conname);
  end loop;
exception when undefined_table then null; end $$;

create or replace function public.start_video_job(p_user_id uuid,p_provider text,p_credit_cost integer,p_idempotency_key text default null,p_request_fingerprint text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_credits integer; v_job uuid; v_old_fingerprint text; v_old_status text; v_old_external text; v_old_provider text;
begin
  if p_credit_cost<1 then raise exception 'Invalid credit cost'; end if;
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) between 1 and 128 then
    select id,request_fingerprint,status,external_id,provider into v_job,v_old_fingerprint,v_old_status,v_old_external,v_old_provider
      from video_jobs where user_id=p_user_id and idempotency_key=trim(p_idempotency_key) for update;
    if v_job is not null then
      if coalesce(v_old_fingerprint,'')<>coalesce(p_request_fingerprint,'') then raise exception 'Idempotency key sudah digunakan untuk request berbeda'; end if;
      return jsonb_build_object('job_id',v_job,'existing',true,'status',v_old_status,'external_id',v_old_external,'provider',v_old_provider);
    end if;
  end if;
  if not exists(select 1 from providers where id=p_provider and enabled=true and api_key<>'') then raise exception 'Provider tidak tersedia'; end if;
  update user_credits set credits=credits-p_credit_cost,updated_at=now() where user_id=p_user_id and credits>=p_credit_cost returning credits into v_credits;
  if v_credits is null then raise exception 'Credit tidak mencukupi'; end if;
  begin
    insert into video_jobs(user_id,provider,credit_cost,idempotency_key,request_fingerprint) values(p_user_id,p_provider,p_credit_cost,nullif(trim(p_idempotency_key),''),p_request_fingerprint) returning id into v_job;
  exception when unique_violation then
    select id,request_fingerprint,status,external_id,provider into v_job,v_old_fingerprint,v_old_status,v_old_external,v_old_provider from video_jobs where user_id=p_user_id and idempotency_key=trim(p_idempotency_key) for update;
    if coalesce(v_old_fingerprint,'')<>coalesce(p_request_fingerprint,'') then raise exception 'Idempotency key sudah digunakan untuk request berbeda'; end if;
    update user_credits set credits=credits+p_credit_cost,updated_at=now() where user_id=p_user_id;
    return jsonb_build_object('job_id',v_job,'existing',true,'status',v_old_status,'external_id',v_old_external,'provider',v_old_provider);
  end;
  insert into credit_transactions(user_id,amount,balance_after,type,note,job_id) values(p_user_id,-p_credit_cost,v_credits,'generation','Video generation',v_job);
  return jsonb_build_object('job_id',v_job,'existing',false,'credits_remaining',v_credits);
end; $$;

create or replace function public.record_video_job_event(p_job_id uuid,p_user_id uuid,p_event_type text,p_provider_status text default null,p_error_code text default null,p_message text default '',p_metadata jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from video_jobs where id=p_job_id and user_id=p_user_id) then raise exception 'Job tidak ditemukan'; end if;
  insert into video_job_events(job_id,user_id,event_type,provider_status,error_code,message,metadata)
  values(p_job_id,p_user_id,p_event_type,p_provider_status,p_error_code,left(coalesce(p_message,''),1000),coalesce(p_metadata,'{}'::jsonb));
end; $$;

revoke all on function public.record_video_job_event(uuid,uuid,text,text,text,text,jsonb) from public;

create or replace function public.refund_video_job(p_job_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_credits integer; v_amount integer; v_user uuid;
begin
  select user_id,credit_cost into v_user,v_amount
    from video_jobs where id=p_job_id and refunded=false and status in ('reserved','processing') for update;
  if v_user is null then return jsonb_build_object('refunded',false); end if;
  update user_credits set credits=credits+v_amount,updated_at=now() where user_id=v_user returning credits into v_credits;
  update video_jobs set refunded=true,status='failed',updated_at=now() where id=p_job_id;
  insert into credit_transactions(user_id,amount,balance_after,type,note,job_id) values(v_user,v_amount,v_credits,'refund','Generation gagal; credit dikembalikan',p_job_id);
  return jsonb_build_object('refunded',true,'credits_remaining',v_credits);
end; $$;

create or replace function public.admin_adjust_credit(p_admin_user_id uuid,p_user_id uuid,p_amount integer,p_note text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_credits integer;
begin
  select role into v_role from user_roles where user_id=p_admin_user_id;
  if v_role<>'admin' then raise exception 'Admin required'; end if;
  insert into user_credits(user_id,credits) values(p_user_id,0) on conflict(user_id) do nothing;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'User tidak ditemukan'; end if;
  if p_amount=0 then raise exception 'Amount tidak boleh 0'; end if;
  select credits into v_credits from user_credits where user_id=p_user_id for update;
  if v_credits is null then v_credits:=0; end if;
  if v_credits+p_amount<0 then raise exception 'Credit tidak boleh negatif'; end if;
  insert into user_credits(user_id,credits,updated_at) values(p_user_id,v_credits+p_amount,now()) on conflict(user_id) do update set credits=excluded.credits,updated_at=now() returning credits into v_credits;
  insert into credit_transactions(user_id,amount,balance_after,type,note,admin_user_id) values(p_user_id,p_amount,v_credits,'admin_adjustment',coalesce(nullif(trim(p_note),''),'Admin adjustment'),p_admin_user_id);
  return jsonb_build_object('credits',v_credits);
end; $$;


create table if not exists public.credit_topup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check(amount > 0),
  note text not null default '',
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists credit_topup_requests_user_created_idx on public.credit_topup_requests(user_id,created_at desc);
create index if not exists credit_topup_requests_status_created_idx on public.credit_topup_requests(status,created_at desc);
create unique index if not exists credit_topup_requests_one_pending_user_idx on public.credit_topup_requests(user_id) where status='pending';

create or replace function public.approve_topup_request(p_admin_user_id uuid,p_request_id uuid,p_admin_note text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_user uuid; v_amount integer; v_status text; v_credits integer;
begin
  select role into v_role from user_roles where user_id=p_admin_user_id and role='admin';
  if v_role is null then raise exception 'Admin required'; end if;
  select user_id,amount,status into v_user,v_amount,v_status from credit_topup_requests where id=p_request_id for update;
  if v_user is null then raise exception 'Top-up request tidak ditemukan'; end if;
  if v_status<>'pending' then raise exception 'Request sudah diproses'; end if;
  insert into user_credits(user_id,credits) values(v_user,0) on conflict(user_id) do nothing;
  update user_credits set credits=credits+v_amount,updated_at=now() where user_id=v_user returning credits into v_credits;
  update credit_topup_requests set status='approved',admin_user_id=p_admin_user_id,admin_note=coalesce(p_admin_note,''),reviewed_at=now() where id=p_request_id;
  insert into credit_transactions(user_id,amount,balance_after,type,note,admin_user_id) values(v_user,v_amount,v_credits,'topup',coalesce(nullif(trim(p_admin_note),''),'Top-up disetujui'),p_admin_user_id);
  return jsonb_build_object('approved',true,'credits',v_credits);
end; $$;

create or replace function public.reject_topup_request(p_admin_user_id uuid,p_request_id uuid,p_admin_note text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_status text;
begin
  select role into v_role from user_roles where user_id=p_admin_user_id and role='admin';
  if v_role is null then raise exception 'Admin required'; end if;
  select status into v_status from credit_topup_requests where id=p_request_id for update;
  if v_status is null then raise exception 'Top-up request tidak ditemukan'; end if;
  if v_status<>'pending' then raise exception 'Request sudah diproses'; end if;
  update credit_topup_requests set status='rejected',admin_user_id=p_admin_user_id,admin_note=coalesce(p_admin_note,''),reviewed_at=now() where id=p_request_id;
  return jsonb_build_object('rejected',true);
end; $$;


-- Automatic recovery for jobs that remain active for too long.
-- Run from a trusted Worker scheduled event only; it restores credits once.
create or replace function public.recover_stale_video_jobs(p_max_age_minutes integer default 1440) returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; v_count integer:=0; v_credits integer;
begin
  if p_max_age_minutes<60 or p_max_age_minutes>10080 then raise exception 'Invalid recovery window'; end if;
  for r in select id,user_id,credit_cost from video_jobs where status in ('reserved','processing') and refunded=false and updated_at < now() - make_interval(mins=>p_max_age_minutes) for update skip locked loop
    update user_credits set credits=credits+r.credit_cost,updated_at=now() where user_id=r.user_id returning credits into v_credits;
    update video_jobs set refunded=true,status='failed',updated_at=now(),metadata=metadata || jsonb_build_object('recovery','stale_job') where id=r.id;
    insert into credit_transactions(user_id,amount,balance_after,type,note,job_id) values(r.user_id,r.credit_cost,v_credits,'refund','Stale job recovery; credit dikembalikan',r.id);
    insert into video_job_events(job_id,user_id,event_type,provider_status,error_code,message,metadata) values(r.id,r.user_id,'recovery','failed','stale_job','Job otomatis dipulihkan karena melebihi batas waktu','{\"recovery\":true}'::jsonb);
    v_count:=v_count+1;
  end loop;
  return jsonb_build_object('recovered',v_count);
end; $$;
revoke all on function public.recover_stale_video_jobs(integer) from public;

alter table public.credit_topup_requests enable row level security;
create policy credit_topup_requests_self_select on public.credit_topup_requests for select to authenticated using(auth.uid()=user_id);
revoke all on function public.approve_topup_request(uuid,uuid,text) from public;
revoke all on function public.reject_topup_request(uuid,uuid,text) from public;

alter table public.user_roles enable row level security;
alter table public.user_credits enable row level security;
alter table public.providers enable row level security;
alter table public.admin_provider_keys enable row level security;
alter table public.video_jobs enable row level security;
alter table public.video_job_events enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='video_job_events' and policyname='video_job_events_self_select') then create policy video_job_events_self_select on public.video_job_events for select to authenticated using(auth.uid()=user_id); end if; end $$;
alter table public.app_settings enable row level security;
alter table public.credit_transactions enable row level security;

do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_credits' and policyname='user_credits_self_select') then create policy user_credits_self_select on public.user_credits for select to authenticated using(auth.uid()=user_id); end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='video_jobs' and policyname='video_jobs_self_select') then create policy video_jobs_self_select on public.video_jobs for select to authenticated using(auth.uid()=user_id); end if; end $$;
-- No browser policy is created for providers/admin_provider_keys/credit_transactions. Service-role Worker access only.

revoke all on function public.start_video_job(uuid,text,integer) from public;
revoke all on function public.start_video_job(uuid,text,integer,text,text) from public;
revoke all on function public.refund_video_job(uuid) from public;
revoke all on function public.admin_adjust_credit(uuid,uuid,integer,text) from public;

-- Prevent accidental lockout: an admin cannot remove the final remaining admin.
create or replace function public.remove_admin(p_admin_user_id uuid,p_user_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_role text; v_count integer;
begin
  select role into v_role from user_roles where user_id=p_admin_user_id and role='admin';
  if v_role is null then raise exception 'Admin required'; end if;
  if p_admin_user_id=p_user_id then raise exception 'Tidak dapat menghapus diri sendiri'; end if;
  select count(*) into v_count from user_roles where role='admin';
  if v_count<=1 then raise exception 'Minimal harus ada satu admin'; end if;
  delete from user_roles where user_id=p_user_id and role='admin';
  if not found then raise exception 'Admin tidak ditemukan'; end if;
  return jsonb_build_object('removed',true);
end; $$;
revoke all on function public.remove_admin(uuid,uuid) from public;


