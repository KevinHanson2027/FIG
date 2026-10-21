'use client'
import { dateTime, relative } from '@/lib/format'

/** "3h ago" with the exact time on hover. The server and browser render a
 *  moment apart, so the text may differ slightly — that's expected. */
export function TimeAgo({ iso }: { iso: string }) {
  return <time dateTime={iso} title={dateTime(iso)} suppressHydrationWarning>{relative(iso)}</time>
}
