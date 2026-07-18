# MyShare — Application Model

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                               │
├──────────────────────┬──────────────────────────────────────────┤
│   Web PWA (HTML/JS)  │      Mobile (React Native / Expo)         │
│   localhost:5000     │      iOS + Android                        │
└──────────┬───────────┴───────────────────┬──────────────────────┘
           │                               │
┌──────────▼───────────────────────────────▼──────────────────────┐
│                      SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  supabaseAuth.ts    │ Signup, Login, OAuth, OTP, MFA            │
│  supabaseDB.ts      │ CRUD: users, groups, expenses, payments   │
│  ocrService.ts      │ Receipt scanning + parsing                │
│  aiSplitService.ts  │ Smart split suggestions                   │
│  securityService.ts │ Risk scoring, fraud detection             │
│  topUpService.ts    │ GCash, Maya, Bank, Card, Stellar          │
│  kycService.ts      │ Identity verification (SEP-12)            │
│  stellarAnchor.ts   │ Blockchain wallet (SEP-10/24)             │
│  mfaBlockchain.ts   │ 2FA + signed transactions                 │
│  reportService.ts   │ Statements, analytics, CSV export         │
│  goalsService.ts    │ Savings targets + bonus points            │
│  apiIntegrations.ts │ Face recognition, ID verify, push notifs  │
│  syncEngine.ts      │ Offline-first data sync                   │
│  localDatabase.ts   │ SQLite cache                              │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                      DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL    │ 11 tables, RLS, functions             │
│  Supabase Auth          │ JWT sessions, OAuth, MFA              │
│  Supabase Storage       │ Receipts, KYC docs, avatars           │
│  Supabase Realtime      │ Live expense/payment updates          │
│  SQLite (local)         │ Offline cache + sync queue            │
└──────────┬──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Stellar Testnet (Horizon API)                                   │
│  testanchor.stellar.org (SEP-10 Auth, SEP-12 KYC, SEP-24 Tx)   │
│  Keypair generation + encrypted storage                          │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Data Model (Supabase PostgreSQL)

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   users     │────<│ group_members │>────│    groups     │
├─────────────┤     └──────────────┘     ├───────────────┤
│ id (PK)     │                          │ id (PK)       │
│ email       │     ┌──────────────┐     │ name          │
│ full_name   │────<│  expenses    │>────│ type          │
│ phone       │     ├──────────────┤     │ created_by    │
│ kyc_level   │     │ id (PK)      │     │ total_expenses│
│ stellar_acc │     │ group_id     │     └───────────────┘
│ created_at  │     │ description  │
│ updated_at  │     │ amount       │     ┌───────────────┐
└─────┬───────┘     │ category     │     │expense_splits │
      │             │ paid_by      │────<├───────────────┤
      │             │ split_method │     │ expense_id    │
      │             │ date         │     │ user_id       │
      │             │ receipt_url  │     │ amount        │
      │             └──────────────┘     │ is_paid       │
      │                                  └───────────────┘
      │
      │  ┌──────────────┐    ┌───────────────┐
      ├─<│  payments    │    │ transactions  │
      │  ├──────────────┤    ├───────────────┤
      │  │ from_user_id │    │ user_id       │
      │  │ to_user_id   │    │ type          │
      │  │ amount       │    │ amount        │
      │  │ method       │    │ method        │
      │  │ settled      │    │ status        │
      │  │ stellar_hash │    │ stellar_hash  │
      │  └──────────────┘    └───────────────┘
      │
      │  ┌──────────────┐    ┌───────────────┐
      ├─<│ kyc_profiles │    │    goals      │
      │  ├──────────────┤    ├───────────────┤
      │  │ status       │    │ title         │
      │  │ first_name   │    │ target_amount │
      │  │ last_name    │    │ current_amount│
      │  │ address      │    │ deadline      │
      │  │ id_type      │    │ status        │
      │  │ id_number    │    └───────────────┘
      │  │ selfie_url   │
      │  └──────────────┘    ┌───────────────┐
      │                      │    points     │
      ├─────────────────────<├───────────────┤
      │                      │ total_points  │
      │                      │ tier          │
      │                      │ streak        │
      │                      │ referral_code │
      │                      └───────────────┘
      │
      └─<┌───────────────┐
         │ notifications │
         ├───────────────┤
         │ title         │
         │ body          │
         │ type          │
         │ read          │
         └───────────────┘
```

## 3. User Flows

### 3.1 Onboarding → Signup → KYC
```
New User Opens App
  → Onboarding (4 slides: Split, Scan, Wallet, Verify)
  → Tap "Get Started"
  → Signup (name, email, password)
  → Supabase Auth creates account
  → Write to users table
  → Auto-open KYC modal
  → Fill fields (sequential: name → phone → birthday → address → ID)
  → Capture ID (rear camera, card detection, auto-capture)
  → Take Selfie (front camera, face detection, auto-capture)
  → Submit → status: PROCESSING
  → KYC approved → kyc_level: 'verified'
  → Stellar wallet generated
  → Full app access unlocked
```

### 3.2 Add Expense (OCR)
```
User taps "Add Expense"
  → Option: "📸 Scan Receipt"
  → Camera opens (or gallery)
  → Image quality check (blur, lighting, receipt detection)
    → <65% confidence: "Retake photo" alert
    → ≥65%: proceed
  → OCR processing (progress bar):
    → Quality check → Lighting → Sharpness → Document → Extract → Done
  → Results shown:
    → Vendor, Date, Items, Subtotal, Tax, Total
    → AI split suggestion (equal/by-item/percentage)
  → User confirms → data fills expense form
  → Select group + split method
  → Submit → saved to Supabase
  → Group members notified
```

### 3.3 Payment (Security Gate)
```
User taps "Settle Up"
  → Select recipient + amount
  → Security gate checks:
    1. Recipient verified? (KYC = ACCEPTED)
       → NO: "Only verified accounts" → blocked
    2. Amount > ₱5,000?
       → YES: Require 2FA
    3. Risk score calculated (13 checks)
       → <25: proceed immediately
       → 25-69: show confirmation popup
       → ≥70: block + contact support
  → 2FA verified (if required)
  → Stellar transaction signed
  → Payment recorded in DB
  → Push notification to recipient
  → Points awarded
```

### 3.4 Top-Up Wallet
```
User taps "Top Up"
  → Select method (GCash/Maya/Bank/Card/Stellar)
  → Enter amount (quick buttons: ₱500, ₱1K, ₱2K, ₱5K)
  → Fee calculated and shown
  → Confirm
  → Redirect to payment provider (PayMongo)
  → Payment confirmed
  → Stellar asset credited
  → Balance updated (realtime)
  → Transaction recorded
```

## 4. Security Model

```
┌─────────────────────────────────────┐
│         AUTHENTICATION              │
├─────────────────────────────────────┤
│ Supabase Auth (JWT)                 │
│ • Email/Password (bcrypt)           │
│ • Google OAuth                      │
│ • Phone OTP (Semaphore)             │
│ • MFA (TOTP)                        │
│ • Session auto-refresh (4 min)      │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         AUTHORIZATION               │
├─────────────────────────────────────┤
│ Row Level Security (RLS)            │
│ • Users see own data only           │
│ • Group members see group data      │
│ • KYC data private                  │
│ • Payments visible to sender/receiver│
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         TRANSACTION SECURITY        │
├─────────────────────────────────────┤
│ • Verified recipients only          │
│ • 13-point risk scoring             │
│ • 2FA for ≥₱5,000                   │
│ • Rate limiting (20 tx/hour)        │
│ • Fraud detection (structuring)     │
│ • Stellar signature required        │
│ • Encrypted private keys            │
└─────────────────────────────────────┘
```

## 5. KYC Tiers & Limits

| Tier | Requirements | Daily Limit | Monthly Limit |
|------|-------------|-------------|---------------|
| None | Signup only | ₱0 | ₱0 |
| Basic | Name, phone, email, birthday | ₱50,000 | ₱100,000 |
| Verified | + Address, ID photo, selfie | ₱200,000 | ₱500,000 |
| Enhanced | + TIN, employment, proof of income | ₱1,000,000 | ₱5,000,000 |

## 6. Points & Gamification

| Action | Points | Frequency |
|--------|--------|-----------|
| Daily login | 2 | 1/day |
| Expense added | 5 | 10/day max |
| Receipt scanned | 10 | 5/day max |
| Debt settled | 15 | 5/day max |
| On-time payment | 25 | unlimited |
| KYC Basic | 50 | one-time |
| KYC Verified | 100 | one-time |
| 7-day streak | 50 | weekly |
| 30-day streak | 200 | monthly |
| Referral | 100 | unlimited |

| Tier | Points | Perks |
|------|--------|-------|
| 🥉 Bronze | 0-499 | Basic |
| 🥈 Silver | 500-1,999 | 10% lower fees |
| 🥇 Gold | 2,000-4,999 | 20% lower fees, PDF export |
| 💎 Platinum | 5,000-14,999 | 30% lower fees, API access |
| 👑 Diamond | 15,000+ | Zero fees, VIP support |

## 7. API Integrations

| API | Provider | Purpose |
|-----|----------|---------|
| Face Recognition | AWS Rekognition | Selfie vs ID matching |
| ID Verification | PH Gov APIs | Validate SSS/TIN/LTO numbers |
| OCR | Google Cloud Vision | Production receipt reading |
| Payments | PayMongo | GCash/Maya checkout |
| SMS OTP | Semaphore | Philippine number verification |
| Exchange Rate | CoinGecko | XLM ↔ PHP conversion |
| Push Notifications | Expo + FCM | Real-time alerts |
| AI/ML | TensorFlow.js | On-device face/document detection |
| Address | PSGC API | PH Region→Province→City→Barangay |
| Blockchain | Stellar SDK | Wallet, transactions, anchors |

## 8. File Structure

```
SplitPay/
├── web/
│   ├── index.html          (150KB PWA - full app)
│   ├── manifest.json       (PWA manifest)
│   ├── sw.js              (Service worker)
│   └── onboarding-bg.png  (Design asset)
├── src/
│   ├── app/page.tsx
│   ├── lib/supabase.ts
│   ├── middleware/auth.ts
│   ├── utils/supabase/     (client, server, middleware)
│   ├── models/
│   │   ├── types.ts        (User, Group, Expense, Payment)
│   │   ├── kyc.ts          (KYC types, tiers, limits)
│   │   ├── receipt.ts      (OCR, split types)
│   │   ├── reports.ts      (Statement, tracker)
│   │   └── goals.ts        (Points, tiers, rewards)
│   ├── services/
│   │   ├── supabaseAuth.ts
│   │   ├── supabaseDB.ts
│   │   ├── ocrService.ts
│   │   ├── aiSplitService.ts
│   │   ├── securityService.ts
│   │   ├── topUpService.ts
│   │   ├── kycService.ts
│   │   ├── stellarAnchor.ts
│   │   ├── mfaBlockchainSecurity.ts
│   │   ├── reportService.ts
│   │   ├── goalsService.ts
│   │   ├── apiIntegrations.ts
│   │   ├── syncEngine.ts
│   │   └── localDatabase.ts
│   ├── screens/            (React Native)
│   └── navigation/
├── supabase/
│   └── migrations/001_initial_schema.sql
├── .agents/skills/         (Supabase AI skills)
├── google-services.json
├── .env.local              (credentials - gitignored)
├── .env.example
└── package.json
```

## 9. Deployment

| Environment | URL | Branch |
|-------------|-----|--------|
| Production (GitHub Pages) | https://jiyoume.github.io/SplitPay/ | gh-pages |
| Local Dev | http://localhost:5000 | StagingV2 |
| GitHub Repo | https://github.com/Jiyoume/SplitPay | StagingV2 (default) |
| Supabase | https://dmhqotrkfrhimdqoftil.supabase.co | — |
| Stellar | https://horizon-testnet.stellar.org | — |
