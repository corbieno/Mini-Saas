create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  workspace_name text not null,
  contact_email text not null,
  status text not null default 'pending',
  stripe_account_id text,
  created_at timestamptz default now()
);

create table if not exists apps (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  title text not null,
  slug text not null unique,
  category text not null,
  summary text,
  pricing_model text default 'subscription',
  price numeric,
  currency text default 'usd',
  status text default 'draft',
  featured boolean default false,
  created_at timestamptz default now()
);

create table if not exists installs (
  id uuid primary key default gen_random_uuid(),
  app_id uuid references apps(id) on delete cascade,
  buyer_company text,
  buyer_email text,
  plan text,
  status text default 'active',
  renewal_date date,
  created_at timestamptz default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references creators(id) on delete cascade,
  amount numeric not null,
  currency text default 'usd',
  payout_date timestamptz default now(),
  stripe_transfer_id text
);

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null,
  processed boolean default false,
  created_at timestamptz default now()
);
