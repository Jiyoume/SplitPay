/**
 * Uniform error handling (ARCHITECTURE §8.3).
 * Every thrown AppError is rendered by the global error handler as
 * `{ error: { code, message, details? } }` with the mapped HTTP status.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "SETTLEMENT_IN_PROGRESS"
  | "MEMBERS_NOT_FOUND"
  | "WALLET_UNFUNDED"
  | "DEST_NOT_FOUND"
  | "INSUFFICIENT_XLM"
  | "PAYMENT_UNDERFUNDED"
  | "FRIENDBOT_FAILED"
  | "STELLAR_ERROR"
  | "WALLET_KEY_ERROR"
  | "ANCHOR_ERROR"
  | "KYC_REQUIRED"
  | "INVALID_STATE"
  | "OCR_FAILED"
  | "INTERNAL";

export const ERROR_CODE_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  SETTLEMENT_IN_PROGRESS: 409,
  MEMBERS_NOT_FOUND: 422,
  WALLET_UNFUNDED: 422,
  DEST_NOT_FOUND: 422,
  INSUFFICIENT_XLM: 422,
  PAYMENT_UNDERFUNDED: 422,
  FRIENDBOT_FAILED: 502,
  STELLAR_ERROR: 502,
  WALLET_KEY_ERROR: 500,
  ANCHOR_ERROR: 502,
  KYC_REQUIRED: 403,
  INVALID_STATE: 409,
  OCR_FAILED: 502,
  INTERNAL: 500,
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly status: number;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.status = ERROR_CODE_STATUS[code];
  }
}
