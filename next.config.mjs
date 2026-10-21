/** @type {import('next').NextConfig} */
const nextConfig = {
  // No images.remotePatterns: nothing uses next/image, and a *.supabase.co
  // pattern let anyone push images from any Supabase project through our optimizer.

  // The old shared-key admin panel and member hub now live in the member portal.
  async redirects() {
    return [
      { source: '/hub', destination: '/portal', permanent: false },
      { source: '/hub/resources', destination: '/portal/resources', permanent: false },
      { source: '/hub/tools', destination: '/portal/tools', permanent: false },
      { source: '/admin', destination: '/portal/admin', permanent: false },
      { source: '/admin/members', destination: '/portal/admin/members', permanent: false },
      { source: '/admin/users', destination: '/portal/admin/members', permanent: false },
      { source: '/admin/content', destination: '/portal/content', permanent: false },
      { source: '/admin/resources', destination: '/portal/resources', permanent: false },
      { source: '/admin/announcements', destination: '/portal', permanent: false },
    ]
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
}

export default nextConfig
