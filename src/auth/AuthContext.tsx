import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiRequestError,
  getTenant,
  listMyJobs,
  login as apiLogin,
  logout as apiLogout,
  registerCleaner,
  resendVerification as apiResendVerification,
  refreshSession,
  sessionHome,
  verifyEmail as apiVerifyEmail,
} from '../lib/api';
import {
  clearSession,
  getAccessToken,
  getCurrentUser,
  getWorkspaceName,
  saveWorkspaceName,
  type SessionUser,
} from '../lib/auth-session';

type AuthStatus = 'loading' | 'signedOut' | 'verificationRequired' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  workspaceName: string | null;
  error: string | null;
  verificationOtp: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    acceptedTerms: boolean,
  ) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationOtp, setVerificationOtp] = useState<string | null>(null);

  const requireVerification = useCallback(
    (nextUser: SessionUser, developmentOtp?: string) => {
      setUser(nextUser);
      setWorkspaceName(null);
      setVerificationOtp(developmentOtp ?? null);
      setStatus('verificationRequired');
    },
    [],
  );

  const establishCleanerSession = useCallback(async () => {
    const home = await sessionHome();
    if (home.home !== 'jobs') {
      await apiLogout();
      throw new ApiRequestError(
        403,
        'This account is for the web office. Sign in there instead.',
      );
    }
    try {
      await listMyJobs();
    } catch (caught: unknown) {
      await apiLogout();
      if (
        caught instanceof ApiRequestError &&
        caught.message.toLowerCase().includes('cleaner profile')
      ) {
        throw new ApiRequestError(
          403,
          'Ask your office to add you as a cleaner before using this app.',
        );
      }
      throw caught;
    }
    const tenant = await getTenant();
    await saveWorkspaceName(tenant.name);
    const nextUser = await getCurrentUser();
    setUser(nextUser);
    setWorkspaceName(tenant.name);
    setVerificationOtp(null);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setStatus('signedOut');
          return;
        }
        let storedUser = await getCurrentUser();
        try {
          const refreshed = await refreshSession();
          storedUser = refreshed.user;
        } catch {
          // Access token may still be valid.
        }
        if (!storedUser?.emailVerified) {
          if (!storedUser) {
            await clearSession();
            setStatus('signedOut');
            return;
          }
          requireVerification(storedUser);
          return;
        }
        await establishCleanerSession();
      } catch {
        await clearSession();
        setUser(null);
        setWorkspaceName(null);
        setStatus('signedOut');
      }
    })();
  }, [establishCleanerSession, requireVerification]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const session = await apiLogin(email.trim(), password);
      if (!session.user.emailVerified) {
        requireVerification(session.user, session.verificationOtp);
        return;
      }
      try {
        await establishCleanerSession();
      } catch (caught: unknown) {
        setStatus('signedOut');
        setUser(null);
        setWorkspaceName(null);
        throw caught;
      }
    },
    [establishCleanerSession, requireVerification],
  );

  const register = useCallback(
    async (email: string, password: string, acceptedTerms: boolean) => {
      setError(null);
      const session = await registerCleaner(
        email.trim(),
        password,
        acceptedTerms,
      );
      requireVerification(session.user, session.verificationOtp);
    },
    [requireVerification],
  );

  const verifyEmail = useCallback(
    async (code: string) => {
      setError(null);
      await apiVerifyEmail(code);
      const session = await refreshSession();
      if (!session.user.emailVerified) {
        throw new ApiRequestError(409, 'Email verification is not complete yet.');
      }
      await establishCleanerSession();
    },
    [establishCleanerSession],
  );

  const resendVerification = useCallback(async () => {
    setError(null);
    const result = await apiResendVerification();
    setVerificationOtp(result.verificationOtp ?? null);
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await apiLogout();
    setUser(null);
    setWorkspaceName(null);
    setVerificationOtp(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      workspaceName: workspaceName ?? (status === 'signedIn' ? 'Workspace' : null),
      error,
      verificationOtp,
      signIn,
      register,
      verifyEmail,
      resendVerification,
      signOut,
      clearError: () => setError(null),
    }),
    [
      status,
      user,
      workspaceName,
      error,
      verificationOtp,
      signIn,
      register,
      verifyEmail,
      resendVerification,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}

export async function readStoredWorkspace(): Promise<string | null> {
  return getWorkspaceName();
}
