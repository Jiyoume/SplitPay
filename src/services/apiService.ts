import { apiClient } from './apiClient';
import { Group, Expense, Payment, Balance, Activity, User } from '../models/types';

export interface BackendGroupListItem {
  id: string;
  name: string;
  description: string | null;
  type: 'family' | 'friends' | 'roommates' | 'trip' | 'other';
  createdBy: string;
  createdAt: string;
  memberCount: number;
  totalExpenses: number;
  balance: number;
  lastActivity: string;
}

export interface GroupDetailResponse {
  group: {
    id: string;
    name: string;
    description: string | null;
    type: 'family' | 'friends' | 'roommates' | 'trip' | 'other';
    createdBy: string;
    createdAt: string;
    totalExpenses: number;
    members: User[];
  };
  balances: Balance[];
}

export interface GroupBalancesResponse {
  balances: Balance[];
  suggestions: {
    fromUserId: string;
    fromName: string;
    toUserId: string;
    toName: string;
    amount: number;
    xlmAmount: string;
    currency: string;
    conversionNote: string;
  }[];
}

export interface SettlementBackend {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  xlmAmount: string;
  status: 'pending' | 'submitting' | 'settled' | 'failed';
  txHash: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
}

export interface SummaryResponse {
  netBalance: number;
  youOwe: number;
  youAreOwed: number;
  recentActivity: any[];
}

export interface WalletFundResponse {
  wallet: {
    publicKey: string;
    fundingStatus: 'funded' | 'unfunded';
    xlmBalance: string | null;
  };
}

// Transition Cache Store
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const transitionCache: { [key: string]: CacheEntry } = {};
const DEFAULT_TTL_MS = 8000; // 8 seconds

export const cacheManager = {
  get: <T>(key: string): T | null => {
    const entry = transitionCache[key];
    if (!entry) return null;
    const isExpired = Date.now() - entry.timestamp > DEFAULT_TTL_MS;
    if (isExpired) {
      delete transitionCache[key];
      return null;
    }
    return entry.data as T;
  },
  
  set: <T>(key: string, data: T): void => {
    transitionCache[key] = {
      data,
      timestamp: Date.now(),
    };
  },
  
  invalidate: (pattern: string | RegExp): void => {
    const keys = Object.keys(transitionCache);
    for (const key of keys) {
      if (typeof pattern === 'string' && key.startsWith(pattern)) {
        delete transitionCache[key];
      } else if (pattern instanceof RegExp && pattern.test(key)) {
        delete transitionCache[key];
      }
    }
  },

  clear: (): void => {
    Object.keys(transitionCache).forEach(key => delete transitionCache[key]);
  }
};

export const apiService = {
  getGroups: async (forceRefresh?: boolean): Promise<Group[]> => {
    const cacheKey = 'getGroups';
    if (!forceRefresh) {
      const cached = cacheManager.get<Group[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get('/groups');
    const mapped = data.groups.map((g: BackendGroupListItem) => ({
      id: g.id,
      name: g.name,
      description: g.description || undefined,
      members: [], // List endpoint does not provide full members, but returns memberCount
      createdBy: g.createdBy,
      createdAt: new Date(g.createdAt),
      type: g.type,
      totalExpenses: g.totalExpenses,
      memberCount: g.memberCount,
      balance: g.balance,
      lastActivity: g.lastActivity ? new Date(g.lastActivity) : undefined,
    }));
    
    cacheManager.set(cacheKey, mapped);
    return mapped;
  },

  createGroup: async (
    name: string,
    description: string,
    type: 'family' | 'friends' | 'roommates' | 'trip' | 'other',
    memberEmails: string[]
  ): Promise<Group> => {
    const data = await apiClient.post('/groups', {
      name,
      description,
      type,
      memberEmails,
    });
    
    // Invalidate Cache
    cacheManager.invalidate('getGroups');
    cacheManager.invalidate('getUserSummary');

    const g = data.group;
    return {
      id: g.id,
      name: g.name,
      description: g.description || undefined,
      members: g.members || [],
      createdBy: g.createdBy,
      createdAt: new Date(g.createdAt),
      type: g.type,
      totalExpenses: g.totalExpenses || 0,
    };
  },

  getGroupDetail: async (groupId: string, forceRefresh?: boolean): Promise<GroupDetailResponse> => {
    const cacheKey = `getGroupDetail:${groupId}`;
    if (!forceRefresh) {
      const cached = cacheManager.get<GroupDetailResponse>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get(`/groups/${groupId}`);
    const g = data.group;
    const response: GroupDetailResponse = {
      group: {
        id: g.id,
        name: g.name,
        description: g.description || undefined,
        members: g.members || [],
        createdBy: g.createdBy,
        createdAt: new Date(g.createdAt).toISOString() as any, // Cast for matching React Navigation types
        type: g.type,
        totalExpenses: g.totalExpenses || 0,
      } as any,
      balances: data.balances || [],
    };

    cacheManager.set(cacheKey, response);
    return response;
  },

  getExpenses: async (groupId: string, forceRefresh?: boolean): Promise<Expense[]> => {
    const cacheKey = `getExpenses:${groupId}`;
    if (!forceRefresh) {
      const cached = cacheManager.get<Expense[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get(`/groups/${groupId}/expenses`);
    const mapped = (data.expenses || []).map((e: any) => ({
      ...e,
      date: new Date(e.date),
      createdAt: new Date(e.createdAt),
    }));

    cacheManager.set(cacheKey, mapped);
    return mapped;
  },

  addExpense: async (
    groupId: string,
    expenseData: {
      description: string;
      amount: number;
      currency?: string;
      category: string;
      paidBy?: string;
      splitMethod: 'equal' | 'exact' | 'percentage';
      splits?: { userId: string; amount?: number; percentage?: number }[];
      date?: Date;
      notes?: string;
    }
  ): Promise<Expense> => {
    const payload = {
      ...expenseData,
      date: expenseData.date ? expenseData.date.toISOString() : undefined,
    };
    const data = await apiClient.post(`/groups/${groupId}/expenses`, payload);
    
    // Invalidate caches
    cacheManager.invalidate('getUserSummary');
    cacheManager.invalidate('getGroups');
    cacheManager.invalidate(`getGroupDetail:${groupId}`);
    cacheManager.invalidate(`getExpenses:${groupId}`);
    cacheManager.invalidate(`getBalances:${groupId}`);
    cacheManager.invalidate('getActivities');

    const e = data.expense;
    return {
      ...e,
      date: new Date(e.date),
      createdAt: new Date(e.createdAt),
    };
  },

  getBalances: async (groupId: string, forceRefresh?: boolean): Promise<GroupBalancesResponse> => {
    const cacheKey = `getBalances:${groupId}`;
    if (!forceRefresh) {
      const cached = cacheManager.get<GroupBalancesResponse>(cacheKey);
      if (cached) return cached;
    }

    const response = await apiClient.get(`/groups/${groupId}/balances`);
    cacheManager.set(cacheKey, response);
    return response;
  },

  createSettlement: async (
    groupId: string,
    settlementData: {
      fromUserId: string;
      toUserId: string;
      amount: number;
      currency?: string;
      note?: string;
    }
  ): Promise<{ settlement: SettlementBackend; status: number }> => {
    const data = await apiClient.post(`/groups/${groupId}/settlements`, settlementData);
    
    // Invalidate caches
    cacheManager.invalidate('getUserSummary');
    cacheManager.invalidate('getGroups');
    cacheManager.invalidate(`getGroupDetail:${groupId}`);
    cacheManager.invalidate(`getSettlements:${groupId}`);
    cacheManager.invalidate(`getBalances:${groupId}`);
    cacheManager.invalidate('getActivities');

    return data; // returns { settlement }
  },

  getSettlements: async (groupId: string, forceRefresh?: boolean): Promise<Payment[]> => {
    const cacheKey = `getSettlements:${groupId}`;
    if (!forceRefresh) {
      const cached = cacheManager.get<Payment[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get(`/groups/${groupId}/settlements`);
    const mapped = (data.settlements || []).map((s: SettlementBackend) => ({
      id: s.id,
      groupId: s.groupId,
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amount: s.amount,
      date: new Date(s.createdAt),
      note: s.note || undefined,
      settled: s.status === 'settled',
      status: s.status,
      xlmAmount: s.xlmAmount,
      txHash: s.txHash,
    }));

    cacheManager.set(cacheKey, mapped);
    return mapped;
  },

  getSettlement: async (settlementId: string): Promise<SettlementBackend> => {
    const data = await apiClient.get(`/settlements/${settlementId}`);
    return data.settlement;
  },

  getActivities: async (limit: number = 50, forceRefresh?: boolean): Promise<Activity[]> => {
    const cacheKey = `getActivities:${limit}`;
    if (!forceRefresh) {
      const cached = cacheManager.get<Activity[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get(`/activity?limit=${limit}`);
    const mapped = (data.activities || []).map((a: any) => ({
      ...a,
      date: new Date(a.date),
    }));

    cacheManager.set(cacheKey, mapped);
    return mapped;
  },

  getUserSummary: async (forceRefresh?: boolean): Promise<SummaryResponse> => {
    const cacheKey = 'getUserSummary';
    if (!forceRefresh) {
      const cached = cacheManager.get<SummaryResponse>(cacheKey);
      if (cached) return cached;
    }

    const data = await apiClient.get('/users/me/summary');
    cacheManager.set(cacheKey, data);
    return data;
  },

  fundWallet: async (): Promise<WalletFundResponse> => {
    const data = await apiClient.post('/users/me/wallet/fund');
    // Invalidate summary cache so that the homepage/profile shows funded status and balance updates
    cacheManager.invalidate('getUserSummary');
    return data;
  },
};

