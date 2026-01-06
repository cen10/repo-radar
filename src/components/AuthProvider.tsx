import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import { AuthContext, type AuthContextType } from '../contexts/auth-context';
import { CONNECTION_FAILED, UNEXPECTED_ERROR } from '../constants/errorMessages';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/error';
import { clearStoredAccessToken, storeAccessToken } from '../services/github-token';

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
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const applySessionToState = useCallback((nextSession: Session | null) => {
    const nextUser = nextSession?.user ? mapSupabaseUserToUser(nextSession.user) : null;
    setProviderToken(nextSession?.provider_token ?? null);
    setUser(nextUser);

    // Store GitHub token for later use when Supabase session refresh loses it
    if (nextSession?.provider_token) {
      storeAccessToken(nextSession.provider_token);
    }
  }, []);

  const getSession = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setConnectionError(null);

      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        const message = getErrorMessage(error, 'Unknown Supabase error');
        logger.error(`Error connecting to Supabase: ${message}`, error);
        setConnectionError(CONNECTION_FAILED);
        setLoading(false);
        return false;
      }

      applySessionToState(initialSession);
      setLoading(false);
      return true;
    } catch (err) {
      const message = getErrorMessage(err, 'Unexpected error');
      logger.error(`Unexpected error getting session: ${message}`, err);
      setConnectionError(UNEXPECTED_ERROR);
      setLoading(false);
      return false;
    }
  }, [applySessionToState]);

  const handleAuthStateChange = useCallback(
    (_event: AuthChangeEvent, session: Session | null) => {
      try {
        applySessionToState(session);
        setLoading(false);
      } catch (err) {
        const message = getErrorMessage(err, 'Unexpected error');
        logger.error(`Unexpected error handling auth state change: ${message}`, err);
        // On error, clear auth state to prevent inconsistent state
        setProviderToken(null);
        setUser(null);
        setLoading(false);
      }
    },
    [applySessionToState]
  );

  useEffect(() => {
    // Listen for auth changes - INITIAL_SESSION fires immediately with current session
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
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      logger.error('Error signing in with GitHub:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    // Clear stored GitHub access token
    clearStoredAccessToken();

    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      providerToken,
      user,
      loading,
      connectionError,
      signInWithGitHub,
      signOut,
      retryAuth: getSession,
    }),
    [providerToken, user, loading, connectionError, signInWithGitHub, signOut, getSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
