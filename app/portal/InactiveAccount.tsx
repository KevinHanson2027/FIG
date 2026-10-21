import Link from 'next/link'
import type { MemberStatus } from '@/lib/types'

const copy: Record<'alumni' | 'none', { title: string; body: string }> = {
  alumni: {
    title: 'Your membership has been archived',
    body: 'Alumni accounts no longer have access to the member portal. If this is a mistake, contact a co-president.',
  },
  none: {
    title: "We couldn't find you on the roster",
    body: 'Your sign-in worked, but this email isn\'t linked to an active FIG member. Ask a co-president to add this email to your profile, or sign in with your school email.',
  },
}

export default function InactiveAccount({ email, status }: { email: string; status: MemberStatus | null }) {
  const c = copy[status === 'alumni' ? 'alumni' : 'none']
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Website Assets/Logos/FIG Logo.png" alt="Fairfield Investment Group" />
          <h1>{c.title}</h1>
          <p>{c.body}</p>
        </div>
        <p className="ui-small ui-muted" style={{ textAlign: 'center', marginBottom: 16 }}>
          Signed in as <strong>{email}</strong>
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="ui-btn ui-btn-primary ui-btn-block">Sign out</button>
        </form>
        <div className="login-footer">
          <Link href="/" className="ui-link">Back to the website</Link>
        </div>
      </div>
    </div>
  )
}
