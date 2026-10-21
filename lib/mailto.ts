// Link builders that work anywhere (no server needed): open the user's own
// email app, or add an event to Google Calendar.

export function mailtoLink(opts: { to?: string | string[]; bcc?: string[]; subject: string; body: string }) {
  const to = Array.isArray(opts.to) ? opts.to.join(',') : opts.to ?? ''
  const params = new URLSearchParams({ subject: opts.subject, body: opts.body })
  if (opts.bcc?.length) params.set('bcc', opts.bcc.join(','))
  return `mailto:${to}?${params.toString().replace(/\+/g, '%20')}`
}

/** "Add to Google Calendar" link — free, no API key. */
export function googleCalendarLink(opts: { title: string; start: string; minutes?: number; details?: string; location?: string }) {
  const start = new Date(opts.start)
  const end = new Date(start.getTime() + (opts.minutes ?? 30) * 60_000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ...(opts.details ? { details: opts.details } : {}),
    ...(opts.location ? { location: opts.location } : {}),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
