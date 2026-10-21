import type { Metadata } from 'next'
import { Libre_Baskerville, Figtree } from 'next/font/google'
import './globals.css'
import './ui.css'

/* Primary typography — headings, brand marks, display text */
const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-libre-baskerville',
  display: 'swap',
})

/* Supporting typography — body copy, navigation, UI */
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Fairfield Investment Group',
    default: 'Fairfield Investment Group',
  },
  description: "Fairfield University's premier student-run investment fund, established in 2013.",
  icons: { icon: '/Website Assets/FIG Favicon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${libreBaskerville.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  )
}
