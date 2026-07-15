/**
 * MyShare - Sync Engine (Supabase Only)
 * 
 * Bridges local SQLite and Supabase PostgreSQL.
 * Firebase removed — Supabase handles everything:
 * - Auth (Supabase Auth)
 * - Database (Supabase PostgreSQL)
 * - Storage (Supabase Storage)
 * - Realtime (Supabase Realtime)
 */

import * as localDB from './localDatabase';
import * as db from './supabaseDB';
import { User, Group, Expense, Payment } from '../models/types';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

let syncStatus: SyncStatus = 'idle';
let syncInterval: any = null;
const listeners: ((status: SyncStatus) => void)[] = [];

export function getSyncStatus(): SyncStatus { return syncStatus; }
export function onSyncStatusChange(cb: (s: SyncStatus) => void) { listeners.push(cb); return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); }; }
function setSyncStatus(s: SyncStatus) { syncStatus = s; listeners.forEach(cb => cb(s)); }
function isOnline(): boolean { return typeof navigator !== 'undefined' ? navigator.onLine : true; }

export function startSyncEngine(intervalMs: number = 30000): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => processQueue());
    window.addEventListener('offline', () => setSyncStatus('offline'));
  }
  syncInterval = setInterval(() => { if (isOnline()) processQueue(); }, intervalMs);
  if (isOnline()) { pullFromCloud(); processQueue(); } else { setSyncStatus('offline'); }
}

export function stopSyncEngine(): void { if (syncInterval) clearInterval(syncInterval); syncInterval = null; }

// Push local changes to Supabase
export async function processQueue(): Promise<void> {
  if (!isOnline()) { setSyncStatus('offline'); return; }
  if (syncStatus === 'syncing') return;
  setSyncStatus('syncing');
  try {
    const pending = await localDB.getPendingSyncItems();
    if (pending.length === 0) { setSyncStatus('idle'); return; }
    for (const item of pending) {
      try {
        const data = item.data ? JSON.parse(item.data) : null;
        switch (item.tableName) {
          case 'groups_table': if (data) await db.createGroup(data); break;
          case 'expenses': if (data) await db.addExpense(data); break;
          case 'payments': if (data) await db.recordPayment(data); break;
        }
        await localDB.markSynced(item.id);
        await localDB.markRecordSynced(item.tableName, item.recordId);
      } catch (err) {
        await localDB.incrementSyncAttempt(item.id);
        if (item.attempts >= 5) await localDB.markSynced(item.id);
      }
    }
    setSyncStatus('idle');
  } catch { setSyncStatus('error'); }
}

// Pull from Supabase to local
export async function pullFromCloud(): Promise<void> {
  if (!isOnline()) return;
  try {
    setSyncStatus('syncing');
    const { supabase } = await import('./supabaseDB');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSyncStatus('idle'); return; }

    const groups = await db.getUserGroups(user.id);
    for (const group of (groups as any[])) {
      if (group) await localDB.saveGroup(group);
    }
    setSyncStatus('idle');
  } catch { setSyncStatus('error'); }
}

export async function forceFullSync(): Promise<{ pushed: number; pulled: number }> {
  if (!isOnline()) throw new Error('No internet');
  const pending = await localDB.getPendingSyncItems();
  await processQueue();
  await pullFromCloud();
  const stats = await localDB.getLocalStats();
  return { pushed: pending.length, pulled: stats.totalExpenses + stats.totalGroups };
}

export async function getSyncStats() {
  const stats = await localDB.getLocalStats();
  const lastSync = await localDB.getSetting('lastSyncAt');
  return { pendingUploads: stats.pendingSync, lastSyncAt: lastSync, isOnline: isOnline(), status: syncStatus };
}
