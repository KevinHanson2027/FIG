'use client'
import { useRef, useState } from 'react'
import { ImagePlus, Link2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Shrink large photos in the browser before upload (keeps storage small and pages fast). */
async function resize(file: File, maxSize: number): Promise<{ blob: Blob; ext: string }> {
  const keepPng = file.type === 'image/png'
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error("This photo format isn't supported. Please upload a JPG or PNG (iPhone: Settings → Camera → Formats → Most Compatible).")
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  if (!keepPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const type = keepPng ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, type, 0.86))
  if (!blob) throw new Error('Could not process this image.')
  return { blob, ext: keepPng ? 'png' : 'jpg' }
}

export function ImageUpload({ value, onChange, bucket, pathPrefix, maxSize = 1600, allowUrl = false, label = 'Upload image', round = false }: {
  value: string
  onChange: (url: string) => void
  bucket: 'headshots' | 'images'
  pathPrefix: string
  maxSize?: number
  allowUrl?: boolean
  label?: string
  round?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showUrl, setShowUrl] = useState(false)

  async function handle(file: File) {
    setBusy(true)
    setError('')
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('That file is over 25 MB. Please choose a smaller image.')
      const { blob, ext } = await resize(file, maxSize)
      const supabase = createClient()
      const path = `${pathPrefix}${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type, upsert: false })
      if (upErr) throw new Error(/row-level|security/i.test(upErr.message) ? "You don't have permission to upload here." : upErr.message)
      onChange(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="ui-row" style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'nowrap' }}>
      <div style={{
        width: 88, height: 88, borderRadius: round ? '50%' : 12, flexShrink: 0, overflow: 'hidden',
        background: '#f1f2f6', border: '1px solid var(--ui-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa0ad',
      }}>
        {value
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <ImagePlus size={24} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="ui-row">
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            <ImagePlus size={15} /> {busy ? 'Uploading…' : value ? 'Replace' : label}
          </button>
          {value && (
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => onChange('')}>
              <Trash2 size={15} /> Remove
            </button>
          )}
          {allowUrl && (
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setShowUrl(s => !s)}>
              <Link2 size={15} /> {showUrl ? 'Hide link' : 'Use a link'}
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />
        {showUrl && (
          <input className="ui-input" style={{ marginTop: 8 }} value={value} placeholder="https://… or /Website Assets/…" onChange={e => onChange(e.target.value)} />
        )}
        {error ? <p className="ui-hint" style={{ color: 'var(--ui-down)', marginTop: 6 }}>{error}</p>
          : <p className="ui-hint" style={{ marginTop: 6 }}>JPG or PNG. Large photos are resized automatically.</p>}
      </div>
    </div>
  )
}
