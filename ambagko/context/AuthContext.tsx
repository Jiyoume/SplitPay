import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/types";
import { users, currentUserId } from "@/data/mockData";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "ambagko.session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "1") {
        setUser(users.find((u) => u.id === currentUserId) ?? null);
      }
      setLoading(false);
    });
  }, []);

  async function signIn(email: string, password: string) {
    if (!email || !password) return { ok: false, error: "Enter your email and password." };
    // Mock auth: any non-empty credentials succeed.
    await AsyncStorage.setItem(STORAGE_KEY, "1");
    setUser(users.find((u) => u.id === currentUserId) ?? null);
    return { ok: true };
  }

  async function signUp(name: string, email: string, password: string) {
    if (!name || !email || !password) return { ok: false, error: "Fill in all fields." };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    await AsyncStorage.setItem(STORAGE_KEY, "1");
    setUser({ id: currentUserId, name, email, preferredMethod: "gcash" });
    return { ok: true };
  }

  async function signInWithGoogle() {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
    setUser(users.find((u) => u.id === currentUserId) ?? null);
  }

  async function signOut() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
