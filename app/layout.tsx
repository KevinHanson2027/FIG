import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
