'use client'
import { useState } from 'react'
import { initials } from '@/lib/format'

export function Avatar({ name, url, size }: { name: string; url?: string | null; size?: 'sm' | 'lg' | 'xl' }) {
  const [broken, setBroken] = useState(false)
  const cls = `ui-avatar${size ? ` ui-avatar-${size}` : ''}`
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cls} onError={() => setBroken(true)} />
  }
  return <span className={cls} aria-hidden>{initials(name)}</span>
}
