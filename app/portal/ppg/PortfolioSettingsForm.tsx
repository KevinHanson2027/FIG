'use client'
import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PortfolioSettings } from '@/lib/types'
import { Card } from '@/components/portal/ui'
import { must, useMutation } from '@/components/portal/feedback'

export default function PortfolioSettingsForm({ initial }: { initial: PortfolioSettings }) {
  const [cash, setCash] = useState(String(initial.cash ?? 0))
  const [rf, setRf] = useState(String(((initial.risk_free_rate ?? 0.04) * 100).toFixed(2)))
  const { run, pending } = useMutation()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const value = { ...initial, cash: Number(cash) || 0, risk_free_rate: (Number(rf) || 0) / 100 }
    await run(async () => must(await createClient().from('settings').upsert({ key: 'portfolio', value }, { onConflict: 'key' })), { success: 'Portfolio settings saved' })
  }

  return (
    <Card title={<><Wallet size={18} /> Portfolio settings</>} description="Used for total value, the daily snapshot and risk metrics.">
      <form onSubmit={save} className="ui-form">
        <div className="ui-form-grid">
          <div className="ui-field">
            <label htmlFor="ps-cash">Cash balance ($)</label>
            <input id="ps-cash" className="ui-input" type="number" step="0.01" min="0" value={cash} onChange={e => setCash(e.target.value)} />
            <span className="ui-hint">Money-market and uninvested cash (e.g. SPAXX).</span>
          </div>
          <div className="ui-field">
            <label htmlFor="ps-rf">Risk-free rate (%)</label>
            <input id="ps-rf" className="ui-input" type="number" step="0.01" min="0" max="20" value={rf} onChange={e => setRf(e.target.value)} />
            <span className="ui-hint">For Sharpe ratio — use the current 3-month T-bill yield.</span>
          </div>
        </div>
        <div><button type="submit" className="ui-btn ui-btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Card>
  )
}
