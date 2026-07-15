/**
 * SplitPay - KYC Service (thin API client)
 *
 * SEP-12 submission to the anchor now runs on the backend. This module just
 * reads/writes the user's KYC profile through the backend's own endpoints.
 */

import { apiClient } from './apiClient';
import { KYCLevel, KYC_LIMITS, PH_ID_TYPES } from '../models/kyc';

export type KycStatus = 'NOT_STARTED' | 'PROCESSING' | 'NEEDS_INFO' | 'ACCEPTED' | 'REJECTED';

export interface KycStatusResponse {
  status: KycStatus;
  level: KYCLevel;
  customerId: string | null;
  submittedFields: string[];
}

export interface KycSubmission {
  firstName: string;
  lastName: string;
  email?: string;
  mobileNumber?: string;
  birthDate?: string;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    countryCode?: string;
  };
  idType?: string;
  idNumber?: string;
}

/**
 * Get the current user's KYC status and level.
 */
export async function getKycStatus(): Promise<KycStatusResponse> {
  return apiClient.get('/users/me/kyc');
}

/**
 * Submit or update the current user's KYC profile with the anchor.
 */
export async function submitKyc(profile: KycSubmission): Promise<KycStatusResponse> {
  return apiClient.put('/users/me/kyc', profile);
}

/**
 * Get the transaction limits for a given KYC level.
 */
export function getTransactionLimits(level: KYCLevel) {
  return KYC_LIMITS[level];
}

export { PH_ID_TYPES };
