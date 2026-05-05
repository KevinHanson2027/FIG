import type { Metadata } from 'next'
import MarketDashboard from './MarketDashboard'

export const metadata: Metadata = { title: 'Market Tools | Member Hub' }

export default function ToolsPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1a1a2e', margin: '0 0 0.25rem' }}>Market Tools</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Live market data, charts, and financial research tools.
        </p>
      </div>
      <MarketDashboard />
    </>
  )
}
