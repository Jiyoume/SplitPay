/**
 * AmbagKo - KYC Data Models (SEP-12 & SEP-9)
 * 
 * Based on:
 * - SEP-12: KYC API (https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md)
 * - SEP-9: Standard KYC Fields (https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0009.md)
 */

// ===== CUSTOMER STATUS (SEP-12) =====

export type CustomerStatus = 
  | 'ACCEPTED'       // KYC approved
  | 'PROCESSING'     // Under review
  | 'NEEDS_INFO'     // More information required
  | 'REJECTED';      // KYC failed permanently

export type FieldStatus = 
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'REJECTED'
  | 'VERIFICATION_REQUIRED';

export type FieldType = 'string' | 'binary' | 'number' | 'date';

// ===== SEP-9 KYC FIELDS =====

/**
 * Natural person (individual) KYC fields as defined in SEP-9.
 * These are the standard fields that anchors can request.
 */
export interface KYCNaturalPerson {
  // Basic Identity
  first_name?: string;
  last_name?: string;
  additional_name?: string;        // Middle name or other names
  email_address?: string;
  phone_number?: string;           // E.164 format: +639171234567
  mobile_number?: string;          // E.164 format
  
  // Date & Birth
  birth_date?: string;             // YYYY-MM-DD
  birth_place?: string;
  birth_country_code?: string;     // ISO 3166-1 alpha-3
  
  // Address
  address_street?: string;
  address_city?: string;
  address_state_province?: string;
  address_postal_code?: string;
  address_country_code?: string;   // ISO 3166-1 alpha-3 (e.g. "PHL")
  
  // Tax & Financial
  tax_id?: string;
  tax_id_name?: string;            // e.g. "TIN" for Philippines
  
  // Identity Documents
  id_type?: string;                // "passport" | "drivers_license" | "national_id" | "voter_id"
  id_country_code?: string;        // Issuing country
  id_issue_date?: string;          // YYYY-MM-DD
  id_expiration_date?: string;     // YYYY-MM-DD
  id_number?: string;
  
  // Binary (file) fields
  photo_id_front?: File | Blob;
  photo_id_back?: File | Blob;
  photo_proof_residence?: File | Blob;  // Utility bill, bank statement
  selfie?: File | Blob;                  // Live selfie for identity verification
  
  // Employment
  occupation?: string;
  employer_name?: string;
  employer_address?: string;
  
  // Citizenship
  citizenship_country_code?: string;
  
  // Language preference
  language_code?: string;          // ISO 639-1 (e.g. "en", "fil")
  
  // Additional
  referral_id?: string;
  ip_address?: string;
  sex?: string;
}

/**
 * Organization (business) KYC fields.
 * Prefixed with "organization." in SEP-9.
 */
export interface KYCOrganization {
  'organization.name'?: string;
  'organization.registration_number'?: string;
  'organization.registration_country'?: string;
  'organization.registration_date'?: string;
  'organization.registered_address'?: string;
  'organization.type'?: string;             // "corporation" | "partnership" | "sole_proprietorship"
  'organization.phone_number'?: string;
  'organization.email'?: string;
  'organization.website'?: string;
  'organization.photo_incorporation_doc'?: File | Blob;
  'organization.photo_proof_address'?: File | Blob;
}

// ===== SEP-12 API TYPES =====

/**
 * Customer field definition returned by GET /customer
 */
export interface CustomerField {
  type: FieldType;
  description: string;
  choices?: string[];
  optional?: boolean;
  status?: FieldStatus;
  error?: string;
}

/**
 * GET /customer response
 */
export interface CustomerResponse {
  id?: string;
  status: CustomerStatus;
  fields?: Record<string, CustomerField>;
  provided_fields?: Record<string, CustomerField>;
  message?: string;
}

/**
 * PUT /customer request body
 */
export interface CustomerPutRequest {
  id?: string;
  account?: string;
  memo?: string;
  memo_type?: 'text' | 'id' | 'hash';
  type?: string;                    // e.g. "sep6-deposit", "sep31-sender"
  transaction_id?: string;
  // Plus any SEP-9 fields
  [key: string]: any;
}

/**
 * PUT /customer response
 */
export interface CustomerPutResponse {
  id: string;
}

/**
 * File upload response from POST /customer/files
 */
export interface CustomerFileResponse {
  file_id: string;
  content_type: string;
  size: number;
  expires_at?: string;
  customer_id?: string;
}

/**
 * PUT /customer/callback request
 */
export interface CustomerCallbackRequest {
  id?: string;
  account?: string;
  memo?: string;
  memo_type?: string;
  url: string;
}

/**
 * DELETE /customer response
 */
export interface CustomerDeleteResponse {
  status: 200 | 401 | 404;
}

// ===== AMBAGKO KYC REGISTRATION MODEL =====

/**
 * KYC levels for AmbagKo.
 * Different tiers unlock different transaction limits.
 */
export type KYCLevel = 'none' | 'basic' | 'verified' | 'enhanced';

/**
 * AmbagKo's internal KYC registration model.
 * Maps user data to SEP-9/SEP-12 fields for anchor submission.
 */
export interface AmbagKoKYCProfile {
  // Internal
  userId: string;
  kycLevel: KYCLevel;
  stellarAccount?: string;
  customerId?: string;              // SEP-12 customer ID from anchor
  status: CustomerStatus | 'NOT_STARTED';
  lastUpdated: string;              // ISO 8601
  
  // Basic KYC (Level 1) — Required for basic transactions
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;             // PH format: +639xxxxxxxxx
  birthDate: string;                // YYYY-MM-DD
  
  // Verified KYC (Level 2) — Required for higher limits
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;            // "PHL"
  };
  idType: 'passport' | 'drivers_license' | 'national_id' | 'voter_id' | 'philsys_id';
  idNumber: string;
  idExpirationDate?: string;
  
  // Enhanced KYC (Level 3) — Required for large transactions
  taxId?: string;                   // TIN
  occupation?: string;
  employerName?: string;
  sourceOfFunds?: string;
  
  // Document uploads (stored as file references)
  documents: {
    photoIdFront?: string;          // file_id from POST /customer/files
    photoIdBack?: string;
    selfie?: string;
    proofOfResidence?: string;
    proofOfIncome?: string;
  };
  
  // Verification
  mobileVerified: boolean;
  emailVerified: boolean;
  identityVerified: boolean;
}

/**
 * KYC tier transaction limits for AmbagKo (in PHP)
 */
export const KYC_LIMITS: Record<KYCLevel, { dailyLimit: number; monthlyLimit: number; singleTxLimit: number }> = {
  none: { dailyLimit: 0, monthlyLimit: 0, singleTxLimit: 0 },
  basic: { dailyLimit: 50000, monthlyLimit: 100000, singleTxLimit: 25000 },
  verified: { dailyLimit: 200000, monthlyLimit: 500000, singleTxLimit: 100000 },
  enhanced: { dailyLimit: 1000000, monthlyLimit: 5000000, singleTxLimit: 500000 },
};

/**
 * Philippine-specific ID types accepted for KYC
 */
export const PH_ID_TYPES = [
  { value: 'philsys_id', label: 'PhilSys National ID' },
  { value: 'passport', label: 'Philippine Passport' },
  { value: 'drivers_license', label: "Driver's License (LTO)" },
  { value: 'national_id', label: 'UMID / SSS / GSIS ID' },
  { value: 'voter_id', label: "Voter's ID (COMELEC)" },
] as const;

/**
 * Required fields per KYC level
 */
export const KYC_REQUIRED_FIELDS: Record<KYCLevel, string[]> = {
  none: [],
  basic: ['firstName', 'lastName', 'email', 'mobileNumber', 'birthDate'],
  verified: ['firstName', 'lastName', 'email', 'mobileNumber', 'birthDate', 
             'address', 'idType', 'idNumber', 'photoIdFront', 'selfie'],
  enhanced: ['firstName', 'lastName', 'email', 'mobileNumber', 'birthDate',
             'address', 'idType', 'idNumber', 'photoIdFront', 'photoIdBack',
             'selfie', 'proofOfResidence', 'taxId', 'occupation'],
};
