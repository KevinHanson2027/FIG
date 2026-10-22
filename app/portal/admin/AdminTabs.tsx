import { SubNav } from '@/components/portal/ui'

export function AdminTabs({ active, inbox }: { active: 'inbox' | 'members' | 'settings' | 'activity'; inbox?: number }) {
  return (
    <SubNav label="Control Panel" items={[
      { href: '/portal/admin', label: 'Inbox', active: active === 'inbox', count: inbox },
      { href: '/portal/admin/members', label: 'Members & roles', active: active === 'members' },
      { href: '/portal/admin/settings', label: 'Settings', active: active === 'settings' },
      { href: '/portal/admin/activity', label: 'Activity', active: active === 'activity' },
    ]} />
  )
}
