/**
 * AmbagKo - Receipt OCR & AI Split Models
 * 
 * Types for OCR-extracted receipt data and AI-powered
 * expense splitting suggestions.
 */

// ===== OCR EXTRACTED DATA =====

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  assignedTo?: string[];    // User IDs this item is assigned to
}

export interface ReceiptOCRResult {
  // Metadata
  id: string;
  imageUrl: string;
  scannedAt: string;              // ISO 8601
  confidence: number;             // 0-1 overall confidence score
  rawText: string;                // Full OCR text
  
  // Extracted Fields
  vendor: {
    name: string;
    address?: string;
    phone?: string;
    taxId?: string;               // TIN/VAT registration
    confidence: number;
  };
  
  date: {
    value: string;                // YYYY-MM-DD
    time?: string;                // HH:mm
    confidence: number;
  };
  
  // Line Items
  items: ReceiptLineItem[];
  
  // Totals
  subtotal: number;
  tax: {
    amount: number;
    rate?: number;                // e.g. 0.12 for 12% VAT
    type?: 'VAT' | 'sales_tax' | 'service_charge' | 'other';
  };
  serviceCharge?: number;
  discount?: number;
  tip?: number;
  total: number;
  
  // Payment Info (if visible on receipt)
  paymentMethod?: 'cash' | 'card' | 'gcash' | 'maya' | 'other';
  currency: string;               // "PHP" | "USD" etc.
  
  // Additional
  receiptNumber?: string;
  category: ExpenseCategory;      // AI-inferred category
}

export type ExpenseCategory = 
  | 'food_dining'
  | 'groceries'
  | 'transport'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'healthcare'
  | 'travel'
  | 'rent_housing'
  | 'education'
  | 'gifts'
  | 'other';

// ===== AI SPLIT SUGGESTIONS =====

export type SplitMethod = 'equal' | 'percentage' | 'exact' | 'by_item' | 'weighted';

export interface SplitMember {
  userId: string;
  name: string;
  avatar?: string;
}

export interface SplitShare {
  userId: string;
  name: string;
  amount: number;
  percentage: number;
  items?: string[];               // Item names assigned to this person
  reason?: string;                // AI explanation for this split
}

export interface AISplitSuggestion {
  id: string;
  method: SplitMethod;
  label: string;                  // e.g. "Equal split", "By consumption"
  description: string;            // AI explanation
  confidence: number;             // 0-1
  shares: SplitShare[];
  totalAmount: number;
  isRecommended: boolean;
}

export interface SplitRequest {
  receiptData: ReceiptOCRResult;
  members: SplitMember[];
  groupId: string;
  context?: {
    previousSplits?: any[];       // Historical split patterns
    memberPreferences?: Record<string, string[]>; // dietary/item prefs
    occasion?: string;            // "dinner" | "groceries" | "trip"
  };
}

export interface SplitResponse {
  suggestions: AISplitSuggestion[];
  recommended: AISplitSuggestion;   // Top pick
  receiptSummary: {
    vendor: string;
    date: string;
    total: number;
    itemCount: number;
    category: ExpenseCategory;
  };
}

// ===== OCR PROCESSING STATUS =====

export type OCRStatus = 'uploading' | 'processing' | 'extracting' | 'analyzing' | 'complete' | 'error';

export interface OCRProgress {
  status: OCRStatus;
  progress: number;               // 0-100
  message: string;
  result?: ReceiptOCRResult;
  error?: string;
}
