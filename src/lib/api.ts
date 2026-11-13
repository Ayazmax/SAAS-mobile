import { apiUrl } from './env';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
  type SessionPayload,
} from './auth-session';
import type { JobDetail, JobListItem } from './jobs';

interface ApiEnvelope<T> {
  data: T;
  errors?: Array<{ message?: string }>;
}

const clientHeader = { 'x-dreamware-client': 'cleaner-mobile' };

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${apiUrl}/health`);
  if (!response.ok) {
    throw new ApiRequestError(response.status, 'API health check failed.');
  }
  const body = (await response.json()) as ApiEnvelope<{ status: string }> | { status: string };
  if ('data' in body && body.data) return body.data;
  if ('status' in body && typeof body.status === 'string') {
    return { status: body.status };
  }
  return { status: 'ok' };
}

export async function login(email: string, password: string): Promise<SessionPayload> {
  const payload = await request<SessionPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await persistMobileSession(payload);
  return payload;
}

export async function registerCleaner(
  email: string,
  password: string,
  acceptedTerms: boolean,
): Promise<SessionPayload> {
  const payload = await request<SessionPayload>('/auth/cleaner/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      acceptedTerms,
      policyVersion: '2026-11-07',
    }),
  });
  await persistMobileSession(payload);
  return payload;
}

async function persistMobileSession(payload: SessionPayload): Promise<void> {
  if (!payload.refreshToken) {
    throw new ApiRequestError(
      500,
      'This API build does not return a mobile refresh token. Rebuild the API.',
    );
  }
  await saveSession(payload);
}

export async function verifyEmail(code: string): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiRequestError(401, 'Please register or sign in again.');
  }
  await request(
    '/auth/verify-email',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
    accessToken,
    true,
  );
}

export async function resendVerification(): Promise<{
  accepted: true;
  verificationOtp?: string;
}> {
  return authenticatedRequest('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        ...clientHeader,
        'content-type': 'application/json',
      },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  } finally {
    await clearSession();
  }
}

export async function sessionHome(): Promise<{ home: 'office' | 'jobs' }> {
  return authenticatedRequest('/auth/home');
}

export async function getTenant(): Promise<{ name: string }> {
  return authenticatedRequest('/tenants/current');
}

export async function listMyJobs(): Promise<JobListItem[]> {
  return authenticatedRequest('/jobs');
}

export interface CleanerEarnings {
  from: string;
  to: string;
  currency: string;
  timezone: string;
  minutes: number;
  hours: number;
  hourlyPay: number | null;
  amount: string;
}

export async function getMyEarnings(
  from: string,
  to: string,
): Promise<CleanerEarnings> {
  return authenticatedRequest(
    `/earnings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export async function getJob(bookingId: string): Promise<JobDetail> {
  return authenticatedRequest(`/jobs/${bookingId}`);
}

export async function startJob(bookingId: string): Promise<{ status: string }> {
  return authenticatedRequest(`/jobs/${bookingId}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function pauseJob(bookingId: string): Promise<{ status: string }> {
  return authenticatedRequest(`/jobs/${bookingId}/pause`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function resumeJob(bookingId: string): Promise<{ status: string }> {
  return authenticatedRequest(`/jobs/${bookingId}/resume`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function completeJob(
  bookingId: string,
): Promise<{ status: string }> {
  return authenticatedRequest(`/jobs/${bookingId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function updateChecklistItem(
  bookingId: string,
  itemId: string,
  status: 'PENDING' | 'DONE' | 'SKIPPED',
): Promise<unknown> {
  return authenticatedRequest(`/jobs/${bookingId}/checklist/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function addJobNote(
  bookingId: string,
  body: string,
  kind: 'NOTE' | 'ISSUE' = 'NOTE',
): Promise<unknown> {
  return authenticatedRequest(`/jobs/${bookingId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ kind, body }),
  });
}

export async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let accessToken = await getAccessToken();
  if (!accessToken) {
    accessToken = (await refreshSession()).accessToken;
  }

  try {
    return await request<T>(path, options, accessToken);
  } catch (error: unknown) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    const refreshed = await refreshSession();
    return request<T>(path, options, refreshed.accessToken);
  }
}

export async function refreshSession(): Promise<SessionPayload> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await clearSession();
    throw new ApiRequestError(401, 'Please sign in again.');
  }
  const payload = await request<SessionPayload>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  await saveSession(payload);
  return payload;
}

async function request<T>(
  path: string,
  options: RequestInit,
  accessToken?: string,
  preserveSessionOnUnauthorized = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('x-dreamware-client', 'cleaner-mobile');
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (response.status === 401) {
    if (!preserveSessionOnUnauthorized) await clearSession();
    throw new ApiRequestError(
      401,
      preserveSessionOnUnauthorized
        ? (body?.errors?.[0]?.message ?? 'That code is incorrect or expired.')
        : 'Session expired. Sign in again.',
    );
  }

  if (!response.ok) {
    const message =
      body?.errors?.[0]?.message ?? `Request failed (${String(response.status)}).`;
    throw new ApiRequestError(response.status, message);
  }

  if (!body || !('data' in body)) {
    throw new ApiRequestError(response.status, 'Unexpected API response.');
  }
  return body.data;
}
