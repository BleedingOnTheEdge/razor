import { createRazorClient, type RazorClient } from '@razor/api-client';

let clientInstance: RazorClient | null = null;

export function getApiClient(): RazorClient {
  if (!clientInstance) {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
    const apiKey = process.env.NEXT_PUBLIC_MANAGEMENT_API_KEY || undefined;

    clientInstance = createRazorClient({
      baseUrl,
      apiKey,
    });
  }
  return clientInstance;
}
