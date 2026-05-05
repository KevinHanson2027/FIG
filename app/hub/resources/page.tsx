import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Resources | Member Hub' }

const fileIcon: Record<string, string> = {
  pdf: '📄', xlsx: '📊', xls: '📊', csv: '📈', docx: '📝', doc: '📝', link: '🔗', default: '📎',
}

export default async function HubResourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let resources: {
    id: string; title: string; description: string | null; file_url: string | null;
    file_type: string | null; sector: string | null; created_at: string;
  }[] = []
  let userSector = ''

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('sector').eq('id', user.id).single()
    userSector = profile?.sector ?? ''

    const { data } = await supabase
      .from('resources')
      .select('*')
      .or(`sector.is.null,sector.eq.${userSector}`)
      .order('created_at', { ascending: false })
    resources = data ?? []
  }

  const allSector = resources.filter(r => r.sector === null)
  const mySector = resources.filter(r => r.sector !== null)

  function ResourceCard({ r }: { r: typeof resources[0] }) {
    const ext = r.file_type ?? 'default'
    const icon = fileIcon[ext] ?? fileIcon.default
    return (
      <a
        href={r.file_url ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', textDecoration: 'none', color: '#333', transition: 'all 0.2s', marginBottom: '0.75rem' }}
      >
        <div style={{ width: '44px', height: '44px', background: '#fee2e2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: '0.2rem' }}>{r.title}</div>
          {r.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{r.description}</div>}
          <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>
            {new Date(r.created_at).toLocaleDateString()} · {r.file_type === 'link' ? 'Link' : (r.file_type ?? 'File').toUpperCase()}
          </div>
        </div>
        <span style={{ color: '#e62d2e', fontSize: '0.85rem', flexShrink: 0, alignSelf: 'center' }}>
          {r.file_type === 'link' ? 'Open →' : 'Download →'}
        </span>
      </a>
    )
  }

  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1a1a2e', margin: '0 0 0.25rem' }}>Resources</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Files and links shared with {userSector ? `${userSector} sector` : 'all members'}.
        </p>
      </div>

      {mySector.length > 0 && (
        <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
          <h3>📂 {userSector} Resources</h3>
          {mySector.map(r => <ResourceCard key={r.id} r={r} />)}
        </div>
      )}

      <div className="hub-card">
        <h3>🌐 All Members</h3>
        {allSector.length === 0 ? (
          <div className="hub-empty"><p>No general resources uploaded yet.</p></div>
        ) : (
          allSector.map(r => <ResourceCard key={r.id} r={r} />)
        )}
      </div>
    </>
  )
}
