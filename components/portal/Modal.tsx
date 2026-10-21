'use client'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Accessible dialog: Escape and backdrop close it, focus moves inside,
 *  page scroll is locked. Becomes a bottom sheet on phones. */
export function Modal({ open, onClose, title, description, children, footer, wide, drawer }: {
  open: boolean
  onClose: () => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
  drawer?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const first = panel.current?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select, button:not([data-close])')
    ;(first ?? panel.current)?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={`ui-overlay${drawer ? ' ui-drawer-overlay' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panel}
        className={drawer ? 'ui-drawer' : `ui-modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ui-modal-head">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" onClick={onClose} aria-label="Close" data-close>
            <X size={18} />
          </button>
        </div>
        <div className="ui-modal-body" style={drawer ? { flex: 1 } : undefined}>{children}</div>
        {footer && <div className="ui-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
