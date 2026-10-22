# FIG Website — Setup & Handbook

This repo is the Fairfield Investment Group website **and** the member portal.
Everything runs on free tiers: **Vercel** (hosting), **Supabase** (database, logins, file storage)
and, optionally, a **Gmail** account for sending emails.

- **Public site** — same look as before, plus a **Member Login** button (top right), a mobile
  menu, an on-site interest form and an **Apply** page that feed the recruiting pipeline.
- **Member portal** (`/portal`) — everyone gets their own login. Five sections for everyone
  (Home, Portfolio, My Work, Resources, My Profile), plus a workspace for each role they hold.
- **Control Panel** (co-presidents) — one page with tabs: Inbox (approvals), Members & roles,
  Settings (including graduation), Activity.

Built to run itself year to year: the semester and recruiting cycle are worked out from the
calendar, members keep their own profiles up to date, and new leaders request their roles.

---

## One-time setup (about 20 minutes)

Do these in order. Everything except email (step 5) is required, and email is strongly recommended.

### 1. Upgrade the database
1. Supabase Dashboard → **SQL Editor** → **New query**.
2. Paste the whole of `supabase/schema.sql` and click **Run**. Supabase will warn about
   *destructive operations*. That's expected: each run removes and recreates the file's own security
   rules, and no member data is deleted. Go ahead and run it. If it also offers **Run and enable
   RLS**, choose **Run without RLS** instead. The file already turns RLS on for every table, and
   the other option adds statements after the summary, so the summary won't show.
3. Check the summary table it prints: every table should say `rls_enabled = true`, and you should
   see the starting roles (both Co-Presidents as admin, each sector's PM, the Marketing team).
   Rows marked **no email** are members who can't sign in until you add an email.

It's safe to run again any time (no data is deleted). **Whenever an update changes
`supabase/schema.sql`, run it again before deploying that update.**

### 2. Supabase sign-in settings
- **Authentication → URL Configuration**
  - Site URL: `https://www.fairfieldinvestmentgroup.org` (the address the domain redirects to)
  - Redirect URLs: add `https://www.fairfieldinvestmentgroup.org/**`,
    `https://fairfieldinvestmentgroup.org/**`, `https://fig-six.vercel.app/**` and
    `http://localhost:3000/**`
- **Authentication → Sign In / Providers**: keep **Email** on, and turn **off** “Allow new users to
  sign up”. The website creates accounts itself after checking the roster or an application —
  this stops anyone from skipping that with the public key.
- Optional: **Email OTP expiration** (same page) — raise it (up to 24 hours) if you'll often share
  sign-in links by hand.

### 3. Vercel environment variables
Vercel → Project → **Settings → Environment Variables** (Production + Preview), then redeploy:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | already set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → **Secret keys** (starts with `sb_secret_`; on projects with the older keys, the **service_role** key). Server-only. Never share it or put it in code. |
| `SITE_URL` | `https://www.fairfieldinvestmentgroup.org`, **Production only** (the address used in email links) |
| `CRON_SECRET` | any long random string (protects the daily job) |

You can delete the old `ADMIN_KEY` and `MEMBER_KEY` — the shared passwords are gone.

### 4. First sign-in (you)
1. Supabase → **Authentication → Users → Add user → Create new user**: your school email, a
   password, and tick **Auto Confirm User**.
2. Go to `/login` and sign in. You're already an admin; finish the short setup screens.
3. Do the same for Thomas, or send a sign-in link from **Control Panel → Members & roles**
   (⋯ → Send sign-in link).

### 5. Outgoing email (recommended, free)
Without email everything still works — the portal gives you sign-in links to copy, and new
people use **Request access** instead of signing themselves up. With email, invites, password
resets, application/interview emails, approval notices and self sign-up are automatic.

Easiest option — a shared FIG Gmail (e.g. `figportal@gmail.com`):
1. Turn on **2-Step Verification**, then create an **App Password** (Google Account → Security).
2. Add these in Vercel and redeploy:

| Name | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | the Gmail address |
| `SMTP_PASS` | the 16-character App Password |
| `EMAIL_FROM` | `Fairfield Investment Group <figportal@gmail.com>` |

Gmail allows roughly 500 emails a day. First emails may land in Junk — tell members to check.

### 6. Daily job
`vercel.json` runs `/api/cron/daily` once a day after the market closes. It records the
portfolio's value (for the performance chart) and keeps the free Supabase project from pausing
during breaks (Supabase pauses free projects after a week with no activity). It needs
`CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`. Check **Control Panel → Settings → System status**.

### 7. Deploy
Push to `main`; Vercel deploys automatically.

### 8. Add share counts
The 40 current holdings were imported from the published Google Sheet without share counts, so
portfolio values, weights and the performance chart stay blank until they're filled in. In the
portal: **Portfolio** → pencil icon on each row → shares and average cost. Co-presidents and the
PPG manager can edit every holding; each PM can edit their own sector's.

---

## How people get in

**Existing members (on the roster):** `/login` → **Set up your account** → school email → open the
emailed link → a 2-minute setup: create a password, confirm sector and graduation year, pick
roles (e.g. PPG), add a photo and bio, and share plans (abroad, leadership interest).

**New members (not on the roster):** same button. They add their name and sector, verify their
email, go through the same setup, and wait. Co-presidents see one card per person in
**Control Panel → Inbox** and click **Approve** (adds the roles they asked for; **Analyst only**
skips them) or **Approve all**.

**Without email set up:** new people use **Request access**. Approve them, then share the
sign-up link the portal gives you.

**What needs a co-president:** new members, role requests and sector moves, all in the Inbox.
Everything else is self-serve. Members edit their own name, photo, bio and LinkedIn under
**My Profile**, which shows a live preview of their member card and bio page and goes live when
they click **Publish**. Every change is recorded in **Control Panel → Activity**.

## Roles

A member can have several. Everyone is an **Analyst**.

| Role | Gets |
|---|---|
| Analyst (everyone) | Home (what needs you, sector holdings and news), Portfolio (overview, holdings, markets), My Work (tasks, attendance, interviews), Resources, My Profile, referrals |
| Portfolio Manager | Sector Team: roster (attendance, abroad, leadership interest), assign tasks, take attendance, manage the sector's holdings, post to their sector |
| PPG Member | Portfolio Performance Group: analytics (risk, technicals, correlation, sector vs ETF), PPG files and assignments |
| PPG Manager | Everything PPG members get, plus assigning PPG work, PPG meetings, cash balance, and editing the Holdings and Portfolio Reporting pages and reports |
| Marketing | Website Content: edit text, links and images on every page; publish reports |
| Recruiting | Pipeline (interest form, referrals, applications), interviews, application settings |
| Donor Relations *(beta)* | Gifts received, donations made, the 5% giving target, receipts to send |
| Admin (Co-Presidents) | Everything, plus the Control Panel |

## Running the year

- **Semesters:** nothing to do. The term is worked out from the date (Spring = January–July,
  Fall = August–December), and attendance rates reset with it.
- **Meetings:** co-presidents create general meetings (Sector Teams → Attendance); PMs create
  sector meetings. Open check-in and put the code on screen. Members enter it on their phone.
- **Recruiting:** Recruiting → Settings → open applications. New candidates go into the current
  semester's cycle unless recruiting names one. Schedule interviews from a candidate's card;
  interviewers fill in scorecards under **My Work → Interviews**.
- **End of year (May):**
  1. Incoming leaders request their roles under **My Profile → Team, plans & roles**. Approve
     them in the **Inbox**, or assign roles directly in **Members & roles**.
  2. **Control Panel → Settings → Graduation & handoff** lists the seniors, already checked.
     Click **Graduate**. They become alumni: hidden from the site, roles removed, profile kept.
     Graduate the outgoing co-presidents last, after the new ones are admins.
  3. Accepted recruits sign themselves up (Member Login → Set up your account), or recruiting
     adds them from the pipeline.

**Ownership handoff (important):** the Supabase project, Vercel project, GitHub repo and FIG
Gmail should be owned by a shared FIG account or passed to the incoming co-presidents each year.

## Free-tier limits

- Supabase: 500 MB database, 1 GB files (photos are resized automatically), pauses after 7 idle
  days (the daily job prevents this).
- Vercel Hobby: cron runs once a day.
- Market data comes from Yahoo Finance's free, delayed feeds. If they ever change, prices show
  “unavailable” instead of breaking pages.

## Troubleshooting

- **“We couldn't find you on the roster”** — their sign-in email doesn't match an active member.
  Fix the email in Control Panel → Members & roles.
- **Link expired or already used** — request a new one from the login page (or Members & roles →
  ⋯ → Send sign-in link).
- **“Your changes could not be saved”** when publishing a profile — the database is behind the
  code. Run `supabase/schema.sql` again (step 1).
- **No admins left** (shouldn't happen — the database blocks removing the last one). In the SQL
  Editor:
  `insert into member_roles (member_id, role) select id, 'admin' from members_directory where email = 'you@student.fairfield.edu';`
- **Member page shows “profiles are being updated”** — run `supabase/schema.sql` (step 1).

---

## For developers

- **Next.js 14 (App Router) + Supabase** (`@supabase/ssr`). Server Components load data; client
  components change it and call `router.refresh()` (see `useMutation` in
  `components/portal/feedback.tsx`).
- **Security lives in the database.** `supabase/schema.sql` defines Row Level Security for
  every table and storage bucket; the UI only hides what a role can't use. Account management
  (sign-in links, approvals that email people, the cron job) uses the service-role client in
  `lib/supabase/admin.ts` on the server only.
- Key folders: `app/(public)` website · `app/portal` portal · `app/portal/admin` Control Panel ·
  `app/portal/welcome` onboarding · `components/portal` UI kit (`ui.tsx`, `charts.tsx`, …) ·
  `lib/roles.ts` what each role unlocks · `lib/cms.ts` editable website fields ·
  `components/public/MemberProfile.tsx` the member card and bio page, shared by the public
  Members pages and the profile editor's live preview (change it once, both update).
- **Add a role:** add it to the role check constraints and helper functions in `schema.sql`, to
  `Role` in `lib/types.ts`, and to `ROLES`/`getAccess` in `lib/roles.ts`.
- **Add an editable website field:** add it to `lib/cms.ts` and read it on the page with
  `getPageContent`.
- Old static HTML (`Website Pages/`, root `styles.css`) isn't served; Next.js serves `app/`.
