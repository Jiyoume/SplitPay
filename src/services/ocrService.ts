/**
 * SplitPay - Receipt OCR Service (thin API client)
 *
 * OCR execution runs on the backend (POST /receipts/scan, Tesseract.js in Node).
 * This module just uploads the image and maps the backend's flat result shape
 * into the richer ReceiptOCRResult model the rest of the app already expects.
 */

import { apiClient } from './apiClient';
import { ReceiptOCRResult, ReceiptLineItem, ExpenseCategory, OCRProgress } from '../models/receipt';

interface BackendReceiptScanResult {
  vendor: string | null;
  date: string | null;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number | null;
  tax: number | null;
  serviceCharge: number | null;
  total: number | null;
  suggestedCategory: string;
  confidence: number;
  rawText: string;
}

/**
 * Scan a receipt photo and extract structured data.
 *
 * @param imageBase64 - Raw base64 or data-URI encoded jpg/png
 * @param onProgress - Progress callback (upload/processing/complete/error)
 * @returns Structured receipt data
 */
export async function scanReceipt(
  imageBase64: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<ReceiptOCRResult> {
  onProgress?.({ status: 'uploading', progress: 15, message: 'Uploading receipt...' });

  try {
    onProgress?.({ status: 'processing', progress: 50, message: 'Reading text from receipt...' });
    const data: { result: BackendReceiptScanResult } = await apiClient.post('/receipts/scan', { imageBase64 });
    const r = data.result;

    onProgress?.({ status: 'extracting', progress: 85, message: 'Extracting vendor, items, and totals...' });

    const items: ReceiptLineItem[] = (r.items || []).map((i) => ({
      name: i.name,
      quantity: i.quantity || 1,
      unitPrice: i.quantity > 0 ? i.price / i.quantity : i.price,
      totalPrice: i.price,
    }));

    const total = r.total ?? items.reduce((sum, i) => sum + i.totalPrice, 0);

    const result: ReceiptOCRResult = {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      imageUrl: '',
      scannedAt: new Date().toISOString(),
      confidence: r.confidence,
      rawText: r.rawText,
      vendor: { name: r.vendor || 'Unknown Vendor', confidence: r.confidence },
      date: { value: r.date || new Date().toISOString().split('T')[0], confidence: r.confidence },
      items,
      subtotal: r.subtotal ?? total,
      tax: { amount: r.tax ?? 0 },
      serviceCharge: r.serviceCharge ?? undefined,
      total,
      currency: 'PHP',
      category: (r.suggestedCategory as ExpenseCategory) || 'other',
    };

    onProgress?.({ status: 'complete', progress: 100, message: 'Receipt scanned successfully!', result });
    return result;
  } catch (error: any) {
    onProgress?.({ status: 'error', progress: 0, message: error.message || 'Failed to scan receipt', error: error.message });
    throw error;
  }
}
