'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ExternalLink, ImagePlus, RotateCcw, Send, Trash2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BIO_MAX, checkProfile, publishProfile, type ProfileDraft } from '@/lib/profile'
import { MemberBio, MemberCard, PmSpotlight, isPortfolioManager, type PublicMember } from '@/components/public/MemberProfile'
import { uploadImage } from '@/components/portal/ImageUpload'
import { useMutation } from '@/components/portal/feedback'

type Props = {
  member: PublicMember & { is_public: boolean }
  sectorName: string
  publicUrl: string | null
}

const inert = { inert: '' } as Record<string, string>

export default function ProfileEditor({ member, sectorName, publicUrl }: Props) {
  const initial: ProfileDraft = { name: member.name, headshot_url: member.headshot_url ?? '', linkedin_url: member.linkedin_url ?? '', bio: member.bio ?? '' }
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [view, setView] = useState<'card' | 'page'>('card')
  const [pane, setPane] = useState<'edit' | 'preview'>('edit')
  const { run, pending } = useMutation()

  const dirty = (Object.keys(draft) as (keyof ProfileDraft)[]).some(k => draft[k] !== saved[k])
  const problem = checkProfile(draft)
  const set = <K extends keyof ProfileDraft>(k: K) => (v: string) => setDraft(d => ({ ...d, [k]: v }))

  // Warn before leaving with unpublished changes.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function publish() {
    const clean = { name: draft.name.trim(), headshot_url: draft.headshot_url, linkedin_url: draft.linkedin_url.trim(), bio: draft.bio.trim() }
    const ok = await run(async () => { await publishProfile(createClient(), member.id, clean); return true }, {
      success: member.is_public ? 'Published. Your profile is live on the website.' : 'Saved',
    })
    if (ok) { setDraft(clean); setSaved(clean) }
  }

  const preview: PublicMember = {
    ...member,
    name: draft.name.trim() || 'Your name',
    headshot_url: draft.headshot_url || null,
    linkedin_url: draft.linkedin_url.trim() || null,
    bio: draft.bio.trim() || null,
  }
  const href = publicUrl ?? '#'
  const pm = isPortfolioManager(member)

  return (
    <div className="pe">
      <div className="pe-switch ui-seg" role="tablist" aria-label="Edit or preview">
        <button type="button" role="tab" aria-selected={pane === 'edit'} onClick={() => setPane('edit')}>Edit</button>
        <button type="button" role="tab" aria-selected={pane === 'preview'} onClick={() => setPane('preview')}>Preview</button>
      </div>

      <form className={`pe-form ui-card${pane === 'edit' ? ' is-shown' : ''}`} onSubmit={e => { e.preventDefault(); publish() }}>
        <div className="pe-fields">
          <PhotoField value={draft.headshot_url} onChange={set('headshot_url')} memberId={member.id} />

          <div className="ui-field">
            <label htmlFor="pe-name">Name</label>
            <input id="pe-name" className="ui-input" maxLength={120} value={draft.name} onChange={e => set('name')(e.target.value)} autoComplete="name" />
            <span className="ui-hint">Title: <strong>{member.title ?? `${sectorName} Analyst`}</strong>, set by the co-presidents.</span>
          </div>

          <div className="ui-field">
            <label htmlFor="pe-li">LinkedIn</label>
            <input id="pe-li" className="ui-input" type="url" inputMode="url" placeholder="https://www.linkedin.com/in/your-name"
              value={draft.linkedin_url} onChange={e => set('linkedin_url')(e.target.value)} />
          </div>

          <div className="ui-field">
            <div className="ui-spread">
              <label htmlFor="pe-bio" className="ui-label">Bio</label>
              <span className="ui-hint" style={{ color: draft.bio.length > BIO_MAX ? 'var(--ui-down)' : undefined }}>{draft.bio.length} / {BIO_MAX}</span>
            </div>
            <textarea id="pe-bio" className="ui-textarea pe-bio" value={draft.bio} onChange={e => set('bio')(e.target.value)}
              placeholder="Jordan is a junior from Boston majoring in Finance. Jordan joined FIG in 2025 and covers semiconductors…" />
            <span className="ui-hint">Write in the third person. Press Enter twice to start a new paragraph.</span>
          </div>
        </div>

        <div className="pe-bar">
          <span className={`pe-status${problem && dirty ? ' is-error' : dirty ? ' is-dirty' : ''}`} aria-live="polite">
            {problem && dirty ? problem : dirty ? 'Unpublished changes' : member.is_public ? 'Live on the website' : 'Saved'}
          </span>
          {dirty && (
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setDraft(saved)} disabled={pending}>
              <RotateCcw size={15} /> Discard
            </button>
          )}
          <button type="submit" className="ui-btn ui-btn-primary" disabled={!dirty || Boolean(problem) || pending}>
            <Send size={15} /> {pending ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </form>

      <aside className={`pe-preview${pane === 'preview' ? ' is-shown' : ''}`} aria-label="Live preview">
        <div className="pe-preview-head">
          <div className="ui-seg" role="tablist" aria-label="Preview">
            <button type="button" role="tab" aria-selected={view === 'card'} onClick={() => setView('card')}>Member card</button>
            <button type="button" role="tab" aria-selected={view === 'page'} onClick={() => setView('page')}>Bio page</button>
          </div>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="ui-link ui-small pe-live-link">Open live page <ExternalLink size={13} /></a>
          )}
        </div>

        <div className="pe-site" key={pane} {...inert}>
          {view === 'card' ? (
            <div className="pe-stage">
              <Scaled width={pm ? 760 : 270}>
                {pm ? <PmSpotlight m={preview} href={href} /> : <MemberCard m={preview} href={href} />}
              </Scaled>
            </div>
          ) : (
            <Scaled width={1000}>
              <MemberBio m={preview} sectorName={sectorName} backHref={href} heroHeight={300} />
            </Scaled>
          )}
        </div>
        <p className="ui-hint pe-caption">
          {dirty ? 'Preview of your unpublished changes.' : 'This is exactly how you appear on the website.'}
          {view === 'card' ? ` Shown on the ${sectorName} page.` : ''}
        </p>
      </aside>
    </div>
  )
}

/** Renders the public site's markup at its real width, scaled down to fit. */
function Scaled({ width, children }: { width: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const o = outer.current, i = inner.current
    if (!o || !i) return
    const measure = () => {
      const s = Math.min(1, o.clientWidth / width)
      setScale(s)
      setHeight(i.offsetHeight * s)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [width])

  return (
    <div ref={outer} style={{ height, overflow: 'hidden' }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left', margin: scale === 1 ? '0 auto' : undefined }}>
        {children}
      </div>
    </div>
  )
}

function PhotoField({ value, onChange, memberId }: { value: string; onChange: (v: string) => void; memberId: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  async function handle(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onChange(await uploadImage(file, 'headshots', `members/${memberId}/`, 900))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div
      className={`pe-photo${over ? ' is-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]) }}
    >
      <button type="button" className="pe-photo-thumb" onClick={() => input.current?.click()} aria-label={value ? 'Replace photo' : 'Upload photo'} disabled={busy}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" /> : <ImagePlus size={26} />}
      </button>
      <div style={{ minWidth: 0 }}>
        <div className="ui-label" style={{ marginBottom: 6 }}>Photo</div>
        <div className="ui-row">
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            <Upload size={15} /> {busy ? 'Uploading…' : value ? 'Replace' : 'Upload photo'}
          </button>
          {value && (
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => onChange('')} disabled={busy}>
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
        {error
          ? <p className="ui-hint" style={{ color: 'var(--ui-down)', marginTop: 6 }}>{error}</p>
          : <p className="ui-hint" style={{ marginTop: 6 }}>A portrait with your face near the top works best. Drop a photo here or upload one.</p>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={e => handle(e.target.files?.[0])} />
      </div>
    </div>
  )
}
