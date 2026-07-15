/**
 * SplitPay - Wallet Top-Up Service (thin API client)
 *
 * Method catalog, fees, limits, and the simulated payment rails all live on
 * the backend now (topups table). This module calls those endpoints and
 * invalidates the cached balance summary once money actually moves.
 */

import { apiClient } from './apiClient';
import { cacheManager } from './apiService';
import { KYCLevel } from '../models/kyc';

export type TopUpMethod =
  | 'gcash'
  | 'maya'
  | 'bank_transfer'
  | 'card'
  | 'stellar_anchor'
  | 'stellar_direct'
  | 'friendbot';

export type TopUpStatus = 'pending_payment' | 'completed' | 'failed' | 'expired';

export interface TopUpMethodInfo {
  method: TopUpMethod;
  name: string;
  icon: string;
  description: string;
  fee: string;
  processingTime: string;
  minAmount: number;
  maxAmount: number;
  available: boolean;
  requiresKYC: KYCLevel;
}

export interface TopUpRecord {
  id: string;
  method: TopUpMethod;
  status: TopUpStatus;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  interactiveUrl?: string;
  paymentInstructions?: Record<string, any>;
  depositInfo?: { address: string; memo: string; memoType: string; network: string };
  stellarTxHash?: string;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Get available top-up methods, with availability already resolved server-side
 * against the current user's KYC level.
 */
export async function getTopUpMethods(): Promise<TopUpMethodInfo[]> {
  const data = await apiClient.get('/users/me/topup/methods');
  return data.methods;
}

/**
 * Initiate a top-up transaction via the given method.
 */
export async function initiateTopUp(
  method: TopUpMethod,
  amount: number,
  metadata?: Record<string, any>
): Promise<TopUpRecord> {
  const data = await apiClient.post('/users/me/topup', { method, amount, metadata });
  if (data.topup?.status === 'completed') {
    cacheManager.invalidate('getUserSummary');
  }
  return data.topup;
}

/**
 * Confirm a simulated-webhook top-up (gcash/maya/card/bank_transfer) after the
 * user says they've paid.
 */
export async function confirmTopUp(id: string): Promise<TopUpRecord> {
  const data = await apiClient.post(`/users/me/topup/${id}/confirm`);
  cacheManager.invalidate('getUserSummary');
  return data.topup;
}

/**
 * Get the current user's top-up history, newest first.
 */
export async function getTopUpHistory(): Promise<TopUpRecord[]> {
  const data = await apiClient.get('/users/me/topup/history');
  return data.topups;
}
