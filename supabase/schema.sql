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


-- ---------------------------------------------------------------------------
-- Collaboration (same SQL as supabase/migrations/20261106151749_creator_collaborations.sql)
-- ---------------------------------------------------------------------------

-- Consent-based creator collaboration.
-- Requires the base Mini SaaS schema (supabase/schema.sql): creators, apps, set_updated_at().
--
-- Both creators must opt in (creator_collaboration_settings.suggestions_enabled)
-- before a request can be sent or accepted. Listings are linked, and contact
-- details are copied into collaboration_contacts, only after acceptance.
--
-- TODO(revenue-sharing): acceptance does not split Stripe Connect payouts.
-- Each listing still pays its own creator until an explicit split is added.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.creator_collaboration_settings (
  creator_id uuid primary key references public.creators (id) on delete cascade,
  suggestions_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  requester_creator_id uuid not null references public.creators (id) on delete cascade,
  recipient_creator_id uuid not null references public.creators (id) on delete cascade,
  requester_app_id uuid not null references public.apps (id) on delete cascade,
  recipient_app_id uuid not null references public.apps (id) on delete cascade,
  requester_app_title text not null,
  recipient_app_title text not null,
  requester_name text not null,
  recipient_name text not null,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  constraint collaboration_requests_status_check
    check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'ended')),
  constraint collaboration_requests_distinct_creators_check
    check (requester_creator_id <> recipient_creator_id),
  constraint collaboration_requests_distinct_apps_check
    check (requester_app_id <> recipient_app_id),
  constraint collaboration_requests_message_length_check
    check (message is null or char_length(message) <= 500)
);

comment on table public.collaboration_requests is
  'Consent-based collaboration between two creators. TODO(revenue-sharing): acceptance does not split Stripe Connect payouts.';

-- Public "Built in collaboration with X" line. No email, no message.
create table if not exists public.collaboration_credits (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps (id) on delete cascade,
  collaboration_request_id uuid not null references public.collaboration_requests (id) on delete cascade,
  partner_creator_id uuid not null references public.creators (id) on delete cascade,
  partner_name text not null,
  created_at timestamptz not null default now(),
  constraint collaboration_credits_app_request_key unique (app_id, collaboration_request_id)
);

-- Contact details visible only to the creator named by owner_creator_id, and
-- only while the collaboration is accepted.
create table if not exists public.collaboration_contacts (
  collaboration_request_id uuid not null references public.collaboration_requests (id) on delete cascade,
  owner_creator_id uuid not null references public.creators (id) on delete cascade,
  partner_creator_id uuid not null references public.creators (id) on delete cascade,
  partner_name text not null,
  partner_email text not null,
  primary key (collaboration_request_id, owner_creator_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists collaboration_requests_requester_idx
  on public.collaboration_requests (requester_creator_id, status);
create index if not exists collaboration_requests_recipient_idx
  on public.collaboration_requests (recipient_creator_id, status);
create index if not exists collaboration_requests_requester_app_idx
  on public.collaboration_requests (requester_app_id);
create index if not exists collaboration_requests_recipient_app_idx
  on public.collaboration_requests (recipient_app_id);
create unique index if not exists collaboration_requests_open_pair_idx
  on public.collaboration_requests (
    least(requester_app_id, recipient_app_id),
    greatest(requester_app_id, recipient_app_id)
  )
  where status in ('pending', 'accepted');
create index if not exists collaboration_credits_app_id_idx
  on public.collaboration_credits (app_id);
create index if not exists collaboration_contacts_owner_idx
  on public.collaboration_contacts (owner_creator_id);
create index if not exists creator_collaboration_settings_enabled_idx
  on public.creator_collaboration_settings (creator_id)
  where suggestions_enabled;

-- ---------------------------------------------------------------------------
-- Similarity (kept in sync with src/lib/collaboration/similarity.ts)
-- ---------------------------------------------------------------------------

create or replace function private.listing_terms(title text, summary text, description text)
returns setof text
language sql
stable
set search_path = public
as $$
  select distinct token
  from regexp_split_to_table(
    lower(
      regexp_replace(
        concat_ws(' ', coalesce(title, ''), coalesce(summary, ''), coalesce(description, '')),
        '[^a-z0-9]+',
        ' ',
        'g'
      )
    ),
    '\s+'
  ) as token
  where char_length(token) >= 4
    and token <> all (array[
      'about', 'after', 'again', 'also', 'apps', 'auto', 'been', 'before', 'could',
      'does', 'each', 'from', 'have', 'here', 'into', 'just', 'more', 'once',
      'only', 'onto', 'other', 'over', 'should', 'some', 'than', 'that', 'their',
      'them', 'then', 'there', 'these', 'they', 'this', 'those', 'under', 'upon',
      'used', 'using', 'very', 'were', 'what', 'when', 'where', 'which', 'while',
      'will', 'with', 'would', 'your'
    ]::text[]);
$$;

create or replace function private.listings_are_similar(left_id uuid, right_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  left_app public.apps%rowtype;
  right_app public.apps%rowtype;
  shared_tags int := 0;
  shared_terms int := 0;
  same_category boolean := false;
begin
  select * into left_app from public.apps where id = left_id;
  select * into right_app from public.apps where id = right_id;

  if left_app.id is null or right_app.id is null or left_app.id = right_app.id then
    return false;
  end if;

  if left_app.creator_id is not null and left_app.creator_id = right_app.creator_id then
    return false;
  end if;

  same_category := length(btrim(coalesce(left_app.category, ''))) > 0
    and lower(btrim(left_app.category)) = lower(btrim(right_app.category));

  select count(*)::int into shared_tags
  from (
    select lower(btrim(tag)) as tag
    from unnest(coalesce(left_app.tags, '{}'::text[])) as tag
    where length(btrim(tag)) > 0
    intersect
    select lower(btrim(tag))
    from unnest(coalesce(right_app.tags, '{}'::text[])) as tag
    where length(btrim(tag)) > 0
  ) shared_tag;

  select count(*)::int into shared_terms
  from (
    select * from private.listing_terms(left_app.title, left_app.summary, left_app.description)
    intersect
    select * from private.listing_terms(right_app.title, right_app.summary, right_app.description)
  ) shared_term;

  return (same_category and (shared_tags > 0 or shared_terms > 0))
    or shared_tags >= 2
    or shared_terms >= 3;
end;
$$;

-- ---------------------------------------------------------------------------
-- Consent triggers
-- ---------------------------------------------------------------------------

create or replace function private.display_name(workspace_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(btrim(workspace_name), ''), 'Creator');
$$;

create or replace function private.enforce_collaboration_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_user uuid;
  requester_title text;
  requester_status text;
  recipient_title text;
  recipient_status text;
  recipient_owner uuid;
  requester_workspace text;
  recipient_workspace text;
  requester_opted_in boolean;
  recipient_opted_in boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;

  if new.status is distinct from 'pending' then
    raise exception 'Collaboration requests start as pending' using errcode = '22023';
  end if;

  if new.message is not null and char_length(btrim(new.message)) = 0 then
    new.message = null;
  elsif new.message is not null then
    new.message = btrim(new.message);
  end if;

  if new.message is not null and char_length(new.message) > 500 then
    raise exception 'Collaboration message must be 500 characters or fewer' using errcode = '22023';
  end if;

  select c.user_id, c.workspace_name
    into requester_user, requester_workspace
  from public.creators c
  where c.id = new.requester_creator_id;

  if requester_user is null or requester_user is distinct from auth.uid() then
    raise exception 'You can only send collaboration requests as yourself' using errcode = '42501';
  end if;

  if new.requester_creator_id = new.recipient_creator_id or new.requester_app_id = new.recipient_app_id then
    raise exception 'You cannot collaborate with yourself' using errcode = '22023';
  end if;

  select a.title, a.status
    into requester_title, requester_status
  from public.apps a
  where a.id = new.requester_app_id
    and a.creator_id = new.requester_creator_id;

  if requester_title is null then
    raise exception 'That listing does not belong to you' using errcode = '42501';
  end if;

  if requester_status not in ('draft', 'approved', 'published') then
    raise exception 'Your listing cannot be used for collaboration' using errcode = '22023';
  end if;

  select a.title, a.status, a.creator_id
    into recipient_title, recipient_status, recipient_owner
  from public.apps a
  where a.id = new.recipient_app_id;

  if recipient_title is null or recipient_owner is distinct from new.recipient_creator_id then
    raise exception 'That listing does not belong to the other creator' using errcode = '42501';
  end if;

  if recipient_status not in ('approved', 'published') then
    raise exception 'You can only request collaboration on a published listing' using errcode = '22023';
  end if;

  select c.workspace_name into recipient_workspace
  from public.creators c
  where c.id = new.recipient_creator_id;

  select s.suggestions_enabled into requester_opted_in
  from public.creator_collaboration_settings s
  where s.creator_id = new.requester_creator_id;

  select s.suggestions_enabled into recipient_opted_in
  from public.creator_collaboration_settings s
  where s.creator_id = new.recipient_creator_id;

  if coalesce(requester_opted_in, false) is not true
     or coalesce(recipient_opted_in, false) is not true then
    raise exception 'Both creators must opt in before a collaboration request can be sent' using errcode = '42501';
  end if;

  if not private.listings_are_similar(new.requester_app_id, new.recipient_app_id) then
    raise exception 'These listings are not similar enough to collaborate' using errcode = '22023';
  end if;

  new.requester_app_title = requester_title;
  new.recipient_app_title = recipient_title;
  new.requester_name = private.display_name(requester_workspace);
  new.recipient_name = private.display_name(recipient_workspace);
  new.responded_at = null;
  new.ended_at = null;

  return new;
end;
$$;

create or replace function private.enforce_collaboration_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  requester_user uuid;
  recipient_user uuid;
  requester_opted_in boolean;
  recipient_opted_in boolean;
begin
  if actor is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;

  if new.id is distinct from old.id
     or new.requester_creator_id is distinct from old.requester_creator_id
     or new.recipient_creator_id is distinct from old.recipient_creator_id
     or new.requester_app_id is distinct from old.requester_app_id
     or new.recipient_app_id is distinct from old.recipient_app_id
     or new.requester_app_title is distinct from old.requester_app_title
     or new.recipient_app_title is distinct from old.recipient_app_title
     or new.requester_name is distinct from old.requester_name
     or new.recipient_name is distinct from old.recipient_name
     or new.created_at is distinct from old.created_at then
    raise exception 'Collaboration identity cannot be changed' using errcode = '22023';
  end if;

  select user_id into requester_user from public.creators where id = old.requester_creator_id;
  select user_id into recipient_user from public.creators where id = old.recipient_creator_id;

  if actor is distinct from requester_user and actor is distinct from recipient_user then
    raise exception 'You are not part of this collaboration' using errcode = '42501';
  end if;

  if new.message is distinct from old.message then
    if old.status <> 'pending' or actor is distinct from requester_user then
      raise exception 'Only the requester can edit the message while it is pending' using errcode = '42501';
    end if;
    if new.message is not null and char_length(btrim(new.message)) = 0 then
      new.message = null;
    elsif new.message is not null then
      new.message = btrim(new.message);
    end if;
    if new.message is not null and char_length(new.message) > 500 then
      raise exception 'Collaboration message must be 500 characters or fewer' using errcode = '22023';
    end if;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status = 'withdrawn' and actor = requester_user then
    new.responded_at = now();
    new.ended_at = null;
  elsif old.status = 'pending' and new.status = 'declined' and actor = recipient_user then
    new.responded_at = now();
    new.ended_at = null;
  elsif old.status = 'pending' and new.status = 'accepted' and actor = recipient_user then
    select suggestions_enabled into requester_opted_in
    from public.creator_collaboration_settings
    where creator_id = old.requester_creator_id;

    select suggestions_enabled into recipient_opted_in
    from public.creator_collaboration_settings
    where creator_id = old.recipient_creator_id;

    if coalesce(requester_opted_in, false) is not true
       or coalesce(recipient_opted_in, false) is not true then
      raise exception 'Both creators must still be opted in to accept a collaboration' using errcode = '42501';
    end if;

    -- TODO(revenue-sharing): do not create a Stripe transfer or application fee here.
    new.responded_at = now();
    new.ended_at = null;
  elsif old.status = 'accepted' and new.status = 'ended'
        and (actor = requester_user or actor = recipient_user) then
    new.ended_at = now();
  else
    raise exception 'That collaboration update is not allowed' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function private.sync_collaboration_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.collaboration_credits where collaboration_request_id = new.id;
  delete from public.collaboration_contacts where collaboration_request_id = new.id;

  if new.status = 'accepted' then
    insert into public.collaboration_credits (
      app_id, collaboration_request_id, partner_creator_id, partner_name
    )
    select new.requester_app_id, new.id, recipient.id, private.display_name(recipient.workspace_name)
    from public.creators recipient
    where recipient.id = new.recipient_creator_id
    union all
    select new.recipient_app_id, new.id, requester.id, private.display_name(requester.workspace_name)
    from public.creators requester
    where requester.id = new.requester_creator_id;

    insert into public.collaboration_contacts (
      collaboration_request_id, owner_creator_id, partner_creator_id, partner_name, partner_email
    )
    select new.id, new.requester_creator_id, recipient.id,
           private.display_name(recipient.workspace_name), recipient.contact_email
    from public.creators recipient
    where recipient.id = new.recipient_creator_id
    union all
    select new.id, new.recipient_creator_id, requester.id,
           private.display_name(requester.workspace_name), requester.contact_email
    from public.creators requester
    where requester.id = new.requester_creator_id;
  end if;

  return new;
end;
$$;

create or replace function private.enforce_collaboration_settings_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.creator_id is distinct from old.creator_id then
    raise exception 'Cannot reassign collaboration settings' using errcode = '22023';
  end if;

  -- Opting out closes pending requests so an opted-out creator never keeps
  -- an open incoming request. Active collaborations stay until someone ends them.
  if old.suggestions_enabled is true and new.suggestions_enabled is false then
    update public.collaboration_requests
      set status = 'declined'
      where recipient_creator_id = new.creator_id
        and status = 'pending';

    update public.collaboration_requests
      set status = 'withdrawn'
      where requester_creator_id = new.creator_id
        and status = 'pending';
  end if;

  return new;
end;
$$;

create or replace function private.create_collaboration_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.creator_collaboration_settings (creator_id)
  values (new.id)
  on conflict (creator_id) do nothing;
  return new;
end;
$$;

create or replace function private.sync_creator_collaboration_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.workspace_name is distinct from old.workspace_name
     or new.contact_email is distinct from old.contact_email then
    update public.collaboration_credits
      set partner_name = private.display_name(new.workspace_name)
      where partner_creator_id = new.id;

    update public.collaboration_contacts
      set partner_name = private.display_name(new.workspace_name),
          partner_email = new.contact_email
      where partner_creator_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists collaboration_requests_enforce_insert on public.collaboration_requests;
create trigger collaboration_requests_enforce_insert
  before insert on public.collaboration_requests
  for each row execute function private.enforce_collaboration_request_insert();

drop trigger if exists collaboration_requests_enforce_update on public.collaboration_requests;
create trigger collaboration_requests_enforce_update
  before update on public.collaboration_requests
  for each row execute function private.enforce_collaboration_request_update();

drop trigger if exists collaboration_requests_sync_visibility on public.collaboration_requests;
create trigger collaboration_requests_sync_visibility
  after insert or update on public.collaboration_requests
  for each row execute function private.sync_collaboration_visibility();

drop trigger if exists collaboration_requests_set_updated_at on public.collaboration_requests;
create trigger collaboration_requests_set_updated_at
  before update on public.collaboration_requests
  for each row execute function public.set_updated_at();

drop trigger if exists collaboration_settings_enforce_update on public.creator_collaboration_settings;
create trigger collaboration_settings_enforce_update
  before update on public.creator_collaboration_settings
  for each row execute function private.enforce_collaboration_settings_update();

drop trigger if exists collaboration_settings_set_updated_at on public.creator_collaboration_settings;
create trigger collaboration_settings_set_updated_at
  before update on public.creator_collaboration_settings
  for each row execute function public.set_updated_at();

drop trigger if exists creators_create_collaboration_settings on public.creators;
create trigger creators_create_collaboration_settings
  after insert on public.creators
  for each row execute function private.create_collaboration_settings();

drop trigger if exists creators_sync_collaboration_profile on public.creators;
create trigger creators_sync_collaboration_profile
  after update on public.creators
  for each row execute function private.sync_creator_collaboration_profile();

insert into public.creator_collaboration_settings (creator_id)
select id from public.creators
on conflict (creator_id) do nothing;

-- ---------------------------------------------------------------------------
-- Privileges
-- Trigger functions must be executable by the role that fires them.
-- Similarity helpers stay owner-only so they are not general-purpose RPCs.
-- ---------------------------------------------------------------------------

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.enforce_collaboration_request_insert() to authenticated;
grant execute on function private.enforce_collaboration_request_update() to authenticated;
grant execute on function private.sync_collaboration_visibility() to authenticated;
grant execute on function private.enforce_collaboration_settings_update() to authenticated;
grant execute on function private.create_collaboration_settings() to authenticated;
grant execute on function private.sync_creator_collaboration_profile() to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
    grant execute on function private.create_collaboration_settings() to supabase_auth_admin;
  end if;
end $$;

revoke all on public.collaboration_requests from anon;
revoke all on public.creator_collaboration_settings from anon;
revoke all on public.collaboration_contacts from anon;
revoke insert, update, delete on public.collaboration_credits from anon, authenticated;
revoke insert, update, delete on public.collaboration_contacts from authenticated;
revoke delete on public.collaboration_requests from authenticated;
revoke delete on public.creator_collaboration_settings from authenticated;

grant select on public.collaboration_credits to anon, authenticated;
grant select, insert, update on public.collaboration_requests to authenticated;
grant select, insert, update on public.creator_collaboration_settings to authenticated;
grant select on public.collaboration_contacts to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.creator_collaboration_settings enable row level security;
alter table public.collaboration_requests enable row level security;
alter table public.collaboration_credits enable row level security;
alter table public.collaboration_contacts enable row level security;

drop policy if exists "Authenticated creators can read collaboration preferences"
  on public.creator_collaboration_settings;
create policy "Authenticated creators can read collaboration preferences"
  on public.creator_collaboration_settings for select
  to authenticated
  using (true);

drop policy if exists "Creators can insert their collaboration preference"
  on public.creator_collaboration_settings;
create policy "Creators can insert their collaboration preference"
  on public.creator_collaboration_settings for insert
  to authenticated
  with check (
    creator_id in (select id from public.creators where user_id = auth.uid())
  );

drop policy if exists "Creators can update their collaboration preference"
  on public.creator_collaboration_settings;
create policy "Creators can update their collaboration preference"
  on public.creator_collaboration_settings for update
  to authenticated
  using (creator_id in (select id from public.creators where user_id = auth.uid()))
  with check (creator_id in (select id from public.creators where user_id = auth.uid()));

drop policy if exists "Participants can read their collaboration requests"
  on public.collaboration_requests;
create policy "Participants can read their collaboration requests"
  on public.collaboration_requests for select
  to authenticated
  using (
    requester_creator_id in (select id from public.creators where user_id = auth.uid())
    or recipient_creator_id in (select id from public.creators where user_id = auth.uid())
  );

drop policy if exists "Requesters can open a pending collaboration"
  on public.collaboration_requests;
create policy "Requesters can open a pending collaboration"
  on public.collaboration_requests for insert
  to authenticated
  with check (
    status = 'pending'
    and requester_creator_id in (select id from public.creators where user_id = auth.uid())
    and requester_creator_id <> recipient_creator_id
    and requester_app_id <> recipient_app_id
    and exists (
      select 1 from public.apps a
      where a.id = requester_app_id
        and a.creator_id = requester_creator_id
    )
    and exists (
      select 1 from public.apps a
      where a.id = recipient_app_id
        and a.creator_id = recipient_creator_id
        and a.status in ('approved', 'published')
    )
    and exists (
      select 1 from public.creator_collaboration_settings s
      where s.creator_id = requester_creator_id
        and s.suggestions_enabled
    )
    and exists (
      select 1 from public.creator_collaboration_settings s
      where s.creator_id = recipient_creator_id
        and s.suggestions_enabled
    )
  );

drop policy if exists "Participants can update their collaboration requests"
  on public.collaboration_requests;
create policy "Participants can update their collaboration requests"
  on public.collaboration_requests for update
  to authenticated
  using (
    requester_creator_id in (select id from public.creators where user_id = auth.uid())
    or recipient_creator_id in (select id from public.creators where user_id = auth.uid())
  )
  with check (
    requester_creator_id in (select id from public.creators where user_id = auth.uid())
    or recipient_creator_id in (select id from public.creators where user_id = auth.uid())
  );

drop policy if exists "Anyone can read collaboration credits"
  on public.collaboration_credits;
create policy "Anyone can read collaboration credits"
  on public.collaboration_credits for select
  using (true);

drop policy if exists "Creators can read contacts shared with them"
  on public.collaboration_contacts;
create policy "Creators can read contacts shared with them"
  on public.collaboration_contacts for select
  to authenticated
  using (
    owner_creator_id in (select id from public.creators where user_id = auth.uid())
  );
