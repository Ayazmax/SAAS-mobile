import * as SecureStore from 'expo-secure-store';

const accessTokenKey = 'dw_access_token';
const refreshTokenKey = 'dw_refresh_token';
const csrfTokenKey = 'dw_csrf_token';
const userKey = 'dw_user';
const workspaceKey = 'dw_workspace';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
}

export interface SessionPayload {
  accessToken: string;
  refreshToken?: string;
  csrfToken: string;
  expiresInSeconds: number;
  user: SessionUser;
  activeMembership: {
    id: string;
    tenantId: string;
  } | null;
  verificationOtp?: string;
}

export async function saveSession(session: SessionPayload): Promise<void> {
  await SecureStore.setItemAsync(accessTokenKey, session.accessToken);
  await SecureStore.setItemAsync(csrfTokenKey, session.csrfToken);
  await SecureStore.setItemAsync(userKey, JSON.stringify(session.user));
  if (session.refreshToken) {
    await SecureStore.setItemAsync(refreshTokenKey, session.refreshToken);
  }
}

export async function saveWorkspaceName(name: string): Promise<void> {
  await SecureStore.setItemAsync(workspaceKey, name);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(accessTokenKey);
  await SecureStore.deleteItemAsync(refreshTokenKey);
  await SecureStore.deleteItemAsync(csrfTokenKey);
  await SecureStore.deleteItemAsync(userKey);
  await SecureStore.deleteItemAsync(workspaceKey);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(accessTokenKey);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(refreshTokenKey);
}

export async function getCsrfToken(): Promise<string | null> {
  return SecureStore.getItemAsync(csrfTokenKey);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const value = await SecureStore.getItemAsync(userKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionUser;
  } catch {
    return null;
  }
}

export async function getWorkspaceName(): Promise<string | null> {
  return SecureStore.getItemAsync(workspaceKey);
}
