import { decryptSecret } from "../../stellar/crypto.js";
import { Keypair } from "@stellar/stellar-sdk";
import { ensureTrustline, sep10Authenticate, sep24Interactive, SRT_ASSET_CODE, SRT_ASSET_ISSUER } from "../../stellar/anchor.js";
import { getWalletRow } from "../users/users.service.js";
import type { Sep24InteractiveResult } from "../../stellar/anchor.js";

async function authenticateAsUser(userId: string): Promise<{ jwt: string; publicKey: string; secret: string }> {
  const wallet = getWalletRow(userId);
  const secret = decryptSecret(wallet.encrypted_secret);
  const keypair = Keypair.fromSecret(secret);
  const jwt = await sep10Authenticate(keypair);
  return { jwt, publicKey: wallet.public_key, secret };
}

export async function initiateAnchorDeposit(userId: string, assetCode: string): Promise<Sep24InteractiveResult> {
  const { jwt, publicKey, secret } = await authenticateAsUser(userId);

  if (assetCode === SRT_ASSET_CODE) {
    await ensureTrustline({ secret, publicKey, assetCode: SRT_ASSET_CODE, assetIssuer: SRT_ASSET_ISSUER });
  }

  return sep24Interactive("deposit", jwt, assetCode, publicKey);
}

export async function initiateAnchorWithdraw(userId: string, assetCode: string): Promise<Sep24InteractiveResult> {
  const { jwt, publicKey } = await authenticateAsUser(userId);
  return sep24Interactive("withdraw", jwt, assetCode, publicKey);
}
