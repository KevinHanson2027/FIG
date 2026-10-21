import { Newspaper } from 'lucide-react'
import type { NewsItem } from '@/lib/market'
import { relative } from '@/lib/format'
import { EmptyState } from './ui'

export function NewsList({ items, empty = 'No recent headlines.' }: { items: NewsItem[]; empty?: string }) {
  if (items.length === 0) return <EmptyState icon={<Newspaper size={20} />} title={empty} />
  return (
    <ul className="ui-list">
      {items.map(n => (
        <li key={n.link}>
          <a className="ui-list-item" href={n.link} target="_blank" rel="noopener noreferrer">
            <div className="ui-list-main">
              <div className="ui-list-title ui-clamp-2" style={{ fontWeight: 600, lineHeight: 1.4 }}>{n.title}</div>
              <div className="ui-list-sub">
                {n.source}{n.publishedAt ? ` · ${relative(n.publishedAt)}` : ''}
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
