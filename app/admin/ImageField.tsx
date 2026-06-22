'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ImageField({
  value, onChange, bucket = 'images', folder = '',
}: { value: string; onChange: (v: string) => void; bucket?: string; folder?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showUrl, setShowUrl] = useState(false)

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadError('')
    const supabase = createClient()
    const ext  = file.name.split('.').pop()
    const path = `${folder}${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })
    if (error) {
      setUploadError('Upload failed: ' + error.message)
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)
      onChange(publicUrl)
    }
    setUploading(false)
  }

  return (
    <div
      style={{
        border: '2px dashed #ddd', borderRadius: '10px', padding: '1.25rem',
        background: '#fafafa', textAlign: 'center',
      }}
    >
      {/* Current image preview */}
      {value && (
        <div style={{ marginBottom: '1rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="current"
            style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '6px', objectFit: 'cover', border: '1px solid #eee' }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        </div>
      )}

      {/* Primary action: Upload */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: '0.7rem 1.5rem', background: '#C80F2E', color: 'white',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: 600,
        }}
      >
        {uploading ? 'Uploading…' : value ? '📷 Replace Image' : '📷 Upload Image'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*, .heic, .heif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
      />

      {uploadError && (
        <p style={{ color: '#C80F2E', fontSize: '0.8rem', marginTop: '0.5rem' }}>{uploadError}</p>
      )}

      {/* Secondary: paste URL toggle */}
      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setShowUrl(s => !s)}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {showUrl ? 'Hide URL field' : 'or paste an image URL instead'}
        </button>
      </div>

      {showUrl && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          style={{
            marginTop: '0.5rem', width: '100%', padding: '0.6rem 0.75rem',
            border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem',
          }}
        />
      )}

      {value && (
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            ✕ Remove image
          </button>
        </div>
      )}
    </div>
  )
}
