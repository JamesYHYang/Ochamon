'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { authApi, UserResponse, ApiError } from './api';

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role?: 'BUYER' | 'SELLER';
    companyName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'matcha_tokens';
const USER_STORAGE_KEY = 'matcha_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load tokens from localStorage on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedTokens = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          const user = JSON.parse(storedUser);

          // Verify token is still valid by fetching user
          try {
            const freshUser = await authApi.me(tokens.accessToken);
            setState({
              user: freshUser,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              isLoading: false,
              isAuthenticated: true,
            });
          } catch (error) {
            // Try to refresh the token
            if (error instanceof ApiError && error.statusCode === 401) {
              try {
                const newTokens = await authApi.refresh(
                  tokens.refreshToken,
                  tokens.accessToken
                );
                const freshUser = await authApi.me(newTokens.accessToken);

                localStorage.setItem(
                  TOKEN_STORAGE_KEY,
                  JSON.stringify(newTokens)
                );
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));

                setState({
                  user: freshUser,
                  accessToken: newTokens.accessToken,
                  refreshToken: newTokens.refreshToken,
                  isLoading: false,
                  isAuthenticated: true,
                });
              } catch {
                // Refresh failed, clear storage
                localStorage.removeItem(TOKEN_STORAGE_KEY);
                localStorage.removeItem(USER_STORAGE_KEY);
                setState({
                  user: null,
                  accessToken: null,
                  refreshToken: null,
                  isLoading: false,
                  isAuthenticated: false,
                });
              }
            }
          }
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadStoredAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });

    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(response.tokens));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));

    setState({
      user: response.user,
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      role?: 'BUYER' | 'SELLER';
      companyName?: string;
    }) => {
      const response = await authApi.register(data);

      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(response.tokens));
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));

      setState({
        user: response.user,
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (state.accessToken) {
        await authApi.logout(state.accessToken);
      }
    } catch {
      // Ignore logout errors
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);

    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [state.accessToken]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!state.refreshToken || !state.accessToken) {
      return null;
    }

    try {
      const newTokens = await authApi.refresh(
        state.refreshToken,
        state.accessToken
      );

      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(newTokens));

      setState((prev) => ({
        ...prev,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      }));

      return newTokens.accessToken;
    } catch {
      await logout();
      return null;
    }
  }, [state.refreshToken, state.accessToken, logout]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper functions for non-hook access (useful for components that can't use hooks)
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      const tokens = JSON.parse(stored);
      return tokens.accessToken || null;
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

export function getUser(): { id: string; email: string; name: string; role: 'BUYER' | 'SELLER' | 'ADMIN' } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}
