import type { Metadata } from 'next'
import { EB_Garamond } from 'next/font/google'
import './globals.css'

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Fairfield Investment Group',
    default: 'Fairfield Investment Group',
  },
  description: "Fairfield University's premier student-run investment fund, established in 2013.",
  icons: { icon: '/Website Assets/Logos/FIG Primary Logo.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ebGaramond.variable}>
      <body>{children}</body>
    </html>
  )
}
