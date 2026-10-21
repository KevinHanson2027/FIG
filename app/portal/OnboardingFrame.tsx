import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { FeedbackProvider } from '@/components/portal/feedback'

/** Minimal chrome for first-login setup and pending applications. */
export default function OnboardingFrame({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <div className="onboard">
        <header className="onboard-top">
          <Link href="/" className="portal-brand" style={{ padding: 0, borderBottom: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Logos/FIG Primary Logo.svg" alt="FIG" />
            <span>Member<br />Portal</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="onboard-signout"><LogOut size={16} /> Sign out</button>
          </form>
        </header>
        <main className="onboard-main" id="main">{children}</main>
      </div>
    </FeedbackProvider>
  )
}
