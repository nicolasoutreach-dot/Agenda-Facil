import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchSession, logoutUser, refreshAuthTokens } from '../features/auth/authAPI.js';

function parseDurationToMs(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const raw = String(value).trim().toLowerCase();

  if (!raw) {
    return null;
  }

  const simpleMatch = raw.match(/^(\d+)(ms|s|m|h|d)?$/);

  if (simpleMatch) {
    const amount = Number(simpleMatch[1]);
    const unit = simpleMatch[2] ?? 'ms';

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    switch (unit) {
      case 'ms':
        return amount;
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return null;
    }
  }

  const extendedMatch = raw.match(/^(\d+)\s*(millisecond|milliseconds|second|seconds|minute|minutes|hour|hours|day|days)$/);

  if (extendedMatch) {
    const amount = Number(extendedMatch[1]);
    const unit = extendedMatch[2];

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    switch (unit) {
      case 'millisecond':
      case 'milliseconds':
        return amount;
      case 'second':
      case 'seconds':
        return amount * 1000;
      case 'minute':
      case 'minutes':
        return amount * 60 * 1000;
      case 'hour':
      case 'hours':
        return amount * 60 * 60 * 1000;
      case 'day':
      case 'days':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return null;
    }
  }

  return null;
}

function calculateRefreshDelay(accessTokenTtlMs) {
  if (!Number.isFinite(accessTokenTtlMs) || accessTokenTtlMs <= 0) {
    return null;
  }

  const buffer = Math.min(60_000, Math.floor(accessTokenTtlMs * 0.2));
  const candidate = accessTokenTtlMs - buffer;

  if (candidate > 0) {
    return candidate;
  }

  return Math.max(Math.floor(accessTokenTtlMs * 0.5), 10_000);
}

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider. Verifique a estrutura de App.jsx.');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [accessTokenTtlMs, setAccessTokenTtlMs] = useState(null);
  const refreshTimerRef = useRef(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const applyAuthResponse = useCallback(
    (authResponse) => {
      if (!authResponse) {
        return null;
      }

      const nextUser = authResponse.user ?? null;
      setUser(nextUser);
      setAccessToken(authResponse.accessToken ?? null);
      setAccessTokenTtlMs(parseDurationToMs(authResponse.accessTokenTtl));
      setIsLoading(false);
      return nextUser;
    },
    [],
  );

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const { user: sessionUser } = await fetchSession();
      setUser(sessionUser);
      setAccessToken(null);
      setAccessTokenTtlMs(null);
      return sessionUser;
    } catch (error) {
      setUser(null);
      setAccessToken(null);
      setAccessTokenTtlMs(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTokens = useCallback(async () => {
    refreshTimerRef.current = null;

    try {
      const response = await refreshAuthTokens({});

      if (response?.user) {
        return applyAuthResponse(response);
      }
    } catch (error) {
      console.error('Falha ao renovar tokens de acesso:', error);
    }

    clearRefreshTimer();
    setUser(null);
    setAccessToken(null);
    setAccessTokenTtlMs(null);
    setIsLoading(false);
    return null;
  }, [applyAuthResponse, clearRefreshTimer]);

  useEffect(() => {
    clearRefreshTimer();

    const delay = calculateRefreshDelay(accessTokenTtlMs);

    if (!delay) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      refreshTokens();
    }, delay);

    refreshTimerRef.current = timerId;

    return () => {
      clearTimeout(timerId);
      if (refreshTimerRef.current === timerId) {
        refreshTimerRef.current = null;
      }
    };
  }, [accessTokenTtlMs, clearRefreshTimer, refreshTokens]);

  useEffect(() => {
    let isCancelled = false;

    loadSession().then((sessionUser) => {
      if (isCancelled) {
        return;
      }

      if (sessionUser) {
        refreshTokens();
      }
    });

    return () => {
      isCancelled = true;
      clearRefreshTimer();
    };
  }, [loadSession, refreshTokens, clearRefreshTimer]);

  const login = useCallback(
    async (userData = null, options = {}) => {
      const { session: authSession = null, accessToken: providedAccessToken = null } = options;

      if (authSession) {
        return applyAuthResponse(authSession);
      }

      if (userData) {
        setUser(userData);
        setAccessToken(providedAccessToken ?? null);
        setAccessTokenTtlMs(null);
        setIsLoading(false);
        return userData;
      }

      const sessionUser = await loadSession();

      if (sessionUser) {
        await refreshTokens();
      }

      return sessionUser;
    },
    [applyAuthResponse, loadSession, refreshTokens],
  );

  const logout = useCallback(async () => {
    clearRefreshTimer();

    try {
      await logoutUser();
    } catch (error) {
      console.error('Falha ao encerrar sessao:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setAccessTokenTtlMs(null);
      setIsLoading(false);
    }
  }, [clearRefreshTimer]);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      isLoading,
      login,
      logout,
      refreshSession: refreshTokens,
      accessToken,
    }),
    [user, isLoading, login, logout, refreshTokens, accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
