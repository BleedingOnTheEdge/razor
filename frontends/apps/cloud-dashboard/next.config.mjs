/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@razor/contracts', '@razor/api-client', '@razor/ui-kit'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '',
    NEXT_PUBLIC_MANAGEMENT_API_KEY: process.env.MANAGEMENT_API_KEY || '',
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/auth/register',
        permanent: false,
      },
      { source: '/instances/:path*', destination: '/panel/instances/:path*', permanent: true },
      { source: '/instances', destination: '/panel/instances', permanent: true },
      { source: '/runs/:path*', destination: '/panel/runs/:path*', permanent: true },
      { source: '/runs', destination: '/panel/runs', permanent: true },
      { source: '/reports/:path*', destination: '/panel/reports/:path*', permanent: true },
      { source: '/reports', destination: '/panel/reports', permanent: true },
      { source: '/tickets/:path*', destination: '/panel/tickets/:path*', permanent: true },
      { source: '/tickets', destination: '/panel/tickets', permanent: true },
      { source: '/admin/:path*', destination: '/panel/admin/:path*', permanent: true },
      { source: '/admin', destination: '/panel/admin', permanent: true },
      { source: '/profile/:path*', destination: '/panel/profile/:path*', permanent: true },
      { source: '/profile', destination: '/panel/profile', permanent: true },
      { source: '/settings/:path*', destination: '/panel/settings/:path*', permanent: true },
      { source: '/settings', destination: '/panel/settings', permanent: true },
      { source: '/bundles/:path*', destination: '/panel/bundles/:path*', permanent: true },
      { source: '/bundles', destination: '/panel/bundles', permanent: true },
      { source: '/live/:path*', destination: '/panel/live/:path*', permanent: true },
      { source: '/live', destination: '/panel/live', permanent: true },
    ];
  },
  async rewrites() {
    const marketplaceUrl = process.env.MARKETPLACE_URL || 'http://localhost:3001';
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    return [
      {
        source: '/marketplace',
        destination: `${marketplaceUrl}/marketplace`,
      },
      {
        source: '/marketplace/:path*',
        destination: `${marketplaceUrl}/marketplace/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
