/**
 * AmbagKo - Sync Engine
 * 
 * Bridges local SQLite and Firebase for offline-first architecture.
 * 
 * Strategy:
 * - Reads: Always from local SQLite (instant)
 * - Writes: Local first, then queue for cloud sync
 * - Online: Process sync queue → push to Firebase
 * - Conflict: Last-write-wins based on updatedAt timestamp
 * - Pull: On app launch / reconnect, pull latest from Firebase → merge to local
 */

import * as localDB from './localDatabase';
import * as firebase from './supabaseService';
import { User, Group, Expense, Payment } from '../models/types';

// ===== SYNC STATUS =====

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

let syncStatus: SyncStatus = 'idle';
let syncInterval: any = null;
const listeners: ((status: SyncStatus) => void)[] = [];

export function getSyncStatus(): SyncStatus { return syncStatus; }

export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  listeners.push(callback);
  return () => { const idx = listeners.indexOf(callback); if (idx >= 0) listeners.splice(idx, 1); };
}

function setSyncStatus(status: SyncStatus) {
  syncStatus = status;
  listeners.forEach(cb => cb(status));
}

// ===== NETWORK DETECTION =====

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ===== INITIALIZE SYNC =====

export function startSyncEngine(intervalMs: number = 30000): void {
  // Listen for online/offline
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { processQueue(); });
    window.addEventListener('offline', () => { setSyncStatus('offline'); });
  }

  // Periodic sync
  syncInterval = setInterval(() => {
    if (isOnline()) processQueue();
  }, intervalMs);

  // Initial sync
  if (isOnline()) {
    pullFromCloud();
    processQueue();
  } else {
    setSyncStatus('offline');
  }
}

export function stopSyncEngine(): void {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = null;
}

// ===== PUSH: LOCAL → FIREBASE =====

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
          case 'users':
            if (item.operation === 'upsert' && data) {
              await firebase.updateUserProfile(item.recordId, data);
            }
            break;
          case 'groups_table':
            if (item.operation === 'upsert' && data) {
              await firebase.updateGroup(item.recordId, data);
            } else if (item.operation === 'delete') {
              await firebase.deleteGroup(item.recordId);
            }
            break;
          case 'expenses':
            if (item.operation === 'upsert' && data) {
              await firebase.addExpense(data);
            }
            break;
          case 'payments':
            if (item.operation === 'upsert' && data) {
              await firebase.recordPayment(data);
            }
            break;
        }

        // Mark synced
        await localDB.markSynced(item.id);
        await localDB.markRecordSynced(item.tableName, item.recordId);
      } catch (err) {
        console.error(`Sync failed for ${item.tableName}/${item.recordId}:`, err);
        await localDB.incrementSyncAttempt(item.id);
        // Skip items that failed too many times
        if (item.attempts >= 5) {
          await localDB.markSynced(item.id); // Remove from queue
        }
      }
    }

    setSyncStatus('idle');
  } catch (error) {
    console.error('Sync queue processing error:', error);
    setSyncStatus('error');
  }
}

// ===== PULL: FIREBASE → LOCAL =====

export async function pullFromCloud(): Promise<void> {
  if (!isOnline()) return;

  const user = firebase.getCurrentUser();
  if (!user) return;

  try {
    setSyncStatus('syncing');

    // Pull groups
    const cloudGroups = await firebase.getUserGroups(user.uid);
    for (const group of cloudGroups) {
      await localDB.saveGroup(group);
      await localDB.markRecordSynced('groups_table', group.id);

      // Pull expenses for each group
      const cloudExpenses = await firebase.getGroupExpenses(group.id);
      for (const expense of cloudExpenses) {
        await localDB.saveExpense(expense);
        await localDB.markRecordSynced('expenses', expense.id);
      }

      // Pull payments for each group
      const cloudPayments = await firebase.getGroupPayments(group.id);
      for (const payment of cloudPayments) {
        await localDB.savePayment(payment);
        await localDB.markRecordSynced('payments', payment.id);
      }
    }

    setSyncStatus('idle');
  } catch (error) {
    console.error('Pull from cloud failed:', error);
    setSyncStatus('error');
  }
}

// ===== UNIFIED DATA ACCESS (LOCAL-FIRST) =====

/**
 * Get groups — reads from local, triggers background sync if online.
 */
export async function getGroups(userId: string): Promise<Group[]> {
  const local = await localDB.getUserGroups(userId);
  if (isOnline() && local.length === 0) {
    await pullFromCloud();
    return localDB.getUserGroups(userId);
  }
  return local;
}

/**
 * Add expense — saves locally first, queues for sync.
 */
export async function addExpense(expense: Expense): Promise<void> {
  await localDB.saveExpense(expense);
  if (isOnline()) processQueue();
}

/**
 * Get expenses — always local.
 */
export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  return localDB.getGroupExpenses(groupId);
}

/**
 * Record payment — local first, then sync.
 */
export async function recordPayment(payment: Payment): Promise<void> {
  await localDB.savePayment(payment);
  if (isOnline()) processQueue();
}

/**
 * Create group — local first, then sync.
 */
export async function createGroup(group: Group): Promise<void> {
  await localDB.saveGroup(group);
  if (isOnline()) processQueue();
}

// ===== FORCE SYNC =====

export async function forceFullSync(): Promise<{ pushed: number; pulled: number }> {
  let pushed = 0;
  let pulled = 0;

  if (!isOnline()) throw new Error('No internet connection');

  // Push pending
  const pending = await localDB.getPendingSyncItems();
  pushed = pending.length;
  await processQueue();

  // Pull fresh
  await pullFromCloud();
  const stats = await localDB.getLocalStats();
  pulled = stats.totalExpenses + stats.totalGroups + stats.totalPayments;

  return { pushed, pulled };
}

/**
 * Get sync statistics.
 */
export async function getSyncStats(): Promise<{
  pendingUploads: number; lastSyncAt: string | null; isOnline: boolean; status: SyncStatus;
}> {
  const stats = await localDB.getLocalStats();
  const lastSync = await localDB.getSetting('lastSyncAt');
  return {
    pendingUploads: stats.pendingSync,
    lastSyncAt: lastSync,
    isOnline: isOnline(),
    status: syncStatus,
  };
}
