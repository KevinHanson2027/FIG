'use client'
import { useState } from 'react'
import { Send, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from './Modal'
import { useMutation } from './feedback'

/** "Refer someone": a small form that adds a candidate to recruiting's pipeline. */
export function ReferButton({ sectors }: { sectors: string[] }) {
  const empty = { name: '', email: '', classYear: '', sector: '', note: '' }
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const { run, pending } = useMutation()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => {
      const { error } = await createClient().rpc('submit_referral', {
        p_name: form.name, p_email: form.email, p_class_year: form.classYear ? Number(form.classYear) : null,
        p_sector: form.sector || null, p_note: form.note || null,
      })
      if (error) throw new Error(error.message)
      return true
    }, { success: 'Thanks! Recruiting will reach out.', refresh: false })
    if (ok) { setForm(empty); setOpen(false) }
  }

  return (
    <>
      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setOpen(true)}><UserPlus size={15} /> Refer someone</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Refer someone to FIG" description="Recruiting will invite them to apply.">
        <form id="refer-form" onSubmit={submit} className="ui-form" style={{ gap: 12 }}>
          <div className="ui-form-grid">
            <div className="ui-field"><label htmlFor="rf-name">Name</label><input id="rf-name" className="ui-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="ui-field"><label htmlFor="rf-email">Email</label><input id="rf-email" className="ui-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="ui-field"><label htmlFor="rf-year">Class year</label><input id="rf-year" className="ui-input" inputMode="numeric" placeholder="2029" value={form.classYear} onChange={e => setForm(f => ({ ...f, classYear: e.target.value }))} /></div>
            <div className="ui-field">
              <label htmlFor="rf-sector">Interest</label>
              <select id="rf-sector" className="ui-select" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                <option value="">Not sure</option>
                {sectors.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="ui-field"><label htmlFor="rf-note">Why them? <span className="ui-muted">(optional)</span></label><textarea id="rf-note" className="ui-textarea" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
          <div><button type="submit" className="ui-btn ui-btn-primary" disabled={pending}><Send size={15} /> {pending ? 'Sending…' : 'Send referral'}</button></div>
        </form>
      </Modal>
    </>
  )
}
