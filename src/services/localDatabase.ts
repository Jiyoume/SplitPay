/**
 * AmbagKo - SQLite Local Repository
 * 
 * Offline-first local database using expo-sqlite for React Native
 * or sql.js for web. Stores all data locally and syncs with Firebase
 * when online.
 * 
 * Install: npm install expo-sqlite
 * 
 * Architecture:
 * - All reads come from local SQLite first (instant)
 * - Writes go to local SQLite immediately, then queue for Firebase sync
 * - Sync engine handles conflict resolution (last-write-wins)
 */

import * as SQLite from 'expo-sqlite';
import { User, Group, Expense, Payment, Split } from '../models/types';
import { PaymentRecord } from '../models/reports';

// ===== DATABASE INITIALIZATION =====

let db: SQLite.SQLiteDatabase;

export async function initLocalDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('ambagko.db');
  await createTables();
  await seedDatabase();
}

async function seedDatabase(): Promise<void> {
  try {
    const userCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users');
    if (userCount && userCount.count > 0) {
      return; // Already seeded
    }

    // Seed default users
    const defaultUsers = [
      { id: '1', name: 'John Doe', email: 'john.doe@email.com', phone: '+1 234 567 890', avatar: null, kycLevel: 'none' },
      { id: '2', name: 'Sarah', email: 'sarah@email.com', phone: '+1 987 654 321', avatar: null, kycLevel: 'none' },
      { id: '3', name: 'Mike', email: 'mike@email.com', phone: '+1 555 123 456', avatar: null, kycLevel: 'none' }
    ];

    for (const u of defaultUsers) {
      await db.runAsync(
        `INSERT INTO users (id, name, email, phone, avatar, kycLevel, updatedAt, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [u.id, u.name, u.email, u.phone, u.avatar, u.kycLevel, new Date().toISOString()]
      );
    }

    // Seed default group
    const defaultGroup = {
      id: '1',
      name: 'Apartment 4B',
      description: 'Shared rent & utility expenses',
      type: 'roommates',
      createdBy: '1',
      totalExpenses: 270.0
    };

    await db.runAsync(
      `INSERT INTO groups_table (id, name, description, type, createdBy, totalExpenses, updatedAt, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [defaultGroup.id, defaultGroup.name, defaultGroup.description, defaultGroup.type, defaultGroup.createdBy, defaultGroup.totalExpenses, new Date().toISOString()]
    );

    // Link group members
    for (const userId of ['1', '2', '3']) {
      await db.runAsync(
        `INSERT INTO group_members (groupId, userId) VALUES (?, ?)`,
        [defaultGroup.id, userId]
      );
    }

    // Seed default expenses
    const defaultExpenses = [
      {
        id: 'exp1',
        groupId: '1',
        description: 'Electricity bill',
        amount: 120.0,
        paidBy: '1',
        category: 'utilities',
        splitMethod: 'equal',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        splits: [
          { userId: '1', amount: 40.0 },
          { userId: '2', amount: 40.0 },
          { userId: '3', amount: 40.0 }
        ]
      },
      {
        id: 'exp2',
        groupId: '1',
        description: 'Groceries',
        amount: 85.0,
        paidBy: '2',
        category: 'groceries',
        splitMethod: 'equal',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        splits: [
          { userId: '1', amount: 28.33 },
          { userId: '2', amount: 28.33 },
          { userId: '3', amount: 28.34 }
        ]
      },
      {
        id: 'exp3',
        groupId: '1',
        description: 'Internet',
        amount: 65.0,
        paidBy: '3',
        category: 'utilities',
        splitMethod: 'equal',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        splits: [
          { userId: '1', amount: 21.66 },
          { userId: '2', amount: 21.67 },
          { userId: '3', amount: 21.67 }
        ]
      }
    ];

    for (const exp of defaultExpenses) {
      await db.runAsync(
        `INSERT INTO expenses (id, groupId, description, amount, currency, category, paidBy, splitMethod, date, notes, receiptUrl, updatedAt, synced) VALUES (?, ?, ?, ?, 'PHP', ?, ?, ?, ?, null, null, ?, 1)`,
        [exp.id, exp.groupId, exp.description, exp.amount, exp.category, exp.paidBy, exp.splitMethod, exp.date, new Date().toISOString()]
      );

      for (const split of exp.splits) {
        await db.runAsync(
          `INSERT INTO expense_splits (expenseId, userId, amount, isPaid, paidAt) VALUES (?, ?, ?, 0, null)`,
          [exp.id, split.userId, split.amount]
        );
      }
    }
  } catch (error) {
    console.error('Failed to seed local database:', error);
  }
}

async function createTables(): Promise<void> {
  await db.execAsync(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      kycLevel TEXT DEFAULT 'none',
      stellarAccount TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );

    -- Groups table
    CREATE TABLE IF NOT EXISTS groups_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'other',
      createdBy TEXT,
      totalExpenses REAL DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );

    -- Group members junction
    CREATE TABLE IF NOT EXISTS group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      joinedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId) REFERENCES groups_table(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Expenses table
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      category TEXT DEFAULT 'other',
      paidBy TEXT NOT NULL,
      splitMethod TEXT DEFAULT 'equal',
      date TEXT NOT NULL,
      notes TEXT,
      receiptUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (groupId) REFERENCES groups_table(id),
      FOREIGN KEY (paidBy) REFERENCES users(id)
    );

    -- Expense splits
    CREATE TABLE IF NOT EXISTS expense_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expenseId TEXT NOT NULL,
      userId TEXT NOT NULL,
      amount REAL NOT NULL,
      percentage REAL,
      isPaid INTEGER DEFAULT 0,
      paidAt TEXT,
      FOREIGN KEY (expenseId) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      groupId TEXT,
      fromUserId TEXT NOT NULL,
      toUserId TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      method TEXT,
      settled INTEGER DEFAULT 0,
      stellarTxHash TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (groupId) REFERENCES groups_table(id),
      FOREIGN KEY (fromUserId) REFERENCES users(id),
      FOREIGN KEY (toUserId) REFERENCES users(id)
    );

    -- Top-up / Transaction history
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      method TEXT,
      status TEXT DEFAULT 'completed',
      reference TEXT,
      counterpartyId TEXT,
      counterpartyName TEXT,
      description TEXT,
      stellarTxHash TEXT,
      date TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );

    -- Sync queue (pending uploads to Firebase)
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tableName TEXT NOT NULL,
      recordId TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT,
      attempts INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      lastAttempt TEXT
    );

    -- App settings / preferences
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_expenses_groupId ON expenses(groupId);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_payments_from ON payments(fromUserId);
    CREATE INDEX IF NOT EXISTS idx_payments_to ON payments(toUserId);
    CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(tableName);
  `);
}

// ===== USERS =====

export async function saveUser(user: User): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO users (id, name, email, phone, avatar, updatedAt, synced) VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [user.id, user.name, user.email, user.phone || null, user.avatar || null, new Date().toISOString()]
  );
  await queueSync('users', user.id, 'upsert', user);
}

export async function getUser(userId: string): Promise<User | null> {
  const result = await db.getFirstAsync<any>('SELECT * FROM users WHERE id = ?', [userId]);
  return result || null;
}

export async function getAllUsers(): Promise<User[]> {
  return db.getAllAsync<User>('SELECT * FROM users ORDER BY name');
}

// ===== GROUPS =====

export async function saveGroup(group: Group): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO groups_table (id, name, description, type, createdBy, totalExpenses, updatedAt, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [group.id, group.name, group.description || null, group.type, group.createdBy, group.totalExpenses, new Date().toISOString()]
  );
  // Save members
  if (group.members) {
    for (const member of group.members) {
      await db.runAsync('INSERT OR IGNORE INTO group_members (groupId, userId) VALUES (?, ?)', [group.id, member.id]);
    }
  }
  await queueSync('groups_table', group.id, 'upsert', group);
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const group = await db.getFirstAsync<any>('SELECT * FROM groups_table WHERE id = ?', [groupId]);
  if (!group) return null;
  const members = await db.getAllAsync<any>('SELECT u.* FROM users u JOIN group_members gm ON u.id = gm.userId WHERE gm.groupId = ?', [groupId]);
  return { ...group, members };
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  return db.getAllAsync<any>(
    `SELECT g.* FROM groups_table g JOIN group_members gm ON g.id = gm.groupId WHERE gm.userId = ? ORDER BY g.updatedAt DESC`,
    [userId]
  );
}

export async function deleteGroup(groupId: string): Promise<void> {
  await db.runAsync('DELETE FROM groups_table WHERE id = ?', [groupId]);
  await queueSync('groups_table', groupId, 'delete', null);
}

// ===== EXPENSES =====

export async function saveExpense(expense: Expense): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO expenses (id, groupId, description, amount, currency, category, paidBy, splitMethod, date, notes, receiptUrl, updatedAt, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [expense.id, expense.groupId, expense.description, expense.amount, expense.currency || 'PHP',
     expense.category, expense.paidBy, expense.splitMethod, new Date(expense.date).toISOString(),
     expense.notes || null, expense.receipt || null, new Date().toISOString()]
  );
  // Save splits
  if (expense.splits) {
    await db.runAsync('DELETE FROM expense_splits WHERE expenseId = ?', [expense.id]);
    for (const split of expense.splits) {
      await db.runAsync(
        'INSERT INTO expense_splits (expenseId, userId, amount, isPaid, paidAt) VALUES (?, ?, ?, ?, ?)',
        [expense.id, split.userId, split.amount, split.isPaid ? 1 : 0, null]
      );
    }
  }
  await queueSync('expenses', expense.id, 'upsert', expense);
}

export async function getExpense(expenseId: string): Promise<Expense | null> {
  const exp = await db.getFirstAsync<any>('SELECT * FROM expenses WHERE id = ?', [expenseId]);
  if (!exp) return null;
  const splits = await db.getAllAsync<any>('SELECT * FROM expense_splits WHERE expenseId = ?', [expenseId]);
  return { ...exp, splits: splits.map((s: any) => ({ ...s, isPaid: !!s.isPaid })) };
}

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const expenses = await db.getAllAsync<any>('SELECT * FROM expenses WHERE groupId = ? ORDER BY date DESC', [groupId]);
  for (const exp of expenses) {
    exp.splits = await db.getAllAsync<any>('SELECT * FROM expense_splits WHERE expenseId = ?', [exp.id]);
    exp.splits = exp.splits.map((s: any) => ({ ...s, isPaid: !!s.isPaid }));
  }
  return expenses;
}

export async function getRecentExpenses(userId: string, count: number = 20): Promise<Expense[]> {
  const expenses = await db.getAllAsync<any>(
    `SELECT e.* FROM expenses e JOIN expense_splits es ON e.id = es.expenseId WHERE es.userId = ? GROUP BY e.id ORDER BY e.date DESC LIMIT ?`,
    [userId, count]
  );
  for (const exp of expenses) {
    exp.splits = await db.getAllAsync<any>('SELECT * FROM expense_splits WHERE expenseId = ?', [exp.id]);
  }
  return expenses;
}

// ===== PAYMENTS =====

export async function savePayment(payment: Payment): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO payments (id, groupId, fromUserId, toUserId, amount, date, note, method, settled, stellarTxHash, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [payment.id, payment.groupId, payment.fromUserId, payment.toUserId, payment.amount,
     new Date(payment.date).toISOString(), payment.note || null, null, payment.settled ? 1 : 0, null]
  );
  await queueSync('payments', payment.id, 'upsert', payment);
}

export async function getGroupPayments(groupId: string): Promise<Payment[]> {
  return db.getAllAsync<any>('SELECT * FROM payments WHERE groupId = ? ORDER BY date DESC', [groupId]);
}

// ===== TRANSACTIONS (TOP-UPS, HISTORY) =====

export async function saveTransaction(tx: PaymentRecord): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO transactions (id, userId, type, amount, currency, method, status, reference, counterpartyId, counterpartyName, description, stellarTxHash, date, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [tx.id, tx.counterparty?.userId || '', tx.type, tx.amount, tx.currency, tx.method,
     tx.status, tx.reference, tx.counterparty?.userId || null, tx.counterparty?.name || null,
     tx.description || null, tx.stellarTxHash || null, tx.date]
  );
}

export async function getTransactionHistory(userId: string, count: number = 50): Promise<PaymentRecord[]> {
  return db.getAllAsync<any>('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC LIMIT ?', [userId, count]);
}

// ===== SYNC QUEUE =====

async function queueSync(tableName: string, recordId: string, operation: string, data: any): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_queue (tableName, recordId, operation, data, createdAt) VALUES (?, ?, ?, ?, ?)',
    [tableName, recordId, operation, data ? JSON.stringify(data) : null, new Date().toISOString()]
  );
}

export async function getPendingSyncItems(): Promise<any[]> {
  return db.getAllAsync<any>('SELECT * FROM sync_queue ORDER BY createdAt ASC LIMIT 50');
}

export async function markSynced(queueId: number): Promise<void> {
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [queueId]);
}

export async function markRecordSynced(tableName: string, recordId: string): Promise<void> {
  await db.runAsync(`UPDATE ${tableName} SET synced = 1 WHERE id = ?`, [recordId]);
}

export async function incrementSyncAttempt(queueId: number): Promise<void> {
  await db.runAsync('UPDATE sync_queue SET attempts = attempts + 1, lastAttempt = ? WHERE id = ?',
    [new Date().toISOString(), queueId]);
}

// ===== SETTINGS =====

export async function setSetting(key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function getSetting(key: string): Promise<string | null> {
  const result = await db.getFirstAsync<any>('SELECT value FROM settings WHERE key = ?', [key]);
  return result?.value || null;
}

// ===== STATS =====

export async function getLocalStats(): Promise<{
  totalExpenses: number; totalGroups: number; totalPayments: number; pendingSync: number;
}> {
  const expenses = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM expenses');
  const groups = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM groups_table');
  const payments = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM payments');
  const pending = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM sync_queue');
  return {
    totalExpenses: expenses?.count || 0,
    totalGroups: groups?.count || 0,
    totalPayments: payments?.count || 0,
    pendingSync: pending?.count || 0,
  };
}

// ===== CLEAR =====

export async function clearAllLocalData(): Promise<void> {
  await db.execAsync(`
    DELETE FROM sync_queue;
    DELETE FROM expense_splits;
    DELETE FROM expenses;
    DELETE FROM payments;
    DELETE FROM transactions;
    DELETE FROM group_members;
    DELETE FROM groups_table;
    DELETE FROM users;
    DELETE FROM settings;
  `);
}
