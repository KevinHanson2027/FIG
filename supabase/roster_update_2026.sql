-- ================================================
-- FIG Members Directory — Roster Update
-- Run in Supabase SQL Editor.
-- Matches existing rows by email (more stable than name).
-- Review the affected-row counts in the editor before/after running.
-- ================================================

-- ── 1. Archive graduated members (info preserved, hidden from public site) ──
update public.members_directory set is_active = false
where email in (
  'sara.wentland@student.fairfield.edu',      -- Sara Wentland, was President
  'matthew.byrnes@student.fairfield.edu',     -- Matt Byrnes, was VP
  'andrew.burke2@student.fairfield.edu',      -- Andrew Burke, was Energy & Utilities PM
  'kelsey.volker@student.fairfield.edu',      -- Kelsey Volker, was Financials PM
  'natalia.adamski@student.fairfield.edu'     -- Natalia Adamski, was Industrials & Materials PM
);

-- ── 2. Executive Board — new Co-Presidents ──────────────────────────────────
update public.members_directory
set title = 'Co-President', sector = 'Executive Board', sort_order = 0
where email = 'kevin.hanson@student.fairfield.edu';      -- was Consumers PM

update public.members_directory
set title = 'Co-President', sector = 'Executive Board', sort_order = 1
where email = 'thomas.fitzmaurice@student.fairfield.edu'; -- was Healthcare PM

-- ── 3. Promotions to Portfolio Manager (same sector) ────────────────────────
update public.members_directory
set title = 'Financials Portfolio Manager', sort_order = 0
where email = 'gregg.bursey@student.fairfield.edu';       -- was Financials Analyst

update public.members_directory
set title = 'Consumers Portfolio Manager', sort_order = 0
where email = 'william.kelley@student.fairfield.edu';     -- was Consumers Analyst

update public.members_directory
set title = 'Real Estate Portfolio Manager', sort_order = 0
where email = 'nicholas.guariniello@student.fairfield.edu'; -- was Real Estate Analyst

-- ── 4. Promotions + sector moves ────────────────────────────────────────────
update public.members_directory
set title = 'Energy & Utilities Portfolio Manager', sector = 'Energy & Utilities', sort_order = 0
where email = 'anthony.terrano@student.fairfield.edu';    -- was Financials Analyst

update public.members_directory
set title = 'Healthcare Portfolio Manager', sector = 'Healthcare', sort_order = 0
where email = 'luke.meierjohan@student.fairfield.edu';    -- was Consumers Analyst

-- ── 5. Outgoing PMs staying on as analysts ──────────────────────────────────
-- NOTE: Liam Collins actually moved to Consumers (not Real Estate) — see section 9 below.
update public.members_directory
set title = 'Technology Analyst', sort_order = 1
where email = 'renata.bayazitova@student.fairfield.edu';  -- was Technology PM

-- ── 6. New Portfolio Managers (placeholder — fill in bio/photo/LinkedIn via /admin/members) ──
insert into public.members_directory (name, title, sector, sort_order, is_active)
values
  ('Spencer Lund', 'Technology Portfolio Manager', 'Technology', 0, true),
  ('James Kates', 'Industrials & Materials Portfolio Manager', 'Industrials & Materials', 0, true);

-- ================================================
-- Sector-by-sector roster reconciliation (Discord roster vs. DB)
-- ================================================

-- ── Technology ───────────────────────────────────────────────────────────────
-- Graduated (info preserved, hidden from public site)
update public.members_directory set is_active = false
where email in (
  'matthew.celentano@student.fairfield.edu',  -- Matthew Celentano
  'lila.sullivan@student.fairfield.edu'       -- Lila Sullivan
);

-- New analysts found on Discord with no prior record — placeholders, fill in via /admin/members
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('James Haimoff', 'Technology Analyst', 'Technology', 1, true, null),
  ('Patrick O''Connell', 'Technology Analyst', 'Technology', 1, true, null),
  ('Charles Hamner', 'Technology Analyst', 'Technology', 1, true, '/Website Assets/Members/Technology/Charles Hamner.png');

-- No change needed: Charlie Brenneman, Mark Costolo (already Technology Analysts in DB)
-- Already handled above: Renata Bayazitova (demoted to analyst), Spencer Lund (new PM)

-- ── Consumers ────────────────────────────────────────────────────────────────
-- Liam Collins moved here from Real Estate (was Real Estate PM, see section 5 note above)
update public.members_directory
set title = 'Consumers Analyst', sector = 'Consumers', sort_order = 1
where email = 'liam.collins@student.fairfield.edu';

-- New analysts found on Discord with no prior record — placeholders, fill in via /admin/members
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('John Beam', 'Consumers Analyst', 'Consumers', 1, true, null),
  ('Claudia Eells', 'Consumers Analyst', 'Consumers', 1, true, null);

-- No change needed: Preet Patel ("PVP" on Discord), Sean Kramer, Grace Hall

-- ── Financials ───────────────────────────────────────────────────────────────
-- Matthew Borella moved here from Fixed Income ("Mathew Borella" on Discord) — keep existing bio/email/LinkedIn/headshot
update public.members_directory
set title = 'Financials Analyst', sector = 'Financials', sort_order = 1
where email = 'matthew.borella@student.fairfield.edu';

-- New analysts found on Discord with no prior record — placeholders, fill in via /admin/members
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('Chase Danielson', 'Financials Analyst', 'Financials', 1, true, null),
  ('Gabriela Coppola', 'Financials Analyst', 'Financials', 1, true, null),
  ('Will Millar', 'Financials Analyst', 'Financials', 1, true, null),
  ('Adam Healey', 'Financials Analyst', 'Financials', 1, true, null);

-- No change needed: Margaux Doran, Eva Weyman

-- ── Industrials & Materials ──────────────────────────────────────────────────
-- Graduated
update public.members_directory set is_active = false
where email = 'joseph.knapik@student.fairfield.edu';  -- Joseph "Joey" Knapik

-- New analysts — Cole Puccini, Michael Fuccione, Hayden Kintner have headshots; Eben Andrews does not
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('Cole Puccini', 'Industrials & Materials Analyst', 'Industrials & Materials', 1, true, '/Website Assets/Members/Industrials & Materials/Cole Puccini.jpg'),
  ('Michael Fuccione', 'Industrials & Materials Analyst', 'Industrials & Materials', 1, true, '/Website Assets/Members/Industrials & Materials/Micheal Fuccione.png'),
  ('Hayden Kintner', 'Industrials & Materials Analyst', 'Industrials & Materials', 1, true, '/Website Assets/Members/Industrials & Materials/Hayden Kintner.png'),
  ('Eben Andrews', 'Industrials & Materials Analyst', 'Industrials & Materials', 1, true, null);

-- No change needed: Luke Castanho. Juliana Elloian and Sarah Gibney stay active (were abroad, missing from Discord snapshot)

-- ── Healthcare ───────────────────────────────────────────────────────────────
-- Preston Biedenkapp moved here from... wait, moved TO Fixed Income (see Fixed Income section below)
update public.members_directory set is_active = false
where email = 'brian.burke1@student.fairfield.edu';  -- Brian Burke, graduated

-- New analysts — Matt Morin, Patrick Reuss, Christopher Ramos, Kaylie McMillan all have headshots
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('Matt Morin', 'Healthcare Analyst', 'Healthcare', 1, true, '/Website Assets/Members/Healthcare/Matt Morin.png'),
  ('Patrick Reuss', 'Healthcare Analyst', 'Healthcare', 1, true, '/Website Assets/Members/Healthcare/Patrick Reuss.png'),
  ('Christopher Ramos', 'Healthcare Analyst', 'Healthcare', 1, true, '/Website Assets/Members/Healthcare/Christopher Ramos.jpg'),
  ('Kaylie McMillan', 'Healthcare Analyst', 'Healthcare', 1, true, '/Website Assets/Members/Healthcare/Kaylie McMillan.jpg');

-- No change needed: Cooper Bateson, Drew Fitzgerald

-- ── Fixed Income ─────────────────────────────────────────────────────────────
-- Preston Biedenkapp moved here from Healthcare — keep existing bio/email/LinkedIn/headshot
update public.members_directory
set title = 'Fixed Income Analyst', sector = 'Fixed Income', sort_order = 1
where email = 'preston.biedenkapp@student.fairfield.edu';

-- Graduated
update public.members_directory set is_active = false
where email = 'brian.lourenco-reis@student.fairfield.edu';  -- Brian Reis

-- New analysts — Alfonso Curatolo has a headshot; Sofia Nogalo and James McKenna do not
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('Sofia Nogalo', 'Fixed Income Analyst', 'Fixed Income', 1, true, null),
  ('Alfonso Curatolo', 'Fixed Income Analyst', 'Fixed Income', 1, true, '/Website Assets/Members/Fixed Income/Alfonso Curatolo.jpeg'),
  ('James McKenna', 'Fixed Income Analyst', 'Fixed Income', 1, true, null);

-- No change needed: Ethan Thomas, Jack McLaughlin, Drew Lottier
-- Already moved out above: Matthew Borella (→ Financials)

-- ── Energy & Utilities ───────────────────────────────────────────────────────
-- Graduated
update public.members_directory set is_active = false
where email in (
  'paul.knieriem@student.fairfield.edu',   -- Paul Knieriem
  'thomas.healey@student.fairfield.edu'    -- Thomas Healey
);

-- New analysts — Alexander Taverna and Christopher Driver have headshots;
-- Ryan Spero and Patrick Mahoney do not. Olivia Tedeschi-Moran's only photo is a
-- .HEIC file (not web-safe) — left with no headshot_url until converted to JPG/PNG.
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('Ryan Spero', 'Energy & Utilities Analyst', 'Energy & Utilities', 1, true, null),
  ('Alexander Taverna', 'Energy & Utilities Analyst', 'Energy & Utilities', 1, true, '/Website Assets/Members/Energy & Utilities/Alexander Taverna.png'),
  ('Christopher Driver', 'Energy & Utilities Analyst', 'Energy & Utilities', 1, true, '/Website Assets/Members/Energy & Utilities/Christopher Driver.jpeg'),
  ('Patrick Mahoney', 'Energy & Utilities Analyst', 'Energy & Utilities', 1, true, null),
  ('Olivia Tedeschi-Moran', 'Energy & Utilities Analyst', 'Energy & Utilities', 1, true, null);

-- No change needed: Michael Byrnes, Patrick Donohue

-- ── Real Estate ──────────────────────────────────────────────────────────────
-- Graduated
update public.members_directory set is_active = false
where email = 'caleb.birchem@student.fairfield.edu';  -- Caleb Birchem

-- New analysts — no existing data found for either
insert into public.members_directory (name, title, sector, sort_order, is_active, headshot_url)
values
  ('Fred Simpson', 'Real Estate Analyst', 'Real Estate', 1, true, null),
  ('Joseph LaPella', 'Real Estate Analyst', 'Real Estate', 1, true, null);

-- No change needed: Billy Ryan, William Guider
-- Already moved out above: Liam Collins (→ Consumers, see Consumers section)
