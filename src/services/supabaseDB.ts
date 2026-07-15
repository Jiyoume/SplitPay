/**
 * MyShare - Supabase Database Service
 * 
 * Connects the app UI and services to Supabase PostgreSQL.
 * Replaces Firebase Firestore as the primary cloud database.
 * 
 * Tables: users, groups, group_members, expenses, expense_splits, payments, transactions, kyc_profiles
 */

import { createClient } from '../utils/supabase/client';

const supabase = createClient();

// ===== USERS =====

export async function getUser(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateUser(userId: string, updates: Record<string, any>) {
  const { data, error } = await supabase.from('users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function createUserProfile(userId: string, profile: { email: string; full_name: string; phone?: string }) {
  const { data, error } = await supabase.from('users').insert({ id: userId, ...profile, kyc_level: 'none', created_at: new Date().toISOString() }).select().single();
  if (error) throw error;
  return data;
}

// ===== GROUPS =====

export async function createGroup(group: { name: string; type: string; created_by: string }) {
  const { data, error } = await supabase.from('groups').insert(group).select().single();
  if (error) throw error;
  return data;
}

export async function getUserGroups(userId: string) {
  const { data, error } = await supabase.from('group_members').select('group_id, groups(*)').eq('user_id', userId);
  if (error) throw error;
  return data?.map(d => d.groups) || [];
}

export async function getGroup(groupId: string) {
  const { data, error } = await supabase.from('groups').select('*, group_members(user_id, users(*))').eq('id', groupId).single();
  if (error) throw error;
  return data;
}

export async function addGroupMember(groupId: string, userId: string) {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

// ===== EXPENSES =====

export async function addExpense(expense: {
  group_id: string; description: string; amount: number; category: string;
  paid_by: string; split_method: string; date: string;
}) {
  const { data, error } = await supabase.from('expenses').insert(expense).select().single();
  if (error) throw error;
  return data;
}

export async function addExpenseSplits(expenseId: string, splits: { user_id: string; amount: number }[]) {
  const rows = splits.map(s => ({ expense_id: expenseId, ...s, is_paid: false }));
  const { error } = await supabase.from('expense_splits').insert(rows);
  if (error) throw error;
}

export async function getGroupExpenses(groupId: string) {
  const { data, error } = await supabase.from('expenses').select('*, expense_splits(*)').eq('group_id', groupId).order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getUserExpenses(userId: string, limit: number = 20) {
  const { data, error } = await supabase.from('expense_splits').select('expense_id, expenses(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data?.map(d => d.expenses) || [];
}

export async function markSplitPaid(expenseId: string, userId: string) {
  const { error } = await supabase.from('expense_splits').update({ is_paid: true, paid_at: new Date().toISOString() }).eq('expense_id', expenseId).eq('user_id', userId);
  if (error) throw error;
}

// ===== PAYMENTS =====

export async function recordPayment(payment: {
  group_id: string; from_user_id: string; to_user_id: string; amount: number; method?: string; note?: string;
}) {
  const { data, error } = await supabase.from('payments').insert({ ...payment, settled: true, date: new Date().toISOString() }).select().single();
  if (error) throw error;
  return data;
}

export async function getGroupPayments(groupId: string) {
  const { data, error } = await supabase.from('payments').select('*').eq('group_id', groupId).order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getUserPayments(userId: string) {
  const { data, error } = await supabase.from('payments').select('*').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).order('date', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ===== TRANSACTIONS (TOP-UPS, WITHDRAWALS) =====

export async function recordTransaction(tx: {
  user_id: string; type: string; amount: number; method: string; status: string; reference?: string;
}) {
  const { data, error } = await supabase.from('transactions').insert({ ...tx, date: new Date().toISOString() }).select().single();
  if (error) throw error;
  return data;
}

export async function getTransactionHistory(userId: string, limit: number = 50) {
  const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

// ===== KYC =====

export async function saveKYCProfile(userId: string, profile: Record<string, any>) {
  const { data, error } = await supabase.from('kyc_profiles').upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() }).select().single();
  if (error) throw error;
  return data;
}

export async function getKYCProfile(userId: string) {
  const { data, error } = await supabase.from('kyc_profiles').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ===== GOALS & POINTS =====

export async function saveGoal(goal: Record<string, any>) {
  const { data, error } = await supabase.from('goals').insert(goal).select().single();
  if (error) throw error;
  return data;
}

export async function getUserGoals(userId: string) {
  const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateGoal(goalId: string, updates: Record<string, any>) {
  const { error } = await supabase.from('goals').update(updates).eq('id', goalId);
  if (error) throw error;
}

export async function getPointsProfile(userId: string) {
  const { data, error } = await supabase.from('points').select('*').eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function addPoints(userId: string, points: number, action: string) {
  const { error } = await supabase.rpc('add_points', { p_user_id: userId, p_points: points, p_action: action });
  if (error) throw error;
}

// ===== REAL-TIME SUBSCRIPTIONS =====

export function subscribeToGroupExpenses(groupId: string, callback: (payload: any) => void) {
  return supabase.channel(`expenses:${groupId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` }, callback).subscribe();
}

export function subscribeToPayments(userId: string, callback: (payload: any) => void) {
  return supabase.channel(`payments:${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments', filter: `to_user_id=eq.${userId}` }, callback).subscribe();
}

export function subscribeToNotifications(userId: string, callback: (payload: any) => void) {
  return supabase.channel(`notifications:${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback).subscribe();
}

// ===== STORAGE (RECEIPTS, KYC DOCS) =====

export async function uploadReceipt(userId: string, file: File, fileName: string) {
  const path = `receipts/${userId}/${Date.now()}_${fileName}`;
  const { data, error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
  return urlData.publicUrl;
}

export async function uploadKYCDoc(userId: string, file: File, docType: string) {
  const path = `kyc/${userId}/${docType}_${Date.now()}`;
  const { data, error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
  return urlData.publicUrl;
}

export { supabase };
