import { Keypair } from "@stellar/stellar-sdk";
import { db } from "../../db/index.js";
import { decryptSecret } from "../../stellar/crypto.js";
import { sep10Authenticate, kycGetCustomer, kycPutCustomer } from "../../stellar/anchor.js";
import { getWalletRow } from "../users/users.service.js";
import type { PutKycBody } from "./kyc.schemas.js";

/** Ported from ../../../src/models/kyc.ts (AmbagKo KYC tiers). */
export type KYCLevel = "none" | "basic" | "verified" | "enhanced";

const KYC_REQUIRED_FIELDS: Record<KYCLevel, string[]> = {
  none: [],
  basic: ["firstName", "lastName", "email", "mobileNumber", "birthDate"],
  verified: [
    "firstName",
    "lastName",
    "email",
    "mobileNumber",
    "birthDate",
    "address",
    "idType",
    "idNumber",
    "photoIdFront",
    "selfie",
  ],
  enhanced: [
    "firstName",
    "lastName",
    "email",
    "mobileNumber",
    "birthDate",
    "address",
    "idType",
    "idNumber",
    "photoIdFront",
    "photoIdBack",
    "selfie",
    "proofOfResidence",
    "taxId",
    "occupation",
  ],
};

interface StoredKycProfile {
  firstName: string;
  lastName: string;
  email?: string;
  mobileNumber?: string;
  birthDate?: string;
  address?: { street?: string; city?: string; province?: string; postalCode?: string; countryCode?: string };
  idType?: string;
  idNumber?: string;
}

interface KycProfileRow {
  user_id: string;
  customer_id: string | null;
  status: string;
  level: KYCLevel;
  fields_json: string;
  created_at: string;
  updated_at: string;
}

/** Ported from checkKYCLevel in ../../../src/services/kycService.ts. Document/tax/occupation
 * fields are never collected by this build's PUT body (see contract §5), so 'verified' and
 * 'enhanced' are not reachable via this endpoint alone — that mirrors the real requirement
 * (ID photos + selfie) rather than a bug. */
function hasField(profile: StoredKycProfile, field: string): boolean {
  if (field === "address") return Boolean(profile.address?.street && profile.address?.city);
  return Boolean((profile as unknown as Record<string, unknown>)[field]);
}

function computeLevel(profile: StoredKycProfile): KYCLevel {
  if (KYC_REQUIRED_FIELDS.enhanced.every((f) => hasField(profile, f))) return "enhanced";
  if (KYC_REQUIRED_FIELDS.verified.every((f) => hasField(profile, f))) return "verified";
  if (KYC_REQUIRED_FIELDS.basic.every((f) => hasField(profile, f))) return "basic";
  return "none";
}

function submittedFieldsOf(profile: StoredKycProfile): string[] {
  const candidates = KYC_REQUIRED_FIELDS.enhanced; // superset of every field we might have
  return candidates.filter((f) => hasField(profile, f));
}

/** Ported from mapProfileToSEP9 in ../../../src/services/kycService.ts. */
function mapProfileToSEP9(profile: StoredKycProfile): Record<string, string | undefined> {
  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    email_address: profile.email,
    mobile_number: profile.mobileNumber,
    birth_date: profile.birthDate,
    address_street: profile.address?.street,
    address_city: profile.address?.city,
    address_state_province: profile.address?.province,
    address_postal_code: profile.address?.postalCode,
    address_country_code: profile.address?.countryCode || "PHL",
    id_type: profile.idType,
    id_number: profile.idNumber,
    id_country_code: "PHL",
    language_code: "en",
  };
}

export interface KycStatusResponse {
  status: string;
  level: KYCLevel;
  customerId: string | null;
  submittedFields: string[];
}

function getKycRow(userId: string): KycProfileRow | undefined {
  return db.prepare("SELECT * FROM kyc_profiles WHERE user_id = ?").get(userId) as KycProfileRow | undefined;
}

export function getKycStatus(userId: string): KycStatusResponse {
  const row = getKycRow(userId);
  if (!row) {
    return { status: "NOT_STARTED", level: "none", customerId: null, submittedFields: [] };
  }
  const profile = JSON.parse(row.fields_json) as StoredKycProfile;
  return {
    status: row.status,
    level: row.level,
    customerId: row.customer_id,
    submittedFields: submittedFieldsOf(profile),
  };
}

export async function submitKyc(userId: string, body: PutKycBody): Promise<KycStatusResponse> {
  const wallet = getWalletRow(userId);
  const secret = decryptSecret(wallet.encrypted_secret);
  const keypair = Keypair.fromSecret(secret);

  const existingRow = getKycRow(userId);
  const existingProfile: StoredKycProfile = existingRow
    ? (JSON.parse(existingRow.fields_json) as StoredKycProfile)
    : { firstName: "", lastName: "" };

  const mergedProfile: StoredKycProfile = {
    ...existingProfile,
    ...body,
    address: { ...existingProfile.address, ...body.address },
  };

  // SEP-10 auth as this user, then SEP-12 submit — anchor failures propagate as ANCHOR_ERROR (502)
  // and nothing is persisted (no fake success), per contract §5.
  const jwt = await sep10Authenticate(keypair);

  const sep9Data = mapProfileToSEP9(mergedProfile);
  const submission: Record<string, unknown> = { type: "sep6-deposit", account: wallet.public_key };
  if (existingRow?.customer_id) submission.id = existingRow.customer_id;
  for (const [key, value] of Object.entries(sep9Data)) {
    if (value !== undefined && value !== null && value !== "") submission[key] = value;
  }

  const putResult = await kycPutCustomer(jwt, submission);
  const statusResult = await kycGetCustomer(jwt, wallet.public_key);

  const level = computeLevel(mergedProfile);
  const now = new Date().toISOString();

  if (existingRow) {
    db.prepare(
      `UPDATE kyc_profiles SET customer_id = ?, status = ?, level = ?, fields_json = ?, updated_at = ? WHERE user_id = ?`
    ).run(putResult.id, statusResult.status, level, JSON.stringify(mergedProfile), now, userId);
  } else {
    db.prepare(
      `INSERT INTO kyc_profiles (user_id, customer_id, status, level, fields_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, putResult.id, statusResult.status, level, JSON.stringify(mergedProfile), now, now);
  }

  return {
    status: statusResult.status,
    level,
    customerId: putResult.id,
    submittedFields: submittedFieldsOf(mergedProfile),
  };
}
