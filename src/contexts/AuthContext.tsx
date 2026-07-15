import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '../models/types';
import { authService } from '../services/authService';
import { getToken, clearToken } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  wallet: {
    publicKey: string;
    fundingStatus: 'funded' | 'unfunded';
    xlmBalance: string | null;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string, avatar?: string) => Promise<void>;
  signInWithGoogle: (email: string, name: string, avatar?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<AuthContextType['wallet']>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        // Fetch fresh user profile
        const data = await authService.getCurrentUser();
        setUser(data.user);
        setWallet(data.wallet);
      }
    } catch (error) {
      console.warn('Failed to restore auth session:', error);
      // Clean up invalid session
      await clearToken();
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      if (data.wallet) {
        setWallet({
          publicKey: data.wallet.publicKey,
          fundingStatus: data.wallet.fundingStatus,
          xlmBalance: null, // will be fetched on users/me read
        });
      }
      // Trigger a profile fetch to get live balance
      await refreshUser();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string, avatar?: string) => {
    setIsLoading(true);
    try {
      const data = await authService.register(name, email, password, phone, avatar);
      setUser(data.user);
      if (data.wallet) {
        setWallet({
          publicKey: data.wallet.publicKey,
          fundingStatus: data.wallet.fundingStatus,
          xlmBalance: null,
        });
      }
      await refreshUser();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async (email: string, name: string, avatar?: string) => {
    setIsLoading(true);
    try {
      const data = await authService.loginWithGoogle(email, name, avatar);
      setUser(data.user);
      if (data.wallet) {
        setWallet({
          publicKey: data.wallet.publicKey,
          fundingStatus: data.wallet.fundingStatus,
          xlmBalance: null,
        });
      }
      await refreshUser();
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await authService.getCurrentUser();
      setUser(data.user);
      setWallet(data.wallet);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        signInWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
