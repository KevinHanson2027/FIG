// The club's first sign-in code. Co-presidents set it in Control Panel →
// Settings and share it at the first meeting; a roster member uses it once,
// with their school email, to choose their own password. Only a salted hash
// is stored (settings key 'access_code').
import 'server-only'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'

export const ACCESS_CODE_KEY = 'access_code'
export const ACCESS_CODE_MIN = 6

export type AccessCode = { hash: string; set_at: string; set_by: string | null }

/** Codes are read out at a meeting, so case and spaces don't matter. */
export function normalizeCode(code: string) {
  return code.replace(/\s+/g, '').toUpperCase()
}

export function hashCode(code: string) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(normalizeCode(code), salt, 32).toString('hex')}`
}

export function codeMatches(code: string, stored: string) {
  const [alg, salt, hash] = stored.split('$')
  if (alg !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  if (expected.length !== 32) return false
  return timingSafeEqual(expected, scryptSync(normalizeCode(code), salt, 32))
}

/** The current code, or null when it's switched off. */
export async function getAccessCode(): Promise<AccessCode | null> {
  if (!hasServiceRole()) return null
  const { data } = await createAdminClient().from('settings').select('value').eq('key', ACCESS_CODE_KEY).maybeSingle()
  const value = data?.value as Partial<AccessCode> | null
  return value?.hash ? (value as AccessCode) : null
}
