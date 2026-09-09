-- Sample marketplace data. Safe to re-run.
-- Demo creators are storefront-only (no auth.users row). Signing up in the app
-- creates a separate creator profile via the handle_new_user trigger.

insert into public.creators (id, workspace_name, contact_email, status, country)
values
  ('00000000-0000-4000-8000-000000000001', 'Corbin Fields Studio', 'corbin@example.com', 'approved', 'US'),
  ('00000000-0000-4000-8000-000000000002', 'Summit Automations', 'maya@summit.test', 'approved', 'US'),
  ('00000000-0000-4000-8000-000000000003', 'Analog Futures', 'lee@analog.test', 'approved', 'US'),
  ('00000000-0000-4000-8000-000000000004', 'Northwind Studio', 'priya@northwind.test', 'approved', 'CA')
on conflict (id) do update
  set workspace_name = excluded.workspace_name,
      contact_email = excluded.contact_email,
      status = excluded.status,
      country = excluded.country;

insert into public.apps (
  id, creator_id, title, slug, category, summary, description,
  pricing_model, price, currency, status, featured, tags
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Corbin Email Guru',
    'corbin-email-guru',
    'Sales Ops',
    'Account-based outreach for NICE teams.',
    'Compose personalized sequences, import contacts, and schedule cadences for account-based outreach.',
    'subscription',
    39,
    'usd',
    'approved',
    true,
    array['Gmail', 'Outlook', 'Cadence']
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Pipeline Pulse',
    'pipeline-pulse',
    'Sales Ops',
    'Turns CRM noise into prioritized revenue plays—auto syncs back to HubSpot & Salesforce.',
    'Score inbound leads, push next-best actions to Slack, and write activity back to your CRM.',
    'subscription',
    29,
    'usd',
    'approved',
    true,
    array['Lead Scoring', 'CRM', 'Slack Alerts']
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000003',
    'Inbox Relay',
    'inbox-relay',
    'Inbox',
    'AI concierge that triages founder inboxes, drafts replies, and books meetings automatically.',
    'Connect Gmail or Outlook, set routing rules, and let Relay draft replies you approve in one click.',
    'subscription',
    19,
    'usd',
    'approved',
    true,
    array['Gmail', 'Outlook']
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000004',
    'Finance Sitter',
    'finance-sitter',
    'Finance',
    'Daily cash intel + anomaly detection for small biz owners. Connects to Stripe, Mercury, QuickBooks.',
    'Watch cash, flag anomalies, and email a morning briefing your bookkeeper can trust.',
    'subscription',
    49,
    'usd',
    'approved',
    true,
    array['Forecasting', 'Alerts']
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000002',
    'Launch Checklist',
    'launch-checklist',
    'Operations',
    'Ship-day runbooks that assign owners, ping Slack, and close the loop automatically.',
    'Turn tribal launch knowledge into a repeatable checklist with reminders and audit history.',
    'subscription',
    15,
    'usd',
    'approved',
    false,
    array['Slack', 'Runbooks']
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000003',
    'Campaign Copilot',
    'campaign-copilot',
    'Marketing',
    'Brief-to-brief copy drafts and UTM hygiene for lean marketing teams.',
    'Generate on-brand variants, keep UTMs consistent, and export to your ESP.',
    'subscription',
    25,
    'usd',
    'approved',
    false,
    array['Copy', 'UTM']
  )
on conflict (slug) do update
  set title = excluded.title,
      category = excluded.category,
      summary = excluded.summary,
      description = excluded.description,
      price = excluded.price,
      status = excluded.status,
      featured = excluded.featured,
      tags = excluded.tags,
      creator_id = excluded.creator_id;

insert into public.installs (id, app_id, buyer_company, buyer_email, plan, status, renewal_date)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Summit CX', 'ops@summitcx.test', '$39/mo', 'active', current_date + 20),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Newwind Labs', 'hello@newwind.test', '$39/mo', 'active', current_date + 12),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Atlas Retail', 'it@atlas.test', '$39/mo', 'cancelled', current_date - 8),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Harbor Freight GTM', 'gtm@harbor.test', '$29/mo', 'active', current_date + 18),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Field & Co', 'founder@field.test', '$19/mo', 'active', current_date + 6)
on conflict (id) do update
  set buyer_company = excluded.buyer_company,
      plan = excluded.plan,
      status = excluded.status,
      renewal_date = excluded.renewal_date;

insert into public.payouts (id, creator_id, amount, currency, payout_date, stripe_transfer_id)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    1820,
    'usd',
    now() + interval '5 days',
    'tr_seed_corbin_preview'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    640,
    'usd',
    now() + interval '7 days',
    'tr_seed_summit_preview'
  )
on conflict (id) do update
  set amount = excluded.amount,
      payout_date = excluded.payout_date;
