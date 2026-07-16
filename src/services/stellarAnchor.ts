/**
 * AmbagKo - Stellar Anchor Integration Service
 * 
 * Uses Stellar Wallet SDK to connect to testanchor.stellar.org
 * for deposit (on-ramp: fiat → crypto) and withdrawal (off-ramp: crypto → fiat)
 * via SEP-24 interactive flows.
 * 
 * Install dependencies:
 *   npm install @stellar/typescript-wallet-sdk @stellar/stellar-sdk
 */

import { Wallet, IssuedAssetId, SigningKeypair } from "@stellar/typescript-wallet-sdk";
import { Keypair, Memo, MemoText } from "@stellar/stellar-sdk";

// ===== CONFIGURATION =====
const ANCHOR_HOME_DOMAIN = "testanchor.stellar.org";
const NETWORK = "testnet"; // Use "public" for mainnet

// ===== INITIALIZE WALLET & ANCHOR =====

// Create wallet instance (testnet)
const wallet = Wallet.TestNet();

// Connect to the Stellar test anchor
const anchor = wallet.anchor({ homeDomain: ANCHOR_HOME_DOMAIN });

// Get Stellar network helper for transactions
const stellar = wallet.stellar();

// ===== TYPES =====
export interface AnchorTransaction {
  id: string;
  status: string;
  url?: string;
  amount?: string;
  asset?: string;
}

export interface DepositResult {
  url: string;       // Interactive URL to open in webview/iframe
  id: string;        // Transaction ID for tracking
}

export interface WithdrawalResult {
  url: string;
  id: string;
}

// ===== AUTHENTICATION (SEP-10) =====

/**
 * Authenticate with the anchor using SEP-10 protocol.
 * This generates a JWT token that authorizes subsequent operations.
 */
export async function authenticateWithAnchor(keypair: Keypair) {
  const sep10 = await anchor.sep10();
  const authToken = await sep10.authenticate({
    accountKp: new SigningKeypair(keypair),
  });

  return authToken;
}

// ===== GET ANCHOR INFO =====

/**
 * Get information about the anchor's supported assets and capabilities.
 */
export async function getAnchorInfo() {
  const info = await anchor.getServicesInfo();
  return info;
}

/**
 * Get the supported asset (e.g., SRT - Stellar Reference Token on testnet).
 */
export async function getSupportedAsset(assetCode: string = "SRT") {
  const info = await anchor.getInfo();
  const currency = info.currencies.find(({ code }) => code === assetCode);

  if (!currency?.code || !currency?.issuer) {
    throw new Error(
      `Anchor does not support ${assetCode} asset or is not correctly configured`
    );
  }

  return new IssuedAssetId(currency.code, currency.issuer);
}

// ===== SEP-24 DEPOSIT (FIAT → CRYPTO) =====

/**
 * Initiate a deposit flow (on-ramp).
 * User deposits fiat and receives crypto on Stellar.
 * 
 * Returns an interactive URL to open for the user to complete KYC/payment.
 * 
 * @param authToken - JWT from SEP-10 authentication
 * @param assetCode - Asset to deposit (default: "SRT" on testnet)
 * @param extraFields - Optional SEP-9 KYC fields to pre-fill
 */
export async function initiateDeposit(
  authToken: any,
  assetCode: string = "SRT",
  extraFields?: Record<string, string>
): Promise<DepositResult> {
  const sep24 = await anchor.sep24();

  const depositParams: any = {
    assetCode,
    authToken,
  };

  // Pre-fill KYC info if provided (SEP-9)
  if (extraFields) {
    depositParams.extraFields = extraFields;
  }

  const deposit = await sep24.deposit(depositParams);

  if (!deposit.url || !deposit.id) {
    throw new Error("Anchor did not return an interactive deposit URL");
  }

  return {
    url: deposit.url,    // Open this in webview/iframe for user to complete
    id: deposit.id,      // Track this transaction
  };
}

// ===== SEP-24 WITHDRAWAL (CRYPTO → FIAT) =====

/**
 * Initiate a withdrawal flow (off-ramp).
 * User sends crypto from Stellar and receives fiat.
 * 
 * Returns an interactive URL for user to provide withdrawal details.
 * 
 * @param authToken - JWT from SEP-10 authentication
 * @param assetCode - Asset to withdraw (default: "SRT" on testnet)
 */
export async function initiateWithdrawal(
  authToken: any,
  assetCode: string = "SRT"
): Promise<WithdrawalResult> {
  const sep24 = await anchor.sep24();

  const withdrawal = await sep24.withdraw({
    assetCode,
    authToken,
  });

  if (!withdrawal.url || !withdrawal.id) {
    throw new Error("Anchor did not return an interactive withdrawal URL");
  }

  return {
    url: withdrawal.url,
    id: withdrawal.id,
  };
}

// ===== TRANSACTION TRACKING =====

/**
 * Watch a single transaction for status updates.
 * Calls onMessage for each status change, onSuccess when complete.
 */
export function watchTransaction(
  authToken: any,
  transactionId: string,
  assetCode: string = "SRT",
  callbacks: {
    onMessage: (transaction: any) => void;
    onSuccess: (transaction: any) => void;
    onError: (error: any) => void;
  }
) {
  const sep24 = anchor.sep24();
  const watcher = sep24.watcher();

  const { stop, refresh } = watcher.watchOneTransaction({
    authToken,
    assetCode,
    id: transactionId,
    onMessage: callbacks.onMessage,
    onSuccess: callbacks.onSuccess,
    onError: callbacks.onError,
  });

  return { stop, refresh };
}

/**
 * Get a specific transaction by ID.
 */
export async function getTransaction(authToken: any, transactionId: string) {
  const sep24 = await anchor.sep24();
  
  const transaction = await sep24.getTransactionBy({
    authToken,
    id: transactionId,
  });

  return transaction;
}

/**
 * Get all transactions for an asset.
 */
export async function getTransactions(authToken: any, assetCode: string = "SRT") {
  const sep24 = await anchor.sep24();
  
  const transactions = await sep24.getTransactionsForAsset({
    authToken,
    assetCode,
  });

  return transactions;
}

// ===== SUBMIT WITHDRAWAL TRANSFER =====

/**
 * Submit the actual Stellar payment for a withdrawal.
 * Called after the anchor returns status "pending_user_transfer_start".
 * 
 * @param keypair - User's Stellar keypair
 * @param transaction - The anchor transaction object
 * @param assetCode - Asset being withdrawn
 */
export async function submitWithdrawalTransfer(
  keypair: Keypair,
  transaction: any,
  assetCode: string = "SRT"
) {
  const asset = await getSupportedAsset(assetCode);

  // Build the transfer transaction
  const signingKeypair = new SigningKeypair(keypair);
  const txBuilder = await stellar.transaction({
    sourceAddress: signingKeypair,
    baseFee: 10000,    // 0.001 XLM
    timebounds: 180,   // 3 minutes
  });

  const transferTransaction = txBuilder
    .transferWithdrawalTransaction(transaction, asset)
    .build();

  // Sign with user's keypair
  transferTransaction.sign(keypair);

  // Submit to Stellar network (returns true on success)
  const success = await stellar.submitTransaction(transferTransaction);

  return {
    stellarTransactionId: transferTransaction.hash().toString("hex"),
    success,
  };
}

// ===== FULL FLOW EXAMPLES =====

/**
 * Complete deposit flow example for AmbagKo "Settle Up" feature.
 * 
 * Usage in app:
 *   1. User taps "Add Funds" / "Top Up"
 *   2. App authenticates with anchor
 *   3. App gets interactive URL
 *   4. App opens URL in webview (user completes KYC + payment)
 *   5. App watches transaction until complete
 */
export async function fullDepositFlow(userKeypair: Keypair) {
  // Step 1: Authenticate with anchor (SEP-10)
  const authToken = await authenticateWithAnchor(userKeypair);

  // Step 2: Initiate deposit (get interactive URL)
  const { url, id } = await initiateDeposit(authToken, "SRT", {
    email_address: "user@ambagko.app",
  });

  console.log("Open this URL for user to complete deposit:", url);
  console.log("Transaction ID to track:", id);

  // Step 3: Track the transaction
  const sep24 = await anchor.sep24();
  const watcher = sep24.watcher();

  return new Promise((resolve, reject) => {
    watcher.watchOneTransaction({
      authToken,
      assetCode: "SRT",
      id,
      onMessage: (tx) => {
        console.log(`Transaction status: ${tx.status}`);
      },
      onSuccess: (tx) => {
        console.log("Deposit completed!", tx);
        resolve(tx);
      },
      onError: (err) => {
        console.error("Deposit failed:", err);
        reject(err);
      },
    });
  });
}

/**
 * Complete withdrawal flow for AmbagKo "Cash Out" feature.
 */
export async function fullWithdrawalFlow(userKeypair: Keypair) {
  // Step 1: Authenticate
  const authToken = await authenticateWithAnchor(userKeypair);

  // Step 2: Initiate withdrawal
  const { url, id } = await initiateWithdrawal(authToken, "SRT");

  console.log("Open this URL for user to provide withdrawal details:", url);

  // Step 3: Watch until anchor is ready to receive funds
  const sep24 = await anchor.sep24();
  const watcher = sep24.watcher();

  return new Promise((resolve, reject) => {
    watcher.watchOneTransaction({
      authToken,
      assetCode: "SRT",
      id,
      onMessage: async (tx) => {
        console.log(`Withdrawal status: ${tx.status}`);

        // When anchor is ready, submit the Stellar transfer
        if (tx.status === "pending_user_transfer_start") {
          try {
            const result = await submitWithdrawalTransfer(userKeypair, tx, "SRT");
            console.log("Transfer submitted:", result.stellarTransactionId);
          } catch (err) {
            console.error("Transfer failed:", err);
            reject(err);
          }
        }
      },
      onSuccess: (tx) => {
        console.log("Withdrawal completed!", tx);
        resolve(tx);
      },
      onError: (err) => {
        console.error("Withdrawal failed:", err);
        reject(err);
      },
    });
  });
}

// ===== EXPORT ANCHOR INSTANCE =====
export { wallet, anchor, stellar };
