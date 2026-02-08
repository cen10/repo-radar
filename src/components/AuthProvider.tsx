import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import { AuthContext, type AuthContextType } from '../contexts/auth-context';
import { CONNECTION_FAILED, UNEXPECTED_ERROR } from '../constants/errorMessages';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';
import {
  clearStoredAccessToken,
  storeAccessToken,
  getStoredAccessToken,
} from '../services/github-token';
import { isDemoModeActive, useDemoMode } from '../demo/demo-context';
import { DEMO_USER } from '../demo/demo-data';

const mapSupabaseUserToUser = (supabaseUser: SupabaseUser): User => {
  const { id, email, user_metadata = {} } = supabaseUser;
  const { user_name, full_name, name, avatar_url } = user_metadata;

  let login = user_name;
  if (!user_name) {
    login = email || '';
    logger.warn('GitHub OAuth response missing user_name, falling back to email', {
      userId: id,
      email,
      userMetadata: user_metadata,
    });
  }

  return {
    id,
    login,
    name: full_name || name || null,
    avatar_url: avatar_url || '',
    email: email || null,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { exitDemoMode } = useDemoMode();
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const applySessionToState = useCallback((nextSession: Session | null) => {
    const nextUser = nextSession?.user ? mapSupabaseUserToUser(nextSession.user) : null;

    // Use provider_token if available, otherwise fall back to stored token
    // (Supabase drops provider_token on session refresh)
    const token = nextSession?.provider_token ?? getStoredAccessToken();
    setProviderToken(token);
    setUser(nextUser);

    // Store GitHub token for later use when Supabase session refresh loses it
    if (nextSession?.provider_token) {
      storeAccessToken(nextSession.provider_token);
    }
  }, []);

  const getSession = useCallback(async (): Promise<boolean> => {
    logger.debug('getSession: Starting session check...');

    // Check for demo mode first - skip Supabase auth entirely
    if (isDemoModeActive()) {
      logger.info('getSession: Demo mode active, using demo user');
      setProviderToken('demo-token');
      setUser(DEMO_USER);
      setAuthLoading(false);
      return true;
    }

    try {
      setAuthLoading(true);
      setConnectionError(null);

      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        const message = getErrorMessage(error, 'Unknown Supabase error');
        logger.error(`Error connecting to Supabase: ${message}`, error);
        setConnectionError(CONNECTION_FAILED);
        setAuthLoading(false);
        return false;
      }

      logger.debug('getSession: Session retrieved', {
        hasSession: !!initialSession,
        userId: initialSession?.user?.id,
        expiresAt: initialSession?.expires_at,
      });

      applySessionToState(initialSession);
      setAuthLoading(false);
      return true;
    } catch (err) {
      const message = getErrorMessage(err, 'Unexpected error');
      logger.error(`Unexpected error getting session: ${message}`, err);
      setConnectionError(UNEXPECTED_ERROR);
      setAuthLoading(false);
      return false;
    }
  }, [applySessionToState]);

  const handleAuthStateChange = useCallback(
    (event: AuthChangeEvent, session: Session | null) => {
      // In demo mode, ignore Supabase auth events
      if (isDemoModeActive()) {
        logger.debug('Auth state change ignored in demo mode', { event });
        return;
      }

      logger.debug('Auth state change event received', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
        providerToken: session?.provider_token ? 'present' : 'absent',
      });

      try {
        applySessionToState(session);
        setAuthLoading(false);

        // Log specific events that could cause logout
        if (event === 'SIGNED_OUT') {
          logger.info('User signed out via auth state change');
        } else if (event === 'TOKEN_REFRESHED') {
          logger.debug('Token refreshed successfully', {
            newExpiresAt: session?.expires_at,
          });
        } else if (!session && event !== 'INITIAL_SESSION') {
          logger.warn('Session became null unexpectedly', { event });
        }
      } catch (err) {
        const message = getErrorMessage(err, 'Unexpected error');
        logger.error(`Unexpected error handling auth state change: ${message}`, err);
        // On error, clear auth state to prevent inconsistent state
        setProviderToken(null);
        setUser(null);
        setAuthLoading(false);
      }
    },
    [applySessionToState]
  );

  // Initialize auth state on mount
  useEffect(() => {
    // If demo mode is active, set demo user immediately
    if (isDemoModeActive()) {
      logger.info('AuthProvider: Demo mode detected, setting demo user');
      setProviderToken('demo-token');
      setUser(DEMO_USER);
      setAuthLoading(false);
      return;
    }

    // Otherwise, set up Supabase auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => subscription.unsubscribe();
  }, [handleAuthStateChange]);

  // Clear connection error on successful auth
  useEffect(() => {
    if (user && connectionError) {
      setConnectionError(null);
    }
  }, [user, connectionError]);

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user user:email public_repo',
        redirectTo: `${window.location.origin}/stars`,
      },
    });

    if (error) {
      logger.error('Error signing in with GitHub:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    logger.info('signOut: Starting sign out, clearing local state first...');

    // Clear query cache first
    queryClient.clear();

    // If in demo mode, exit demo mode properly (clears localStorage, stops MSW)
    if (isDemoModeActive()) {
      logger.info('signOut: Exiting demo mode');
      exitDemoMode();
      setProviderToken(null);
      setUser(null);
      return;
    }

    // Clear local state to prevent race condition where queries re-run
    // with stale localStorage token during Supabase sign-out
    clearStoredAccessToken();

    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('signOut: Error signing out:', error);
      throw error;
    }

    logger.info('signOut: Sign out complete');
  }, [queryClient, exitDemoMode]);

  const value: AuthContextType = useMemo(
    () => ({
      providerToken,
      user,
      authLoading,
      connectionError,
      signInWithGitHub,
      signOut,
      retryAuth: getSession,
    }),
    [providerToken, user, authLoading, connectionError, signInWithGitHub, signOut, getSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
