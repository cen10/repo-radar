import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { User } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  connectionError: string | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  retryAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export type { AuthContextType };
