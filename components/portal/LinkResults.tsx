'use client'
import { Copy, Mail } from 'lucide-react'
import { Modal } from './Modal'
import { friendlyError, useToast } from './feedback'
import { Notice } from './ui'

export type LinkList = { sent: number; links: { name: string; email: string; url: string }[]; failed: string[] }

/** Shows sign-in links to share by hand when email isn't set up. */
export function LinkResults({ result, onClose }: { result: LinkList; onClose: () => void }) {
  const toast = useToast()
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success('Copied') } catch (e) { toast.error(friendlyError(e)) }
  }
  const all = result.links.map(l => `${l.name} <${l.email}>: ${l.url}`).join('\n\n')
  return (
    <Modal open onClose={onClose} title="Sign-in links" wide
      description={result.sent ? `${result.sent} emailed automatically. Share the rest privately — each link works once.` : 'Email isn’t set up, so share these privately (text or email). Each link works once and expires.'}
      footer={<>
        {result.links.length > 1 && <button type="button" className="ui-btn ui-btn-secondary" onClick={() => copy(all)}><Copy size={15} /> Copy all</button>}
        <button type="button" className="ui-btn ui-btn-primary" onClick={onClose}>Done</button>
      </>}>
      {result.failed.length > 0 && <div style={{ marginBottom: 12 }}><Notice tone="error">Couldn&apos;t create links for: {result.failed.join(', ')}</Notice></div>}
      <ul className="ui-list">
        {result.links.map(l => (
          <li key={l.email} className="ui-list-item" style={{ padding: '10px 0' }}>
            <div className="ui-list-main"><div className="ui-list-title">{l.name}</div><div className="ui-list-sub">{l.email}</div></div>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => copy(l.url)}><Copy size={14} /> Copy link</button>
            <a className="ui-btn ui-btn-ghost ui-btn-sm" href={`mailto:${l.email}?subject=${encodeURIComponent('Your FIG member account')}&body=${encodeURIComponent(`Set up your FIG portal account here (works once):\n\n${l.url}`)}`}><Mail size={14} /> Email</a>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
