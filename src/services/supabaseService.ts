/**
 * SplitPay - Supabase Backend Service
 * 
 * Cloud backend for online sync using Supabase:
 * - PostgreSQL: Database for expenses, groups, payments, profiles
 * - Auth: User authentication (email, Google, OTP)
 * - Storage: Receipt images, ID documents
 * - Real-time: Live expense and notification subscriptions
 */

import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User, Group, Expense, Payment } from '../models/types';
import { AmbagKoKYCProfile } from '../models/kyc';

const SUPABASE_URL = 'https://iclskpmsscogiqpyacru.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljbHNrcG1zc2NvZ2lxcHlhY3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjM2NjYsImV4cCI6MjA5OTY5OTY2Nn0.NgU5t8LrFgQVyQO5pa1WP8jbh0WZLRXzz5hglbARDDI';

let supabase: SupabaseClient;

export function initSupabase(): void {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

// Ensure it's initialized immediately
initSupabase();

// ===== AUTHENTICATION =====

export async function registerWithEmail(email: string, password: string, displayName: string): Promise<any> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { displayName }
    }
  });
  if (error) throw error;
  if (!data.user) throw new Error('User creation failed');

  // Create user profile in profiles table
  const { error: profileError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    name: displayName,
    created_at: new Date().toISOString(),
  });
  if (profileError) console.error('Error creating profile:', profileError);

  return data.user;
}

export async function loginWithEmail(email: string, password: string): Promise<any> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function loginWithGoogle(): Promise<any> {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  return data;
}

export async function loginWithPhone(phoneNumber: string): Promise<any> {
  const { data, error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });
  if (error) throw error;
  return data;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback: (user: any | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => data.subscription.unsubscribe();
}

export function getCurrentUser(): any | null {
  // Get active session user
  return supabase.auth.getUser();
}

// ===== USERS =====

export async function getUserProfile(userId: string): Promise<any> {
  const { data, error } = await supabase.from('users').select().eq('id', userId).single();
  if (error && error.code !== 'PGRST116') throw error; // ignore row not found
  return data;
}

export async function updateUserProfile(userId: string, data: Partial<any>): Promise<void> {
  const { error } = await supabase.from('users').upsert({ id: userId, ...data });
  if (error) throw error;
}

// ===== GROUPS =====

export async function createGroup(group: Omit<Group, 'id'>): Promise<string> {
  const { data, error } = await supabase.from('groups').insert(group).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select().eq('id', groupId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as Group | null;
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  // Assuming memberIds is stored as a PostgreSQL array or jsonb
  const { data, error } = await supabase.from('groups').select().contains('memberIds', [userId]);
  if (error) throw error;
  return data as Group[];
}

export async function updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
  const { error } = await supabase.from('groups').update(data).eq('id', groupId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

// ===== EXPENSES =====

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
  const { data, error } = await supabase.from('expenses').insert(expense).select('id').single();
  if (error) throw error;

  // Increment group total
  if (expense.groupId) {
    const { data: grp } = await supabase.from('groups').select('totalExpenses').eq('id', expense.groupId).single();
    const currentTotal = grp?.totalExpenses || 0;
    await supabase.from('groups').update({ totalExpenses: currentTotal + expense.amount }).eq('id', expense.groupId);
  }

  return data.id;
}

export async function getExpense(expenseId: string): Promise<Expense | null> {
  const { data, error } = await supabase.from('expenses').select().eq('id', expenseId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as Expense | null;
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select().eq('groupId', groupId).order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}

export async function getUserExpenses(userId: string, limitCount: number = 50): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select()
    .contains('memberIds', [userId])
    .order('date', { ascending: false })
    .limit(limitCount);
  if (error) throw error;
  return data as Expense[];
}

export async function updateExpense(expenseId: string, data: Partial<Expense>): Promise<void> {
  const { error } = await supabase.from('expenses').update(data).eq('id', expenseId);
  if (error) throw error;
}

// ===== PAYMENTS =====

export async function recordPayment(payment: Omit<Payment, 'id'>): Promise<string> {
  const { data, error } = await supabase.from('payments').insert(payment).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function getGroupPayments(groupId: string): Promise<Payment[]> {
  const { data, error } = await supabase.from('payments').select().eq('groupId', groupId).order('date', { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const { data: sent, error: errorSent } = await supabase.from('payments').select().eq('fromUserId', userId);
  const { data: received, error: errorRecv } = await supabase.from('payments').select().eq('toUserId', userId);
  if (errorSent) throw errorSent;
  if (errorRecv) throw errorRecv;

  const all = [...(sent || []), ...(received || [])];
  return all.sort((a, b) => (b.date > a.date ? 1 : -1)) as Payment[];
}

// ===== KYC =====

export async function saveKYCProfile(userId: string, profile: Partial<AmbagKoKYCProfile>): Promise<void> {
  const { error } = await supabase.from('kyc').upsert({ userId, ...profile, updatedAt: new Date().toISOString() });
  if (error) throw error;
}

export async function getKYCProfile(userId: string): Promise<AmbagKoKYCProfile | null> {
  const { data, error } = await supabase.from('kyc').select().eq('userId', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as AmbagKoKYCProfile | null;
}

// ===== STORAGE (RECEIPTS, DOCUMENTS) =====

export async function uploadReceiptImage(userId: string, file: any, fileName: string): Promise<string> {
  const path = `receipts/${userId}/${Date.now()}_${fileName}`;
  const { error } = await supabase.storage.from('receipts').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('receipts').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadKYCDocument(userId: string, file: any, docType: string): Promise<string> {
  const path = `kyc/${userId}/${docType}_${Date.now()}`;
  const { error } = await supabase.storage.from('kyc').upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from('kyc').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from('receipts').remove([filePath]);
  if (error) throw error;
}

// ===== REAL-TIME LISTENERS =====

export function listenToGroupExpenses(groupId: string, callback: (expenses: Expense[]) => void): () => void {
  const channel = supabase
    .channel(`expenses-${groupId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `groupId=eq.${groupId}` }, async () => {
      const expenses = await getGroupExpenses(groupId);
      callback(expenses);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function listenToUserNotifications(userId: string, callback: (notifications: any[]) => void): () => void {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${userId}` }, async () => {
      const { data } = await supabase.from('notifications').select().eq('userId', userId).eq('read', false).order('createdAt', { ascending: false });
      callback(data || []);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ===== BATCH OPERATIONS =====

export async function settleGroupDebts(groupId: string, settlements: { from: string; to: string; amount: number }[]): Promise<void> {
  const payments = settlements.map(s => ({
    groupId,
    fromUserId: s.from,
    toUserId: s.to,
    amount: s.amount,
    settled: true,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));

  const { error } = await supabase.from('payments').insert(payments);
  if (error) throw error;
}

export { supabase };
