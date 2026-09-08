insert into creators (workspace_name, contact_email, status)
values
  ('Corbin Fields Studio', 'corbin@example.com', 'approved')
  on conflict do nothing;

insert into apps (creator_id, title, slug, category, summary, pricing_model, price, status)
select id, 'Corbin Email Guru', 'corbin-email-guru', 'Sales Ops', 'Account-based outreach for NICE teams.', 'subscription', 39, 'approved'
from creators
where workspace_name = 'Corbin Fields Studio'
on conflict (slug) do nothing;
