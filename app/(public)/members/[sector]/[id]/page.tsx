import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getSectors } from '@/lib/data'
import { MemberBio } from '@/components/public/MemberProfile'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function generateMetadata({
  params,
}: {
  params: { sector: string; id: string }
}): Promise<Metadata> {
  if (!UUID.test(params.id)) return { title: 'Member Bio' }
  const supabase = await createClient()
  const { data } = await supabase
    .from('members_directory')
    .select('name, title')
    .eq('id', params.id)
    .eq('status', 'active')
    .eq('is_public', true)
    .maybeSingle()
  return {
    title: data?.name ?? 'Member Bio',
    description: data?.title ?? undefined,
  }
}

export default async function MemberBioPage({
  params,
}: {
  params: { sector: string; id: string }
}) {
  const slug       = params.sector
  const sectorName = (await getSectors()).find(s => s.slug === slug)?.name ?? 'Members'

  const supabase = await createClient()
  let { data: member, error } = UUID.test(params.id)
    ? await supabase
        .from('members_directory')
        .select('*')
        .eq('id', params.id)
        .eq('status', 'active')
        .eq('is_public', true)
        .maybeSingle()
    : { data: null, error: null }
  if (error) {
    // Database not upgraded yet (supabase/schema.sql): use the legacy flag.
    ;({ data: member } = await supabase.from('members_directory').select('*').eq('id', params.id).eq('is_active', true).maybeSingle())
  }

  if (!member) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
        <h2 style={{ color: '#C8102E', marginBottom: '1rem' }}>Member not found</h2>
        <Link href={`/members/${slug}`} className="btn">← Back to {sectorName}</Link>
      </div>
    )
  }

  return <MemberBio m={member} sectorName={sectorName} backHref={`/members/${slug}`} />
}
