// Shown inside the portal shell while a page loads its data.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="ui-skeleton" style={{ height: 34, width: 260, marginBottom: 10 }} />
      <div className="ui-skeleton" style={{ height: 16, width: 380, maxWidth: '80%', marginBottom: 28 }} />
      <div className="ui-grid ui-grid-3" style={{ marginBottom: 20 }}>
        {[0, 1, 2].map(i => <div key={i} className="ui-skeleton" style={{ height: 108 }} />)}
      </div>
      <div className="ui-skeleton" style={{ height: 280 }} />
    </div>
  )
}
