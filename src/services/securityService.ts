/**
 * AmbagKo - Payment Security & Risk Detection Service
 * 
 * Ensures payments are only sent to verified accounts and
 * detects suspicious activity with confirmation prompts.
 * 
 * Security layers:
 * 1. Account verification check (KYC status must be ACCEPTED)
 * 2. Transaction risk scoring (amount, frequency, recipient, time)
 * 3. Anomaly detection (unusual patterns)
 * 4. Confirmation gate for flagged transactions
 */

import { AmbagKoKYCProfile, KYCLevel, KYC_LIMITS } from '../models/kyc';

// ===== TYPES =====

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RiskFlag = 
  | 'unverified_recipient'
  | 'exceeds_daily_limit'
  | 'exceeds_single_tx_limit'
  | 'unusual_amount'
  | 'unusual_time'
  | 'rapid_transactions'
  | 'new_recipient'
  | 'dormant_account'
  | 'cross_border'
  | 'round_number_large'
  | 'recipient_flagged'
  | 'device_change'
  | 'location_mismatch';

export interface RiskAssessment {
  level: RiskLevel;
  score: number;                    // 0-100 (0 = safe, 100 = block)
  flags: RiskFlag[];
  messages: string[];               // Human-readable warnings
  requiresConfirmation: boolean;
  blocked: boolean;
  blockReason?: string;
  recommendations: string[];
}

export interface PaymentRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  groupId?: string;
  description?: string;
  method?: 'gcash' | 'maya' | 'bank' | 'stellar' | 'cash';
  timestamp?: string;
}

export interface VerifiedAccount {
  userId: string;
  name: string;
  kycLevel: KYCLevel;
  kycStatus: 'ACCEPTED' | 'PROCESSING' | 'NEEDS_INFO' | 'REJECTED' | 'NOT_STARTED';
  isVerified: boolean;
  verifiedAt?: string;
  trustScore: number;               // 0-100
  transactionCount: number;
  memberSince: string;
  flags: string[];
}

export interface TransactionHistory {
  dailyTotal: number;
  monthlyTotal: number;
  last24hCount: number;
  lastTransactionAt?: string;
  averageAmount: number;
  maxHistoricalAmount: number;
  uniqueRecipients: number;
}

export interface SecurityConfirmation {
  required: boolean;
  title: string;
  message: string;
  details: string[];
  severity: RiskLevel;
  actions: {
    confirm: string;
    cancel: string;
    report?: string;
  };
}

// ===== ACCOUNT VERIFICATION =====

/**
 * Check if a recipient account is verified and eligible to receive payments.
 */
export function verifyRecipientAccount(recipient: VerifiedAccount): {
  eligible: boolean;
  reason?: string;
} {
  // Must have completed KYC
  if (recipient.kycStatus !== 'ACCEPTED') {
    return {
      eligible: false,
      reason: `Recipient has not completed identity verification (Status: ${recipient.kycStatus}). Payments can only be sent to verified accounts.`,
    };
  }

  // Must have at least basic KYC level
  if (recipient.kycLevel === 'none') {
    return {
      eligible: false,
      reason: 'Recipient account has no KYC verification. They must complete at least Basic verification to receive payments.',
    };
  }

  // Check if account is flagged
  if (recipient.flags.includes('suspended')) {
    return {
      eligible: false,
      reason: 'Recipient account has been suspended. Contact support for more information.',
    };
  }

  if (recipient.flags.includes('fraud_suspected')) {
    return {
      eligible: false,
      reason: 'This account has been flagged for suspicious activity. Payment blocked for your protection.',
    };
  }

  // Account is dormant (no activity for 90+ days)
  if (recipient.flags.includes('dormant')) {
    return {
      eligible: true, // Allow but flag
      reason: 'This account has been inactive for over 90 days. Please confirm you have the correct recipient.',
    };
  }

  return { eligible: true };
}

// ===== RISK SCORING ENGINE =====

/**
 * Calculate risk score for a payment transaction.
 * Returns 0-100 score with identified risk flags.
 */
export function assessTransactionRisk(
  payment: PaymentRequest,
  sender: VerifiedAccount,
  recipient: VerifiedAccount,
  senderHistory: TransactionHistory,
  senderKYC: AmbagKoKYCProfile
): RiskAssessment {
  const flags: RiskFlag[] = [];
  const messages: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  // --- Rule 1: Unverified recipient (CRITICAL) ---
  if (!recipient.isVerified || recipient.kycStatus !== 'ACCEPTED') {
    flags.push('unverified_recipient');
    messages.push('Recipient has not been verified.');
    score += 50;
  }

  // --- Rule 2: Transaction limits ---
  const limits = KYC_LIMITS[senderKYC.kycLevel];
  
  if (payment.amount > limits.singleTxLimit) {
    flags.push('exceeds_single_tx_limit');
    messages.push(`Amount ₱${payment.amount.toLocaleString()} exceeds your single transaction limit of ₱${limits.singleTxLimit.toLocaleString()}.`);
    score += 40;
  }

  if (senderHistory.dailyTotal + payment.amount > limits.dailyLimit) {
    flags.push('exceeds_daily_limit');
    messages.push(`This transaction would exceed your daily limit of ₱${limits.dailyLimit.toLocaleString()}.`);
    score += 35;
  }

  // --- Rule 3: Unusual amount ---
  if (senderHistory.averageAmount > 0) {
    const ratio = payment.amount / senderHistory.averageAmount;
    if (ratio > 5) {
      flags.push('unusual_amount');
      messages.push(`This amount is ${Math.round(ratio)}x higher than your average transaction.`);
      score += 20;
    }
  }

  // Large round numbers are suspicious
  if (payment.amount >= 10000 && payment.amount % 1000 === 0) {
    flags.push('round_number_large');
    score += 5;
  }

  // --- Rule 4: Unusual timing ---
  const hour = new Date(payment.timestamp || Date.now()).getHours();
  if (hour >= 0 && hour < 5) {
    flags.push('unusual_time');
    messages.push('Transaction initiated during unusual hours (12am-5am).');
    score += 10;
  }

  // --- Rule 5: Rapid transactions (velocity check) ---
  if (senderHistory.last24hCount >= 10) {
    flags.push('rapid_transactions');
    messages.push(`You've made ${senderHistory.last24hCount} transactions in the last 24 hours.`);
    score += 15;
  }

  // Check time since last transaction
  if (senderHistory.lastTransactionAt) {
    const timeSince = Date.now() - new Date(senderHistory.lastTransactionAt).getTime();
    const minutesSince = timeSince / (1000 * 60);
    if (minutesSince < 2 && payment.amount > 5000) {
      flags.push('rapid_transactions');
      messages.push('Multiple high-value transactions in quick succession detected.');
      score += 20;
    }
  }

  // --- Rule 6: New recipient ---
  if (recipient.transactionCount === 0) {
    flags.push('new_recipient');
    messages.push('You have never sent money to this person before.');
    score += 10;
    recommendations.push('Double-check the recipient name and details.');
  }

  // --- Rule 7: Dormant recipient account ---
  if (recipient.flags.includes('dormant')) {
    flags.push('dormant_account');
    messages.push('Recipient account has been inactive for an extended period.');
    score += 15;
  }

  // --- Rule 8: Flagged recipient ---
  if (recipient.trustScore < 30) {
    flags.push('recipient_flagged');
    messages.push('This recipient has a low trust score.');
    score += 25;
  }

  // --- Determine risk level ---
  let level: RiskLevel;
  if (score >= 70) level = 'critical';
  else if (score >= 45) level = 'high';
  else if (score >= 25) level = 'medium';
  else level = 'low';

  // --- Determine if blocked ---
  const blocked = score >= 80 || flags.includes('unverified_recipient');
  const blockReason = blocked
    ? flags.includes('unverified_recipient')
      ? 'Payments can only be sent to verified accounts. Ask the recipient to complete their KYC verification.'
      : 'Transaction blocked due to multiple high-risk indicators. Please contact support.'
    : undefined;

  // --- Recommendations ---
  if (flags.includes('exceeds_daily_limit') || flags.includes('exceeds_single_tx_limit')) {
    recommendations.push('Upgrade your KYC level to increase transaction limits.');
  }
  if (flags.includes('unusual_amount')) {
    recommendations.push('Verify the amount is correct before proceeding.');
  }
  if (level === 'medium' || level === 'high') {
    recommendations.push('Review all details carefully before confirming.');
  }

  return {
    level,
    score: Math.min(score, 100),
    flags,
    messages,
    requiresConfirmation: level !== 'low',
    blocked,
    blockReason,
    recommendations,
  };
}

// ===== CONFIRMATION DIALOG GENERATOR =====

/**
 * Generate the confirmation popup content based on risk assessment.
 */
export function generateSecurityConfirmation(
  risk: RiskAssessment,
  payment: PaymentRequest,
  recipientName: string
): SecurityConfirmation {
  if (risk.blocked) {
    return {
      required: true,
      title: '🚫 Payment Blocked',
      message: risk.blockReason || 'This transaction cannot be completed.',
      details: risk.messages,
      severity: 'critical',
      actions: {
        confirm: 'Contact Support',
        cancel: 'Go Back',
      },
    };
  }

  if (risk.level === 'critical') {
    return {
      required: true,
      title: '⚠️ High Risk Detected',
      message: `Are you sure you want to send ₱${payment.amount.toLocaleString()} to ${recipientName}?`,
      details: [
        ...risk.messages,
        '',
        '⚠️ Multiple security concerns were detected with this transaction.',
        'If you did not initiate this payment, secure your account immediately.',
      ],
      severity: 'critical',
      actions: {
        confirm: 'I understand the risks — Send anyway',
        cancel: 'Cancel Payment',
        report: 'Report Suspicious Activity',
      },
    };
  }

  if (risk.level === 'high') {
    return {
      required: true,
      title: '⚠️ Please Confirm',
      message: `Sending ₱${payment.amount.toLocaleString()} to ${recipientName}`,
      details: [
        ...risk.messages,
        '',
        'Please review and confirm this is correct.',
      ],
      severity: 'high',
      actions: {
        confirm: 'Confirm & Send',
        cancel: 'Cancel',
        report: 'Something looks wrong',
      },
    };
  }

  // Medium risk
  return {
    required: true,
    title: '🔔 Confirm Payment',
    message: `Send ₱${payment.amount.toLocaleString()} to ${recipientName}?`,
    details: risk.messages.length > 0 
      ? ['Note:', ...risk.messages]
      : [`You are about to send ₱${payment.amount.toLocaleString()} to ${recipientName}.`],
    severity: 'medium',
    actions: {
      confirm: 'Send Payment',
      cancel: 'Cancel',
    },
  };
}

// ===== PAYMENT GATE =====

/**
 * Main security gate — call this before processing any payment.
 * 
 * Returns:
 * - allowed: true → proceed with payment
 * - allowed: false, confirmation → show popup to user
 * - allowed: false, blocked → reject payment
 */
export function paymentSecurityGate(
  payment: PaymentRequest,
  sender: VerifiedAccount,
  recipient: VerifiedAccount,
  senderHistory: TransactionHistory,
  senderKYC: AmbagKoKYCProfile
): {
  allowed: boolean;
  risk: RiskAssessment;
  confirmation?: SecurityConfirmation;
} {
  // Step 1: Check recipient is verified
  const recipientCheck = verifyRecipientAccount(recipient);
  
  if (!recipientCheck.eligible) {
    return {
      allowed: false,
      risk: {
        level: 'critical',
        score: 100,
        flags: ['unverified_recipient'],
        messages: [recipientCheck.reason!],
        requiresConfirmation: false,
        blocked: true,
        blockReason: recipientCheck.reason,
        recommendations: ['Ask the recipient to complete KYC verification.'],
      },
      confirmation: {
        required: true,
        title: '🚫 Unverified Recipient',
        message: recipientCheck.reason!,
        details: [
          'For your security, AmbagKo only allows payments to verified accounts.',
          '',
          'The recipient needs to:',
          '1. Open AmbagKo and go to Profile',
          '2. Complete identity verification (KYC)',
          '3. Wait for approval',
          '',
          'Once verified, you can send them payments.',
        ],
        severity: 'critical',
        actions: {
          confirm: 'Notify Recipient',
          cancel: 'Go Back',
        },
      },
    };
  }

  // Step 2: Assess transaction risk
  const risk = assessTransactionRisk(payment, sender, recipient, senderHistory, senderKYC);

  // Step 3: If low risk, allow immediately
  if (risk.level === 'low' && !risk.requiresConfirmation) {
    return { allowed: true, risk };
  }

  // Step 4: Generate confirmation for medium+ risk
  const confirmation = generateSecurityConfirmation(risk, payment, recipient.name);

  return {
    allowed: false,
    risk,
    confirmation,
  };
}

// ===== FRAUD PATTERN DETECTION =====

/**
 * Detect potential fraud patterns across transaction history.
 * Run periodically or before large transactions.
 */
export function detectFraudPatterns(
  recentTransactions: PaymentRequest[],
  sender: VerifiedAccount
): { suspicious: boolean; patterns: string[] } {
  const patterns: string[] = [];

  // Pattern 1: Splitting large amount into smaller ones (structuring)
  const last1h = recentTransactions.filter(tx => {
    const diff = Date.now() - new Date(tx.timestamp || '').getTime();
    return diff < 3600000; // 1 hour
  });
  
  if (last1h.length >= 5) {
    const total = last1h.reduce((sum, tx) => sum + tx.amount, 0);
    const avg = total / last1h.length;
    if (avg < 5000 && total > 20000) {
      patterns.push('Possible structuring: multiple small transactions that total a large amount.');
    }
  }

  // Pattern 2: Same amount to multiple recipients
  const amountGroups: Record<number, string[]> = {};
  recentTransactions.forEach(tx => {
    if (!amountGroups[tx.amount]) amountGroups[tx.amount] = [];
    amountGroups[tx.amount].push(tx.toUserId);
  });
  
  Object.entries(amountGroups).forEach(([amount, recipients]) => {
    const unique = new Set(recipients);
    if (unique.size >= 3 && Number(amount) > 1000) {
      patterns.push(`Same amount (₱${Number(amount).toLocaleString()}) sent to ${unique.size} different recipients.`);
    }
  });

  // Pattern 3: Receiving and immediately sending (pass-through)
  // Would need received transactions too — simplified here

  return {
    suspicious: patterns.length > 0,
    patterns,
  };
}

// ===== RATE LIMITING =====

const rateLimitStore: Record<string, { count: number; resetAt: number }> = {};

/**
 * Check rate limit for a user.
 * Prevents more than maxTx transactions per windowMs.
 */
export function checkRateLimit(
  userId: string,
  maxTx: number = 20,
  windowMs: number = 3600000 // 1 hour
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore[userId];

  if (!entry || now > entry.resetAt) {
    rateLimitStore[userId] = { count: 1, resetAt: now + windowMs };
    return { allowed: true, remaining: maxTx - 1, resetIn: windowMs };
  }

  if (entry.count >= maxTx) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxTx - entry.count, resetIn: entry.resetAt - now };
}
