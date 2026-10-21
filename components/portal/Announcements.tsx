'use client'
import { useState } from 'react'
import { Megaphone, Pin, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Audience } from '@/lib/types'
import type { AudienceOption } from '@/lib/audience'

import { Modal } from './Modal'
import { must, useConfirm, useMutation } from './feedback'
import { Badge, EmptyState } from './ui'
import { TimeAgo } from './TimeAgo'

export type AnnouncementView = {
  id: string; title: string; body: string; audience: Audience; sector: string | null
  pinned: boolean; created_at: string; created_by: string | null; author: string | null
}

export function audienceLabel(a: Audience, sector: string | null) {
  return a === 'all' ? 'Everyone' : a === 'ppg' ? 'PPG' : a === 'pm' ? 'Portfolio Managers' : sector ?? 'Sector'
}

export function Announcements({ items, postOptions, viewerId, isAdmin }: {
  items: AnnouncementView[]
  postOptions: AudienceOption[]
  viewerId: string
  isAdmin: boolean
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', key: postOptions[0]?.key ?? '', pinned: false })
  const { run, pending } = useMutation()
  const confirm = useConfirm()

  async function post(e: React.FormEvent) {
    e.preventDefault()
    const opt = postOptions.find(o => o.key === form.key)
    if (!opt) return
    const ok = await run(async () => must(await createClient().from('announcements').insert({
      title: form.title.trim(), body: form.body.trim(), audience: opt.audience, sector: opt.sector, pinned: form.pinned,
    })), { success: 'Announcement posted' })
    if (ok) { setOpen(false); setForm(f => ({ ...f, title: '', body: '', pinned: false })) }
  }

  async function remove(id: string) {
    if (!(await confirm({ title: 'Delete this announcement?', confirmLabel: 'Delete', danger: true }))) return
    await run(async () => must(await createClient().from('announcements').delete().eq('id', id)), { success: 'Deleted' })
  }

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <h2><Megaphone size={18} /> Announcements</h2>
        {postOptions.length > 0 && (
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setOpen(true)}>
            <Plus size={16} /> Post
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState title="No announcements yet">Updates from leadership will show up here.</EmptyState>
      ) : (
        <ul className="ui-list">
          {items.map(a => (
            <li key={a.id} className="ui-list-item" style={{ alignItems: 'flex-start' }}>
              <div className="ui-list-main">
                <div className="ui-row" style={{ gap: 6 }}>
                  {a.pinned && <Pin size={14} aria-label="Pinned" style={{ color: 'var(--ui-red)' }} />}
                  <span className="ui-list-title" style={{ whiteSpace: 'normal' }}>{a.title}</span>
                  {a.audience !== 'all' && <Badge tone="blue">{audienceLabel(a.audience, a.sector)}</Badge>}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--ui-text)', marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.55 }}>{a.body}</p>
                <div className="ui-list-sub">{a.author ?? 'FIG'} · <TimeAgo iso={a.created_at} /></div>
              </div>
              {(isAdmin || a.created_by === viewerId) && (
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label="Delete announcement" onClick={() => remove(a.id)}>
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Post an announcement"
        footer={
          <>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="announce-form" className="ui-btn ui-btn-primary" disabled={pending || !form.title.trim() || !form.body.trim()}>
              {pending ? 'Posting…' : 'Post'}
            </button>
          </>
        }
      >
        <form id="announce-form" onSubmit={post} className="ui-form">
          <div className="ui-field">
            <label htmlFor="a-title">Title</label>
            <input id="a-title" className="ui-input" required maxLength={140} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Pitch night moved to Thursday" />
          </div>
          <div className="ui-field">
            <label htmlFor="a-body">Message</label>
            <textarea id="a-body" className="ui-textarea" required rows={5} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="ui-form-grid">
            <div className="ui-field">
              <label htmlFor="a-aud">Who should see it?</label>
              <select id="a-aud" className="ui-select" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))}>
                {postOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <label className="ui-check" style={{ alignSelf: 'end', paddingBottom: 10 }}>
              <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
              Pin to the top
            </label>
          </div>
        </form>
      </Modal>
    </section>
  )
}
