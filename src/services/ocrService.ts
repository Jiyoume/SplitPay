/**
 * AmbagKo - Receipt OCR Service
 * 
 * Uses Tesseract.js (client-side OCR) for text extraction from receipt photos,
 * then applies ML-based parsing to extract structured data (vendor, items, totals).
 * 
 * Install: npm install tesseract.js
 * 
 * Architecture:
 * 1. Image preprocessing (contrast, deskew)
 * 2. OCR text extraction (Tesseract.js)
 * 3. NLP parsing (regex + ML patterns for receipt fields)
 * 4. Validation & confidence scoring
 */

import Tesseract from 'tesseract.js';
import {
  ReceiptOCRResult,
  ReceiptLineItem,
  ExpenseCategory,
  OCRProgress,
  OCRStatus,
} from '../models/receipt';

// ===== IMAGE PREPROCESSING =====

/**
 * Preprocess image for better OCR accuracy.
 * Applies grayscale, contrast enhancement, and noise reduction.
 */
async function preprocessImage(imageFile: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale and enhance contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Contrast enhancement (1.5x)
        const enhanced = ((gray - 128) * 1.5) + 128;
        
        // Threshold for cleaner text
        const final = enhanced > 140 ? 255 : enhanced < 80 ? 0 : enhanced;
        
        data[i] = final;
        data[i + 1] = final;
        data[i + 2] = final;
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
}

// ===== OCR TEXT EXTRACTION =====

/**
 * Extract text from receipt image using Tesseract.js
 */
async function extractText(
  imageSource: string | File | Blob,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  const result = await Tesseract.recognize(imageSource, 'eng+fil', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence / 100,
  };
}

// ===== RECEIPT PARSING (ML/NLP) =====

/**
 * Parse vendor name from OCR text.
 * Uses heuristics: first non-empty line, or line with business indicators.
 */
function parseVendor(lines: string[]): { name: string; address?: string; phone?: string; confidence: number } {
  let vendorName = '';
  let address = '';
  let phone = '';
  let confidence = 0.5;

  // Vendor name is usually the first 1-3 lines (often in caps or bold)
  const headerLines = lines.slice(0, 5).filter(l => l.trim().length > 2);
  
  for (const line of headerLines) {
    const trimmed = line.trim();
    
    // Phone pattern
    if (/(\+63|09|02)\d[\d\s-]{7,}/.test(trimmed)) {
      phone = trimmed.match(/(\+?[\d\s-]{10,})/)?.[1]?.trim() || '';
      continue;
    }
    
    // Address indicators
    if (/\b(st\.?|street|ave|avenue|blvd|road|city|brgy|barangay)\b/i.test(trimmed)) {
      address = trimmed;
      continue;
    }
    
    // First substantial line is likely the vendor
    if (!vendorName && trimmed.length > 3 && !/^(receipt|invoice|tax|official)/i.test(trimmed)) {
      vendorName = trimmed;
      // All caps = higher confidence it's a business name
      if (trimmed === trimmed.toUpperCase()) confidence = 0.85;
      else confidence = 0.7;
    }
  }

  return { name: vendorName || 'Unknown Vendor', address, phone, confidence };
}

/**
 * Parse date from OCR text.
 */
function parseDate(text: string): { value: string; time?: string; confidence: number } {
  // Common date patterns in Philippine receipts
  const patterns = [
    /(\d{4}[-/]\d{2}[-/]\d{2})/,                    // 2026-07-15
    /(\d{2}[-/]\d{2}[-/]\d{4})/,                    // 07/15/2026
    /(\d{2}[-/]\d{2}[-/]\d{2})\b/,                  // 07/15/26
    /(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/i,          // July 15, 2026
    /(\d{1,2})\s+(\w{3,9})\s+(\d{4})/i,            // 15 July 2026
  ];

  const timePattern = /(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i;
  const timeMatch = text.match(timePattern);
  const time = timeMatch ? timeMatch[1].trim() : undefined;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let dateStr = match[0];
      // Normalize to YYYY-MM-DD
      try {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return {
            value: parsed.toISOString().split('T')[0],
            time,
            confidence: 0.85,
          };
        }
      } catch {}
      
      return { value: dateStr, time, confidence: 0.6 };
    }
  }

  // Default to today
  return { value: new Date().toISOString().split('T')[0], time, confidence: 0.3 };
}

/**
 * Parse line items from OCR text.
 * Looks for patterns like: "Item Name    qty x price    total"
 */
function parseLineItems(lines: string[]): ReceiptLineItem[] {
  const items: ReceiptLineItem[] = [];
  
  // Pattern: text followed by numbers (price)
  const itemPatterns = [
    /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+[.,]\d{2})\s+(\d+[.,]\d{2})$/,  // name qty x price total
    /^(.+?)\s{2,}(\d+[.,]\d{2})$/,                                    // name    price
    /^(\d+)\s+(.+?)\s+(\d+[.,]\d{2})$/,                               // qty name price
    /^(.+?)\s+@\s*(\d+[.,]\d{2})\s*[xX×]\s*(\d+)\s+(\d+[.,]\d{2})$/, // name @price x qty total
  ];

  // Skip header/footer zones
  const bodyLines = lines.slice(3, -5);
  
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue;
    
    // Skip non-item lines
    if (/^(subtotal|total|tax|vat|discount|change|cash|card|gcash|amount|tender)/i.test(trimmed)) continue;
    if (/^[-=*_]{3,}/.test(trimmed)) continue;
    
    for (const pattern of itemPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const parseNum = (s: string) => parseFloat(s.replace(',', '.'));
        
        if (match.length === 5) {
          // Full: name, qty, unitPrice, total
          items.push({
            name: match[1].trim(),
            quantity: parseInt(match[2]),
            unitPrice: parseNum(match[3]),
            totalPrice: parseNum(match[4]),
          });
        } else if (match.length === 3) {
          // Simple: name, price
          items.push({
            name: match[1].trim(),
            quantity: 1,
            unitPrice: parseNum(match[2]),
            totalPrice: parseNum(match[2]),
          });
        }
        break;
      }
    }
    
    // Fallback: any line with a number at the end that looks like a price
    if (items.length === 0 || items[items.length - 1]?.name !== trimmed) {
      const priceMatch = trimmed.match(/^(.{3,}?)\s+P?(\d{1,6}[.,]\d{2})$/);
      if (priceMatch) {
        const name = priceMatch[1].replace(/[._]{2,}/g, '').trim();
        const price = parseFloat(priceMatch[2].replace(',', '.'));
        if (name.length > 2 && price > 0 && price < 100000) {
          items.push({ name, quantity: 1, unitPrice: price, totalPrice: price });
        }
      }
    }
  }

  return items;
}

/**
 * Parse totals (subtotal, tax, total) from OCR text.
 */
function parseTotals(text: string): { subtotal: number; tax: number; taxRate?: number; total: number; discount?: number; serviceCharge?: number } {
  const findAmount = (pattern: RegExp): number => {
    const match = text.match(pattern);
    return match ? parseFloat(match[1].replace(/[,\s]/g, '')) : 0;
  };

  // Parse totals line-by-line for accuracy (avoids "Subtotal" matching "Total")
  let total = 0, subtotal = 0, tax = 0, discount = 0, serviceCharge = 0;
  const lines = text.split('\n');
  for (const line of lines) {
    const l = line.trim();
    let m;
    if ((m = l.match(/^(?:grand\s*total|total\s*(?:amount|bill|current\s*bill|charges)|amount\s*due|current\s*charges|total\s*amount\s*due)[:\s]*(?:P|₱|PHP)?\s*(\d[\d,]*\.?\d*)/i)) ||
        (m = l.match(/^total[:\s]+(?:P|₱|PHP)?\s*(\d[\d,]*\.?\d*)/i))) {
      total = parseFloat(m[1].replace(/,/g, ''));
    }
    if (m = l.match(/^(?:subtotal|sub[\s-]total)[:\s]*(?:P|₱|PHP)?\s*(\d[\d,]*\.?\d*)/i)) {
      subtotal = parseFloat(m[1].replace(/,/g, ''));
    }
    if (m = l.match(/^(?:vat|tax)\s*\d*%?\s+(\d[\d,]*\.\d{2})/i)) {
      tax = parseFloat(m[1].replace(/,/g, ''));
    }
    if (m = l.match(/^(?:discount|disc|less|promo)[:\s]*-?(?:P|₱|PHP)?\s*(\d[\d,]*\.?\d*)/i)) {
      discount = parseFloat(m[1].replace(/,/g, ''));
    }
    if (m = l.match(/^(?:service\s*charge|sc|svc)[:\s]*(?:P|₱|PHP)?\s*(\d[\d,]*\.?\d*)/i)) {
      serviceCharge = parseFloat(m[1].replace(/,/g, ''));
    }
  }

  // Detect VAT rate
  const vatRateMatch = text.match(/vat\s*(\d+)\s*%/i);
  const taxRate = vatRateMatch ? parseInt(vatRateMatch[1]) / 100 : undefined;

  return {
    subtotal: subtotal || (total - tax),
    tax,
    taxRate,
    total: total || (subtotal + tax - (discount || 0)),
    discount: discount || undefined,
    serviceCharge: serviceCharge || undefined,
  };
}

/**
 * Infer expense category from vendor name and items.
 */
function inferCategory(vendorName: string, items: ReceiptLineItem[]): ExpenseCategory {
  const text = (vendorName + ' ' + items.map(i => i.name).join(' ')).toLowerCase();
  
  const categoryPatterns: [ExpenseCategory, RegExp][] = [
    ['utilities', /\b(electric|meralco|water|maynilad|internet|pldt|globe\s*telecom|smart\s*comm|converge|wifi|manila\s*water)\b/i],
    ['transport', /\b(grab|uber|taxi|gas\s*station|fuel|petron|shell|caltex|parking|toll|lrt|mrt|bus|jeep|angkas)\b/i],
    ['healthcare', /\b(pharmacy|mercury\s*drug|watsons|hospital|clinic|doctor|dental|medical|generika)\b/i],
    ['food_dining', /\b(restaurant|cafe|coffee|diner|grill|kitchen|pizza|burger|chicken|jollibee|mcdo|mcdonald|kfc|mang\s*inasal|chowking|greenwich|shakey|yellow\s*cab|starbucks|tim\s*hortons)\b/i],
    ['groceries', /\b(grocery|supermarket|sm\s*supermarket|sm\s*hypermarket|robinsons\s*supermarket|puregold|metro\s*mart|savemore|7-?eleven|mini\s*stop|alfamart|landers|s&r)\b/i],
    ['entertainment', /\b(cinema|movie|netflix|spotify|games|concert|bar|club|karaoke|sm\s*cinema)\b/i],
    ['shopping', /\b(mall|uniqlo|h&m|zara|lazada|shopee|department|hardware|ace|handyman|national\s*book)\b/i],
    ['travel', /\b(hotel|airbnb|airline|cebu\s*pac|airasia|booking|resort|inn|agoda|trivago)\b/i],
    ['education', /\b(school|tuition|books|university|college|course|training|review\s*center)\b/i],
  ];

  for (const [category, pattern] of categoryPatterns) {
    if (pattern.test(text)) return category;
  }
  
  return 'other';
}

// ===== MAIN OCR FUNCTION =====

/**
 * Scan a receipt photo and extract structured data.
 * 
 * @param imageFile - Photo of the receipt
 * @param onProgress - Progress callback
 * @returns Structured receipt data
 */
export async function scanReceipt(
  imageFile: File | Blob,
  onProgress?: (progress: OCRProgress) => void
): Promise<ReceiptOCRResult> {
  const updateProgress = (status: OCRStatus, progress: number, message: string) => {
    onProgress?.({ status, progress, message });
  };

  try {
    // Step 1: Preprocess image
    updateProgress('uploading', 10, 'Preparing image...');
    const processedImage = await preprocessImage(imageFile);

    // Step 2: OCR extraction
    updateProgress('processing', 20, 'Reading text from receipt...');
    const { text: rawText, confidence } = await extractText(processedImage, (p) => {
      updateProgress('processing', 20 + Math.round(p * 0.4), 'Reading text from receipt...');
    });

    // Step 3: Parse extracted text
    updateProgress('extracting', 65, 'Extracting vendor, items, and totals...');
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    
    const vendor = parseVendor(lines);
    const date = parseDate(rawText);
    const items = parseLineItems(lines);
    const totals = parseTotals(rawText);

    // Step 4: Infer category
    updateProgress('analyzing', 85, 'Categorizing expense...');
    const category = inferCategory(vendor.name, items);

    // Step 5: Build result
    updateProgress('complete', 100, 'Receipt scanned successfully!');

    const result: ReceiptOCRResult = {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      imageUrl: processedImage,
      scannedAt: new Date().toISOString(),
      confidence,
      rawText,
      vendor,
      date,
      items,
      subtotal: totals.subtotal,
      tax: {
        amount: totals.tax,
        rate: totals.taxRate,
        type: totals.taxRate === 0.12 ? 'VAT' : 'sales_tax',
      },
      serviceCharge: totals.serviceCharge,
      discount: totals.discount,
      total: totals.total || items.reduce((sum, i) => sum + i.totalPrice, 0),
      currency: 'PHP',
      category,
    };

    return result;
    
  } catch (error: any) {
    updateProgress('error', 0, error.message || 'Failed to scan receipt');
    throw error;
  }
}
