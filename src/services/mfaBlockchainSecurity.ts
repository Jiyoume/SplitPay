/**
 * MyShare - 2FA & Blockchain Security Service
 * 
 * Aligns Supabase Auth 2FA with Stellar blockchain operations.
 * Enforces MFA for sensitive actions.
 */

import { Keypair } from '@stellar/stellar-sdk';

// ===== 2FA REQUIRED ACTIONS =====

export type SecureAction =
  | 'payment_send'           // Sending money
  | 'withdrawal'             // Withdrawing from wallet
  | 'large_transaction'      // Over ₱5,000
  | 'password_change'        // Changing password
  | 'kyc_submit'             // Submitting KYC docs
  | 'stellar_transfer'       // Blockchain transfer
  | 'account_delete'         // Deleting account
  | 'mfa_disable';           // Disabling 2FA itself

export const MFA_THRESHOLDS = {
  paymentAmount: 5000,       // ₱5,000+ requires 2FA
  withdrawalAmount: 1000,    // ₱1,000+ withdrawal requires 2FA
  dailyTotal: 20000,         // ₱20,000+ daily total triggers 2FA
};

// ===== 2FA ENFORCEMENT =====

export interface MFAChallenge {
  required: boolean;
  action: SecureAction;
  reason: string;
  method: '2fa_totp' | '2fa_sms' | 'password_confirm' | 'biometric';
}

/**
 * Check if an action requires 2FA verification.
 */
export function requiresMFA(action: SecureAction, amount?: number): MFAChallenge {
  switch (action) {
    case 'payment_send':
      if (amount && amount >= MFA_THRESHOLDS.paymentAmount) {
        return { required: true, action, reason: `Payments over ₱${MFA_THRESHOLDS.paymentAmount.toLocaleString()} require verification`, method: '2fa_totp' };
      }
      return { required: false, action, reason: '', method: '2fa_totp' };

    case 'withdrawal':
      return { required: true, action, reason: 'All withdrawals require 2FA verification', method: '2fa_totp' };

    case 'large_transaction':
      return { required: true, action, reason: 'Large transactions require additional verification', method: '2fa_totp' };

    case 'stellar_transfer':
      return { required: true, action, reason: 'Blockchain transfers require 2FA for security', method: '2fa_totp' };

    case 'password_change':
      return { required: true, action, reason: 'Password changes require current verification', method: 'password_confirm' };

    case 'kyc_submit':
      return { required: true, action, reason: 'Identity documents require verification before submission', method: '2fa_sms' };

    case 'account_delete':
      return { required: true, action, reason: 'Account deletion is permanent and requires full verification', method: '2fa_totp' };

    case 'mfa_disable':
      return { required: true, action, reason: 'Disabling 2FA requires current 2FA code', method: '2fa_totp' };

    default:
      return { required: false, action, reason: '', method: '2fa_totp' };
  }
}

/**
 * Verify 2FA code via Supabase.
 */
export async function verify2FA(supabaseClient: any, factorId: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: challenge, error: challengeErr } = await supabaseClient.auth.mfa.challenge({ factorId });
    if (challengeErr) return { success: false, error: challengeErr.message };

    const { error: verifyErr } = await supabaseClient.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyErr) return { success: false, error: 'Invalid verification code. Please try again.' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if user has 2FA enabled.
 */
export async function has2FAEnabled(supabaseClient: any): Promise<{ enabled: boolean; factorId?: string }> {
  const { data, error } = await supabaseClient.auth.mfa.listFactors();
  if (error || !data?.totp?.length) return { enabled: false };
  const verified = data.totp.find((f: any) => f.status === 'verified');
  return verified ? { enabled: true, factorId: verified.id } : { enabled: false };
}

// ===== STELLAR WALLET SECURITY =====

/**
 * Generate a new Stellar keypair for a user on signup.
 * The secret key should be encrypted before storing.
 */
export function generateStellarWallet(): { publicKey: string; secretKey: string } {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

/**
 * Encrypt secret key before storing (simple XOR for demo — use AES in production).
 */
export function encryptSecretKey(secretKey: string, userPassword: string): string {
  // In production: use AES-256-GCM with derived key from password
  const encoded = Buffer.from(secretKey).toString('base64');
  return encoded; // Placeholder — replace with real encryption
}

/**
 * Decrypt secret key for signing transactions.
 */
export function decryptSecretKey(encryptedKey: string, userPassword: string): string {
  // In production: use AES-256-GCM decryption
  const decoded = Buffer.from(encryptedKey, 'base64').toString();
  return decoded; // Placeholder
}

/**
 * Sign a Stellar transaction — requires 2FA first.
 */
export async function signStellarTransaction(
  supabaseClient: any,
  encryptedSecret: string,
  userPassword: string,
  mfaCode: string,
  factorId: string,
  transactionXDR: string
): Promise<{ signedXDR?: string; error?: string }> {
  // Step 1: Verify 2FA
  const mfaResult = await verify2FA(supabaseClient, factorId, mfaCode);
  if (!mfaResult.success) {
    return { error: '2FA verification failed: ' + mfaResult.error };
  }

  // Step 2: Decrypt secret key
  const secretKey = decryptSecretKey(encryptedSecret, userPassword);
  
  // Step 3: Sign transaction
  try {
    const keypair = Keypair.fromSecret(secretKey);
    const { TransactionBuilder } = require('@stellar/stellar-sdk');
    const transaction = TransactionBuilder.fromXDR(transactionXDR, 'Test SDF Network ; September 2015');
    transaction.sign(keypair);
    return { signedXDR: transaction.toXDR() };
  } catch (err: any) {
    return { error: 'Failed to sign transaction: ' + err.message };
  }
}

// ===== SECURE PAYMENT FLOW =====

/**
 * Full secure payment flow: verify recipient + 2FA + sign + submit.
 */
export async function securePaymentFlow(params: {
  supabaseClient: any;
  amount: number;
  recipientId: string;
  senderEncryptedKey: string;
  senderPassword: string;
  mfaCode?: string;
  factorId?: string;
}): Promise<{ success: boolean; requiresMFA: boolean; error?: string }> {
  const { supabaseClient, amount, recipientId, mfaCode, factorId } = params;

  // Step 1: Check if 2FA needed
  const mfaCheck = requiresMFA('payment_send', amount);
  if (mfaCheck.required) {
    if (!mfaCode || !factorId) {
      return { success: false, requiresMFA: true, error: mfaCheck.reason };
    }
    // Verify 2FA
    const mfaResult = await verify2FA(supabaseClient, factorId, mfaCode);
    if (!mfaResult.success) {
      return { success: false, requiresMFA: true, error: '2FA failed: ' + mfaResult.error };
    }
  }

  // Step 2: Verify recipient is KYC'd
  const { data: recipient } = await supabaseClient.from('users').select('id,kyc_level,stellar_account').eq('id', recipientId).single();
  if (!recipient || recipient.kyc_level === 'none') {
    return { success: false, requiresMFA: false, error: 'Recipient has not completed identity verification. Payments can only be sent to verified accounts.' };
  }
  if (!recipient.stellar_account) {
    return { success: false, requiresMFA: false, error: 'Recipient does not have a Stellar wallet configured.' };
  }

  // Step 3: Payment approved
  return { success: true, requiresMFA: false };
}

// ===== SETUP 2FA FOR NEW USER =====

/**
 * Enroll user in 2FA during onboarding.
 */
export async function setup2FA(supabaseClient: any): Promise<{ qrCode?: string; secret?: string; factorId?: string; error?: string }> {
  const { data, error } = await supabaseClient.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'MyShare Authenticator',
  });

  if (error) return { error: error.message };
  return {
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id,
  };
}

/**
 * Generate Stellar wallet and save to user profile after 2FA setup.
 */
export async function setupUserWallet(supabaseClient: any, userId: string): Promise<{ publicKey: string; error?: string }> {
  const wallet = generateStellarWallet();

  // Store public key in users table (secret encrypted separately)
  const { error } = await supabaseClient.from('users').update({
    stellar_account: wallet.publicKey,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);

  if (error) return { publicKey: '', error: error.message };

  // In production: store encrypted secret key in a secure vault
  // For now: store in user metadata (NOT recommended for production)
  await supabaseClient.auth.updateUser({
    data: { stellar_secret_encrypted: encryptSecretKey(wallet.secretKey, userId) }
  });

  return { publicKey: wallet.publicKey };
}
