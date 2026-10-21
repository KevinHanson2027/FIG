import { requireMember } from '@/lib/auth'
import { firstName } from '@/lib/format'
import { PageHeader } from '@/components/portal/ui'
import PasswordForm from './PasswordForm'

export const metadata = { title: 'Password & sign-in' }

export default async function AccountPage({ searchParams }: { searchParams: { reset?: string } }) {
  const { member, email } = await requireMember()
  const setup = searchParams.reset === '1'
  return (
    <>
      <PageHeader
        title={setup ? `Choose a new password, ${firstName(member.name)}` : 'Password & sign-in'}
        description={setup ? "You're signed in. Set a new password so you can sign in with your email next time." : `You sign in with ${email}.`}
      />
      <div style={{ maxWidth: 520 }}>
        <PasswordForm setup={setup} email={email} />
      </div>
    </>
  )
}
