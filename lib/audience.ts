// Who a member can post announcements / resources to.
import type { Access } from '@/lib/roles'
import type { Audience } from '@/lib/types'

export type AudienceOption = { key: string; audience: Audience; sector: string | null; label: string }

export function audienceOptions(access: Access, sectors: string[]): AudienceOption[] {
  const out: AudienceOption[] = []
  if (access.isAdmin) {
    out.push({ key: 'all', audience: 'all', sector: null, label: 'Everyone' })
    out.push({ key: 'pm', audience: 'pm', sector: null, label: 'Portfolio Managers only' })
  }
  if (access.isAdmin || access.isPpgManager) out.push({ key: 'ppg', audience: 'ppg', sector: null, label: 'Portfolio Performance Group' })
  const sectorList = access.isAdmin ? sectors : access.pmSectors
  for (const s of sectorList) out.push({ key: `sector:${s}`, audience: 'sector', sector: s, label: `${s} sector` })
  return out
}
