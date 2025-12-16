import { useEffect, useState } from 'react';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import { AuthContext, type AuthContextType } from '../contexts/auth-context';
import { CONNECTION_FAILED, UNEXPECTED_ERROR } from '../constants/errorMessages';
import { logger } from '../utils/logger';

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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const applySessionToState = (nextSession: Session | null) => {
    const nextUser = nextSession?.user ? mapSupabaseUserToUser(nextSession.user) : null;
    setSession(nextSession);
    setUser(nextUser);
  };

  const getSession = async () => {
    try {
      setLoading(true);
      setConnectionError(null);

      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.error('Error connecting to Supabase:', error);
        setConnectionError(CONNECTION_FAILED);
        setLoading(false);
        return;
      }

      applySessionToState(initialSession);
      setLoading(false);
    } catch (err) {
      logger.error('Unexpected error getting session:', err);
      setConnectionError(UNEXPECTED_ERROR);
      setLoading(false);
    }
  };

  const handleAuthStateChange = async (_event: AuthChangeEvent, session: Session | null) => {
    try {
      applySessionToState(session);
      setLoading(false);
    } catch (err) {
      logger.error('Unexpected error handling auth state change:', err);
      // On error, clear auth state to prevent inconsistent state
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => subscription.unsubscribe();
  }, []);

  // Clear connection error on successful auth
  useEffect(() => {
    if (session && connectionError) {
      setConnectionError(null);
    }
  }, [session, connectionError]);

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user user:email',
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      logger.error('Error signing in with GitHub:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    connectionError,
    signInWithGitHub,
    signOut,
    retryAuth: getSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
