export default function AdminUsersPage() {
  return (
    <>
      <div className="admin-header">
        <h1>Access Keys</h1>
        <p>This app uses shared password keys — no individual accounts needed.</p>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>How Access Works</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
            <h3 style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '1.1rem' }}>🔑 Admin Key</h3>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.6', marginBottom: '0.75rem' }}>
              Whoever has the Admin Key lands at <code style={{ background: '#fee2e2', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>/admin</code> after login.
            </p>
            <ul style={{ fontSize: '0.85rem', color: '#666', paddingLeft: '1.2rem', lineHeight: '1.8' }}>
              <li>Edit all website page content</li>
              <li>Add / edit / remove members</li>
              <li>Upload resources &amp; files</li>
              <li>Post announcements</li>
            </ul>
            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.75rem' }}>
              Set in Vercel env vars as <code>ADMIN_KEY</code>
            </p>
          </div>

          <div style={{ padding: '1.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px' }}>
            <h3 style={{ color: '#2563eb', marginBottom: '0.75rem', fontSize: '1.1rem' }}>🔑 Member Key</h3>
            <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.6', marginBottom: '0.75rem' }}>
              Whoever has the Member Key lands at <code style={{ background: '#dbeafe', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>/hub</code> after login.
            </p>
            <ul style={{ fontSize: '0.85rem', color: '#666', paddingLeft: '1.2rem', lineHeight: '1.8' }}>
              <li>View sector resources &amp; files</li>
              <li>Read announcements</li>
              <li>Access market tools</li>
              <li>No edit access</li>
            </ul>
            <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.75rem' }}>
              Set in Vercel env vars as <code>MEMBER_KEY</code>
            </p>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>Changing a Key</h2>
        </div>
        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#444', lineHeight: '2' }}>
          <li>Go to your <strong>Vercel dashboard → Project → Settings → Environment Variables</strong></li>
          <li>Update <code>ADMIN_KEY</code> or <code>MEMBER_KEY</code> to the new value</li>
          <li>Click <strong>Save</strong> and trigger a <strong>Redeploy</strong></li>
          <li>Share the new key with the relevant people — old key stops working immediately</li>
        </ol>
        <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '1rem' }}>
          Tip: keep both keys strong (12+ characters, mix of letters, numbers, symbols).
        </p>
      </div>
    </>
  )
}
