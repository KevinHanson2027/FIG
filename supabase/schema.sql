-- ================================================
-- FIG App — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
--
-- Auth note: This app uses password-key auth (not
-- Supabase Auth). Security is enforced at the
-- Next.js middleware level. DB policies are open
-- so the anon key can read/write from client components.
-- ================================================


-- 1. Page Content (admin-editable website text)
create table if not exists public.page_content (
  id          uuid default gen_random_uuid() primary key,
  page_slug   text unique not null,
  content     jsonb not null default '{}',
  updated_at  timestamptz default now()
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


-- 2. Members Directory (public member roster)
create table if not exists public.members_directory (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  title        text,
  sector       text not null,
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


-- 3. Resources (files & links shared with members)
create table if not exists public.resources (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
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


-- 4. Announcements (internal posts for the member hub)
create table if not exists public.announcements (
  id         uuid default gen_random_uuid() primary key,
  title      text not null,
  body       text not null,
  sector     text,
  created_at timestamptz default now()
);

alter table public.announcements enable row level security;
drop policy if exists "open" on public.announcements;
create policy "open" on public.announcements for all using (true) with check (true);

grant select, insert, update, delete on public.announcements to anon;


-- ================================================
-- Supabase Storage Buckets
-- Create these manually in Dashboard → Storage:
--   "resources" → Private  (member file uploads)
--   "headshots" → Public   (member profile photos)
-- ================================================
