import { requireMember } from '@/lib/auth'
import { PageHeader } from '@/components/portal/ui'
import { PortfolioTabs } from '@/components/portal/SectionTabs'
import MarketDashboard from './MarketDashboard'

export const metadata = { title: 'Markets' }

export default async function ToolsPage() {
  await requireMember()
  return (
    <>
      <PageHeader title="Portfolio" description="Live market data, charts and free research tools." />
      <PortfolioTabs active="markets" />
      <MarketDashboard />
    </>
  )
}
