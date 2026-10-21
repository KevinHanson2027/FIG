'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** A <select> that updates one URL search param (server re-renders the data). */
export function SelectNav({ param, value, options, label }: { param: string; value: string; options: { value: string; label: string }[]; label: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <select
      className="ui-select"
      aria-label={label}
      value={value}
      style={{ height: 32, fontSize: '0.8125rem', width: 'auto', maxWidth: 220 }}
      onChange={e => {
        const q = new URLSearchParams(params.toString())
        q.set(param, e.target.value)
        router.push(`${pathname}?${q}`, { scroll: false })
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
