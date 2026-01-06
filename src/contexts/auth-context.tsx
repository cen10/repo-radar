import { createContext } from 'react';
import type { User } from '../types';

interface AuthContextType {
  providerToken: string | null;
  user: User | null;
  loading: boolean;
  connectionError: string | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  retryAuth: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export type { AuthContextType };
