'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CircleCheck, CircleX } from 'lucide-react'
import { Modal } from './Modal'

// ── Toasts ─────────────────────────────────────────────────────────
type Toast = { id: number; kind: 'success' | 'error'; text: string }
type ToastApi = { success: (text: string) => void; error: (text: string) => void }
const ToastContext = createContext<ToastApi | null>(null)

// ── Confirm dialog (instead of the browser's confirm()) ──────────
type ConfirmOptions = { title: string; body?: React.ReactNode; confirmLabel?: string; danger?: boolean }
const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = nextId.current++
    setToasts(t => [...t, { id, kind, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === 'error' ? 6000 : 3500)
  }, [])
  const toastApi = useRef<ToastApi>({ success: t => push('success', t), error: t => push('error', t) })
  toastApi.current = { success: t => push('success', t), error: t => push('error', t) }

  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ ...o, resolve })), [])
  const settle = (value: boolean) => { pending?.resolve(value); setPending(null) }

  return (
    <ToastContext.Provider value={toastApi.current}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <div className="ui-toasts" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className={`ui-toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
              {t.kind === 'success' ? <CircleCheck size={18} /> : <CircleX size={18} />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
        <Modal
          open={pending !== null}
          onClose={() => settle(false)}
          title={pending?.title ?? ''}
          footer={
            <>
              <button type="button" className="ui-btn ui-btn-secondary" onClick={() => settle(false)}>Cancel</button>
              <button type="button" className={`ui-btn ${pending?.danger ? 'ui-btn-danger' : 'ui-btn-primary'}`} onClick={() => settle(true)}>
                {pending?.confirmLabel ?? 'Confirm'}
              </button>
            </>
          }
        >
          <div style={{ fontSize: '0.9rem', color: 'var(--ui-text)', lineHeight: 1.55 }}>{pending?.body}</div>
        </Modal>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside FeedbackProvider')
  return ctx
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside FeedbackProvider')
  return ctx
}

/** Turn Supabase / Postgres errors into something a member can act on. */
export function friendlyError(e: unknown): string {
  const raw = (e as { message?: string })?.message ?? String(e)
  if (/row-level security|permission denied/i.test(raw)) return "You don't have permission to do that."
  if (/duplicate key|already exists/i.test(raw)) return 'That already exists.'
  if (/violates foreign key/i.test(raw)) return 'That refers to something that no longer exists.'
  if (/JWT|session|refresh token/i.test(raw)) return 'Your session expired — please sign in again.'
  if (/Failed to fetch|NetworkError/i.test(raw)) return "Couldn't reach the server. Check your connection and try again."
  return raw.replace(/^Error:\s*/, '')
}

/** Throws when a Supabase call returned an error, so useMutation can show it. */
export function must<T extends { error: { message: string } | null }>(result: T): T {
  if (result.error) throw new Error(result.error.message)
  return result
}

/** Run a change, show feedback, then refresh server data on the page. */
export function useMutation() {
  const router = useRouter()
  const toast = useToast()
  const [pending, setPending] = useState(false)

  const run = useCallback(async <T,>(fn: () => Promise<T>, opts: { success?: string; refresh?: boolean } = {}): Promise<T | undefined> => {
    setPending(true)
    try {
      const result = await fn()
      if (opts.success) toast.success(opts.success)
      if (opts.refresh !== false) router.refresh()
      return result
    } catch (e) {
      toast.error(friendlyError(e))
      return undefined
    } finally {
      setPending(false)
    }
  }, [router, toast])

  return { run, pending }
}
