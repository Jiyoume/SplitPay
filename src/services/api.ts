/**
 * Typed client for the SplitPay backend (backend/ARCHITECTURE.md §4 — 16 endpoints).
 * Plain fetch, JSON in/out, JWT bearer auth via session.ts.
 */

import { getToken } from './session';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ===== Shared enums (backend/src/config/constants.ts) =====

export type GroupType = 'family' | 'friends' | 'roommates' | 'trip' | 'other';
export type SplitMethod = 'equal' | 'exact' | 'percentage';
export type SettlementStatus = 'pending' | 'submitting' | 'settled' | 'failed';
export type ActivityType = 'expense_added' | 'payment_made' | 'group_created' | 'member_added';
export type FundingStatus = 'funded' | 'unfunded';

// ===== Shared resource shapes =====

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface ApiWallet {
  publicKey: string;
  fundingStatus: FundingStatus;
  xlmBalance?: string | null;
}

export interface ApiGroupMember {
  id: string;
  name: string;
  email: string;
}

export interface ApiGroupSummary {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  totalExpenses: number;
  balance: number;
  lastActivity: string;
}

export interface ApiGroupDetail {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  createdBy: string;
  createdAt: string;
  totalExpenses: number;
  members: ApiGroupMember[];
}

export interface ApiSplit {
  userId: string;
  amount: number;
  isPaid: boolean;
}

export interface ApiExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidBy: string;
  splitMethod: SplitMethod;
  date: string;
  createdAt: string;
  receipt: string | null;
  notes: string | null;
  splits: ApiSplit[];
}

export interface ApiBalance {
  userId: string;
  owes: { toUserId: string; amount: number }[];
  isOwed: { fromUserId: string; amount: number }[];
  netBalance: number;
}

export interface ApiSettleSuggestion {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  xlmAmount: string;
  currency: string;
  conversionNote: string;
}

export interface ApiSettlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  xlmAmount: string;
  status: SettlementStatus;
  settled: boolean;
  txHash: string | null;
  explorerUrl: string | null;
  note: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  conversionNote: string;
}

export interface ApiActivity {
  id: string;
  type: ActivityType;
  groupId: string;
  userId: string;
  description: string;
  amount: number | null;
  date: string;
}

// ===== Request/response payloads, one pair per endpoint =====

// 1. POST /auth/register
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
}
export interface RegisterResponse {
  user: ApiUser;
  wallet: { publicKey: string; fundingStatus: FundingStatus };
  token: string;
}

// 2. POST /auth/login
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  user: ApiUser;
  token: string;
}

// 3. GET /users/me
export interface MeResponse {
  user: ApiUser & { avatar: string | null };
  wallet: ApiWallet;
}

// 4. GET /users/me/summary (deferrable per ARCHITECTURE §4.2 #4 — may 404 if not shipped)
export interface SummaryResponse {
  netBalance: number;
  youOwe: number;
  youAreOwed: number;
  recentActivity: ApiActivity[];
}

// 5. POST /users/me/wallet/fund
export interface FundWalletResponse {
  wallet: ApiWallet;
}

// 6. GET /groups
export interface GroupsListResponse {
  groups: ApiGroupSummary[];
}

// 7. POST /groups
export interface CreateGroupRequest {
  name: string;
  description?: string;
  type: GroupType;
  memberEmails?: string[];
}
export interface CreateGroupResponse {
  group: ApiGroupDetail;
}

// 8. GET /groups/:id
export interface GroupDetailResponse {
  group: ApiGroupDetail;
  balances: ApiBalance[];
}

// 9. GET /groups/:id/expenses
export interface ExpensesResponse {
  expenses: ApiExpense[];
}

// 10. POST /groups/:id/expenses
export interface AddExpenseRequest {
  description: string;
  amount: number;
  currency?: string;
  category: string;
  paidBy?: string;
  splitMethod: SplitMethod;
  date?: string;
  splits?: { userId: string; amount: number }[] | { userId: string; percentage: number }[];
  receipt?: string | null;
  notes?: string | null;
}
export interface AddExpenseResponse {
  expense: ApiExpense;
}

// 11. GET /groups/:id/balances
export interface BalancesResponse {
  balances: ApiBalance[];
  suggestions: ApiSettleSuggestion[];
}

// 12. POST /groups/:id/settlements
export interface CreateSettlementRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency?: string;
  note?: string;
}
export interface SettlementResponse {
  settlement: ApiSettlement;
}

// 13. GET /groups/:id/settlements
export interface SettlementsListResponse {
  settlements: ApiSettlement[];
}

// 14. GET /settlements/:id -> SettlementResponse (same shape as #12)

// 15. GET /activity
export interface ActivityResponse {
  activities: ApiActivity[];
}

// 16. GET /health
export interface HealthResponse {
  status: string;
  network: string;
  time: string;
}

// ===== Error handling =====

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/** Normalized error thrown for every non-2xx response (uniform envelope, ARCHITECTURE §8.3). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

// ===== Core request helper =====

interface RequestOptions {
  method: 'GET' | 'POST';
  body?: unknown;
}

async function request<T>(path: string, { method, body }: RequestOptions): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  // Only set Content-Type when actually sending a body — this server 500s on
  // `Content-Type: application/json` with an empty body (verified against a live instance).
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Network request failed',
    });
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const errorBody: ApiErrorBody = json?.error ?? {
      code: 'INTERNAL',
      message: `Request failed with status ${res.status}`,
    };
    throw new ApiError(res.status, errorBody);
  }

  return json as T;
}

// ===== Endpoint functions (16 total) =====

export function health(): Promise<HealthResponse> {
  return request('/health', { method: 'GET' });
}

export function register(body: RegisterRequest): Promise<RegisterResponse> {
  return request('/auth/register', { method: 'POST', body });
}

export function login(body: LoginRequest): Promise<LoginResponse> {
  return request('/auth/login', { method: 'POST', body });
}

export function getMe(): Promise<MeResponse> {
  return request('/users/me', { method: 'GET' });
}

export function getMeSummary(): Promise<SummaryResponse> {
  return request('/users/me/summary', { method: 'GET' });
}

export function fundWallet(): Promise<FundWalletResponse> {
  return request('/users/me/wallet/fund', { method: 'POST' });
}

export function getGroups(): Promise<GroupsListResponse> {
  return request('/groups', { method: 'GET' });
}

export function createGroup(body: CreateGroupRequest): Promise<CreateGroupResponse> {
  return request('/groups', { method: 'POST', body });
}

export function getGroup(groupId: string): Promise<GroupDetailResponse> {
  return request(`/groups/${groupId}`, { method: 'GET' });
}

export function getExpenses(groupId: string): Promise<ExpensesResponse> {
  return request(`/groups/${groupId}/expenses`, { method: 'GET' });
}

export function addExpense(groupId: string, body: AddExpenseRequest): Promise<AddExpenseResponse> {
  return request(`/groups/${groupId}/expenses`, { method: 'POST', body });
}

export function getBalances(groupId: string): Promise<BalancesResponse> {
  return request(`/groups/${groupId}/balances`, { method: 'GET' });
}

export function createSettlement(
  groupId: string,
  body: CreateSettlementRequest
): Promise<SettlementResponse> {
  return request(`/groups/${groupId}/settlements`, { method: 'POST', body });
}

export function getSettlements(groupId: string): Promise<SettlementsListResponse> {
  return request(`/groups/${groupId}/settlements`, { method: 'GET' });
}

export function getSettlement(settlementId: string): Promise<SettlementResponse> {
  return request(`/settlements/${settlementId}`, { method: 'GET' });
}

export function getActivity(limit?: number): Promise<ActivityResponse> {
  const query = limit ? `?limit=${limit}` : '';
  return request(`/activity${query}`, { method: 'GET' });
}
