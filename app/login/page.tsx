import type { Metadata } from 'next'
import { getSectors } from '@/lib/data'
import { safeNext } from '@/lib/accounts'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Member Login', robots: { index: false } }

const errors: Record<string, string> = {
  'link-expired': 'That link has expired or was already used. Request a new one below.',
}

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const sectors = await getSectors()
  return (
    <LoginForm
      next={safeNext(searchParams.next)}
      initialError={searchParams.error ? errors[searchParams.error] ?? 'Something went wrong. Please try again.' : ''}
      sectors={sectors.map(s => s.name)}
    />
  )
}
