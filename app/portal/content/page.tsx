import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { PAGES, PPG_PAGES } from '@/lib/cms'
import type { Report } from '@/lib/types'
import { NoAccess, PageHeader, Tabs } from '@/components/portal/ui'
import PageEditor from './PageEditor'
import ReportsManager from './ReportsManager'

export const metadata = { title: 'Website Content' }

export default async function ContentPage({ searchParams }: { searchParams: { tab?: string; page?: string } }) {
  const { access } = await requireMember()
  if (!access.canEditContent) return <NoAccess what="Website Content is for the Marketing team, the PPG manager and co-presidents." />

  const editable = access.canEditAllPages ? PAGES : PAGES.filter(p => PPG_PAGES.includes(p.slug))
  const tab = searchParams.tab === 'reports' ? 'reports' : 'pages'
  const supabase = await createClient()

  let body: React.ReactNode
  if (tab === 'pages') {
    const page = editable.find(p => p.slug === searchParams.page) ?? editable[0]
    const { data } = await supabase.from('page_content').select('content, updated_at').eq('page_slug', page.slug).maybeSingle()
    body = (
      <PageEditor
        key={page.slug}
        pages={editable.map(p => ({ slug: p.slug, name: p.name }))}
        slug={page.slug}
        saved={(data?.content as Record<string, string>) ?? {}}
        updatedAt={data?.updated_at ?? null}
      />
    )
  } else {
    const { data } = await supabase.from('reports').select('*').order('period_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    body = <ReportsManager reports={(data ?? []) as Report[]} />
  }

  return (
    <>
      <PageHeader title="Website Content" description="Edit the text, links and images on the public website, and publish reports. Changes go live as soon as you save." />
      <Tabs basePath="/portal/content" active={tab} tabs={[{ id: 'pages', label: 'Pages' }, { id: 'reports', label: 'Reports' }]} />
      {body}
    </>
  )
}
