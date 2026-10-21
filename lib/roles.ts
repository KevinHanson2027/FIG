// Role metadata and the abilities each combination of roles unlocks.
// Shared by server and client code; the database enforces the same rules
// through Row Level Security, so this only decides what the UI shows.
import type { Role, RoleGrant } from '@/lib/types'

export const ROLES: Record<Role, { label: string; short: string; description: string }> = {
  admin: {
    label: 'Co-President (Admin)',
    short: 'Admin',
    description: 'Control panel, approvals, roles and every workspace.',
  },
  portfolio_manager: {
    label: 'Portfolio Manager',
    short: 'PM',
    description: 'Runs a sector: assigns work, takes attendance and manages its holdings.',
  },
  marketing: {
    label: 'Marketing',
    short: 'Marketing',
    description: 'Edits website text, links and images, and publishes reports.',
  },
  ppg_member: {
    label: 'PPG Member',
    short: 'PPG',
    description: 'Portfolio Performance Group: advanced analytics, technicals and PPG files.',
  },
  ppg_manager: {
    label: 'PPG Manager',
    short: 'PPG Manager',
    description: 'Runs PPG: assigns PPG work and edits the portfolio reporting pages.',
  },
  recruiting: {
    label: 'Recruiting',
    short: 'Recruiting',
    description: 'Runs the recruiting pipeline: referrals, applications and interviews.',
  },
  donor_relations: {
    label: 'Donor Relations',
    short: 'Donor Relations',
    description: 'Tracks donations received and given, and the 5% giving target.',
  },
}

/** Roles a member can ask for from their profile (admins are appointed). */
export const REQUESTABLE_ROLES: Exclude<Role, 'admin'>[] = [
  'ppg_member',
  'portfolio_manager',
  'marketing',
  'recruiting',
  'ppg_manager',
  'donor_relations',
]

export type Access = {
  isAdmin: boolean
  pmSectors: string[]
  isMarketing: boolean
  isPpgMember: boolean
  isPpgManager: boolean
  isRecruiting: boolean
  isDonorRelations: boolean
  canManageTeams: boolean
  hasPpg: boolean
  canManagePpg: boolean
  canEditContent: boolean
  canEditAllPages: boolean
  canManageReports: boolean
  canRecruit: boolean
  canManageDonations: boolean
  canUploadResources: boolean
}

export function getAccess(roles: RoleGrant[]): Access {
  const has = (r: Role) => roles.some(g => g.role === r)
  const isAdmin = has('admin')
  const pmSectors = roles.filter(g => g.role === 'portfolio_manager' && g.sector).map(g => g.sector!)
  const isMarketing = has('marketing')
  const isPpgMember = has('ppg_member')
  const isPpgManager = has('ppg_manager')
  const isRecruiting = has('recruiting')
  const isDonorRelations = has('donor_relations')

  return {
    isAdmin,
    pmSectors,
    isMarketing,
    isPpgMember,
    isPpgManager,
    isRecruiting,
    isDonorRelations,
    canManageTeams: isAdmin || pmSectors.length > 0,
    hasPpg: isAdmin || isPpgMember || isPpgManager,
    canManagePpg: isAdmin || isPpgManager,
    canEditContent: isAdmin || isMarketing || isPpgManager,
    canEditAllPages: isAdmin || isMarketing,
    canManageReports: isAdmin || isMarketing || isPpgManager,
    canRecruit: isAdmin || isRecruiting,
    canManageDonations: isAdmin || isDonorRelations,
    canUploadResources: isAdmin || pmSectors.length > 0 || isPpgManager,
  }
}

/** PMs edit their sector's holdings; the PPG manager and admins edit all. */
export function canEditHoldingsIn(access: Access, sector: string | null) {
  if (access.isAdmin || access.isPpgManager) return true
  return sector !== null && access.pmSectors.includes(sector)
}

/** Short role line for the sidebar, e.g. "Co-President · PPG". */
export function roleLine(title: string | null, roles: RoleGrant[]) {
  const parts: string[] = []
  if (title) parts.push(title)
  for (const g of roles) {
    if (g.role === 'admin' || g.role === 'portfolio_manager') continue // already in the title
    parts.push(ROLES[g.role].short)
  }
  return parts.join(' · ') || 'Analyst'
}
