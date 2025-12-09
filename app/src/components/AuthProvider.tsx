import { useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { User } from '../types';
import { AuthContext, type AuthContextType } from '../contexts/auth-context';

const mapSupabaseUserToUser = (supabaseUser: SupabaseUser): User => {
  return {
    id: supabaseUser.id,
    login: supabaseUser.user_metadata?.user_name || supabaseUser.email?.split('@')[0] || '',
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
    avatar_url: supabaseUser.user_metadata?.avatar_url || '',
    email: supabaseUser.email || null,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const getSession = async () => {
    try {
      setLoading(true);
      setConnectionError(null);

      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error connecting to Supabase:', error);
        setConnectionError(
          'Failed to connect to authentication service. Please check your internet connection and try again.'
        );
        setLoading(false);
        return;
      }

      setSession(initialSession);
      if (initialSession?.user) {
        setUser(mapSupabaseUserToUser(initialSession.user));
      }
      setLoading(false);
    } catch (err) {
      console.error('Unexpected error getting session:', err);
      setConnectionError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        setUser(mapSupabaseUserToUser(session.user));
      } else {
        setUser(null);
      }

      // Set loading to false when auth state change completes
      setLoading(false);
    });

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
      console.error('Error signing in with GitHub:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
