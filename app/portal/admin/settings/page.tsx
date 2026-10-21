import { CircleCheck, CircleX, Server } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { isEmailConfigured } from '@/lib/email'
import { getOrigin } from '@/lib/accounts'
import { getSectors, getSettings } from '@/lib/data'
import { Card, NoAccess, PageHeader } from '@/components/portal/ui'
import { GivingForm, SectorsEditor, SignupForm, TermForm } from './forms'

export const metadata = { title: 'Settings' }

function Check({ ok, label, help }: { ok: boolean; label: string; help: string }) {
  return (
    <li className="ui-list-item" style={{ padding: '10px 0', alignItems: 'flex-start' }}>
      {ok ? <CircleCheck size={18} style={{ color: 'var(--ui-green)', flexShrink: 0 }} /> : <CircleX size={18} style={{ color: 'var(--ui-amber)', flexShrink: 0 }} />}
      <div className="ui-list-main"><div className="ui-list-title">{label}</div><div className="ui-list-sub">{help}</div></div>
    </li>
  )
}

/** Is the secret key set, and does Supabase accept it? */
async function serviceKeyStatus(): Promise<'ok' | 'missing' | 'rejected'> {
  if (!hasServiceRole()) return 'missing'
  try {
    const { error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 })
    return error ? 'rejected' : 'ok'
  } catch {
    return 'rejected'
  }
}

export default async function SettingsPage() {
  const { access } = await requireMember()
  if (!access.isAdmin) return <NoAccess what="Settings are for the co-presidents." />
  const [settings, sectors, keyStatus, origin] = await Promise.all([getSettings(), getSectors(true), serviceKeyStatus(), getOrigin()])
  const service = keyStatus === 'ok'
  const email = isEmailConfigured()
  const siteUrlSet = Boolean(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL)

  return (
    <>
      <PageHeader title="Settings" description="Club-wide settings. Most of these change once a semester." />
      <div className="ui-stack">
        <div className="ui-grid ui-grid-2">
          <TermForm initial={settings.term} />
          <Card title={<><Server size={18} /> System status</>} description="Set in Vercel → Project → Settings → Environment Variables. See SETUP.md.">
            <ul className="ui-list">
              <Check ok={service} label="Account management" help={
                keyStatus === 'ok' ? 'Sign-in links, invites and approvals work.'
                : keyStatus === 'rejected' ? "SUPABASE_SERVICE_ROLE_KEY is set, but Supabase didn't accept it. Copy the secret key again (step 3), then redeploy."
                : 'Add SUPABASE_SERVICE_ROLE_KEY to send sign-in links (step 3).'} />
              <Check ok={siteUrlSet} label="Links in emails" help={siteUrlSet ? `Point to ${origin}.` : `Point to ${origin}. Add SITE_URL (step 3) to use your main address.`} />
              <Check ok={email} label="Outgoing email" help={email ? 'Invites, password resets and recruiting emails send automatically.' : 'Optional. Without SMTP, the portal gives you links to copy or opens your own email app (step 5).'} />
              <Check ok={Boolean(process.env.CRON_SECRET)} label="Daily snapshot" help={process.env.CRON_SECRET ? 'Portfolio value is recorded every weekday evening and the database stays awake.' : 'Add CRON_SECRET so the daily job can run (step 6).'} />
            </ul>
          </Card>
        </div>
        <SectorsEditor sectors={sectors} />
        <div className="ui-grid ui-grid-2">
          <SignupForm initial={settings.signup} emailReady={service && email} />
          <GivingForm initial={settings.donations} />
        </div>
      </div>
    </>
  )
}
