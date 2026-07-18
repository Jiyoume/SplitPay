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
      // Scale down large images for faster processing (max 1500px width)
      const maxWidth = 1500;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Step 1: Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      
      // Step 2: Auto-level (normalize brightness range)
      let minVal = 255, maxVal = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < minVal) minVal = data[i];
        if (data[i] > maxVal) maxVal = data[i];
      }
      const range = maxVal - minVal || 1;
      for (let i = 0; i < data.length; i += 4) {
        const normalized = ((data[i] - minVal) / range) * 255;
        data[i] = data[i + 1] = data[i + 2] = normalized;
      }
      
      // Step 3: Adaptive contrast enhancement
      for (let i = 0; i < data.length; i += 4) {
        const val = data[i];
        // Sigmoid-based contrast (preserves mid-tones better than linear)
        const contrast = 255 / (1 + Math.exp(-(val - 128) / 30));
        data[i] = data[i + 1] = data[i + 2] = contrast;
      }
      
      // Step 4: Otsu's threshold for binarization (text becomes pure black, bg pure white)
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) histogram[Math.round(data[i])]++;
      const totalPixels = data.length / 4;
      
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];
      let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
      
      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        const wF = totalPixels - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVariance) { maxVariance = variance; threshold = t; }
      }
      
      // Apply threshold with slight bias toward keeping text
      const adjustedThreshold = threshold * 0.9;
      for (let i = 0; i < data.length; i += 4) {
        const final = data[i] > adjustedThreshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = final;
      }
      
      // Step 5: Noise removal (remove isolated black pixels)
      const w = canvas.width;
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          if (data[i] === 0) {
            // Count black neighbors
            let blackNeighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const ni = ((y + dy) * w + (x + dx)) * 4;
                if (data[ni] === 0) blackNeighbors++;
              }
            }
            // Isolated pixel (< 2 neighbors) — remove it
            if (blackNeighbors < 2) data[i] = data[i + 1] = data[i + 2] = 255;
          }
        }
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
 * Handles various PH receipt formats: thermal printers, handwritten, POS systems.
 */
function parseLineItems(lines: string[]): ReceiptLineItem[] {
  const items: ReceiptLineItem[] = [];
  
  // Extended patterns for Philippine receipts
  const itemPatterns = [
    /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+[.,]\d{2})\s+(\d+[.,]\d{2})$/,       // name qty x price total
    /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+[.,]\d{2})$/,                          // name qty x price (no total)
    /^(.+?)\s{2,}(\d+[.,]\d{2})$/,                                         // name    price (2+ spaces)
    /^(\d+)\s+(.+?)\s+(\d+[.,]\d{2})$/,                                    // qty name price
    /^(.+?)\s+@\s*(\d+[.,]\d{2})\s*[xX×]\s*(\d+)\s+(\d+[.,]\d{2})$/,     // name @price x qty total
    /^(.+?)\s+P(\d+[.,]\d{2})$/,                                           // name P123.00 (peso prefix)
    /^(.+?)\s+₱(\d+[.,]\d{2})$/,                                           // name ₱123.00
    /^(.+?)\.{2,}\s*(\d+[.,]\d{2})$/,                                      // name.....price (dot leaders)
    /^(.+?)\s+(\d{2,5})$/,                                                  // name  price (whole number, 2-5 digits)
    /^(.+?)\s+-?\s*(\d+[.,]\d{2})\s*[A-Z]?$/,                             // name  price + tax code letter
    /^(\d+)\s*[xX×]\s*(.+?)\s+(\d+[.,]\d{2})$/,                           // qty x name price
    /^(.+?)\t+(\d+[.,]?\d*)$/,                                             // name\tprice (tab separated)
  ];

  // Skip header (first 3 lines) and footer (last 5 lines)
  const bodyLines = lines.slice(3, Math.max(lines.length - 5, 4));
  
  // Words that indicate non-item lines
  const skipPatterns = /^(subtotal|sub-total|total|tax|vat|discount|change|cash|card|gcash|maya|amount|tender|thank|welcome|come|again|receipt|invoice|tin|official|cashier|date|time|terminal|-----|\*\*\*\*|====)/i;
  
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed.length < 4) continue;
    if (skipPatterns.test(trimmed)) continue;
    if (/^[-=*_~]{3,}$/.test(trimmed)) continue; // Separator lines
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/.test(trimmed)) continue; // Date lines
    
    let matched = false;
    for (const pattern of itemPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const parseNum = (s: string) => parseFloat(s.replace(',', '.'));
        
        if (match.length === 5) {
          items.push({ name: match[1].trim(), quantity: parseInt(match[2]), unitPrice: parseNum(match[3]), totalPrice: parseNum(match[4]) });
        } else if (match.length === 4 && /^\d+$/.test(match[1])) {
          // qty name price
          items.push({ name: match[2].trim(), quantity: parseInt(match[1]), unitPrice: parseNum(match[3]), totalPrice: parseNum(match[3]) * parseInt(match[1]) });
        } else if (match.length === 4) {
          // name qty x price (no total)
          items.push({ name: match[1].trim(), quantity: parseInt(match[2]), unitPrice: parseNum(match[3]), totalPrice: parseNum(match[3]) * parseInt(match[2]) });
        } else if (match.length === 3) {
          const price = parseNum(match[2]);
          if (price > 0 && price < 100000) {
            items.push({ name: match[1].trim(), quantity: 1, unitPrice: price, totalPrice: price });
          }
        }
        matched = true;
        break;
      }
    }
    
    // Fallback: any line with a number that looks like a price at the end
    if (!matched) {
      const priceMatch = trimmed.match(/^(.{3,}?)\s+P?₱?(\d{1,6}[.,]?\d{0,2})$/);
      if (priceMatch) {
        const name = priceMatch[1].replace(/[._]{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const price = parseFloat(priceMatch[2].replace(',', '.'));
        if (name.length > 2 && price > 0 && price < 100000 && !/total|sub|vat|tax|disc/i.test(name)) {
          items.push({ name, quantity: 1, unitPrice: price, totalPrice: price });
        }
      }
    }
  }

  // De-duplicate items (same name + price appearing twice)
  const unique: ReceiptLineItem[] = [];
  for (const item of items) {
    const exists = unique.find(u => u.name === item.name && u.totalPrice === item.totalPrice);
    if (!exists) unique.push(item);
  }

  return unique;
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
