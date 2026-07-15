/**
 * SplitPay - Stellar Anchor Integration Service (thin API client)
 *
 * SEP-10/SEP-24 handshakes now run on the backend against the user's custodial
 * key (never exposed to the client). This module just calls the deposit/withdraw
 * endpoints and returns the anchor's interactive URL for the app to open.
 */

import { apiClient } from './apiClient';

export interface AnchorInteractiveResult {
  url: string;  // Interactive URL to open (Linking.openURL) for the user to complete
  id: string;   // Anchor transaction ID for tracking
}

/**
 * Initiate a SEP-24 deposit flow (fiat -> crypto on-ramp).
 */
export async function initiateDeposit(assetCode: string = 'SRT'): Promise<AnchorInteractiveResult> {
  return apiClient.post('/users/me/anchor/deposit', { assetCode });
}

/**
 * Initiate a SEP-24 withdrawal flow (crypto -> fiat off-ramp).
 */
export async function initiateWithdrawal(assetCode: string = 'SRT'): Promise<AnchorInteractiveResult> {
  return apiClient.post('/users/me/anchor/withdraw', { assetCode });
}
