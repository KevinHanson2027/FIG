import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'

// Optional outgoing email through any SMTP account (a FIG Gmail with an
// App Password works and is free). Without it, the portal shows links to
// copy or opens the sender's own email app instead. See SETUP.md, step 5.

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

let transporter: Transporter | null = null

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporter
}

export async function sendEmail(message: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }) {
  if (!isEmailConfigured()) throw new Error('Email is not set up yet.')
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || `Fairfield Investment Group <${process.env.SMTP_USER}>`,
    ...message,
  })
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Simple branded email. Paragraphs are plain text (escaped here). */
export function brandedEmail(opts: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string }) {
  const p = opts.paragraphs
    .map(t => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333">${escapeHtml(t)}</p>`)
    .join('')
  const button = opts.button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(opts.button.url)}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px">${escapeHtml(opts.button.label)}</a></p>
       <p style="margin:0 0 16px;font-size:12px;color:#888">Or paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(opts.button.url)}</span></p>`
    : ''
  const foot = opts.footnote ? `<p style="margin:16px 0 0;font-size:12px;color:#888">${escapeHtml(opts.footnote)}</p>` : ''
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6fa;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:10px;overflow:hidden">
      <tr><td style="background:#C8102E;padding:18px 28px;color:#fff;font-family:Georgia,serif;font-size:18px;font-weight:700">Fairfield Investment Group</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#1a1a2e">${escapeHtml(opts.heading)}</h1>
        ${p}${button}${foot}
      </td></tr>
    </table>
  </td></tr></table></body></html>`
  const text = [opts.heading, '', ...opts.paragraphs, ...(opts.button ? ['', `${opts.button.label}: ${opts.button.url}`] : []), ...(opts.footnote ? ['', opts.footnote] : [])].join('\n')
  return { html, text }
}

export { mailtoLink } from '@/lib/mailto'
