/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/marketplace',
  reactStrictMode: true,
  transpilePackages: ['@razor/contracts', '@razor/api-client', '@razor/ui-kit'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '',
    NEXT_PUBLIC_MANAGEMENT_API_KEY: process.env.MANAGEMENT_API_KEY || '',
    NEXT_PUBLIC_DASHBOARD_URL: process.env.DASHBOARD_URL || process.env.NEXT_PUBLIC_DASHBOARD_URL || '',
  },
};

export default nextConfig;
