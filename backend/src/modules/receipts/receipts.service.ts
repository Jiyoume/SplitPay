/**
 * Receipt OCR — ports the regex parsing + category detection from
 * ../../../src/services/ocrService.ts (client-side canvas preprocessing dropped per contract §1;
 * the raw image buffer goes straight to Tesseract, which runs fine in Node).
 */

import Tesseract from "tesseract.js";
import { AppError } from "../../utils/errors.js";

interface ParsedLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptScanResult {
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

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function isSupportedImage(buf: Buffer): boolean {
  return (
    (buf.length >= PNG_SIGNATURE.length && buf.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) ||
    (buf.length >= JPEG_SIGNATURE.length && buf.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE))
  );
}

/**
 * Decodes + validates the image magic bytes (jpg/png only, per contract §1) BEFORE handing the
 * buffer to Tesseract. This guard is required, not cosmetic: tesseract.js's underlying worker
 * throws an *uncaught* exception (crashing the whole Node process, not a rejected promise) when
 * given data it can't parse as an image — verified during this build's curl testing. Rejecting
 * malformed input here keeps a bad upload a clean 400 instead of taking the server down.
 */
function decodeImage(imageBase64: string): Buffer {
  const commaIdx = imageBase64.indexOf(",");
  const raw = imageBase64.startsWith("data:") && commaIdx !== -1 ? imageBase64.slice(commaIdx + 1) : imageBase64;
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
  } catch {
    throw new AppError("VALIDATION_ERROR", "imageBase64 is not valid base64 image data");
  }
  if (buf.length === 0 || !isSupportedImage(buf)) {
    throw new AppError("VALIDATION_ERROR", "imageBase64 must decode to a valid JPEG or PNG image");
  }
  return buf;
}

async function extractText(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  try {
    const result = await Tesseract.recognize(buffer, "eng+fil");
    return { text: result.data.text, confidence: result.data.confidence / 100 };
  } catch (err) {
    throw new AppError("OCR_FAILED", "Failed to run OCR on the receipt image", {
      reason: (err as Error)?.message ?? String(err),
    });
  }
}

function parseVendor(lines: string[]): { name: string; confidence: number } {
  let vendorName = "";
  let confidence = 0.5;

  const headerLines = lines.slice(0, 5).filter((l) => l.trim().length > 2);

  for (const line of headerLines) {
    const trimmed = line.trim();

    if (/(\+63|09|02)\d[\d\s-]{7,}/.test(trimmed)) continue; // phone line
    if (/\b(st\.?|street|ave|avenue|blvd|road|city|brgy|barangay)\b/i.test(trimmed)) continue; // address line

    if (!vendorName && trimmed.length > 3 && !/^(receipt|invoice|tax|official)/i.test(trimmed)) {
      vendorName = trimmed;
      confidence = trimmed === trimmed.toUpperCase() ? 0.85 : 0.7;
    }
  }

  return { name: vendorName || "Unknown Vendor", confidence };
}

function parseDate(text: string): { value: string; confidence: number } {
  const patterns = [
    /(\d{4}[-/]\d{2}[-/]\d{2})/,
    /(\d{2}[-/]\d{2}[-/]\d{4})/,
    /(\d{2}[-/]\d{2}[-/]\d{2})\b/,
    /(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{1,2})\s+(\w{3,9})\s+(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[0];
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return { value: parsed.toISOString().split("T")[0], confidence: 0.85 };
      }
      return { value: dateStr, confidence: 0.6 };
    }
  }

  return { value: new Date().toISOString().split("T")[0], confidence: 0.3 };
}

function parseLineItems(lines: string[]): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];

  const itemPatterns = [
    /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+[.,]\d{2})\s+(\d+[.,]\d{2})$/,
    /^(.+?)\s{2,}(\d+[.,]\d{2})$/,
    /^(\d+)\s+(.+?)\s+(\d+[.,]\d{2})$/,
    /^(.+?)\s+@\s*(\d+[.,]\d{2})\s*[xX×]\s*(\d+)\s+(\d+[.,]\d{2})$/,
  ];

  const bodyLines = lines.slice(3, -5);

  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue;

    if (/^(subtotal|total|tax|vat|discount|change|cash|card|gcash|amount|tender)/i.test(trimmed)) continue;
    if (/^[-=*_]{3,}/.test(trimmed)) continue;

    let matched = false;
    for (const pattern of itemPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const parseNum = (s: string) => parseFloat(s.replace(",", "."));

        if (match.length === 5) {
          items.push({
            name: match[1].trim(),
            quantity: parseInt(match[2], 10),
            unitPrice: parseNum(match[3]),
            totalPrice: parseNum(match[4]),
          });
        } else if (match.length === 3) {
          items.push({
            name: match[1].trim(),
            quantity: 1,
            unitPrice: parseNum(match[2]),
            totalPrice: parseNum(match[2]),
          });
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      const priceMatch = trimmed.match(/^(.{3,}?)\s+P?(\d{1,6}[.,]\d{2})$/);
      if (priceMatch) {
        const name = priceMatch[1].replace(/[._]{2,}/g, "").trim();
        const price = parseFloat(priceMatch[2].replace(",", "."));
        if (name.length > 2 && price > 0 && price < 100000) {
          items.push({ name, quantity: 1, unitPrice: price, totalPrice: price });
        }
      }
    }
  }

  return items;
}

function parseTotals(text: string): {
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  serviceCharge?: number;
} {
  const findAmount = (pattern: RegExp): number => {
    const match = text.match(pattern);
    return match ? parseFloat(match[1].replace(/[,\s]/g, "")) : 0;
  };

  const total = findAmount(/(?:total|grand\s*total|amount\s*due)[:\s]*P?\s*(\d+[.,]?\d*)/i);
  const subtotal = findAmount(/(?:subtotal|sub\s*total|sub-total)[:\s]*P?\s*(\d+[.,]?\d*)/i);
  const tax = findAmount(/(?:vat|tax|vat\s*\d+%)[:\s]*P?\s*(\d+[.,]?\d*)/i);
  const discount = findAmount(/(?:discount|disc|less)[:\s]*-?P?\s*(\d+[.,]?\d*)/i);
  const serviceCharge = findAmount(/(?:service\s*charge|sc)[:\s]*P?\s*(\d+[.,]?\d*)/i);

  return {
    subtotal: subtotal || total - tax,
    tax,
    total: total || subtotal + tax - (discount || 0),
    discount: discount || undefined,
    serviceCharge: serviceCharge || undefined,
  };
}

/**
 * Ported from inferCategory in ocrService.ts. NOTE: these category ids (e.g. 'food_dining',
 * 'groceries') do NOT match backend EXPENSE_CATEGORIES (config/constants.ts) used to validate
 * POST /groups/:id/expenses — this is a display-only suggestion string per contract §1; the
 * frontend must map it to the nearest EXPENSE_CATEGORIES value before submitting an expense.
 */
function inferCategory(vendorName: string, items: ParsedLineItem[]): string {
  const text = (vendorName + " " + items.map((i) => i.name).join(" ")).toLowerCase();

  const categoryPatterns: [string, RegExp][] = [
    ["food_dining", /restaurant|cafe|coffee|diner|grill|kitchen|pizza|burger|chicken|jollibee|mcdo|kfc|mang inasal|chowking/i],
    ["groceries", /grocery|supermarket|sm|robinsons|puregold|metro|savemore|7-?eleven|mini\s*stop/i],
    ["transport", /grab|uber|taxi|gas|fuel|petron|shell|caltex|parking|toll|lrt|mrt|bus|jeep/i],
    ["utilities", /electric|meralco|water|maynilad|internet|pldt|globe|smart|converge|wifi/i],
    ["entertainment", /cinema|movie|netflix|spotify|games|concert|bar|club|karaoke/i],
    ["shopping", /mall|uniqlo|h&m|zara|lazada|shopee|department|hardware/i],
    ["healthcare", /pharmacy|mercury|watsons|hospital|clinic|doctor|dental|medical/i],
    ["travel", /hotel|airbnb|airline|cebu\s*pac|airasia|booking|resort|inn/i],
    ["education", /school|tuition|books|university|college|course|training/i],
  ];

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(text)) return category;
  }

  return "other";
}

export async function scanReceipt(imageBase64: string): Promise<ReceiptScanResult> {
  const buffer = decodeImage(imageBase64);
  const { text: rawText, confidence } = await extractText(buffer);

  const lines = rawText.split("\n").filter((l) => l.trim().length > 0);
  const vendor = parseVendor(lines);
  const date = parseDate(rawText);
  const items = parseLineItems(lines);
  const totals = parseTotals(rawText);
  const suggestedCategory = inferCategory(vendor.name, items);
  const total = totals.total || items.reduce((sum, i) => sum + i.totalPrice, 0);

  return {
    vendor: vendor.name === "Unknown Vendor" ? null : vendor.name,
    date: date.value || null,
    items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.totalPrice })),
    subtotal: totals.subtotal || null,
    tax: totals.tax || null,
    serviceCharge: totals.serviceCharge ?? null,
    total: total || null,
    suggestedCategory,
    confidence,
    rawText,
  };
}
