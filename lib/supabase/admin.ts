import 'server-only'
import { createClient } from '@supabase/supabase-js'

/** Service-role client that bypasses Row Level Security.
 *  Server-only: use it for account management (invites, sign-in links),
 *  signed file downloads and the daily cron — never for data a member
 *  could read with their own permissions. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. See SETUP.md, step 3.')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

export function hasServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}
