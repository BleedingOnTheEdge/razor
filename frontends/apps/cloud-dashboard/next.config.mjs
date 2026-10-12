/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@razor/contracts', '@razor/api-client', '@razor/ui-kit'],
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
    NEXT_PUBLIC_MANAGEMENT_API_KEY: process.env.MANAGEMENT_API_KEY || '',
  },
};

export default nextConfig;
