import { createRazorClient, type RazorClient } from '@razor/api-client';

export type * from '@razor/api-client';

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('razor_auth_token');
    if (token) {
      headers['X-Cloud-Management-Key'] = token;
      headers['Authorization'] = `Bearer ${token}`;
    }
    const rawUser = localStorage.getItem('razor_auth_user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        if (u.accountId) headers['X-Account-Id'] = u.accountId;
        if (u.userId) headers['X-User-Id'] = u.userId;
        if (u.email) headers['X-User-Email'] = u.email;
      } catch {
        // ignore parse error
      }
    }
  }
  return headers;
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
    headers: getAuthHeaders(),
  });
}

export async function fetchApi<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Cloud API returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function downloadRunXlsx(runId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${baseUrl}/api/reports/${runId}/export/xlsx`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error(`XLSX export failed with status ${res.status}`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flow-run-${runId}-report.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
