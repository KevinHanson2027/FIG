import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors } from '@/lib/data'
import { audienceOptions } from '@/lib/audience'
import type { Resource } from '@/lib/types'
import { PageHeader } from '@/components/portal/ui'
import { ResourceLibrary } from '@/components/portal/ResourceLibrary'

export const metadata = { title: 'Resources' }

export default async function ResourcesPage() {
  const { member, access } = await requireMember()
  const supabase = await createClient()
  const [{ data }, sectors] = await Promise.all([
    supabase.from('resources').select('*, uploader:members_directory(name)').order('created_at', { ascending: false }),
    getSectors(),
  ])
  const resources = ((data ?? []) as (Resource & { uploader: { name: string } | null })[]).map(r => ({ ...r, uploader: r.uploader?.name ?? null }))

  return (
    <>
      <PageHeader title="Resources" description="Templates, models, guides and links shared with you. You only see what's meant for your sector and roles." />
      <ResourceLibrary
        resources={resources}
        uploadOptions={access.canUploadResources ? audienceOptions(access, sectors.map(s => s.name)) : []}
        viewerId={member.id}
        isAdmin={access.isAdmin}
        title="Shared files & links"
      />
    </>
  )
}
