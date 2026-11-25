'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthUser } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [googleOAuthConfigured, setGoogleOAuthConfigured] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        setGoogleOAuthConfigured(Boolean(data.googleOAuthConfigured));
      }
    } catch (e) {
      console.warn('Failed to load auth session:', e);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setUser(data.user ?? null);
          setGoogleOAuthConfigured(Boolean(data.googleOAuthConfigured));
        }
      } catch (e) {
        console.warn('Failed to load auth session:', e);
      } finally {
        if (!cancelled) {
          setIsAuthLoading(false);
        }
      }
    };
    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Failed to log out:', e);
    } finally {
      setUser(null);
    }
  }, []);

  return {
    user,
    isAuthLoading,
    googleOAuthConfigured,
    refreshAuth,
    logout,
  };
}
