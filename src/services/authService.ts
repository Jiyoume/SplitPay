import { apiClient, setToken, clearToken } from './apiClient';
import { User } from '../models/types';

export interface AuthResponse {
  user: User;
  token: string;
  wallet?: {
    publicKey: string;
    fundingStatus: 'funded' | 'unfunded';
  };
}

export interface UserResponse {
  user: User;
  wallet: {
    publicKey: string;
    fundingStatus: 'funded' | 'unfunded';
    xlmBalance: string | null;
  };
}

export const authService = {
  register: async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    avatar?: string
  ): Promise<AuthResponse> => {
    const data = await apiClient.post('/auth/register', {
      name,
      email,
      password,
      phone,
      avatar,
    });
    
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await apiClient.post('/auth/login', { email, password });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  loginWithGoogle: async (email: string, name: string, avatar?: string): Promise<AuthResponse> => {
    const data = await apiClient.post('/auth/google', { email, name, avatar });
    if (data.token) {
      await setToken(data.token);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    await clearToken();
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    return apiClient.get('/users/me');
  },
};
