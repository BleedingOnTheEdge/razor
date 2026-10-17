/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@razor/contracts', '@razor/api-client', '@razor/ui-kit'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
    NEXT_PUBLIC_MANAGEMENT_API_KEY: process.env.MANAGEMENT_API_KEY || '',
    NEXT_PUBLIC_DASHBOARD_URL: process.env.DASHBOARD_URL || process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3002',
  },
};

export default nextConfig;
