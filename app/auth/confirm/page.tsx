import type { Metadata } from 'next'
import Link from 'next/link'
import { confirmEmailLink } from './actions'

export const metadata: Metadata = { title: 'Continue to FIG', robots: { index: false } }

// Email links land here and only sign in when the button is pressed, so
// inbox link scanners (e.g. Outlook Safe Links) can't use up the one-time link.
export default function ConfirmPage({ searchParams }: { searchParams: { token_hash?: string; type?: string; next?: string } }) {
  const valid = Boolean(searchParams.token_hash && searchParams.type)
  const isInvite = searchParams.type === 'invite'

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Website Assets/Logos/FIG Logo.png" alt="Fairfield Investment Group" />
          <h1>{!valid ? 'This link is incomplete' : isInvite ? 'Welcome to FIG' : 'Sign in to FIG'}</h1>
          <p>
            {!valid
              ? 'Open the full link from your email, or request a new one.'
              : isInvite
                ? "You're one step away from your member portal. Continue to create your password."
                : 'Continue to sign in and choose a new password.'}
          </p>
        </div>
        {valid ? (
          <form action={confirmEmailLink}>
            <input type="hidden" name="token_hash" value={searchParams.token_hash} />
            <input type="hidden" name="type" value={searchParams.type} />
            <input type="hidden" name="next" value={searchParams.next ?? '/portal/welcome'} />
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" style={{ height: 44 }}>Continue</button>
          </form>
        ) : (
          <Link href="/login" className="ui-btn ui-btn-primary ui-btn-block" style={{ height: 44 }}>Go to login</Link>
        )}
      </div>
    </div>
  )
}
