import type { User } from '../models/types';

/**
 * In-memory session holder (token + current user).
 *
 * TODO: this does not survive app restarts. Once the app has a real persistence
 * layer (e.g. expo-secure-store for the token, AsyncStorage for the user), wire
 * it in here — storageService.ts / localDatabase.ts are currently in-memory
 * mocks themselves, so there is nothing trivially reusable to persist through yet.
 */

let currentToken: string | null = null;
let currentUser: User | null = null;

export function setSession(token: string, user: User): void {
  currentToken = token;
  currentUser = user;
}

export function getToken(): string | null {
  return currentToken;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function clearSession(): void {
  currentToken = null;
  currentUser = null;
}
