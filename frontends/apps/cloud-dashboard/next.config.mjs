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
