# FIG Website — Setup & Handbook

This repo is the Fairfield Investment Group website **and** the member portal.
Everything runs on free tiers: **Vercel** (hosting), **Supabase** (database, logins, file storage)
and, optionally, a **Gmail** account for sending emails.

- **Public site** — same look as before, plus a **Member Login** button (top right), a mobile
  menu, an on-site interest form and an **Apply** page that feed the recruiting pipeline.
- **Member portal** (`/portal`) — everyone gets their own login. The sidebar shows only what
  their roles allow.
- **Control Panel** (co-presidents) — approvals, members & roles, year-end transition, settings,
  activity log.

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

It's safe to run again any time (no data is deleted). Run it **before** deploying the new code,
then deploy soon after: until the new code is live, the old admin panel can't save changes.

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
3. Do the same for Thomas, or send a sign-in link from **Members & Roles** (⋯ → Send sign-in link).

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
email, go through the same setup, and wait. Co-presidents see one card per person under
**Approvals → New member applications** and click **Approve** (adds the roles they asked for;
**Analyst only** skips them) or **Approve all**.

**Without email set up:** new people use **Request access**. Approve them, then share the
sign-up link the portal gives you.

What needs approval: new members, role requests and changes to public profiles (bio, photo,
LinkedIn, name, sector). Members save their own plans, tasks and attendance without approval.
Co-presidents' own edits go live immediately.

## Roles

A member can have several. Everyone is an **Analyst**.

| Role | Gets |
|---|---|
| Analyst (everyone) | Home dashboard, profile, portfolio snapshot + sector news, tasks, attendance check-in, resources, market tools, referrals |
| Portfolio Manager | Sector Team: roster (attendance, abroad, leadership interest), assign tasks, take attendance, manage the sector's holdings, post to their sector |
| PPG Member | Portfolio Performance Group: analytics (risk, technicals, correlation, sector vs ETF), PPG files and assignments |
| PPG Manager | Everything PPG members get, plus assigning PPG work, PPG meetings, cash balance, and editing the Holdings and Portfolio Reporting pages and reports |
| Marketing | Website Content: edit text, links and images on every page; publish reports |
| Recruiting | Pipeline (interest form, referrals, applications), interviews, application settings |
| Donor Relations *(beta)* | Gifts received, donations made, the 5% giving target, receipts to send |
| Admin (Co-Presidents) | Everything, plus the Control Panel |

## Running the year

- **Start of each semester:** Control Panel → **Settings** → Current term (name + first day of
  classes). Attendance rates count meetings from that date.
- **Meetings:** co-presidents create general meetings (Sector Teams → Attendance); PMs create
  sector meetings. Open check-in and put the code on screen — members enter it on their phone.
- **Recruiting:** Recruiting → Settings → set the cycle and open applications. The interest form
  and `/apply` page feed the pipeline; schedule interviews from a candidate's card; interviewers
  fill scorecards under **My Interviews**.
- **End of year:** Control Panel → **Year-End Transition**:
  1. Graduate seniors (by graduation year) → alumni, hidden from the site.
  2. Hand off leadership (new co-presidents, PMs, PPG manager, …). Do your own admin removal last.
  3. Add accepted recruits and send sign-in links.
  4. Set the new term and recruiting cycle, and work through the handoff checklist.

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
  Fix the email in Members & Roles.
- **Link expired or already used** — request a new one from the login page (or Members & Roles →
  ⋯ → Send sign-in link).
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
  `lib/roles.ts` what each role unlocks · `lib/cms.ts` editable website fields.
- **Add a role:** add it to the role check constraints and helper functions in `schema.sql`, to
  `Role` in `lib/types.ts`, and to `ROLES`/`getAccess` in `lib/roles.ts`.
- **Add an editable website field:** add it to `lib/cms.ts` and read it on the page with
  `getPageContent`.
- Old static HTML (`Website Pages/`, root `styles.css`) isn't served; Next.js serves `app/`.
