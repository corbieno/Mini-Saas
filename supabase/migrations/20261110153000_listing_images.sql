-- Listing images for marketplace apps.
-- Safe to re-run. Apply in the Supabase SQL editor (the project does not need
-- to be reachable from the app build):
--
--   supabase/migrations/20261110153000_listing_images.sql
--
-- Adds nullable cover + ordered gallery paths. Existing listings stay valid
-- with a null cover and an empty gallery.
--
-- Creates a private `listing-images` bucket (5 MB, png/jpeg/webp/gif).
-- SELECT policies are not filtered with storage.allow_any_operation() so
-- signed-URL creation keeps working on projects that predate that helper.
-- A private bucket still checks these policies on download. Public buckets
-- would ignore them, so this bucket stays private and the app signs URLs.

alter table public.apps add column if not exists cover_image_path text;
alter table public.apps add column if not exists gallery_image_paths text[] not null default '{}';

comment on column public.apps.cover_image_path is
  'Object path in the listing-images bucket. Null when the listing has no cover.';
comment on column public.apps.gallery_image_paths is
  'Ordered object paths in the listing-images bucket. At most 5.';

alter table public.apps drop constraint if exists apps_gallery_image_paths_limit;
alter table public.apps
  add constraint apps_gallery_image_paths_limit
  check (cardinality(gallery_image_paths) <= 5);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner reads include drafts. Anyone can read objects for a published listing,
-- which is what createSignedUrls checks before it issues a URL.
drop policy if exists "Listing owners can read their listing images" on storage.objects;
create policy "Listing owners can read their listing images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.apps
      join public.creators on creators.id = apps.creator_id
      where apps.id::text = (storage.foldername(name))[1]
        and creators.user_id = auth.uid()
    )
  );

drop policy if exists "Anyone can read images for published listings" on storage.objects;
create policy "Anyone can read images for published listings"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.apps
      where apps.id::text = (storage.foldername(name))[1]
        and apps.status in ('approved', 'published')
    )
  );

-- Insert + select + update so a later upsert can replace a file. Uploads use
-- a new object name; update is still granted per the storage upsert rules.
drop policy if exists "Listing owners can upload listing images" on storage.objects;
create policy "Listing owners can upload listing images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif')
    and exists (
      select 1
      from public.apps
      join public.creators on creators.id = apps.creator_id
      where apps.id::text = (storage.foldername(name))[1]
        and creators.user_id = auth.uid()
    )
  );

drop policy if exists "Listing owners can update listing images" on storage.objects;
create policy "Listing owners can update listing images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.apps
      join public.creators on creators.id = apps.creator_id
      where apps.id::text = (storage.foldername(name))[1]
        and creators.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'listing-images'
    and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'gif')
    and exists (
      select 1
      from public.apps
      join public.creators on creators.id = apps.creator_id
      where apps.id::text = (storage.foldername(name))[1]
        and creators.user_id = auth.uid()
    )
  );

drop policy if exists "Listing owners can delete listing images" on storage.objects;
create policy "Listing owners can delete listing images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and exists (
      select 1
      from public.apps
      join public.creators on creators.id = apps.creator_id
      where apps.id::text = (storage.foldername(name))[1]
        and creators.user_id = auth.uid()
    )
  );
