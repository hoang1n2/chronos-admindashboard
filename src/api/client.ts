/**
 * API Client for Admin Dashboard
 * All requests go through https://api.davarium.com
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.davarium.com';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('admin_token');
}

/**
 * Make an authenticated API request
 */
export async function apiRequest(endpoint: string, options: RequestOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!skipAuth && token) {
    headers['Cookie'] = `auth-token=${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  return fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });
}

export async function apiGet(endpoint: string, options?: RequestOptions): Promise<Response> {
  return apiRequest(endpoint, { ...options, method: 'GET' });
}

export async function apiPost(endpoint: string, data?: unknown, options?: RequestOptions): Promise<Response> {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiPut(endpoint: string, data?: unknown, options?: RequestOptions): Promise<Response> {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function apiDelete(endpoint: string, options?: RequestOptions): Promise<Response> {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
}

export async function apiPatch(endpoint: string, data?: unknown, options?: RequestOptions): Promise<Response> {
  return apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}
