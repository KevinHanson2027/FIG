'use client'
import { useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="ui-card">
      <div className="ui-empty">
        <h3>Something went wrong loading this page</h3>
        <p>It may be a temporary problem. Try again, and if it keeps happening let a co-president know.</p>
        <button type="button" className="ui-btn ui-btn-primary" onClick={reset}>
          <RotateCcw size={16} /> Try again
        </button>
      </div>
    </div>
  )
}
