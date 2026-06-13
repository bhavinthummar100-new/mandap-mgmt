import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { AppUser } from '@/types';
import { subscribeAuth, getUserProfile, logout as authLogout } from '@/services/authService';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const profile = await getUserProfile(uid);
    setUser(profile);
  };

  useEffect(() => {
    const unsub = subscribeAuth(async (fbUser) => {
      try {
        setFirebaseUser(fbUser);
        if (fbUser) {
          await loadProfile(fbUser.uid);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to load auth profile:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const logout = async () => {
    await authLogout();
    setUser(null);
    setFirebaseUser(null);
  };

  const refreshUser = async () => {
    if (firebaseUser) await loadProfile(firebaseUser.uid);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
