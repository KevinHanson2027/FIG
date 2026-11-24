'use client'
// Keeps portfolio numbers current while the page is open. During market hours
// it re-renders the page with fresh prices every minute (server components
// re-run; anything typed, sorted or expanded on the page stays as it is).
// It pauses while the tab is hidden or a dialog is open.
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { marketHours } from '@/lib/format'

const FRESH_MS = 20 * 60_000

export function LivePrices({ quotedAt, asOf, every = 60, compact = false }: {
  /** Newest quote time (ms since epoch). */
  quotedAt: number | null
  /** That time as text, e.g. "2:31 PM ET" or "Fri 4:00 PM ET". */
  asOf: string | null
  /** Seconds between refreshes while the market is open. */
  every?: number
  /** Just a dot (with the status as a tooltip), for small tiles. */
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState<boolean | null>(null)
  const [now, setNow] = useState(0)
  const last = useRef(0)

  const refresh = useCallback(() => {
    last.current = Date.now()
    startTransition(() => router.refresh())
  }, [router])

  useEffect(() => {
    last.current = Date.now()
    const check = () => {
      const hours = marketHours()
      setOpen(hours.open)
      setNow(Date.now())
      if (!hours.refresh || document.visibilityState !== 'visible') return
      if (document.querySelector('[role="dialog"]')) return
      if (Date.now() - last.current >= every * 1000) refresh()
    }
    check()
    const id = window.setInterval(check, 10_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [every, refresh])

  // Before the first check (and on the server) only the time is shown, so the
  // server and browser render the same thing.
  const live = open === true && quotedAt !== null && now - quotedAt < FRESH_MS
  const text = !asOf ? 'Prices unavailable right now'
    : live ? `Live · ${asOf}`
    : open === false ? `Market closed · prices as of ${asOf}`
    : `Prices as of ${asOf}`

  if (compact) {
    return live ? <span className="live-dot" role="img" aria-label={text} title={text} /> : null
  }
  return (
    <span className="live-prices">
      {live && <span className="live-dot" aria-hidden />}
      <span>{text}</span>
      <button type="button" className="live-refresh" onClick={refresh} disabled={pending} aria-label="Refresh prices" title="Refresh prices">
        <RefreshCw size={13} className={pending ? 'spin' : undefined} aria-hidden />
      </button>
    </span>
  )
}
