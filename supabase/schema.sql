-- ================================================
-- FIG App — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ================================================

-- 1. Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  name        text,
  role        text not null default 'member'
                check (role in ('admin', 'member')),
  sector      text,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can update all profiles"
  on profiles for update
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can insert profiles"
  on profiles for insert
  with check (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Page Content (admin-editable website text)
create table if not exists public.page_content (
  id          uuid default gen_random_uuid() primary key,
  page_slug   text unique not null,
  content     jsonb not null default '{}',
  updated_at  timestamptz default now(),
  updated_by  uuid references profiles(id)
);
alter table public.page_content enable row level security;

create policy "Anyone can view page content"
  on page_content for select
  using (true);

create policy "Admins can manage page content"
  on page_content for all
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));

-- Seed default page slugs
insert into public.page_content (page_slug, content) values
  ('home',                 '{}'),
  ('about',                '{}'),
  ('holdings',             '{}'),
  ('portfolio-reporting',  '{}'),
  ('resources',            '{}'),
  ('get-involved',         '{}')
on conflict (page_slug) do nothing;


-- 3. Members Directory (public member roster)
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

create policy "Anyone can view active members"
  on members_directory for select
  using (is_active = true);

create policy "Admins can manage members directory"
  on members_directory for all
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));


-- 4. Resources (files shared with members)
create table if not exists public.resources (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  description text,
  file_url    text,
  file_type   text,
  sector      text,           -- null = visible to all members
  uploaded_by uuid references profiles(id),
  created_at  timestamptz default now()
);
alter table public.resources enable row level security;

create policy "Members can view resources for their sector"
  on resources for select
  using (
    auth.uid() is not null and (
      sector is null
      or sector = (select sector from profiles where id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Admins can manage resources"
  on resources for all
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));


-- 5. Announcements (internal posts for members)
create table if not exists public.announcements (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  body        text not null,
  sector      text,           -- null = visible to all members
  created_by  uuid references profiles(id),
  created_at  timestamptz default now()
);
alter table public.announcements enable row level security;

create policy "Members can view relevant announcements"
  on announcements for select
  using (
    auth.uid() is not null and (
      sector is null
      or sector = (select sector from profiles where id = auth.uid())
      or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "Admins can manage announcements"
  on announcements for all
  using (exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ));


-- ================================================
-- Supabase Storage Buckets
-- Run these in the Supabase dashboard → Storage
-- OR uncomment and run here if your project supports it
-- ================================================
-- insert into storage.buckets (id, name, public) values ('resources', 'resources', false);
-- insert into storage.buckets (id, name, public) values ('headshots', 'headshots', true);
