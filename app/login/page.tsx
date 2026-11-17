import type { Metadata } from 'next'
import { getSectors } from '@/lib/data'
import { safeNext } from '@/lib/accounts'
import { getAccessCode } from '@/lib/accessCode'
import { hasServiceRole } from '@/lib/supabase/admin'
import { isEmailConfigured } from '@/lib/email'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Member Login', robots: { index: false } }

const errors: Record<string, string> = {
  'link-expired': 'That link has expired or was already used. Sign in below, or request a new link.',
}

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const [sectors, code] = await Promise.all([getSectors(), getAccessCode()])
  return (
    <LoginForm
      codeEnabled={Boolean(code)}
      emailEnabled={hasServiceRole() && isEmailConfigured()}
      next={safeNext(searchParams.next)}
      initialError={searchParams.error ? errors[searchParams.error] ?? 'Something went wrong. Please try again.' : ''}
      sectors={sectors.map(s => s.name)}
    />
  )
}
