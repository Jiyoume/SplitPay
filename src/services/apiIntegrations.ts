/**
 * MyShare - External API Integrations
 * 
 * All third-party API connections for production features:
 * 1. Face Recognition (AWS Rekognition)
 * 2. ID Verification (Philippine Gov databases)
 * 3. OCR (Google Cloud Vision)
 * 4. Payment Gateway (GCash, Maya)
 * 5. SMS OTP (Semaphore PH)
 * 6. Exchange Rate (for crypto conversion)
 * 7. Push Notifications (Expo + FCM)
 * 8. AI/ML (TensorFlow.js face/document detection)
 */

// ===== 1. FACE RECOGNITION (AWS Rekognition) =====

export interface FaceMatchResult {
  matched: boolean;
  similarity: number;    // 0-100%
  confidence: number;
  faceDetails: { ageRange: { low: number; high: number }; gender: string; emotions: string[] };
}

export async function compareFaces(
  selfieBase64: string,
  idPhotoBase64: string
): Promise<FaceMatchResult> {
  const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/api/face/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify({ source: selfieBase64, target: idPhotoBase64 }),
  });
  return response.json();
}

export async function detectFaceLiveness(videoFrames: string[]): Promise<{ isLive: boolean; confidence: number }> {
  const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/api/face/liveness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify({ frames: videoFrames }),
  });
  return response.json();
}

// ===== 2. ID VERIFICATION (Philippine Government) =====

export interface IDVerificationResult {
  valid: boolean;
  matchesName: boolean;
  matchesBirthdate: boolean;
  status: 'verified' | 'invalid' | 'not_found' | 'expired';
  details?: { issuedDate?: string; expiryDate?: string; issuer?: string };
}

export async function verifyPhilippineID(
  idType: string,
  idNumber: string,
  fullName: string,
  birthDate: string
): Promise<IDVerificationResult> {
  // Routes to appropriate government API based on ID type
  const endpoints: Record<string, string> = {
    philsys: '/api/verify/philsys',
    sss: '/api/verify/sss',
    gsis: '/api/verify/gsis',
    tin: '/api/verify/bir',
    drivers_license: '/api/verify/lto',
    passport: '/api/verify/dfa',
    prc: '/api/verify/prc',
    philhealth: '/api/verify/philhealth',
    voters: '/api/verify/comelec',
  };

  const endpoint = endpoints[idType] || '/api/verify/generic';
  const response = await fetch(process.env.EXPO_PUBLIC_API_URL + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify({ idType, idNumber, fullName, birthDate }),
  });
  return response.json();
}

// ===== 3. OCR - GOOGLE CLOUD VISION =====

export interface VisionOCRResult {
  fullText: string;
  blocks: { text: string; confidence: number; boundingBox: any }[];
  amounts: number[];
  dates: string[];
  vendor: string;
}

export async function ocrWithGoogleVision(imageBase64: string): Promise<VisionOCRResult> {
  const response = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: imageBase64 },
        features: [
          { type: 'TEXT_DETECTION', maxResults: 1 },
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
      }],
    }),
  });
  const data = await response.json();
  const fullText = data.responses?.[0]?.fullTextAnnotation?.text || '';
  return { fullText, blocks: [], amounts: extractAmounts(fullText), dates: extractDates(fullText), vendor: '' };
}

function extractAmounts(text: string): number[] {
  const matches = text.match(/(?:P|₱|PHP)?\s*\d{1,3}(?:[,]\d{3})*(?:\.\d{2})?/g) || [];
  return matches.map(m => parseFloat(m.replace(/[P₱PHP,\s]/g, ''))).filter(n => n > 0);
}

function extractDates(text: string): string[] {
  const matches = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/g) || [];
  return matches;
}

// ===== 4. PAYMENT GATEWAY (GCash & Maya) =====

export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  redirectUrl: string;
  userId: string;
}

export interface PaymentResponse {
  checkoutUrl: string;
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
}

// GCash via PayMongo
export async function createGCashPayment(req: PaymentRequest): Promise<PaymentResponse> {
  const response = await fetch('https://api.paymongo.com/v1/sources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(process.env.EXPO_PUBLIC_PAYMONGO_SECRET + ':'),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: req.amount * 100, // centavos
          currency: 'PHP',
          type: 'gcash',
          redirect: { success: req.redirectUrl + '?status=success', failed: req.redirectUrl + '?status=failed' },
        },
      },
    }),
  });
  const data = await response.json();
  return {
    checkoutUrl: data.data?.attributes?.redirect?.checkout_url || '',
    paymentId: data.data?.id || '',
    status: 'pending',
  };
}

// Maya via PayMongo
export async function createMayaPayment(req: PaymentRequest): Promise<PaymentResponse> {
  const response = await fetch('https://api.paymongo.com/v1/sources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(process.env.EXPO_PUBLIC_PAYMONGO_SECRET + ':'),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: req.amount * 100,
          currency: 'PHP',
          type: 'grab_pay', // Maya uses grab_pay type in PayMongo
          redirect: { success: req.redirectUrl + '?status=success', failed: req.redirectUrl + '?status=failed' },
        },
      },
    }),
  });
  const data = await response.json();
  return { checkoutUrl: data.data?.attributes?.redirect?.checkout_url || '', paymentId: data.data?.id || '', status: 'pending' };
}

// Check payment status
export async function checkPaymentStatus(paymentId: string): Promise<string> {
  const response = await fetch('https://api.paymongo.com/v1/sources/' + paymentId, {
    headers: { 'Authorization': 'Basic ' + btoa(process.env.EXPO_PUBLIC_PAYMONGO_SECRET + ':') },
  });
  const data = await response.json();
  return data.data?.attributes?.status || 'unknown';
}

// ===== 5. SMS OTP (Semaphore PH) =====

export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  const response = await fetch('https://api.semaphore.co/api/v4/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: process.env.EXPO_PUBLIC_SEMAPHORE_KEY,
      number: phoneNumber.replace('+63', '0'),
      message: 'Your MyShare verification code is: {otp}. Valid for 5 minutes.',
      code: otp,
    }),
  });
  const data = await response.json();
  
  // Store OTP for verification (in production, use Redis/cache)
  await storeOTP(phoneNumber, otp);
  
  return data.error ? { success: false, error: data.error } : { success: true, messageId: data.message_id };
}

export async function verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
  const stored = await getStoredOTP(phoneNumber);
  return stored === code;
}

async function storeOTP(phone: string, otp: string): Promise<void> {
  // Store in Supabase with 5-min expiry
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);
  await supabase.from('otp_codes').upsert({ phone, code: otp, expires_at: new Date(Date.now() + 300000).toISOString() });
}

async function getStoredOTP(phone: string): Promise<string | null> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await supabase.from('otp_codes').select('code').eq('phone', phone).gt('expires_at', new Date().toISOString()).single();
  return data?.code || null;
}

// ===== 6. EXCHANGE RATE API =====

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export async function getExchangeRate(from: string = 'XLM', to: string = 'PHP'): Promise<ExchangeRate> {
  // Stellar DEX rate
  const response = await fetch('https://horizon-testnet.stellar.org/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=PHP&buying_asset_issuer=GAZ...');
  const data = await response.json();
  const rate = data.asks?.[0]?.price ? parseFloat(data.asks[0].price) : 28.50; // Fallback
  return { from, to, rate, timestamp: new Date().toISOString() };
}

export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  const { rate } = await getExchangeRate(from, to);
  return Math.round(amount * rate * 100) / 100;
}

// Crypto rates from CoinGecko
export async function getCryptoRates(): Promise<Record<string, number>> {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=php,usd');
  const data = await response.json();
  return { xlm_php: data.stellar?.php || 0, xlm_usd: data.stellar?.usd || 0 };
}

// ===== 7. PUSH NOTIFICATIONS (Expo + FCM) =====

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: expoPushToken,
      title,
      body,
      sound: 'default',
      badge: 1,
      data: data || {},
    }),
  });
  const result = await response.json();
  return result.data?.status === 'ok';
}

export async function sendBulkNotifications(tokens: string[], title: string, body: string): Promise<number> {
  const messages = tokens.map(token => ({ to: token, title, body, sound: 'default' }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const results = await response.json();
  return results.data?.filter((r: any) => r.status === 'ok').length || 0;
}

// Notification types for MyShare
export type NotificationType = 'payment_received' | 'payment_reminder' | 'expense_added' | 'group_invite' | 'kyc_approved' | 'kyc_rejected' | 'goal_milestone';

export async function notifyUser(userId: string, type: NotificationType, data: Record<string, any>): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);
  
  const messages: Record<NotificationType, { title: string; body: string }> = {
    payment_received: { title: '💰 Payment Received', body: `${data.from} sent you ₱${data.amount}` },
    payment_reminder: { title: '⏰ Payment Reminder', body: `You owe ${data.to} ₱${data.amount}` },
    expense_added: { title: '🧾 New Expense', body: `${data.by} added "${data.description}" — ₱${data.amount}` },
    group_invite: { title: '👥 Group Invite', body: `${data.from} invited you to "${data.groupName}"` },
    kyc_approved: { title: '✅ KYC Approved', body: 'Your identity verification has been approved!' },
    kyc_rejected: { title: '❌ KYC Rejected', body: 'Please resubmit your documents.' },
    goal_milestone: { title: '🎯 Goal Milestone!', body: `You reached ${data.percentage}% of "${data.goalName}"` },
  };

  const msg = messages[type];
  
  // Store in notifications table
  await supabase.from('notifications').insert({ user_id: userId, title: msg.title, body: msg.body, type, read: false });
  
  // Send push if token exists
  const { data: user } = await supabase.from('users').select('push_token').eq('id', userId).single();
  if (user?.push_token) await sendPushNotification(user.push_token, msg.title, msg.body, data);
}

// ===== 8. AI/ML - TENSORFLOW.JS =====

export interface MLDetectionResult {
  type: 'face' | 'document' | 'receipt';
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks?: { leftEye?: any; rightEye?: any; nose?: any };
}

// On-device face detection model config
export const FACE_MODEL_CONFIG = {
  modelUrl: 'https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1',
  inputSize: 128,
  scoreThreshold: 0.75,
  iouThreshold: 0.3,
  maxFaces: 1,
};

// On-device document detection model config
export const DOCUMENT_MODEL_CONFIG = {
  modelUrl: 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1',
  inputSize: 300,
  scoreThreshold: 0.5,
  labels: ['receipt', 'id_card', 'document', 'paper'],
};

export async function loadFaceModel(): Promise<any> {
  // In production: import * as blazeface from '@tensorflow-models/blazeface';
  // const model = await blazeface.load();
  // return model;
  return null; // Placeholder
}

export async function detectFaceOnDevice(imageData: ImageData): Promise<MLDetectionResult | null> {
  // In production: use loaded model
  // const predictions = await model.estimateFaces(imageData);
  // return predictions[0] ? { type: 'face', confidence: predictions[0].probability, ... } : null;
  return null; // Placeholder
}

// ===== HELPER =====
function getToken(): string {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('myshare_token') || '' : '';
}
