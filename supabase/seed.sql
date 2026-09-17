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

-- ---------------------------------------------------------------------------
-- Grok / Claude / OpenAI ecosystem listings
-- Provider chips on /apps match the provider name in apps.tags.
-- Re-run this file after pull to upsert the new storefronts.
-- ---------------------------------------------------------------------------

insert into public.creators (id, workspace_name, contact_email, status, country)
values
  ('00000000-0000-4000-8000-000000000005', 'Nightshift Agents', 'hello@nightshift.test', 'approved', 'US'),
  ('00000000-0000-4000-8000-000000000006', 'Hearth Context', 'studio@hearth.test', 'approved', 'GB'),
  ('00000000-0000-4000-8000-000000000007', 'Prompt Foundry', 'foundry@prompt.test', 'approved', 'US')
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
    '10000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000005',
    'Grok Desk Runner',
    'grok-desk-runner',
    'Operations',
    'Desktop agent that watches a folder, reasons with Grok, and clicks through local apps for you.',
    'Point Grok Desk Runner at a drop folder or inbox. Grok classifies each item, plans a click-path across the Mac or Windows apps you already use, and executes the run with an audit log you can replay. Built for ops teams who want agentic desktop automation without writing RPA scripts.',
    'subscription',
    39,
    'usd',
    'approved',
    true,
    array['Grok', 'Desktop', 'Agents']
  ),
  (
    '10000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000005',
    'Timeline Scout',
    'timeline-scout',
    'Marketing',
    'Live-web Grok agent that briefs Slack on competitors, launches, and breaking threads.',
    'Scout watches X, the open web, and your competitor list. Grok summarizes what changed, scores urgency, and posts a tight briefing to Slack or email every hour. Save searches as playbooks and forward the ones that need a human.',
    'subscription',
    29,
    'usd',
    'approved',
    true,
    array['Grok', 'Monitoring', 'Slack']
  ),
  (
    '10000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000005',
    'Fleet Click',
    'fleet-click',
    'Operations',
    'Multi-step desktop runbooks: Grok plans the path, a local runner executes it.',
    'Record a messy multi-app workflow once. Fleet Click turns it into a Grok-planned runbook with checkpoints, retries, and human-in-the-loop prompts. Ship the same play to every operator laptop without a brittle selector map.',
    'subscription',
    45,
    'usd',
    'approved',
    false,
    array['Grok', 'RPA', 'Desktop']
  ),
  (
    '10000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000006',
    'Claude Research Desk',
    'claude-research-desk',
    'Operations',
    'Long-context literature review — drop PDFs, get cited briefs you can hand to a client.',
    'Upload papers, transcripts, and knowledge-base dumps. Claude Research Desk chunks them, keeps citations honest, and writes a brief with claims, counterpoints, and open questions. Export to Notion or a shareable PDF. Designed for consultants and analysts who outgrew chat paste-ins.',
    'subscription',
    39,
    'usd',
    'approved',
    true,
    array['Claude', 'Research', 'PDF']
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000006',
    'Longform Hearth',
    'longform-hearth',
    'Marketing',
    'Brand-voice writing studio with Claude projects, style cards, and editorial memory.',
    'Hearth stores your style cards, banned phrases, and approved examples. Claude drafts long-form pages, sequences, and changelog posts in that voice, then scores drift against the card. Teams keep a shared Hearth instead of a graveyard of chat threads.',
    'subscription',
    25,
    'usd',
    'approved',
    true,
    array['Claude', 'Writing', 'Brand']
  ),
  (
    '10000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000006',
    'Claude Code Steward',
    'claude-code-steward',
    'Operations',
    'PR review and refactor suggestions from Claude, posted back to GitHub.',
    'Install the GitHub app, pick repos, and let Claude Code Steward review diffs against your architecture notes. It flags risk, suggests patches, and never merges without a human. Pairs with CI so noisy nits stay out of the main thread.',
    'subscription',
    49,
    'usd',
    'approved',
    false,
    array['Claude', 'Code', 'GitHub']
  ),
  (
    '10000000-0000-4000-8000-000000000013',
    '00000000-0000-4000-8000-000000000007',
    'Assistants Switchboard',
    'assistants-switchboard',
    'Inbox',
    'Route customer intents to the right OpenAI Assistant with shared memory across threads.',
    'Switchboard sits in front of the Assistants API. It classifies the inbound ticket, selects a specialist assistant (billing, product, or onboarding), and carries a compact memory envelope between them. Operators see the handoff; buyers get one thread.',
    'subscription',
    32,
    'usd',
    'approved',
    true,
    array['OpenAI', 'Assistants', 'Support']
  ),
  (
    '10000000-0000-4000-8000-000000000014',
    '00000000-0000-4000-8000-000000000007',
    'GPT Workflow Kit',
    'gpt-workflow-kit',
    'Sales Ops',
    'Visual builder for GPT + function-calling workflows into HubSpot, Slack, and Sheets.',
    'Drag tools onto a canvas: web research, CRM writes, Slack posts, and custom HTTP. Workflow Kit compiles to the OpenAI API with retries, budget caps, and a run history sales ops can audit. Start from templates for lead research and follow-up drafts.',
    'subscription',
    27,
    'usd',
    'approved',
    true,
    array['OpenAI', 'GPT', 'Workflows']
  ),
  (
    '10000000-0000-4000-8000-000000000015',
    '00000000-0000-4000-8000-000000000007',
    'Threadsmith',
    'threadsmith',
    'Inbox',
    'Custom GPT that drafts, tags, and files support threads without leaving the helpdesk.',
    'Threadsmith learns from your closed tickets, then drafts replies, applies tags, and suggests macros in Zendesk or Gmail. It never sends until you approve. Built for small support teams who want GPT quality with an audit trail.',
    'subscription',
    22,
    'usd',
    'approved',
    false,
    array['OpenAI', 'GPT', 'Inbox']
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
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000007', 'Harbor Labs', 'ops@harborlabs.test', '$39/mo', 'active', current_date + 14),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000010', 'Northshore Advisory', 'research@northshore.test', '$39/mo', 'active', current_date + 9),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000013', 'Field Support Co', 'cs@fieldsupport.test', '$32/mo', 'active', current_date + 21)
on conflict (id) do update
  set buyer_company = excluded.buyer_company,
      plan = excluded.plan,
      status = excluded.status,
      renewal_date = excluded.renewal_date;

insert into public.payouts (id, creator_id, amount, currency, payout_date, stripe_transfer_id)
values
  (
    '30000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000005',
    910,
    'usd',
    now() + interval '6 days',
    'tr_seed_nightshift_preview'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000006',
    1240,
    'usd',
    now() + interval '8 days',
    'tr_seed_hearth_preview'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000007',
    780,
    'usd',
    now() + interval '4 days',
    'tr_seed_foundry_preview'
  )
on conflict (id) do update
  set amount = excluded.amount,
      payout_date = excluded.payout_date;
