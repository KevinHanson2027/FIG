import { requireMember } from '@/lib/auth'
import { PageHeader } from '@/components/portal/ui'
import MarketDashboard from './MarketDashboard'

export const metadata = { title: 'Market Tools' }

export default async function ToolsPage() {
  await requireMember()
  return (
    <>
      <PageHeader title="Market Tools" description="Live market data, charts and free research tools." />
      <MarketDashboard />
    </>
  )
}
