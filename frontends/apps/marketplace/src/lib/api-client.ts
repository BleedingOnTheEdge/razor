import { createRazorClient, type RazorClient } from '@razor/api-client';

export type * from '@razor/api-client';

export function getApiClient(): RazorClient {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  let apiKey = process.env.NEXT_PUBLIC_MANAGEMENT_API_KEY;

  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('razor_auth_token');
    if (savedToken) {
      apiKey = savedToken;
    }
  }

  if (!apiKey && process.env.NODE_ENV !== 'production') {
    apiKey = process.env.NEXT_PUBLIC_DEV_API_KEY || '';
  }

  return createRazorClient({
    baseUrl,
    apiKey,
  });
}
