-- Mini SaaS marketplace schema
-- Apply in the Supabase SQL editor (or `supabase db query -f supabase/schema.sql`).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  workspace_name text not null default '',
  contact_email text not null,
  status text not null default 'pending',
  country text,
  stripe_account_id text unique,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators (id) on delete cascade,
  title text not null,
  slug text not null unique,
  category text not null,
  summary text,
  description text,
  pricing_model text not null default 'subscription',
  price numeric,
  currency text not null default 'usd',
  status text not null default 'draft',
  featured boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installs (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references public.apps (id) on delete cascade,
  buyer_company text,
  buyer_email text,
  plan text,
  status text not null default 'active',
  renewal_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators (id) on delete cascade,
  amount numeric not null,
  currency text not null default 'usd',
  payout_date timestamptz not null default now(),
  stripe_transfer_id text
);

create table if not exists public.webhook_events (
  id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Additive upgrades for databases that already applied an earlier draft.
alter table public.creators add column if not exists user_id uuid unique;
alter table public.creators add column if not exists country text;
alter table public.creators add column if not exists charges_enabled boolean not null default false;
alter table public.creators add column if not exists payouts_enabled boolean not null default false;
alter table public.creators add column if not exists details_submitted boolean not null default false;
alter table public.creators add column if not exists updated_at timestamptz not null default now();
alter table public.apps add column if not exists description text;
alter table public.apps add column if not exists tags text[] not null default '{}';
alter table public.apps add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'webhook_events'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    alter table public.webhook_events
      alter column id drop default,
      alter column id type text using id::text;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists apps_slug_idx on public.apps (slug);
create index if not exists apps_status_idx on public.apps (status);
create index if not exists apps_category_idx on public.apps (category);
create index if not exists apps_creator_id_idx on public.apps (creator_id);
create index if not exists installs_status_idx on public.installs (status);
create index if not exists installs_app_id_idx on public.installs (app_id);
create index if not exists payouts_payout_date_idx on public.payouts (payout_date);
create index if not exists payouts_creator_id_idx on public.payouts (creator_id);
create index if not exists creators_user_id_idx on public.creators (user_id);
create index if not exists creators_stripe_account_id_idx on public.creators (stripe_account_id);
create index if not exists creators_status_idx on public.creators (status);
create index if not exists webhook_events_type_idx on public.webhook_events (event_type);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creators_set_updated_at on public.creators;
create trigger creators_set_updated_at
  before update on public.creators
  for each row execute function public.set_updated_at();

drop trigger if exists apps_set_updated_at on public.apps;
create trigger apps_set_updated_at
  before update on public.apps
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a creator row when a user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.creators (user_id, workspace_name, contact_email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'workspace_name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    'pending'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Creator dashboard metrics (SECURITY DEFINER, scoped to auth.uid())
-- ---------------------------------------------------------------------------

create or replace function public.creator_metrics()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  result json;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select id into cid from public.creators where user_id = uid;

  if cid is null then
    return json_build_object(
      'mrr', 0,
      'active_installs', 0,
      'cancelled_installs', 0,
      'churn_rate', 0,
      'apps_count', 0,
      'next_payout', null
    );
  end if;

  select json_build_object(
    'mrr', coalesce((
      select sum(a.price)
      from public.installs i
      join public.apps a on a.id = i.app_id
      where a.creator_id = cid
        and i.status = 'active'
    ), 0),
    'active_installs', (
      select count(*)::int
      from public.installs i
      join public.apps a on a.id = i.app_id
      where a.creator_id = cid
        and i.status = 'active'
    ),
    'cancelled_installs', (
      select count(*)::int
      from public.installs i
      join public.apps a on a.id = i.app_id
      where a.creator_id = cid
        and i.status = 'cancelled'
    ),
    'churn_rate', (
      select case
        when count(*) filter (where i.status in ('active', 'cancelled')) = 0 then 0
        else round(
          (
            count(*) filter (where i.status = 'cancelled')::numeric
            / count(*) filter (where i.status in ('active', 'cancelled'))
          ) * 100,
          1
        )
      end
      from public.installs i
      join public.apps a on a.id = i.app_id
      where a.creator_id = cid
    ),
    'apps_count', (
      select count(*)::int from public.apps where creator_id = cid
    ),
    'next_payout', (
      select json_build_object(
        'amount', p.amount,
        'currency', p.currency,
        'payout_date', p.payout_date,
        'stripe_transfer_id', p.stripe_transfer_id
      )
      from public.payouts p
      where p.creator_id = cid
      order by p.payout_date desc
      limit 1
    )
  ) into result;

  return result;
end;
$$;

grant execute on function public.creator_metrics() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.creators enable row level security;
alter table public.apps enable row level security;
alter table public.installs enable row level security;
alter table public.payouts enable row level security;
alter table public.webhook_events enable row level security;

-- creators
drop policy if exists "Public can read live creator storefronts" on public.creators;
create policy "Public can read live creator storefronts"
  on public.creators for select
  using (status in ('approved', 'active') or user_id = auth.uid());

drop policy if exists "Creators can insert their profile" on public.creators;
create policy "Creators can insert their profile"
  on public.creators for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Creators can update their profile" on public.creators;
create policy "Creators can update their profile"
  on public.creators for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- apps
drop policy if exists "Public can read published apps" on public.apps;
create policy "Public can read published apps"
  on public.apps for select
  using (
    status in ('approved', 'published')
    or creator_id in (select id from public.creators where user_id = auth.uid())
  );

drop policy if exists "Creators can insert their apps" on public.apps;
create policy "Creators can insert their apps"
  on public.apps for insert
  to authenticated
  with check (
    creator_id in (select id from public.creators where user_id = auth.uid())
  );

drop policy if exists "Creators can update their apps" on public.apps;
create policy "Creators can update their apps"
  on public.apps for update
  to authenticated
  using (creator_id in (select id from public.creators where user_id = auth.uid()))
  with check (creator_id in (select id from public.creators where user_id = auth.uid()));

drop policy if exists "Creators can delete their apps" on public.apps;
create policy "Creators can delete their apps"
  on public.apps for delete
  to authenticated
  using (creator_id in (select id from public.creators where user_id = auth.uid()));

-- installs
drop policy if exists "Creators can read installs for their apps" on public.installs;
create policy "Creators can read installs for their apps"
  on public.installs for select
  to authenticated
  using (
    app_id in (
      select a.id
      from public.apps a
      join public.creators c on c.id = a.creator_id
      where c.user_id = auth.uid()
    )
  );

-- payouts
drop policy if exists "Creators can read their payouts" on public.payouts;
create policy "Creators can read their payouts"
  on public.payouts for select
  to authenticated
  using (
    creator_id in (select id from public.creators where user_id = auth.uid())
  );

-- webhook_events: no anon/authenticated policies — service role only
drop policy if exists "No direct access to webhook events" on public.webhook_events;
