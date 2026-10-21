'use client'
import { useEffect, useRef, useState } from 'react'
import { Ellipsis } from 'lucide-react'

/** Small "⋯" menu for row actions. Closes on outside click and Escape. */
export function Menu({ label = 'Actions', children, trigger }: { label?: string; children: (close: () => void) => React.ReactNode; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="ui-menu" ref={root}>
      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {trigger ?? <Ellipsis size={18} />}
      </button>
      {open && <div className="ui-menu-panel" role="menu">{children(() => setOpen(false))}</div>}
    </div>
  )
}
