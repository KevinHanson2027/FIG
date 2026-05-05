-- ================================================
-- FIG App — Supabase Database Schema v3
-- Run this entire file in the Supabase SQL Editor
-- ================================================


-- ── CLEANUP: wipe old auth-dependent objects ─────────────────────
drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table    if exists public.profiles CASCADE;   -- CASCADE removes all dependent policies & FK constraints
-- ────────────────────────────────────────────────────────────────


-- 1. Page Content
create table if not exists public.page_content (
  id         uuid    default gen_random_uuid() primary key,
  page_slug  text    unique not null,
  content    jsonb   not null default '{}',
  updated_at timestamptz default now()
);
alter table public.page_content enable row level security;
drop policy if exists "open" on public.page_content;
create policy "open" on public.page_content for all using (true) with check (true);
grant select, insert, update, delete on public.page_content to anon;

insert into public.page_content (page_slug, content) values
  ('home',                '{}'),
  ('about',               '{}'),
  ('holdings',            '{}'),
  ('portfolio-reporting', '{}'),
  ('resources',           '{}'),
  ('get-involved',        '{}')
on conflict (page_slug) do nothing;


-- 2. Members Directory
create table if not exists public.members_directory (
  id           uuid    default gen_random_uuid() primary key,
  name         text    not null,
  title        text,
  sector       text    not null,
  email        text,
  linkedin_url text,
  bio          text,
  headshot_url text,
  is_active    boolean default true,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);
alter table public.members_directory enable row level security;
drop policy if exists "open" on public.members_directory;
create policy "open" on public.members_directory for all using (true) with check (true);
grant select, insert, update, delete on public.members_directory to anon;


-- 3. Resources
create table if not exists public.resources (
  id          uuid    default gen_random_uuid() primary key,
  title       text    not null,
  description text,
  file_url    text,
  file_type   text,
  sector      text,
  created_at  timestamptz default now()
);
alter table public.resources enable row level security;
drop policy if exists "open" on public.resources;
create policy "open" on public.resources for all using (true) with check (true);
grant select, insert, update, delete on public.resources to anon;


-- 4. Announcements
create table if not exists public.announcements (
  id         uuid    default gen_random_uuid() primary key,
  title      text    not null,
  body       text    not null,
  sector     text,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;
drop policy if exists "open" on public.announcements;
create policy "open" on public.announcements for all using (true) with check (true);
grant select, insert, update, delete on public.announcements to anon;


-- ── Storage Policies ─────────────────────────────────────────────
-- Run AFTER creating buckets: "images" (public), "headshots" (public), "resources" (private)

-- images bucket (page content photos — public read, anon write)
drop policy if exists "images public read"   on storage.objects;
drop policy if exists "images anon insert"   on storage.objects;
drop policy if exists "images anon update"   on storage.objects;
drop policy if exists "images anon delete"   on storage.objects;
create policy "images public read"  on storage.objects for select using (bucket_id = 'images');
create policy "images anon insert"  on storage.objects for insert with check (bucket_id = 'images');
create policy "images anon update"  on storage.objects for update using (bucket_id = 'images');
create policy "images anon delete"  on storage.objects for delete using (bucket_id = 'images');

-- headshots bucket (member photos — public read, anon write)
drop policy if exists "headshots public read"  on storage.objects;
drop policy if exists "headshots anon insert"  on storage.objects;
drop policy if exists "headshots anon update"  on storage.objects;
drop policy if exists "headshots anon delete"  on storage.objects;
create policy "headshots public read"  on storage.objects for select using (bucket_id = 'headshots');
create policy "headshots anon insert"  on storage.objects for insert with check (bucket_id = 'headshots');
create policy "headshots anon update"  on storage.objects for update using (bucket_id = 'headshots');
create policy "headshots anon delete"  on storage.objects for delete using (bucket_id = 'headshots');

-- resources bucket (member files — anon read & write)
drop policy if exists "resources anon read"    on storage.objects;
drop policy if exists "resources anon insert"  on storage.objects;
drop policy if exists "resources anon delete"  on storage.objects;
create policy "resources anon read"    on storage.objects for select using (bucket_id = 'resources');
create policy "resources anon insert"  on storage.objects for insert with check (bucket_id = 'resources');
create policy "resources anon delete"  on storage.objects for delete using (bucket_id = 'resources');
