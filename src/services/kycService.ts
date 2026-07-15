/**
 * AmbagKo - KYC Service (SEP-12 Implementation)
 * 
 * Implements the SEP-12 KYC API client for registering customer
 * information with Stellar anchors during the onboarding flow.
 * 
 * Flow:
 * 1. User signs up in AmbagKo
 * 2. User starts KYC → GET /customer (check required fields)
 * 3. User fills form → PUT /customer (submit info)
 * 4. If files needed → POST /customer/files (upload docs)
 * 5. If verification needed → PUT /customer (with _verification code)
 * 6. Watch status → GET /customer or callback
 */

import { Keypair } from "@stellar/stellar-sdk";
import {
  CustomerResponse,
  CustomerPutResponse,
  CustomerFileResponse,
  AmbagKoKYCProfile,
  KYCLevel,
  KYC_LIMITS,
  KYC_REQUIRED_FIELDS,
  KYCNaturalPerson,
} from "../models/kyc";
import { authenticateWithAnchor, anchor } from "./stellarAnchor";

// ===== CONFIGURATION =====
const KYC_SERVER = "https://testanchor.stellar.org/kyc";

// ===== SEP-12 API CLIENT =====

/**
 * GET /customer — Check KYC status or get required fields.
 */
export async function getCustomer(
  authToken: string,
  options: {
    id?: string;
    type?: string;
    transactionId?: string;
  } = {}
): Promise<CustomerResponse> {
  const params = new URLSearchParams();
  if (options.id) params.set("id", options.id);
  if (options.type) params.set("type", options.type);
  if (options.transactionId) params.set("transaction_id", options.transactionId);

  const response = await fetch(`${KYC_SERVER}/customer?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `KYC GET failed: ${response.status}`);
  }

  return response.json();
}

/**
 * PUT /customer — Submit or update customer KYC information.
 * Supports both JSON and multipart/form-data (for binary files).
 */
export async function putCustomer(
  authToken: string,
  data: Record<string, any>,
  files?: Record<string, File | Blob>
): Promise<CustomerPutResponse> {
  let body: FormData | string;
  let headers: Record<string, string> = {
    Authorization: `Bearer ${authToken}`,
  };

  if (files && Object.keys(files).length > 0) {
    // Use multipart/form-data for file uploads
    const formData = new FormData();
    
    // Add non-binary fields first
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    
    // Add binary fields last (per SEP-12 spec)
    Object.entries(files).forEach(([key, file]) => {
      formData.append(key, file);
    });

    body = formData;
    // Don't set Content-Type — browser will set it with boundary
  } else {
    // Use JSON for non-binary data
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  const response = await fetch(`${KYC_SERVER}/customer`, {
    method: "PUT",
    headers,
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `KYC PUT failed: ${response.status}`);
  }

  return response.json();
}

/**
 * POST /customer/files — Upload a file for later use in PUT /customer.
 */
export async function uploadCustomerFile(
  authToken: string,
  file: File | Blob
): Promise<CustomerFileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${KYC_SERVER}/customer/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `File upload failed: ${response.status}`);
  }

  return response.json();
}

/**
 * PUT /customer/callback — Set webhook for status updates.
 */
export async function setCustomerCallback(
  authToken: string,
  callbackUrl: string,
  customerId?: string
): Promise<void> {
  const body: Record<string, string> = { url: callbackUrl };
  if (customerId) body.id = customerId;

  const response = await fetch(`${KYC_SERVER}/customer/callback`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Callback setup failed: ${response.status}`);
  }
}

/**
 * DELETE /customer/:account — Delete all customer data.
 */
export async function deleteCustomer(
  authToken: string,
  stellarAccount: string
): Promise<void> {
  const response = await fetch(`${KYC_SERVER}/customer/${stellarAccount}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete customer failed: ${response.status}`);
  }
}

// ===== AMBAGKO KYC REGISTRATION FLOW =====

/**
 * Map AmbagKo profile data to SEP-9 fields for anchor submission.
 */
export function mapProfileToSEP9(profile: AmbagKoKYCProfile): KYCNaturalPerson {
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
    id_expiration_date: profile.idExpirationDate,
    id_country_code: "PHL",
    tax_id: profile.taxId,
    tax_id_name: "TIN",
    occupation: profile.occupation,
    employer_name: profile.employerName,
    citizenship_country_code: "PHL",
    language_code: "en",
  };
}

/**
 * Start the KYC registration process.
 * 
 * Steps:
 * 1. Authenticate with anchor (SEP-10)
 * 2. Check what fields are required (GET /customer)
 * 3. Submit user data (PUT /customer)
 * 4. Upload documents if needed (POST /customer/files)
 * 5. Return customer ID and status
 */
export async function startKYCRegistration(
  userKeypair: Keypair,
  profile: AmbagKoKYCProfile,
  documents?: {
    photoIdFront?: File | Blob;
    photoIdBack?: File | Blob;
    selfie?: File | Blob;
    proofOfResidence?: File | Blob;
  }
): Promise<{ customerId: string; status: string }> {
  // Step 1: Authenticate (SEP-12 endpoints take the raw JWT string)
  const { token: authToken } = await authenticateWithAnchor(userKeypair);

  // Step 2: Check required fields
  const currentStatus = await getCustomer(authToken, { type: "sep6-deposit" });
  console.log("Current KYC status:", currentStatus.status);

  // Step 3: Map profile to SEP-9 and submit
  const sep9Data = mapProfileToSEP9(profile);
  
  // Clean undefined values
  const cleanData: Record<string, any> = { type: "sep6-deposit" };
  Object.entries(sep9Data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      cleanData[key] = value;
    }
  });

  // If we already have a customer ID, include it
  if (profile.customerId) {
    cleanData.id = profile.customerId;
  }

  // Step 4: Upload documents first if provided
  const fileIds: Record<string, string> = {};
  
  if (documents) {
    if (documents.photoIdFront) {
      const result = await uploadCustomerFile(authToken, documents.photoIdFront);
      fileIds.photo_id_front_file_id = result.file_id;
    }
    if (documents.photoIdBack) {
      const result = await uploadCustomerFile(authToken, documents.photoIdBack);
      fileIds.photo_id_back_file_id = result.file_id;
    }
    if (documents.selfie) {
      const result = await uploadCustomerFile(authToken, documents.selfie);
      // Selfie mapped to photo_id_front or separate field
      fileIds.selfie_file_id = result.file_id;
    }
    if (documents.proofOfResidence) {
      const result = await uploadCustomerFile(authToken, documents.proofOfResidence);
      fileIds.photo_proof_residence_file_id = result.file_id;
    }
  }

  // Merge file IDs into submission
  const submissionData = { ...cleanData, ...fileIds };

  // Step 5: Submit to anchor
  const putResult = await putCustomer(authToken, submissionData);

  // Step 6: Check final status
  const finalStatus = await getCustomer(authToken, { id: putResult.id });

  return {
    customerId: putResult.id,
    status: finalStatus.status,
  };
}

/**
 * Submit mobile number verification code.
 */
export async function verifyMobileNumber(
  authToken: string,
  customerId: string,
  verificationCode: string
): Promise<CustomerResponse> {
  await putCustomer(authToken, {
    id: customerId,
    mobile_number_verification: verificationCode,
  });

  // Get updated status
  return getCustomer(authToken, { id: customerId });
}

/**
 * Submit email verification code.
 */
export async function verifyEmail(
  authToken: string,
  customerId: string,
  verificationCode: string
): Promise<CustomerResponse> {
  await putCustomer(authToken, {
    id: customerId,
    email_address_verification: verificationCode,
  });

  return getCustomer(authToken, { id: customerId });
}

/**
 * Check if user has completed the required KYC level.
 */
export function checkKYCLevel(profile: AmbagKoKYCProfile): KYCLevel {
  const requiredBasic = KYC_REQUIRED_FIELDS.basic;
  const requiredVerified = KYC_REQUIRED_FIELDS.verified;
  const requiredEnhanced = KYC_REQUIRED_FIELDS.enhanced;

  const hasField = (field: string): boolean => {
    if (field === 'address') return !!(profile.address?.street && profile.address?.city);
    if (field === 'photoIdFront') return !!profile.documents?.photoIdFront;
    if (field === 'photoIdBack') return !!profile.documents?.photoIdBack;
    if (field === 'selfie') return !!profile.documents?.selfie;
    if (field === 'proofOfResidence') return !!profile.documents?.proofOfResidence;
    return !!(profile as any)[field];
  };

  if (requiredEnhanced.every(hasField)) return 'enhanced';
  if (requiredVerified.every(hasField)) return 'verified';
  if (requiredBasic.every(hasField)) return 'basic';
  return 'none';
}

/**
 * Get the transaction limits for a given KYC level.
 */
export function getTransactionLimits(level: KYCLevel) {
  return KYC_LIMITS[level];
}

/**
 * Poll KYC status until it changes from PROCESSING.
 */
export async function pollKYCStatus(
  authToken: string,
  customerId: string,
  intervalMs: number = 5000,
  maxAttempts: number = 60
): Promise<CustomerResponse> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await getCustomer(authToken, { id: customerId });
    
    if (status.status !== 'PROCESSING') {
      return status;
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('KYC status polling timed out');
}
