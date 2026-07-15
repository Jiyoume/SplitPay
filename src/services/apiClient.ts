import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'myshare_auth_token';

// Use localhost for iOS simulator, and 10.0.2.2 for Android emulator
const DEFAULT_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000' 
  : 'http://localhost:3000';

let baseUrl = DEFAULT_BASE_URL;
let cachedToken: string | null = null;

export const setBaseUrl = (url: string) => {
  baseUrl = url;
};

export const getBaseUrl = () => baseUrl;

export const setToken = async (token: string) => {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
};

export const clearToken = async () => {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
};

export class ApiError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(message: string, code: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  body?: any;
}

export async function request(endpoint: string, options: RequestOptions = {}) {
  const token = await getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  if (__DEV__) {
    console.log(`[API Request] ${options.method || 'GET'} ${url}`, options.body ? JSON.stringify(options.body) : '');
  }

  const config: RequestInit = {
    ...options,
    headers: headers as HeadersInit,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }

    if (__DEV__) {
      console.log(`[API Response] ${response.status} ${url}`, JSON.stringify(data));
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || response.statusText || 'An error occurred';
      const errorCode = data?.error?.code || 'API_ERROR';
      const errorDetails = data?.error?.details;
      throw new ApiError(errorMsg, errorCode, response.status, errorDetails);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (__DEV__) {
      console.error(`[API Network Error] ${url}`, error);
    }
    throw new ApiError(
      'Network error. Please make sure the backend is running and reachable.',
      'NETWORK_ERROR',
      500
    );
  }
}

export const apiClient = {
  get: (endpoint: string, options?: RequestOptions) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body?: any, options?: RequestOptions) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint: string, body?: any, options?: RequestOptions) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint: string, options?: RequestOptions) => request(endpoint, { ...options, method: 'DELETE' }),
};
