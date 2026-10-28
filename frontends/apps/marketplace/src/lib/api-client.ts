import { createRazorClient, type RazorClient } from '@razor/api-client';

export type * from '@razor/api-client';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '';
    }
    return envUrl || '';
  }
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5000';
}

export function getApiClient(): RazorClient {
  const baseUrl = getApiBaseUrl();
  let apiKey = process.env.NEXT_PUBLIC_MANAGEMENT_API_KEY;

  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('razor_auth_token');
    if (savedToken) {
      apiKey = savedToken;
    }
  }

  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_DEV_API_KEY || 'dev-cloud-management-key-3000';
  }

  return createRazorClient({
    baseUrl,
    apiKey,
  });
}
