'use client'
import { useState } from 'react'
import { Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RecruitingSettings } from '@/lib/types'
import { Card, Notice } from '@/components/portal/ui'
import { must, useMutation } from '@/components/portal/feedback'

export default function RecruitingSettingsForm({ initial }: { initial: RecruitingSettings }) {
  const [f, setF] = useState({ ...initial, deadline: initial.deadline ?? '', intro: initial.intro ?? '' })
  const { run, pending } = useMutation()
  const cycleChanged = f.cycle.trim() !== initial.cycle

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const value: RecruitingSettings = { cycle: f.cycle.trim(), applications_open: f.applications_open, deadline: f.deadline || null, intro: f.intro.trim() }
    await run(async () => must(await createClient().from('settings').upsert({ key: 'recruiting', value, is_public: true }, { onConflict: 'key' })), { success: 'Recruiting settings saved' })
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <Card title={<><Settings size={18} /> Recruiting settings</>} description="Controls the public application page and which cycle new candidates join.">
        <form onSubmit={save} className="ui-form">
          <div className="ui-form-grid">
            <div className="ui-field">
              <label htmlFor="rs-cycle">Current cycle</label>
              <input id="rs-cycle" className="ui-input" required value={f.cycle} onChange={e => setF(x => ({ ...x, cycle: e.target.value }))} placeholder="Spring 2027" />
              <span className="ui-hint">New interest forms, referrals and applications go into this cycle.</span>
            </div>
            <div className="ui-field">
              <label htmlFor="rs-deadline">Application deadline</label>
              <input id="rs-deadline" className="ui-input" type="date" value={f.deadline} onChange={e => setF(x => ({ ...x, deadline: e.target.value }))} />
            </div>
          </div>
          {cycleChanged && <Notice tone="info">Starting a new cycle gives you a fresh, empty pipeline. Past cycles stay available from the cycle picker.</Notice>}
          <label className="ui-switch">
            <input type="checkbox" checked={f.applications_open} onChange={e => setF(x => ({ ...x, applications_open: e.target.checked }))} />
            <span className="track" />
            Applications are open
          </label>
          <div className="ui-field">
            <label htmlFor="rs-intro">Message at the top of the application page</label>
            <textarea id="rs-intro" className="ui-textarea" rows={4} value={f.intro} onChange={e => setF(x => ({ ...x, intro: e.target.value }))}
              placeholder="e.g. Interviews run Dec 1–5 in Dolan. Decisions go out before winter break." />
          </div>
          <div><button type="submit" className="ui-btn ui-btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</button></div>
        </form>
      </Card>
    </div>
  )
}
