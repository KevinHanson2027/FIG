-- =====================================================================
-- FIG App — Supabase Database Schema v5 (Member Portal)
-- ---------------------------------------------------------------------
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste this
-- whole file → Run.
--
-- Safe to run more than once. Every statement is idempotent, and it
-- upgrades a database created by earlier versions of this file without
-- deleting data. The last query prints a security summary to review.
--
-- What this sets up
--   1. Sectors, members, roles and approval queues
--   2. Tasks, meetings & attendance
--   3. Holdings, portfolio snapshots, reports, page content
--   4. Resources, announcements, recruiting, donor relations
--   5. Row Level Security: the browser can only do what the signed-in
--      member's roles allow (anonymous visitors can only read the
--      public website)
--   6. Storage buckets and policies
--
-- Roles (a member can hold several):
--   admin              Co-Presidents: control panel, approvals, everything
--   portfolio_manager  Runs one sector: tasks, attendance, holdings
--   marketing          Website content + reports
--   ppg_member         Portfolio Performance Group analytics
--   ppg_manager        Runs PPG: assigns PPG work, edits portfolio reporting
--   recruiting         Recruiting pipeline and interviews
--   donor_relations    Donations in/out and the 5% giving target
-- Every active member also has the base "analyst" abilities.
--
-- Accounts: people sign up themselves (the website checks the roster or
-- records an application as status 'pending'), finish onboarding at
-- /portal/welcome, and co-presidents approve them with approve_member().
-- Members edit their own name, photo, bio and LinkedIn directly; only
-- sector changes, roles and new members need a co-president.
-- See SETUP.md for the full walkthrough.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Bookkeeping for one-time data steps
-- ---------------------------------------------------------------------
create table if not exists public.app_migrations (
  id     text primary key,
  ran_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 1. Sectors (teams). Edit in Portal → Admin → Settings.
-- ---------------------------------------------------------------------
create table if not exists public.sectors (
  name       text primary key,
  slug       text not null unique,
  kind       text not null default 'investment',
  benchmark  text,                         -- ETF used for sector news & comparisons
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sectors drop constraint if exists sectors_kind_check;
alter table public.sectors add constraint sectors_kind_check
  check (kind in ('investment', 'leadership', 'operations'));

insert into public.sectors (name, slug, kind, benchmark, sort_order) values
  ('Executive Board',         'executive-board',  'leadership', null,   0),
  ('Consumers',               'consumers',        'investment', 'XLY',  1),
  ('Energy & Utilities',      'energy-utilities', 'investment', 'XLE',  2),
  ('Financials',              'financials',       'investment', 'XLF',  3),
  ('Fixed Income',            'fixed-income',     'investment', 'AGG',  4),
  ('Healthcare',              'healthcare',       'investment', 'XLV',  5),
  ('Industrials & Materials', 'industrials',      'investment', 'XLI',  6),
  ('Real Estate',             'real-estate',      'investment', 'XLRE', 7),
  ('Technology',              'technology',       'investment', 'XLK',  8),
  ('Marketing',               'marketing',        'operations', null,   9)
on conflict (name) do nothing;


-- ---------------------------------------------------------------------
-- 2. Members (public profile + login link)
-- ---------------------------------------------------------------------
create table if not exists public.members_directory (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  title        text,
  sector       text not null,
  email        text,
  linkedin_url text,
  bio          text,
  headshot_url text,
  is_active    boolean default true,   -- legacy: kept in sync automatically, don't edit
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

alter table public.members_directory
  add column if not exists user_id    uuid,
  add column if not exists status     text,
  add column if not exists is_public  boolean,
  add column if not exists class_year integer,
  add column if not exists onboarded_at timestamptz,   -- finished the first-login setup
  add column if not exists updated_at timestamptz default now();

-- First run only: derive the new columns from the old is_active flag.
update public.members_directory
   set status = case when coalesce(is_active, true) then 'active' else 'alumni' end
 where status is null;
update public.members_directory
   set is_public = coalesce(is_active, true)
 where is_public is null;

alter table public.members_directory
  alter column status    set default 'active',
  alter column status    set not null,
  alter column is_public set default true,
  alter column is_public set not null;

alter table public.members_directory drop constraint if exists members_directory_status_check;
alter table public.members_directory add constraint members_directory_status_check
  check (status in ('pending', 'active', 'alumni'));

-- Any sector value already in use must exist in sectors before the FK.
insert into public.sectors (name, slug, kind, sort_order)
select distinct m.sector,
       trim(both '-' from regexp_replace(lower(m.sector), '[^a-z0-9]+', '-', 'g')),
       'investment', 100
  from public.members_directory m
 where m.sector is not null
   and not exists (select 1 from public.sectors s where s.name = m.sector)
on conflict do nothing;

alter table public.members_directory drop constraint if exists members_directory_sector_fkey;
alter table public.members_directory add constraint members_directory_sector_fkey
  foreign key (sector) references public.sectors(name) on update cascade;

alter table public.members_directory drop constraint if exists members_directory_user_id_fkey;
alter table public.members_directory add constraint members_directory_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

update public.members_directory set email = lower(trim(email))
 where email is not null and email <> lower(trim(email));

create unique index if not exists members_directory_user_id_key
  on public.members_directory (user_id) where user_id is not null;
create unique index if not exists members_directory_email_key
  on public.members_directory (lower(email)) where email is not null;
create index if not exists members_directory_sector_idx
  on public.members_directory (sector, sort_order);


-- ---------------------------------------------------------------------
-- 3. Roles
-- ---------------------------------------------------------------------
create table if not exists public.member_roles (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members_directory(id) on delete cascade,
  role       text not null,
  sector     text references public.sectors(name) on update cascade,  -- only for portfolio_manager
  granted_by uuid references public.members_directory(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.member_roles drop constraint if exists member_roles_role_check;
alter table public.member_roles add constraint member_roles_role_check
  check (role in ('admin', 'portfolio_manager', 'marketing', 'ppg_member',
                  'ppg_manager', 'recruiting', 'donor_relations'));
alter table public.member_roles drop constraint if exists member_roles_sector_check;
alter table public.member_roles add constraint member_roles_sector_check
  check ((role = 'portfolio_manager') = (sector is not null));
create unique index if not exists member_roles_unique
  on public.member_roles (member_id, role, coalesce(sector, ''));


-- ---------------------------------------------------------------------
-- 4. Permission helpers used by the security policies below.
--    SECURITY DEFINER so they can read roles regardless of the caller's
--    own row-level permissions.
-- ---------------------------------------------------------------------
create or replace function public.current_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.members_directory m
   where m.user_id = auth.uid() and m.status = 'active'
$$;

-- The signed-in person's roster entry while active OR still applying
-- (pending). Used only where applicants may act on their own application.
create or replace function public.my_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.members_directory m
   where m.user_id = auth.uid() and m.status in ('active', 'pending')
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members_directory m
                  where m.user_id = auth.uid() and m.status = 'active')
$$;

create or replace function public.my_sector() returns text
language sql stable security definer set search_path = '' as $$
  select m.sector from public.members_directory m
   where m.user_id = auth.uid() and m.status = 'active'
$$;

create or replace function public.has_role(p_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_roles r
      join public.members_directory m on m.id = r.member_id
     where m.user_id = auth.uid() and m.status = 'active' and r.role = p_role)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('admin')
$$;

create or replace function public.is_pm_of(p_sector text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.member_roles r
      join public.members_directory m on m.id = r.member_id
     where m.user_id = auth.uid() and m.status = 'active'
       and r.role = 'portfolio_manager' and r.sector = p_sector)
$$;

create or replace function public.has_ppg_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('ppg_member') or public.has_role('ppg_manager') or public.is_admin()
$$;

-- Admins, or the PM of the member's sector.
create or replace function public.manages_member(p_member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.members_directory m
     where m.id = p_member and public.is_pm_of(m.sector))
$$;

create or replace function public.can_edit_page(p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.has_role('marketing')
      or (public.has_role('ppg_manager') and p_slug in ('portfolio-reporting', 'holdings'))
$$;

create or replace function public.can_manage_reports() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.has_role('marketing') or public.has_role('ppg_manager')
$$;

create or replace function public.can_upload_images() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.has_role('marketing') or public.has_role('ppg_manager')
$$;

create or replace function public.can_upload_resources() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.has_role('portfolio_manager') or public.has_role('ppg_manager')
$$;

create or replace function public.can_recruit() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.has_role('recruiting')
$$;

create or replace function public.can_manage_donations() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or public.has_role('donor_relations')
$$;

-- Who can read a resource / announcement aimed at an audience.
create or replace function public.can_see_audience(p_audience text, p_sector text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_audience
    when 'all'    then public.is_member()
    when 'sector' then public.is_admin() or public.my_sector() = p_sector or public.is_pm_of(p_sector)
    when 'ppg'    then public.has_ppg_access()
    when 'pm'     then public.is_admin() or public.has_role('portfolio_manager')
    else false
  end
$$;

-- Who can post to an audience: admins anywhere, PMs to their sector,
-- the PPG manager to PPG.
create or replace function public.can_post_audience(p_audience text, p_sector text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin() or case p_audience
    when 'sector' then public.is_pm_of(p_sector)
    when 'ppg'    then public.has_role('ppg_manager')
    else false
  end
$$;

create or replace function public.is_task_manager(p_team text, p_sector text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (p_team = 'sector' and p_sector is not null and public.is_pm_of(p_sector))
      or (p_team = 'ppg' and public.has_role('ppg_manager'))
$$;

create or replace function public.can_edit_setting(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (p_key = 'portfolio'  and public.has_role('ppg_manager'))
      or (p_key = 'recruiting' and public.has_role('recruiting'))
      or (p_key = 'donations'  and public.has_role('donor_relations'))
$$;


-- ---------------------------------------------------------------------
-- 5. Member details visible only to the member, their PM and admins
-- ---------------------------------------------------------------------
create table if not exists public.member_internal (
  member_id           uuid primary key references public.members_directory(id) on delete cascade,
  abroad_term         text,                 -- e.g. 'Spring 2027'; null = not going abroad
  leadership_interest boolean not null default false,
  leadership_note     text,                 -- which roles and why
  notes               text,                 -- admin/PM notes, access-request message
  updated_at          timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 6. Approval queues
-- ---------------------------------------------------------------------
create table if not exists public.role_requests (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members_directory(id) on delete cascade,
  role        text not null,
  sector      text references public.sectors(name) on update cascade,
  note        text,
  status      text not null default 'pending',
  reviewed_by uuid references public.members_directory(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz not null default now()
);
alter table public.role_requests drop constraint if exists role_requests_role_check;
alter table public.role_requests add constraint role_requests_role_check
  check (role in ('portfolio_manager', 'marketing', 'ppg_member', 'ppg_manager',
                  'recruiting', 'donor_relations'));
alter table public.role_requests drop constraint if exists role_requests_status_check;
alter table public.role_requests add constraint role_requests_status_check
  check (status in ('pending', 'approved', 'denied', 'cancelled'));
alter table public.role_requests drop constraint if exists role_requests_sector_check;
alter table public.role_requests add constraint role_requests_sector_check
  check ((role = 'portfolio_manager') = (sector is not null));
create unique index if not exists role_requests_one_pending
  on public.role_requests (member_id, role, coalesce(sector, '')) where status = 'pending';

-- Sector changes wait here until an admin approves them (members edit the
-- rest of their profile directly).
create table if not exists public.profile_changes (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members_directory(id) on delete cascade,
  changes     jsonb not null,   -- sector (older rows may also hold name, bio, headshot_url, linkedin_url)
  status      text not null default 'pending',
  reviewed_by uuid references public.members_directory(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz not null default now()
);
alter table public.profile_changes drop constraint if exists profile_changes_status_check;
alter table public.profile_changes add constraint profile_changes_status_check
  check (status in ('pending', 'approved', 'denied', 'cancelled'));
create unique index if not exists profile_changes_one_pending
  on public.profile_changes (member_id) where status = 'pending';


-- ---------------------------------------------------------------------
-- 7. Settings (term, recruiting cycle, portfolio cash, giving target)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}',
  is_public  boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.members_directory(id) on delete set null
);

insert into public.settings (key, value, is_public) values
  ('term',       '{"name": "Fall 2026", "starts_on": "2026-08-31"}', false),
  ('recruiting', '{"cycle": "Spring 2027", "applications_open": false, "deadline": null, "intro": ""}', true),
  ('portfolio',  '{"cash": 0, "risk_free_rate": 0.04, "benchmark": "SPY"}', false),
  ('donations',  '{"rate": 0.05, "fy_start_month": 7, "asset_bases": {}}', false),
  ('signup',     '{"open": true, "domains": ["student.fairfield.edu", "fairfield.edu"]}', true)
on conflict (key) do nothing;

-- The cycle recruiting named, or else the current semester ("Fall 2026").
create or replace function public.recruiting_cycle() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(trim((select s.value->>'cycle' from public.settings s where s.key = 'recruiting')), ''),
    case when extract(month from now() at time zone 'America/New_York') >= 8 then 'Fall ' else 'Spring ' end
      || extract(year from now() at time zone 'America/New_York')::int::text)
$$;


-- ---------------------------------------------------------------------
-- 8. Tasks (PMs → sector members, PPG manager → PPG members)
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  kind           text not null default 'other',
  team           text not null default 'sector',
  sector         text references public.sectors(name) on update cascade,
  ticker         text,
  batch_id       uuid,                 -- tasks created together share a batch
  assigned_to    uuid not null references public.members_directory(id) on delete cascade,
  assigned_by    uuid references public.members_directory(id) on delete set null,
  due_date       date,
  status         text not null default 'todo',
  submission_url text,
  feedback       text,
  submitted_at   timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.tasks drop constraint if exists tasks_kind_check;
alter table public.tasks add constraint tasks_kind_check
  check (kind in ('earnings_report', 'one_pager', 'stock_pitch', 'research',
                  'presentation', 'ppg_report', 'other'));
alter table public.tasks drop constraint if exists tasks_team_check;
alter table public.tasks add constraint tasks_team_check
  check (team in ('sector', 'ppg', 'general'));
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('todo', 'in_progress', 'submitted', 'done'));
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to, status);
create index if not exists tasks_sector_idx on public.tasks (team, sector);


-- ---------------------------------------------------------------------
-- 9. Meetings & attendance
-- ---------------------------------------------------------------------
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  meeting_date date not null default current_date,
  kind         text not null default 'general',
  sector       text references public.sectors(name) on update cascade,
  checkin_code text,
  checkin_open boolean not null default false,
  created_by   uuid references public.members_directory(id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.meetings drop constraint if exists meetings_kind_check;
alter table public.meetings add constraint meetings_kind_check
  check (kind in ('general', 'sector', 'ppg', 'event'));
alter table public.meetings drop constraint if exists meetings_sector_check;
alter table public.meetings add constraint meetings_sector_check
  check ((kind = 'sector') = (sector is not null));
create index if not exists meetings_date_idx on public.meetings (meeting_date desc);

create table if not exists public.attendance (
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  member_id   uuid not null references public.members_directory(id) on delete cascade,
  status      text not null,
  note        text,
  recorded_by uuid references public.members_directory(id) on delete set null,
  recorded_at timestamptz not null default now(),
  primary key (meeting_id, member_id)
);
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (status in ('present', 'late', 'excused', 'absent'));
create index if not exists attendance_member_idx on public.attendance (member_id);


-- ---------------------------------------------------------------------
-- 10. Portfolio: holdings and daily snapshots
-- ---------------------------------------------------------------------
create table if not exists public.holdings (
  id           uuid primary key default gen_random_uuid(),
  ticker       text,                        -- null for positions without a market ticker
  name         text not null,
  sector       text references public.sectors(name) on update cascade,  -- null = portfolio-level
  asset_type   text not null default 'equity',
  shares       numeric(18, 6) not null default 0,
  cost_basis   numeric(18, 4),              -- average cost per share
  manual_value numeric(18, 2),              -- market value when there is no ticker
  purchased_on date,
  thesis_url   text,
  notes        text,
  is_active    boolean not null default true,   -- false once sold; kept for history
  sold_on      date,
  updated_by   uuid references public.members_directory(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.holdings drop constraint if exists holdings_asset_type_check;
alter table public.holdings add constraint holdings_asset_type_check
  check (asset_type in ('equity', 'etf', 'bond', 'fund', 'other'));
create unique index if not exists holdings_active_ticker
  on public.holdings (upper(ticker)) where is_active and ticker is not null;

-- Written once a day by /api/cron/daily.
create table if not exists public.portfolio_snapshots (
  snapshot_date   date primary key,
  total_value     numeric(18, 2) not null,
  invested_value  numeric(18, 2) not null,
  cash            numeric(18, 2) not null default 0,
  benchmark_close numeric(18, 4),
  by_sector       jsonb not null default '{}',
  created_at      timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 11. Website content: pages, reports, resources, announcements
-- ---------------------------------------------------------------------
create table if not exists public.page_content (
  id         uuid default gen_random_uuid() primary key,
  page_slug  text unique not null,
  content    jsonb not null default '{}',
  updated_at timestamptz default now()
);
insert into public.page_content (page_slug, content) values
  ('home', '{}'), ('about', '{}'), ('holdings', '{}'),
  ('portfolio-reporting', '{}'), ('resources', '{}'), ('get-involved', '{}')
on conflict (page_slug) do nothing;

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  kind         text not null default 'monthly',
  period_date  date,                -- month/quarter the report covers
  file_url     text not null,
  summary      text,
  is_published boolean not null default true,
  created_by   uuid references public.members_directory(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check
  check (kind in ('monthly', 'quarterly', 'annual', 'newsletter', 'other'));

create table if not exists public.resources (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  description text,
  file_url    text,
  file_type   text,
  sector      text,
  created_at  timestamptz default now()
);
alter table public.resources
  add column if not exists audience     text not null default 'all',
  add column if not exists storage_path text,
  add column if not exists uploaded_by  uuid references public.members_directory(id) on delete set null;
update public.resources set audience = 'sector' where sector is not null and audience = 'all';
alter table public.resources drop constraint if exists resources_audience_check;
alter table public.resources add constraint resources_audience_check
  check (audience in ('all', 'sector', 'ppg', 'pm'));
alter table public.resources drop constraint if exists resources_sector_fkey;
alter table public.resources add constraint resources_sector_fkey
  foreign key (sector) references public.sectors(name) on update cascade on delete set null;

create table if not exists public.announcements (
  id         uuid default gen_random_uuid() primary key,
  title      text not null,
  body       text not null,
  sector     text,
  created_at timestamptz default now()
);
alter table public.announcements
  add column if not exists audience   text not null default 'all',
  add column if not exists pinned     boolean not null default false,
  add column if not exists created_by uuid references public.members_directory(id) on delete set null;
update public.announcements set audience = 'sector' where sector is not null and audience = 'all';
alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check
  check (audience in ('all', 'sector', 'ppg', 'pm'));
alter table public.announcements drop constraint if exists announcements_sector_fkey;
alter table public.announcements add constraint announcements_sector_fkey
  foreign key (sector) references public.sectors(name) on update cascade on delete set null;


-- ---------------------------------------------------------------------
-- 12. Recruiting
-- ---------------------------------------------------------------------
create table if not exists public.candidates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null,
  class_year      integer,
  major           text,
  source          text not null default 'interest_form',
  referred_by     uuid references public.members_directory(id) on delete set null,
  referral_note   text,
  sector_interest text,
  stage           text not null default 'interested',
  application     jsonb,              -- answers from the application form
  resume_path     text,               -- object in the private 'applications' bucket
  resume_url      text,               -- or an external link
  linkedin_url    text,
  notes           text,               -- recruiting team notes
  member_id       uuid references public.members_directory(id) on delete set null,
  cycle           text not null default '',
  applied_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.candidates drop constraint if exists candidates_source_check;
alter table public.candidates add constraint candidates_source_check
  check (source in ('interest_form', 'referral', 'application', 'event', 'other'));
alter table public.candidates drop constraint if exists candidates_stage_check;
alter table public.candidates add constraint candidates_stage_check
  check (stage in ('interested', 'invited', 'applied', 'interviewing', 'offered',
                   'accepted', 'rejected', 'withdrawn'));
create unique index if not exists candidates_email_cycle on public.candidates (email, cycle);

create table if not exists public.interviews (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references public.candidates(id) on delete cascade,
  interviewer_id uuid not null references public.members_directory(id) on delete cascade,
  scheduled_at   timestamptz,
  location       text,
  status         text not null default 'scheduled',
  rating         integer,
  recommendation text,
  feedback       text,
  created_by     uuid references public.members_directory(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.interviews drop constraint if exists interviews_status_check;
alter table public.interviews add constraint interviews_status_check
  check (status in ('scheduled', 'completed', 'no_show', 'cancelled'));
alter table public.interviews drop constraint if exists interviews_rating_check;
alter table public.interviews add constraint interviews_rating_check
  check (rating between 1 and 5);
alter table public.interviews drop constraint if exists interviews_recommendation_check;
alter table public.interviews add constraint interviews_recommendation_check
  check (recommendation in ('strong_yes', 'yes', 'maybe', 'no'));
create index if not exists interviews_interviewer_idx on public.interviews (interviewer_id);


-- ---------------------------------------------------------------------
-- 13. Donor relations (work in progress)
-- ---------------------------------------------------------------------
create table if not exists public.donations (
  id              uuid primary key default gen_random_uuid(),
  direction       text not null,          -- 'in' = gift received, 'out' = donation made
  party           text not null,          -- donor name, or recipient organization
  amount          numeric(14, 2) not null,
  txn_date        date not null default current_date,
  method          text,
  designation     text,                   -- restriction / cause
  ein             text,                   -- recipient EIN (donations made)
  acknowledged_on date,                   -- receipt / thank-you sent (gifts received)
  notes           text,
  recorded_by     uuid references public.members_directory(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.donations drop constraint if exists donations_direction_check;
alter table public.donations add constraint donations_direction_check
  check (direction in ('in', 'out'));
alter table public.donations drop constraint if exists donations_amount_check;
alter table public.donations add constraint donations_amount_check check (amount > 0);


-- ---------------------------------------------------------------------
-- 14. Activity log (admins) and email rate limiting (server only)
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.members_directory(id) on delete set null,
  action     text not null,
  table_name text not null,
  record_id  text,
  label      text,
  data       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

create table if not exists public.email_link_log (
  email   text not null,
  purpose text not null,
  sent_at timestamptz not null default now()
);
create index if not exists email_link_log_email_idx on public.email_link_log (email, sent_at desc);


-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Generic: keep updated_at fresh.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['member_internal', 'holdings', 'reports', 'candidates',
                           'interviews', 'donations', 'settings', 'page_content']
  loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Generic: stamp who did it. Args: column name, 'always' | 'if_null'.
create or replace function public.stamp_actor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_argv[1] = 'always' or (to_jsonb(new) ->> tg_argv[0]) is null then
    new := jsonb_populate_record(new, jsonb_build_object(tg_argv[0], public.current_member_id()));
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
      ('resources',     'uploaded_by', 'if_null', 'insert'),
      ('announcements', 'created_by',  'if_null', 'insert'),
      ('tasks',         'assigned_by', 'if_null', 'insert'),
      ('meetings',      'created_by',  'if_null', 'insert'),
      ('attendance',    'recorded_by', 'always',  'insert or update'),
      ('holdings',      'updated_by',  'always',  'insert or update'),
      ('reports',       'created_by',  'if_null', 'insert'),
      ('member_roles',  'granted_by',  'if_null', 'insert'),
      ('interviews',    'created_by',  'if_null', 'insert'),
      ('donations',     'recorded_by', 'if_null', 'insert'),
      ('settings',      'updated_by',  'always',  'insert or update')
    ) as v(tbl, col, mode, events)
  loop
    execute format('drop trigger if exists stamp_actor on public.%I', r.tbl);
    execute format('create trigger stamp_actor before %s on public.%I
                    for each row execute function public.stamp_actor(%L, %L)',
                   r.events, r.tbl, r.col, r.mode);
  end loop;
end $$;

-- Members: normalize, protect columns, link logins, sync legacy flag.
create or replace function public.members_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  new.updated_at := now();

  -- Members editing their own row may change their name, photo, bio,
  -- LinkedIn, class year and onboarding marker, and those go live right
  -- away. A sector change goes through profile_changes for an admin to
  -- approve, except for applicants, whose row isn't public yet.
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_admin() then
    if old.status <> 'pending' then
      new.sector := old.sector;
    end if;
    new.title := old.title;           new.email := old.email;
    new.sort_order := old.sort_order;
    new.status := old.status;         new.is_public := old.is_public;
    new.user_id := old.user_id;       new.created_at := old.created_at;
  end if;

  -- Re-link a confirmed login when a member is (re)activated or applies.
  if new.user_id is null and new.status in ('active', 'pending') and new.email is not null then
    select u.id into new.user_id
      from auth.users u
     where lower(u.email) = new.email and u.email_confirmed_at is not null
       and not exists (select 1 from public.members_directory x
                        where x.user_id = u.id and x.id <> new.id)
     limit 1;
  end if;

  new.is_active := (new.status = 'active' and new.is_public);
  return new;
end $$;

drop trigger if exists members_before_write on public.members_directory;
create trigger members_before_write before insert or update on public.members_directory
  for each row execute function public.members_before_write();

-- Link a login to the roster entry with the same email once the email is
-- confirmed (invite accepted, or created with "auto confirm" in the dashboard).
create or replace function public.link_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and new.email is not null then
    update public.members_directory m
       set user_id = new.id
     where lower(m.email) = lower(new.email)
       and m.user_id is null
       and m.status in ('active', 'pending')
       and not exists (select 1 from public.members_directory x where x.user_id = new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_linked on auth.users;
create trigger on_auth_user_linked
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.link_auth_user();

-- Never allow the club to end up without an active admin. Deferred to
-- the end of the transaction so admins can be swapped in one step.
create or replace function public.ensure_an_admin_remains() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_removed boolean;
begin
  if tg_table_name = 'member_roles' then
    v_removed := old.role = 'admin';
  else
    v_removed := old.status = 'active' and new.status <> 'active'
                 and exists (select 1 from public.member_roles r
                              where r.member_id = old.id and r.role = 'admin');
  end if;
  if v_removed and not exists (
       select 1 from public.member_roles r
         join public.members_directory m on m.id = r.member_id
        where r.role = 'admin' and m.status = 'active') then
    raise exception 'FIG must always have at least one active admin. Make someone else an admin first.';
  end if;
  return null;
end $$;

drop trigger if exists ensure_an_admin_remains on public.member_roles;
create constraint trigger ensure_an_admin_remains
  after delete or update on public.member_roles
  deferrable initially deferred
  for each row execute function public.ensure_an_admin_remains();

drop trigger if exists ensure_an_admin_remains on public.members_directory;
create constraint trigger ensure_an_admin_remains
  after update of status on public.members_directory
  deferrable initially deferred
  for each row execute function public.ensure_an_admin_remains();

-- Tasks: assignees can only move their task along and attach work.
create or replace function public.tasks_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and auth.uid() is not null
     and not public.is_task_manager(old.team, old.sector) then
    if old.status = 'done' then
      raise exception 'This task is already complete';
    end if;
    if new.status = 'done' then
      raise exception 'Only the person who assigned this task can mark it done';
    end if;
    new.title := old.title;             new.description := old.description;
    new.kind := old.kind;               new.team := old.team;
    new.sector := old.sector;           new.ticker := old.ticker;
    new.assigned_to := old.assigned_to; new.assigned_by := old.assigned_by;
    new.due_date := old.due_date;       new.feedback := old.feedback;
    new.batch_id := old.batch_id;       new.created_at := old.created_at;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    new.submitted_at := now();
  end if;
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status <> 'done' then new.completed_at := now(); end if;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists tasks_before_write on public.tasks;
create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- Interviews: interviewers can only fill in the scorecard.
create or replace function public.interviews_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.can_recruit() then
    new.candidate_id := old.candidate_id;   new.interviewer_id := old.interviewer_id;
    new.scheduled_at := old.scheduled_at;   new.location := old.location;
    new.created_by := old.created_by;       new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists interviews_before_update on public.interviews;
create trigger interviews_before_update before update on public.interviews
  for each row execute function public.interviews_before_update();

-- Normalize candidate emails so duplicates are caught.
create or replace function public.candidates_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;

drop trigger if exists candidates_before_write on public.candidates;
create trigger candidates_before_write before insert or update on public.candidates
  for each row execute function public.candidates_before_write();

-- Activity log for the tables admins care about.
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old     jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new     jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_changes jsonb;
  v_label   text;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_object('from', v_old -> k, 'to', v_new -> k))
      into v_changes
      from jsonb_object_keys(v_new) as k
     where k not in ('updated_at', 'updated_by', 'is_active')
       and (v_old -> k) is distinct from (v_new -> k);
    if v_changes is null then return null; end if;
  end if;

  v_label := case
    when tg_table_name = 'members_directory' then v_row ->> 'name'
    when tg_table_name in ('member_roles', 'role_requests', 'profile_changes') then
      (select m.name from public.members_directory m where m.id = (v_row ->> 'member_id')::uuid)
    when tg_table_name = 'holdings' then coalesce(v_row ->> 'ticker', v_row ->> 'name')
    when tg_table_name = 'page_content' then v_row ->> 'page_slug'
    when tg_table_name = 'settings' then v_row ->> 'key'
    when tg_table_name = 'donations' then v_row ->> 'party'
    when tg_table_name in ('reports', 'candidates') then coalesce(v_row ->> 'title', v_row ->> 'name')
  end;

  insert into public.activity_log (actor_id, action, table_name, record_id, label, data)
  values (public.current_member_id(), lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'page_slug'), v_label,
          case tg_op when 'UPDATE' then v_changes when 'INSERT' then v_new else v_old end);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['members_directory', 'member_roles', 'role_requests', 'profile_changes',
                           'holdings', 'page_content', 'reports', 'settings', 'donations', 'candidates']
  loop
    execute format('drop trigger if exists log_activity on public.%I', t);
    execute format('create trigger log_activity after insert or update or delete on public.%I
                    for each row execute function public.log_activity()', t);
  end loop;
end $$;


-- =====================================================================
-- ROW LEVEL SECURITY
-- Anonymous visitors: read the public website only.
-- Signed-in members: what their roles allow.
-- =====================================================================

-- One statement per table (not a loop) so Supabase's SQL editor can see
-- RLS is on and doesn't warn about tables created without it.
alter table public.app_migrations enable row level security;
alter table public.sectors enable row level security;
alter table public.members_directory enable row level security;
alter table public.member_roles enable row level security;
alter table public.member_internal enable row level security;
alter table public.role_requests enable row level security;
alter table public.profile_changes enable row level security;
alter table public.settings enable row level security;
alter table public.tasks enable row level security;
alter table public.meetings enable row level security;
alter table public.attendance enable row level security;
alter table public.holdings enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.page_content enable row level security;
alter table public.reports enable row level security;
alter table public.resources enable row level security;
alter table public.announcements enable row level security;
alter table public.candidates enable row level security;
alter table public.interviews enable row level security;
alter table public.donations enable row level security;
alter table public.activity_log enable row level security;
alter table public.email_link_log enable row level security;

-- Remove the old wide-open policies from schema v3.
drop policy if exists "open" on public.page_content;
drop policy if exists "open" on public.members_directory;
drop policy if exists "open" on public.resources;
drop policy if exists "open" on public.announcements;

-- sectors ------------------------------------------------------------
drop policy if exists sectors_read on public.sectors;
create policy sectors_read on public.sectors for select to anon, authenticated using (true);
drop policy if exists sectors_admin on public.sectors;
create policy sectors_admin on public.sectors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- members_directory --------------------------------------------------
drop policy if exists members_public_read on public.members_directory;
create policy members_public_read on public.members_directory for select to anon, authenticated
  using (status = 'active' and is_public);
drop policy if exists members_internal_read on public.members_directory;
create policy members_internal_read on public.members_directory for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or (status = 'active' and public.is_member()));
drop policy if exists members_self_update on public.members_directory;
create policy members_self_update on public.members_directory for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists members_admin on public.members_directory;
create policy members_admin on public.members_directory for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- member_roles -------------------------------------------------------
drop policy if exists member_roles_read on public.member_roles;
create policy member_roles_read on public.member_roles for select to authenticated
  using (public.is_member()
         or member_id in (select m.id from public.members_directory m where m.user_id = auth.uid()));
drop policy if exists member_roles_admin on public.member_roles;
create policy member_roles_admin on public.member_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- member_internal ----------------------------------------------------
drop policy if exists member_internal_read on public.member_internal;
create policy member_internal_read on public.member_internal for select to authenticated
  using (member_id = public.my_member_id() or public.manages_member(member_id));
drop policy if exists member_internal_insert on public.member_internal;
create policy member_internal_insert on public.member_internal for insert to authenticated
  with check (member_id = public.my_member_id() or public.is_admin());
drop policy if exists member_internal_update on public.member_internal;
create policy member_internal_update on public.member_internal for update to authenticated
  using (member_id = public.my_member_id() or public.is_admin())
  with check (member_id = public.my_member_id() or public.is_admin());
drop policy if exists member_internal_delete on public.member_internal;
create policy member_internal_delete on public.member_internal for delete to authenticated
  using (public.is_admin());

-- role_requests & profile_changes -----------------------------------
drop policy if exists role_requests_read on public.role_requests;
create policy role_requests_read on public.role_requests for select to authenticated
  using (member_id = public.my_member_id() or public.is_admin());
drop policy if exists role_requests_insert on public.role_requests;
create policy role_requests_insert on public.role_requests for insert to authenticated
  with check (member_id = public.my_member_id() and status = 'pending');
drop policy if exists role_requests_cancel on public.role_requests;
create policy role_requests_cancel on public.role_requests for update to authenticated
  using (member_id = public.my_member_id() and status = 'pending')
  with check (member_id = public.my_member_id() and status in ('pending', 'cancelled'));
drop policy if exists role_requests_admin on public.role_requests;
create policy role_requests_admin on public.role_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists profile_changes_read on public.profile_changes;
create policy profile_changes_read on public.profile_changes for select to authenticated
  using (member_id = public.current_member_id() or public.is_admin());
drop policy if exists profile_changes_insert on public.profile_changes;
create policy profile_changes_insert on public.profile_changes for insert to authenticated
  with check (member_id = public.current_member_id() and status = 'pending');
drop policy if exists profile_changes_edit on public.profile_changes;
create policy profile_changes_edit on public.profile_changes for update to authenticated
  using (member_id = public.current_member_id() and status = 'pending')
  with check (member_id = public.current_member_id() and status in ('pending', 'cancelled'));
drop policy if exists profile_changes_admin on public.profile_changes;
create policy profile_changes_admin on public.profile_changes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- settings -----------------------------------------------------------
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to anon, authenticated
  using (is_public);
drop policy if exists settings_member_read on public.settings;
create policy settings_member_read on public.settings for select to authenticated
  using (public.is_member());
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.can_edit_setting(key)) with check (public.can_edit_setting(key));

-- tasks --------------------------------------------------------------
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
  using (assigned_to = public.current_member_id()
         or assigned_by = public.current_member_id()
         or public.is_task_manager(team, sector));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_task_manager(team, sector));
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using (assigned_to = public.current_member_id() or public.is_task_manager(team, sector))
  with check (assigned_to = public.current_member_id() or public.is_task_manager(team, sector));
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.is_task_manager(team, sector));

-- meetings -----------------------------------------------------------
drop policy if exists meetings_read on public.meetings;
create policy meetings_read on public.meetings for select to authenticated
  using (public.is_member());
drop policy if exists meetings_write on public.meetings;
create policy meetings_write on public.meetings for all to authenticated
  using (public.is_admin()
         or (kind = 'sector' and public.is_pm_of(sector))
         or (kind = 'ppg' and public.has_role('ppg_manager')))
  with check (public.is_admin()
         or (kind = 'sector' and public.is_pm_of(sector))
         or (kind = 'ppg' and public.has_role('ppg_manager')));

-- attendance ---------------------------------------------------------
drop policy if exists attendance_read on public.attendance;
create policy attendance_read on public.attendance for select to authenticated
  using (member_id = public.current_member_id()
         or public.manages_member(member_id)
         or (public.has_role('ppg_manager')
             and meeting_id in (select g.id from public.meetings g where g.kind = 'ppg')));
drop policy if exists attendance_write on public.attendance;
create policy attendance_write on public.attendance for all to authenticated
  using (public.manages_member(member_id)
         or (public.has_role('ppg_manager')
             and meeting_id in (select g.id from public.meetings g where g.kind = 'ppg')))
  with check (public.manages_member(member_id)
         or (public.has_role('ppg_manager')
             and meeting_id in (select g.id from public.meetings g where g.kind = 'ppg')));

-- holdings & snapshots -----------------------------------------------
drop policy if exists holdings_read on public.holdings;
create policy holdings_read on public.holdings for select to authenticated
  using (public.is_member());
drop policy if exists holdings_write on public.holdings;
create policy holdings_write on public.holdings for all to authenticated
  using (public.is_admin() or public.has_role('ppg_manager')
         or (sector is not null and public.is_pm_of(sector)))
  with check (public.is_admin() or public.has_role('ppg_manager')
         or (sector is not null and public.is_pm_of(sector)));

drop policy if exists snapshots_read on public.portfolio_snapshots;
create policy snapshots_read on public.portfolio_snapshots for select to authenticated
  using (public.is_member());
drop policy if exists snapshots_write on public.portfolio_snapshots;
create policy snapshots_write on public.portfolio_snapshots for all to authenticated
  using (public.is_admin() or public.has_role('ppg_manager'))
  with check (public.is_admin() or public.has_role('ppg_manager'));

-- page_content -------------------------------------------------------
drop policy if exists page_content_read on public.page_content;
create policy page_content_read on public.page_content for select to anon, authenticated
  using (true);
drop policy if exists page_content_write on public.page_content;
create policy page_content_write on public.page_content for all to authenticated
  using (public.can_edit_page(page_slug)) with check (public.can_edit_page(page_slug));

-- reports ------------------------------------------------------------
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select to anon, authenticated
  using (is_published);
drop policy if exists reports_editor_read on public.reports;
create policy reports_editor_read on public.reports for select to authenticated
  using (public.can_manage_reports());
drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports for all to authenticated
  using (public.can_manage_reports()) with check (public.can_manage_reports());

-- resources & announcements ------------------------------------------
drop policy if exists resources_read on public.resources;
create policy resources_read on public.resources for select to authenticated
  using (public.can_see_audience(audience, sector) or uploaded_by = public.current_member_id());
drop policy if exists resources_insert on public.resources;
create policy resources_insert on public.resources for insert to authenticated
  with check (public.can_post_audience(audience, sector));
drop policy if exists resources_update on public.resources;
create policy resources_update on public.resources for update to authenticated
  using (public.is_admin() or uploaded_by = public.current_member_id())
  with check (public.can_post_audience(audience, sector));
drop policy if exists resources_delete on public.resources;
create policy resources_delete on public.resources for delete to authenticated
  using (public.is_admin() or uploaded_by = public.current_member_id());

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select to authenticated
  using (public.can_see_audience(audience, sector) or created_by = public.current_member_id());
drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements for insert to authenticated
  with check (public.can_post_audience(audience, sector));
drop policy if exists announcements_update on public.announcements;
create policy announcements_update on public.announcements for update to authenticated
  using (public.is_admin() or created_by = public.current_member_id())
  with check (public.can_post_audience(audience, sector));
drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements for delete to authenticated
  using (public.is_admin() or created_by = public.current_member_id());

-- recruiting ---------------------------------------------------------
drop policy if exists candidates_read on public.candidates;
create policy candidates_read on public.candidates for select to authenticated
  using (public.can_recruit()
         or id in (select i.candidate_id from public.interviews i
                    where i.interviewer_id = public.current_member_id()));
drop policy if exists candidates_write on public.candidates;
create policy candidates_write on public.candidates for all to authenticated
  using (public.can_recruit()) with check (public.can_recruit());

drop policy if exists interviews_read on public.interviews;
create policy interviews_read on public.interviews for select to authenticated
  using (public.can_recruit() or interviewer_id = public.current_member_id());
drop policy if exists interviews_write on public.interviews;
create policy interviews_write on public.interviews for all to authenticated
  using (public.can_recruit()) with check (public.can_recruit());
drop policy if exists interviews_scorecard on public.interviews;
create policy interviews_scorecard on public.interviews for update to authenticated
  using (interviewer_id = public.current_member_id())
  with check (interviewer_id = public.current_member_id());

-- donations ----------------------------------------------------------
drop policy if exists donations_all on public.donations;
create policy donations_all on public.donations for all to authenticated
  using (public.can_manage_donations()) with check (public.can_manage_donations());

-- activity log -------------------------------------------------------
drop policy if exists activity_log_read on public.activity_log;
create policy activity_log_read on public.activity_log for select to authenticated
  using (public.is_admin());

-- app_migrations & email_link_log: no policies = server-only access.


-- =====================================================================
-- FUNCTIONS CALLED FROM THE APP (RPC)
-- =====================================================================

-- Admin: approve or deny a role request.
create or replace function public.review_role_request(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.role_requests;
begin
  if not public.is_admin() then raise exception 'Only admins can review requests'; end if;
  select * into r from public.role_requests where id = p_id for update;
  if not found or r.status <> 'pending' then raise exception 'This request is no longer pending'; end if;

  update public.role_requests
     set status = case when p_approve then 'approved' else 'denied' end,
         reviewed_by = public.current_member_id(), reviewed_at = now(), review_note = p_note
   where id = p_id;

  if p_approve then
    insert into public.member_roles (member_id, role, sector, granted_by)
    values (r.member_id, r.role, r.sector, public.current_member_id())
    on conflict do nothing;
  end if;
end $$;

-- Admin: approve (apply) or deny a public profile edit.
create or replace function public.review_profile_change(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.profile_changes;
begin
  if not public.is_admin() then raise exception 'Only admins can review requests'; end if;
  select * into c from public.profile_changes where id = p_id for update;
  if not found or c.status <> 'pending' then raise exception 'This request is no longer pending'; end if;

  update public.profile_changes
     set status = case when p_approve then 'approved' else 'denied' end,
         reviewed_by = public.current_member_id(), reviewed_at = now(), review_note = p_note
   where id = p_id;

  if p_approve then
    update public.members_directory m set
      name         = case when c.changes ? 'name'         then coalesce(nullif(trim(c.changes ->> 'name'), ''), m.name) else m.name end,
      bio          = case when c.changes ? 'bio'          then nullif(trim(c.changes ->> 'bio'), '') else m.bio end,
      headshot_url = case when c.changes ? 'headshot_url' then nullif(c.changes ->> 'headshot_url', '') else m.headshot_url end,
      linkedin_url = case when c.changes ? 'linkedin_url' then nullif(trim(c.changes ->> 'linkedin_url'), '') else m.linkedin_url end,
      sector       = case when c.changes ? 'sector'       then coalesce(nullif(c.changes ->> 'sector', ''), m.sector) else m.sector end
     where m.id = c.member_id;
  end if;
end $$;

-- Admin: grant/revoke roles, retitle and move members in one transaction
-- (used by Members & Roles and the Year-End Transition).
-- p_changes: [{"op":"grant"|"revoke"|"title"|"sector", "member_id":..., "role":..., "sector":..., "title":...}]
create or replace function public.apply_role_changes(p_changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare c jsonb;
begin
  if not public.is_admin() then raise exception 'Only admins can change roles'; end if;
  for c in select value from jsonb_array_elements(p_changes) loop
    if c ->> 'op' = 'grant' then
      insert into public.member_roles (member_id, role, sector, granted_by)
      values ((c ->> 'member_id')::uuid, c ->> 'role', nullif(c ->> 'sector', ''), public.current_member_id())
      on conflict do nothing;
    elsif c ->> 'op' = 'revoke' then
      delete from public.member_roles
       where member_id = (c ->> 'member_id')::uuid and role = c ->> 'role'
         and coalesce(sector, '') = coalesce(c ->> 'sector', '');
    elsif c ->> 'op' = 'title' then
      update public.members_directory set title = nullif(trim(c ->> 'title'), '')
       where id = (c ->> 'member_id')::uuid;
    elsif c ->> 'op' = 'sector' then
      update public.members_directory set sector = c ->> 'sector'
       where id = (c ->> 'member_id')::uuid;
    end if;
  end loop;
end $$;

-- Admin: approve an applicant from self sign-up, optionally granting every
-- role they requested during onboarding, in one step.
create or replace function public.approve_member(p_member uuid, p_with_roles boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.members_directory; r public.role_requests; v_pm text;
begin
  if not public.is_admin() then raise exception 'Only admins can approve members'; end if;
  select * into m from public.members_directory where id = p_member for update;
  if not found or m.status <> 'pending' then raise exception 'This application was already handled'; end if;

  update public.members_directory
     set status = 'active', is_public = true, title = coalesce(m.title, m.sector || ' Analyst')
   where id = p_member;

  if p_with_roles then
    for r in select * from public.role_requests where member_id = p_member and status = 'pending' loop
      perform public.review_role_request(r.id, true, null);
    end loop;
    select x.sector into v_pm from public.member_roles x
     where x.member_id = p_member and x.role = 'portfolio_manager' limit 1;
    if v_pm is not null then
      update public.members_directory set title = v_pm || ' Portfolio Manager' where id = p_member;
    end if;
  end if;
end $$;

-- Admin: move graduating members to alumni (hidden from the site, no roles).
create or replace function public.graduate_members(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Only admins can graduate members'; end if;
  delete from public.member_roles where member_id = any(p_ids);
  update public.members_directory set status = 'alumni', is_public = false
   where id = any(p_ids) and status = 'active';
  get diagnostics n = row_count;
  return n;
end $$;

-- Member: self check-in with the code shown at a meeting.
create or replace function public.check_in(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_member public.members_directory; v_meeting public.meetings;
begin
  select * into v_member from public.members_directory where user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Only active members can check in'; end if;

  select * into v_meeting from public.meetings
   where checkin_open and upper(checkin_code) = upper(trim(p_code))
     and meeting_date between current_date - 1 and current_date + 1
   order by meeting_date desc limit 1;
  if not found then raise exception 'That code doesn''t match an open meeting'; end if;

  if v_meeting.kind = 'sector' and v_meeting.sector is distinct from v_member.sector then
    raise exception 'This meeting is for the % sector', v_meeting.sector;
  end if;
  if v_meeting.kind = 'ppg' and not public.has_ppg_access() then
    raise exception 'This meeting is for the Portfolio Performance Group';
  end if;

  insert into public.attendance (meeting_id, member_id, status, recorded_by)
  values (v_meeting.id, v_member.id, 'present', v_member.id)
  on conflict (meeting_id, member_id) do update
     set status = 'present', recorded_at = now()
   where public.attendance.status = 'absent';
  return v_meeting.title;
end $$;

-- Public website: ticker list for the Holdings page (no position sizes).
create or replace function public.public_holdings()
returns table (ticker text, name text, sector text, asset_type text)
language sql stable security definer set search_path = '' as $$
  select h.ticker, h.name, h.sector, h.asset_type
    from public.holdings h
    left join public.sectors s on s.name = h.sector
   where h.is_active
   order by s.sort_order nulls last, h.ticker nulls last
$$;

-- Shared validation for the public forms.
create or replace function public.check_contact(p_name text, p_email text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(trim(p_name), '') = '' or length(p_name) > 120 then
    raise exception 'Please enter your name';
  end if;
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200 then
    raise exception 'Please enter a valid email address';
  end if;
end $$;

-- Public website: join the interest list (Get Involved page).
create or replace function public.submit_interest(
  p_name text, p_email text, p_class_year integer default null, p_major text default null,
  p_sector text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.check_contact(p_name, p_email);
  insert into public.candidates (name, email, class_year, major, sector_interest, referral_note, source, stage, cycle)
  values (trim(p_name), lower(trim(p_email)), p_class_year, nullif(trim(p_major), ''),
          nullif(p_sector, ''), left(nullif(trim(p_note), ''), 2000), 'interest_form', 'interested',
          public.recruiting_cycle())
  on conflict (email, cycle) do update
     set name            = excluded.name,
         class_year      = coalesce(excluded.class_year, public.candidates.class_year),
         major           = coalesce(excluded.major, public.candidates.major),
         sector_interest = coalesce(excluded.sector_interest, public.candidates.sector_interest),
         updated_at      = now();
end $$;

-- Public website: submit an application (when applications are open).
create or replace function public.submit_application(
  p_name text, p_email text, p_class_year integer, p_major text, p_sector text,
  p_linkedin text default null, p_resume_path text default null, p_resume_url text default null,
  p_answers jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare v_settings jsonb;
begin
  perform public.check_contact(p_name, p_email);
  select value into v_settings from public.settings where key = 'recruiting';
  if not coalesce((v_settings ->> 'applications_open')::boolean, false) then
    raise exception 'Applications are closed right now';
  end if;
  if p_resume_path is not null and p_resume_path !~ '^resumes/[A-Za-z0-9._/-]+$' then
    raise exception 'Invalid resume upload';
  end if;
  if length(p_answers::text) > 20000 then raise exception 'Your answers are too long'; end if;

  insert into public.candidates (name, email, class_year, major, sector_interest, linkedin_url,
                                 resume_path, resume_url, application, source, stage, cycle, applied_at)
  values (trim(p_name), lower(trim(p_email)), p_class_year, nullif(trim(p_major), ''), nullif(p_sector, ''),
          nullif(trim(p_linkedin), ''), p_resume_path, nullif(trim(p_resume_url), ''), p_answers,
          'application', 'applied', public.recruiting_cycle(), now())
  on conflict (email, cycle) do update
     set name            = excluded.name,
         class_year      = excluded.class_year,
         major           = excluded.major,
         sector_interest = excluded.sector_interest,
         linkedin_url    = coalesce(excluded.linkedin_url, public.candidates.linkedin_url),
         resume_path     = coalesce(excluded.resume_path, public.candidates.resume_path),
         resume_url      = coalesce(excluded.resume_url, public.candidates.resume_url),
         application     = excluded.application,
         applied_at      = now(),
         stage           = case when public.candidates.stage in ('interested', 'invited')
                                then 'applied' else public.candidates.stage end,
         updated_at      = now();
end $$;

-- Member: refer someone to recruiting.
create or replace function public.submit_referral(
  p_name text, p_email text, p_class_year integer default null,
  p_sector text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then raise exception 'Only members can submit referrals'; end if;
  perform public.check_contact(p_name, p_email);
  insert into public.candidates (name, email, class_year, sector_interest, referral_note, referred_by, source, stage, cycle)
  values (trim(p_name), lower(trim(p_email)), p_class_year, nullif(p_sector, ''),
          left(nullif(trim(p_note), ''), 2000), public.current_member_id(), 'referral', 'interested',
          public.recruiting_cycle())
  on conflict (email, cycle) do update
     set referred_by   = coalesce(public.candidates.referred_by, excluded.referred_by),
         referral_note = coalesce(public.candidates.referral_note, excluded.referral_note),
         updated_at    = now();
end $$;

-- Login page: someone not on the roster asks for access (admins approve).
create or replace function public.request_access(
  p_name text, p_email text, p_sector text, p_class_year integer default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_existing public.members_directory; v_id uuid;
begin
  perform public.check_contact(p_name, p_email);
  select * into v_existing from public.members_directory where email = lower(trim(p_email));
  if found then
    if v_existing.status = 'active' then
      raise exception 'You''re already on the roster. Use "Activate your account" instead.';
    elsif v_existing.status = 'pending' then
      raise exception 'Your request is already waiting for approval.';
    else
      raise exception 'Your membership is archived. Please contact a co-president.';
    end if;
  end if;
  if not exists (select 1 from public.sectors where name = p_sector and is_active) then
    raise exception 'Please choose your sector';
  end if;

  insert into public.members_directory (name, email, sector, class_year, status, is_public, sort_order)
  values (trim(p_name), lower(trim(p_email)), p_sector, p_class_year, 'pending', false, 50)
  returning id into v_id;
  if nullif(trim(p_note), '') is not null then
    insert into public.member_internal (member_id, notes) values (v_id, left(trim(p_note), 2000));
  end if;
end $$;


-- =====================================================================
-- STORAGE
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('headshots',    'headshots',    true,  5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('images',       'images',       true,  10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('reports',      'reports',      true,  26214400, array['application/pdf']),
  ('resources',    'resources',    false, 26214400, null),
  ('applications', 'applications', false, 5242880,  array['application/pdf'])
on conflict (id) do update
   set public             = excluded.public,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- Remove the old wide-open storage policies from schema v3.
drop policy if exists "images public read"    on storage.objects;
drop policy if exists "images anon insert"    on storage.objects;
drop policy if exists "images anon update"    on storage.objects;
drop policy if exists "images anon delete"    on storage.objects;
drop policy if exists "headshots public read" on storage.objects;
drop policy if exists "headshots anon insert" on storage.objects;
drop policy if exists "headshots anon update" on storage.objects;
drop policy if exists "headshots anon delete" on storage.objects;
drop policy if exists "resources anon read"   on storage.objects;
drop policy if exists "resources anon insert" on storage.objects;
drop policy if exists "resources anon delete" on storage.objects;

drop policy if exists "fig public read" on storage.objects;
create policy "fig public read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('headshots', 'images', 'reports'));

-- Members upload their own headshot under members/<their member id>/…
drop policy if exists "fig headshots upload" on storage.objects;
create policy "fig headshots upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'headshots' and (
    public.is_admin()
    or ((storage.foldername(name))[1] = 'members'
        and (storage.foldername(name))[2] = public.my_member_id()::text)));
drop policy if exists "fig headshots manage" on storage.objects;
create policy "fig headshots manage" on storage.objects for delete to authenticated
  using (bucket_id = 'headshots' and public.is_admin());

drop policy if exists "fig images upload" on storage.objects;
create policy "fig images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.can_upload_images());
drop policy if exists "fig images manage" on storage.objects;
create policy "fig images manage" on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.can_upload_images());

drop policy if exists "fig reports upload" on storage.objects;
create policy "fig reports upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and public.can_manage_reports());
drop policy if exists "fig reports manage" on storage.objects;
create policy "fig reports manage" on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and public.can_manage_reports());

-- Private files: anyone who can see the resource row (per its audience)
-- can open the file through a short-lived signed link.
drop policy if exists "fig resources upload" on storage.objects;
create policy "fig resources upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'resources' and public.can_upload_resources());
drop policy if exists "fig resources read" on storage.objects;
create policy "fig resources read" on storage.objects for select to authenticated
  using (bucket_id = 'resources'
         and exists (select 1 from public.resources r where r.storage_path = objects.name));
drop policy if exists "fig resources delete" on storage.objects;
create policy "fig resources delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resources'
         and exists (select 1 from public.resources r where r.storage_path = objects.name
                       and (r.uploaded_by = public.current_member_id() or public.is_admin())));

-- Applicants upload a résumé PDF (bucket enforces PDF + 5 MB). Recruiting
-- and the candidate's interviewers can open it (same rule as the candidate row).
drop policy if exists "fig applications upload" on storage.objects;
create policy "fig applications upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'applications' and (storage.foldername(name))[1] = 'resumes');
drop policy if exists "fig applications read" on storage.objects;
create policy "fig applications read" on storage.objects for select to authenticated
  using (bucket_id = 'applications'
         and exists (select 1 from public.candidates c where c.resume_path = objects.name));


-- =====================================================================
-- GRANTS
-- Anonymous visitors never write directly; public forms go through the
-- functions above. Row Level Security decides which rows are visible.
-- =====================================================================
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke truncate on all tables in schema public from authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke execute on function public.review_role_request(uuid, boolean, text)   from anon, public;
revoke execute on function public.review_profile_change(uuid, boolean, text) from anon, public;
revoke execute on function public.apply_role_changes(jsonb)                   from anon, public;
revoke execute on function public.graduate_members(uuid[])                   from anon, public;
revoke execute on function public.approve_member(uuid, boolean)              from anon, public;
revoke execute on function public.check_in(text)                             from anon, public;
revoke execute on function public.submit_referral(text, text, integer, text, text) from anon, public;
grant execute on function public.review_role_request(uuid, boolean, text)   to authenticated;
grant execute on function public.review_profile_change(uuid, boolean, text) to authenticated;
grant execute on function public.apply_role_changes(jsonb)                   to authenticated;
grant execute on function public.graduate_members(uuid[])                   to authenticated;
grant execute on function public.approve_member(uuid, boolean)              to authenticated;
grant execute on function public.check_in(text)                             to authenticated;
grant execute on function public.submit_referral(text, text, integer, text, text) to authenticated;
grant execute on function public.public_holdings() to anon, authenticated;
grant execute on function public.submit_interest(text, text, integer, text, text, text) to anon, authenticated;
grant execute on function public.submit_application(text, text, integer, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.request_access(text, text, text, integer, text) to anon, authenticated;


-- =====================================================================
-- ONE-TIME DATA SETUP
-- =====================================================================

-- Starting roles, from current titles: Co-Presidents → admin,
-- Portfolio Managers → their sector, Marketing team → marketing.
do $$
begin
  if exists (select 1 from public.app_migrations where id = 'seed_roles_v1') then return; end if;

  insert into public.member_roles (member_id, role)
  select id, 'admin' from public.members_directory
   where status = 'active' and title ilike '%president%'
  on conflict do nothing;

  insert into public.member_roles (member_id, role, sector)
  select id, 'portfolio_manager', sector from public.members_directory
   where status = 'active' and title ilike '%portfolio manager%'
  on conflict do nothing;

  insert into public.member_roles (member_id, role)
  select id, 'marketing' from public.members_directory
   where status = 'active' and sector = 'Marketing'
  on conflict do nothing;

  -- Only mark done once an admin exists (fresh installs seed members later).
  if exists (select 1 from public.member_roles where role = 'admin') then
    insert into public.app_migrations (id) values ('seed_roles_v1');
  end if;
end $$;

-- Starting holdings, from the published portfolio sheet (October 2026).
-- Share counts and cost basis are blank: PMs / the PPG manager fill them in.
do $$
begin
  if exists (select 1 from public.app_migrations where id = 'seed_holdings_v1')
     or exists (select 1 from public.holdings) then return; end if;

  insert into public.holdings (ticker, name, sector, asset_type) values
    ('TSCO', 'Tractor Supply Co',                'Consumers',               'equity'),
    ('WMT',  'Walmart Inc',                      'Consumers',               'equity'),
    ('PM',   'Philip Morris International Inc.', 'Consumers',               'equity'),
    ('COST', 'Costco Wholesale Corp',            'Consumers',               'equity'),
    ('LNG',  'Cheniere Energy Inc',              'Energy & Utilities',      'equity'),
    ('NEE',  'NextEra Energy Inc',               'Energy & Utilities',      'equity'),
    ('COP',  'ConocoPhillips',                   'Energy & Utilities',      'equity'),
    ('GS',   'The Goldman Sachs Group, Inc.',    'Financials',              'equity'),
    ('MA',   'Mastercard Inc',                   'Financials',              'equity'),
    ('CB',   'Chubb Limited',                    'Financials',              'equity'),
    ('JPM',  'JPMorgan Chase & Co.',             'Financials',              'equity'),
    ('XLF',  'Financial Select Sector SPDR ETF', 'Financials',              'etf'),
    (null,   'Blue Owl Capital Bond',            'Fixed Income',            'bond'),
    (null,   'US Treasury Note',                 'Fixed Income',            'bond'),
    ('VRTX', 'Vertex Pharmaceuticals Inc',       'Healthcare',              'equity'),
    ('PODD', 'Insulet Corp',                     'Healthcare',              'equity'),
    ('ABBV', 'AbbVie Inc',                       'Healthcare',              'equity'),
    ('REGN', 'Regeneron Pharmaceuticals Inc',    'Healthcare',              'equity'),
    ('TMO',  'Thermo Fisher Scientific Inc',     'Healthcare',              'equity'),
    ('MCK',  'McKesson Corp',                    'Healthcare',              'equity'),
    ('RTX',  'RTX Corp',                         'Industrials & Materials', 'equity'),
    ('CAT',  'Caterpillar Inc',                  'Industrials & Materials', 'equity'),
    ('VRT',  'Vertiv Holdings Co',               'Industrials & Materials', 'equity'),
    ('WM',   'Waste Management Inc',             'Industrials & Materials', 'equity'),
    ('XLI',  'Industrial Select Sector SPDR ETF','Industrials & Materials', 'etf'),
    ('XME',  'SPDR S&P Metals & Mining ETF',     'Industrials & Materials', 'etf'),
    ('WELL', 'Welltower Inc',                    'Real Estate',             'equity'),
    ('EQIX', 'Equinix Inc',                      'Real Estate',             'equity'),
    ('AMZN', 'Amazon.com Inc',                   'Technology',              'equity'),
    ('GOOG', 'Alphabet Inc Class C',             'Technology',              'equity'),
    ('MSFT', 'Microsoft Corp',                   'Technology',              'equity'),
    ('AAPL', 'Apple Inc',                        'Technology',              'equity'),
    ('AVGO', 'Broadcom Inc',                     'Technology',              'equity'),
    ('PANW', 'Palo Alto Networks Inc',           'Technology',              'equity'),
    ('ASML', 'ASML Holding NV',                  'Technology',              'equity'),
    ('CRM',  'Salesforce Inc',                   'Technology',              'equity'),
    ('META', 'Meta Platforms Inc',               'Technology',              'equity'),
    ('MU',   'Micron Technology Inc',            'Technology',              'equity'),
    ('TSM',  'Taiwan Semiconductor Manufacturing','Technology',             'equity'),
    ('VB',   'Vanguard Small-Cap ETF',           null,                      'etf');
  insert into public.app_migrations (id) values ('seed_holdings_v1');
end $$;

-- The report that was already on the Portfolio Reporting page.
do $$
begin
  if exists (select 1 from public.app_migrations where id = 'seed_reports_v1')
     or exists (select 1 from public.reports) then return; end if;
  insert into public.reports (title, kind, period_date, file_url)
  values ('November 2025 Report', 'monthly', '2025-11-01',
          '/Website Assets/Portfolio Reporting/Novemeber Report.pdf');
  insert into public.app_migrations (id) values ('seed_reports_v1');
end $$;


-- =====================================================================
-- SUMMARY — review this output after running.
-- Every table should show rls_enabled = true. Members without an email
-- can't sign in until one is added in Control Panel → Members & Roles.
-- =====================================================================
select 'table' as kind, c.relname as name,
       c.relrowsecurity::text as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)::text as policies
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
union all
select 'storage policy', policyname, cmd, array_to_string(roles, ',')
  from pg_policies where schemaname = 'storage' and tablename = 'objects'
union all
select 'role', r.role || coalesce(' (' || r.sector || ')', ''), m.name, m.email
  from public.member_roles r join public.members_directory m on m.id = r.member_id
union all
select 'no email', m.name, m.sector, 'add an email so they can sign in'
  from public.members_directory m where m.status = 'active' and m.email is null
order by 1, 2;
