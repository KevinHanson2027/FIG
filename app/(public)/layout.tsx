import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getSectors } from '@/lib/data'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const sectors = await getSectors()
  return (
    <>
      <Header sectors={sectors.map(s => ({ name: s.name, slug: s.slug }))} />
      {children}
      <Footer />
    </>
  )
}
