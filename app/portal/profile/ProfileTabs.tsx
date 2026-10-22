import { SubNav } from '@/components/portal/ui'

export function ProfileTabs({ active }: { active: 'profile' | 'plans' | 'password' }) {
  return (
    <SubNav label="Profile sections" items={[
      { href: '/portal/profile', label: 'Website profile', active: active === 'profile' },
      { href: '/portal/profile?tab=plans', label: 'Team, plans & roles', active: active === 'plans' },
      { href: '/portal/account', label: 'Password', active: active === 'password' },
    ]} />
  )
}
