// Saving a member's own website profile from the browser. Name, photo, bio
// and LinkedIn go live right away; a sector change waits for a co-president.
import type { SupabaseClient } from '@supabase/supabase-js'

export const BIO_MAX = 1500

export type ProfileDraft = { name: string; headshot_url: string; linkedin_url: string; bio: string }

/** Returns an error message, or null when the draft is fine to publish. */
export function checkProfile(d: ProfileDraft): string | null {
  if (!d.name.trim()) return 'Please enter your name.'
  if (d.name.trim().length > 120) return 'Please shorten your name.'
  const li = d.linkedin_url.trim()
  if (li && !/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(li)) return 'LinkedIn links should start with https://www.linkedin.com/'
  if (d.bio.length > BIO_MAX) return `Please keep your bio under ${BIO_MAX} characters.`
  return null
}

/** Publishes the draft to the website. */
export async function publishProfile(supabase: SupabaseClient, memberId: string, d: ProfileDraft) {
  const problem = checkProfile(d)
  if (problem) throw new Error(problem)
  const patch = {
    name: d.name.trim(),
    headshot_url: d.headshot_url || null,
    linkedin_url: d.linkedin_url.trim() || null,
    bio: d.bio.trim() || null,
  }
  const { data, error } = await supabase.from('members_directory').update(patch).eq('id', memberId).select('name, bio').single()
  if (error) throw new Error(error.message)
  // Before schema v5 the database silently kept the old values.
  if (data.name !== patch.name || (data.bio ?? null) !== patch.bio) {
    throw new Error('Your changes could not be saved. Ask a co-president to re-run supabase/schema.sql (see SETUP.md).')
  }
}

/** Asks the co-presidents to move the member to another sector. */
export async function requestSectorChange(supabase: SupabaseClient, memberId: string, sector: string, pendingId: string | null) {
  const { error } = pendingId
    ? await supabase.from('profile_changes').update({ changes: { sector } }).eq('id', pendingId)
    : await supabase.from('profile_changes').insert({ member_id: memberId, changes: { sector } })
  if (error) throw new Error(error.message)
}
