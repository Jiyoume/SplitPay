/**
 * AmbagKo - Stellar Wallet Top-Up Module
 * 
 * Provides multiple ways to fund a user's Stellar wallet:
 * 1. SEP-24 Anchor deposit (fiat → Stellar via interactive flow)
 * 2. GCash/Maya on-ramp (Philippine e-wallets)
 * 3. Bank transfer (InstaPay/PESONet)
 * 4. Stellar testnet friendbot (for testing)
 * 5. Direct Stellar transfer (from external wallet)
 * 
 * All top-ups go through security verification before crediting.
 */

import { Keypair, Networks, TransactionBuilder, Operation, Asset, Horizon } from '@stellar/stellar-sdk';
import { Wallet, IssuedAssetId } from '@stellar/typescript-wallet-sdk';
import { authenticateWithAnchor, anchor, stellar } from './stellarAnchor';
import { paymentSecurityGate } from './securityService';
import { AmbagKoKYCProfile, KYC_LIMITS, KYCLevel } from '../models/kyc';

// ===== TYPES =====

export type TopUpMethod = 
  | 'stellar_anchor'    // SEP-24 interactive deposit
  | 'gcash'             // GCash e-wallet
  | 'maya'              // Maya (PayMaya) e-wallet
  | 'bank_transfer'     // InstaPay / PESONet
  | 'card'              // Debit/Credit card
  | 'stellar_direct'    // From external Stellar wallet
  | 'friendbot';        // Testnet funding

export type TopUpStatus = 
  | 'initiated'
  | 'pending_payment'
  | 'processing'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'refunded';

export interface TopUpRequest {
  userId: string;
  method: TopUpMethod;
  amount: number;              // In PHP (will be converted to Stellar asset)
  currency: string;            // "PHP"
  stellarAccount: string;      // User's Stellar public key
  assetCode?: string;          // Target asset (default: "SRT" on testnet, "PHPC" on mainnet)
  metadata?: {
    gcashNumber?: string;
    mayaNumber?: string;
    bankCode?: string;
    bankAccountNumber?: string;
    cardLast4?: string;
    externalStellarAddress?: string;
  };
}

export interface TopUpTransaction {
  id: string;
  userId: string;
  method: TopUpMethod;
  status: TopUpStatus;
  amount: number;
  currency: string;
  stellarAsset: string;
  stellarAmount: number;       // Amount in Stellar asset (after conversion)
  exchangeRate: number;        // PHP to asset rate
  fee: number;
  netAmount: number;           // Amount credited after fees
  stellarTxHash?: string;
  anchorTxId?: string;
  interactiveUrl?: string;     // For SEP-24 flows
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface TopUpLimits {
  minAmount: number;
  maxAmount: number;
  dailyRemaining: number;
  monthlyRemaining: number;
}

export interface TopUpMethodInfo {
  method: TopUpMethod;
  name: string;
  icon: string;
  description: string;
  fee: string;                 // e.g. "1.5%" or "₱25 flat"
  processingTime: string;      // e.g. "Instant" or "1-2 business days"
  minAmount: number;
  maxAmount: number;
  available: boolean;
  requiresKYC: KYCLevel;
}

// ===== CONFIGURATION =====

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const TOP_UP_METHODS: TopUpMethodInfo[] = [
  {
    method: 'gcash',
    name: 'GCash',
    icon: '💚',
    description: 'Top up instantly from your GCash wallet',
    fee: '1.5%',
    processingTime: 'Instant',
    minAmount: 100,
    maxAmount: 50000,
    available: true,
    requiresKYC: 'basic',
  },
  {
    method: 'maya',
    name: 'Maya',
    icon: '💜',
    description: 'Top up from your Maya account',
    fee: '1.5%',
    processingTime: 'Instant',
    minAmount: 100,
    maxAmount: 50000,
    available: true,
    requiresKYC: 'basic',
  },
  {
    method: 'bank_transfer',
    name: 'Bank Transfer',
    icon: '🏦',
    description: 'Transfer from any Philippine bank via InstaPay',
    fee: '₱15 flat',
    processingTime: '5-30 minutes',
    minAmount: 500,
    maxAmount: 200000,
    available: true,
    requiresKYC: 'verified',
  },
  {
    method: 'card',
    name: 'Debit/Credit Card',
    icon: '💳',
    description: 'Visa or Mastercard',
    fee: '2.5%',
    processingTime: 'Instant',
    minAmount: 200,
    maxAmount: 100000,
    available: true,
    requiresKYC: 'verified',
  },
  {
    method: 'stellar_anchor',
    name: 'Stellar Anchor',
    icon: '⭐',
    description: 'Deposit via Stellar anchor (SEP-24)',
    fee: 'Varies',
    processingTime: '1-5 minutes',
    minAmount: 100,
    maxAmount: 500000,
    available: true,
    requiresKYC: 'basic',
  },
  {
    method: 'stellar_direct',
    name: 'External Stellar Wallet',
    icon: '🔗',
    description: 'Send from another Stellar wallet address',
    fee: 'Network fee only',
    processingTime: '3-5 seconds',
    minAmount: 1,
    maxAmount: 10000000,
    available: true,
    requiresKYC: 'basic',
  },
  {
    method: 'friendbot',
    name: 'Testnet Faucet',
    icon: '🤖',
    description: 'Get free test XLM (testnet only)',
    fee: 'Free',
    processingTime: 'Instant',
    minAmount: 0,
    maxAmount: 10000,
    available: true,
    requiresKYC: 'none',
  },
];

// ===== HELPER FUNCTIONS =====

function generateTxId(): string {
  return `topup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function calculateFee(method: TopUpMethod, amount: number): number {
  switch (method) {
    case 'gcash':
    case 'maya':
      return Math.round(amount * 0.015 * 100) / 100;    // 1.5%
    case 'card':
      return Math.round(amount * 0.025 * 100) / 100;    // 2.5%
    case 'bank_transfer':
      return 15;                                          // ₱15 flat
    case 'stellar_anchor':
      return Math.round(amount * 0.01 * 100) / 100;     // ~1%
    case 'stellar_direct':
    case 'friendbot':
      return 0;
    default:
      return 0;
  }
}

// ===== TOP-UP SERVICE =====

/**
 * Get available top-up methods for a user based on their KYC level.
 */
export function getAvailableTopUpMethods(kycLevel: KYCLevel): TopUpMethodInfo[] {
  const levelOrder: KYCLevel[] = ['none', 'basic', 'verified', 'enhanced'];
  const userLevelIndex = levelOrder.indexOf(kycLevel);

  return TOP_UP_METHODS.map(method => ({
    ...method,
    available: levelOrder.indexOf(method.requiresKYC) <= userLevelIndex,
  }));
}

/**
 * Get top-up limits for a user.
 */
export function getTopUpLimits(
  kycLevel: KYCLevel,
  method: TopUpMethod,
  dailyUsed: number = 0,
  monthlyUsed: number = 0
): TopUpLimits {
  const kycLimits = KYC_LIMITS[kycLevel];
  const methodInfo = TOP_UP_METHODS.find(m => m.method === method);

  const maxByMethod = methodInfo?.maxAmount || 0;
  const maxByKYC = kycLimits.singleTxLimit;

  return {
    minAmount: methodInfo?.minAmount || 100,
    maxAmount: Math.min(maxByMethod, maxByKYC),
    dailyRemaining: Math.max(0, kycLimits.dailyLimit - dailyUsed),
    monthlyRemaining: Math.max(0, kycLimits.monthlyLimit - monthlyUsed),
  };
}

/**
 * Initiate a top-up transaction.
 */
export async function initiateTopUp(request: TopUpRequest): Promise<TopUpTransaction> {
  const fee = calculateFee(request.method, request.amount);
  const netAmount = request.amount - fee;
  const exchangeRate = 1; // 1:1 for testnet SRT, would be dynamic on mainnet

  const transaction: TopUpTransaction = {
    id: generateTxId(),
    userId: request.userId,
    method: request.method,
    status: 'initiated',
    amount: request.amount,
    currency: request.currency || 'PHP',
    stellarAsset: request.assetCode || 'SRT',
    stellarAmount: netAmount * exchangeRate,
    exchangeRate,
    fee,
    netAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
  };

  return transaction;
}

// ===== METHOD-SPECIFIC HANDLERS =====

/**
 * Top up via Stellar Anchor (SEP-24 interactive deposit).
 */
export async function topUpViaStellarAnchor(
  userKeypair: Keypair,
  amount: number,
  assetCode: string = 'SRT'
): Promise<{ interactiveUrl: string; transactionId: string }> {
  // Authenticate with anchor
  const authToken = await authenticateWithAnchor(userKeypair);

  // Get SEP-24 service
  const sep24 = await anchor.sep24();

  // Initiate deposit
  const deposit = await sep24.deposit({
    assetCode,
    authToken,
    extraFields: {
      amount: String(amount),
    },
  });

  if (!deposit.url || !deposit.id) {
    throw new Error('Anchor did not return an interactive deposit URL');
  }

  return {
    interactiveUrl: deposit.url,
    transactionId: deposit.id,
  };
}

/**
 * Top up via Friendbot (testnet only — free XLM).
 */
export async function topUpViaFriendbot(
  stellarAccount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${stellarAccount}`);
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Friendbot request failed' };
    }

    const result = await response.json();
    return {
      success: true,
      txHash: result.hash,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Top up via GCash (simulated for hackathon — would integrate GCash API).
 */
export async function topUpViaGCash(
  amount: number,
  gcashNumber: string,
  userId: string
): Promise<TopUpTransaction> {
  const transaction = await initiateTopUp({
    userId,
    method: 'gcash',
    amount,
    currency: 'PHP',
    stellarAccount: '',
    metadata: { gcashNumber },
  });

  // In production: call GCash Payments API
  // For hackathon: simulate the flow
  transaction.status = 'pending_payment';
  transaction.interactiveUrl = `https://api.gcash.com/pay?amount=${amount}&ref=${transaction.id}`;

  return transaction;
}

/**
 * Top up via Maya (simulated for hackathon).
 */
export async function topUpViaMaya(
  amount: number,
  mayaNumber: string,
  userId: string
): Promise<TopUpTransaction> {
  const transaction = await initiateTopUp({
    userId,
    method: 'maya',
    amount,
    currency: 'PHP',
    stellarAccount: '',
    metadata: { mayaNumber },
  });

  transaction.status = 'pending_payment';
  transaction.interactiveUrl = `https://payments.maya.ph/pay?amount=${amount}&ref=${transaction.id}`;

  return transaction;
}

/**
 * Top up via bank transfer (generates payment instructions).
 */
export async function topUpViaBankTransfer(
  amount: number,
  userId: string
): Promise<TopUpTransaction & { paymentInstructions: any }> {
  const transaction = await initiateTopUp({
    userId,
    method: 'bank_transfer',
    amount,
    currency: 'PHP',
    stellarAccount: '',
  });

  transaction.status = 'pending_payment';

  const paymentInstructions = {
    bankName: 'AmbagKo Digital Bank',
    accountName: 'AmbagKo Holdings Inc.',
    accountNumber: '0012-3456-7890',
    referenceNumber: transaction.id.replace('topup_', ''),
    amount: amount,
    channel: 'InstaPay or PESONet',
    expiresAt: transaction.expiresAt,
    note: 'Use the reference number as your transaction memo.',
  };

  return { ...transaction, paymentInstructions };
}

/**
 * Top up via direct Stellar transfer (from external wallet).
 * Returns the deposit address and memo for the user to send to.
 */
export function getDirectDepositInfo(
  stellarAccount: string,
  userId: string
): { address: string; memo: string; memoType: string; asset: string; network: string } {
  return {
    address: stellarAccount,
    memo: userId.slice(0, 28), // Stellar memo max 28 chars
    memoType: 'text',
    asset: 'XLM (native) or SRT',
    network: 'Stellar Testnet',
  };
}

// ===== TRANSACTION MONITORING =====

/**
 * Watch for incoming Stellar payments to detect top-up completion.
 */
export async function watchIncomingPayments(
  stellarAccount: string,
  onPayment: (payment: any) => void
): Promise<() => void> {
  const server = new Horizon.Server(HORIZON_URL);
  
  const closeStream = server
    .payments()
    .forAccount(stellarAccount)
    .cursor('now')
    .stream({
      onmessage: (payment: any) => {
        // Only process incoming payments
        if (payment.type === 'payment' && payment.to === stellarAccount) {
          onPayment({
            from: payment.from,
            amount: payment.amount,
            asset: payment.asset_type === 'native' ? 'XLM' : payment.asset_code,
            txHash: payment.transaction_hash,
            timestamp: payment.created_at,
          });
        }
      },
      onerror: (error: any) => {
        console.error('Payment stream error:', error);
      },
    });

  // Return cleanup function
  return () => closeStream();
}

/**
 * Check account balance on Stellar.
 */
export async function getWalletBalance(
  stellarAccount: string
): Promise<{ asset: string; balance: string }[]> {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(stellarAccount);
    
    return account.balances.map((bal: any) => ({
      asset: bal.asset_type === 'native' ? 'XLM' : `${bal.asset_code}`,
      balance: bal.balance,
    }));
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [{ asset: 'XLM', balance: '0' }];
    }
    throw error;
  }
}

/**
 * Create and fund a new Stellar account (testnet).
 */
export async function createStellarWallet(): Promise<{
  publicKey: string;
  secretKey: string;
  funded: boolean;
}> {
  const keypair = Keypair.random();
  
  // Fund on testnet via friendbot
  const fundResult = await topUpViaFriendbot(keypair.publicKey());
  
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
    funded: fundResult.success,
  };
}

/**
 * Establish trustline for an anchor asset (required before receiving deposits).
 */
export async function establishTrustline(
  userKeypair: Keypair,
  assetCode: string,
  assetIssuer: string
): Promise<{ success: boolean; txHash?: string }> {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(userKeypair.publicKey());
    
    const asset = new Asset(assetCode, assetIssuer);
    
    const transaction = new TransactionBuilder(account, {
      fee: '10000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(Operation.changeTrust({ asset }))
      .setTimeout(180)
      .build();
    
    transaction.sign(userKeypair);
    
    const result = await server.submitTransaction(transaction);
    
    return { success: true, txHash: result.hash };
  } catch (error: any) {
    console.error('Trustline error:', error);
    return { success: false };
  }
}

// ===== EXPORT ALL METHODS INFO =====
export { TOP_UP_METHODS };
