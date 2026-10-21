'use server'
import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { hasServiceRole } from '@/lib/supabase/admin'
import { ensureMemberLink, safeNext } from '@/lib/accounts'

export async function confirmEmailLink(formData: FormData) {
  const tokenHash = String(formData.get('token_hash') ?? '')
  const type = String(formData.get('type') ?? '') as EmailOtpType
  const next = safeNext(String(formData.get('next') ?? ''), '/portal')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error || !data.user) redirect('/login?error=link-expired')

  if (hasServiceRole()) await ensureMemberLink(data.user.id, data.user.email)
  redirect(next)
}
