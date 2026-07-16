# MyShare UI Redesign Spec (StagingV2)

Source of truth: 10 design PNGs (scratchpad/designs/design-01..10.png, from Kiel's Downloads 2026-07-16).
Brand: **MyShare** wordmark in-app ("My" navy + "Share" teal). App/bundle id stays SplitPay/com.splitpay.app.
Currency: **₱ peso** everywhere.

## Design tokens (already in `src/constants/theme.ts` — import from there, do NOT redefine)
- Background `#F2F5F9`; cards `#FFFFFF` radius 16, shadow: `{ shadowColor:'#101828', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{width:0,height:4}, elevation:2 }`
- Primary gradient CTA: `['#4A5CFB','#21D4E8']` horizontal, full-width, height 52, radius 14, white 600 text. Use `expo-linear-gradient` (installed). Component: `src/components/GradientButton.tsx`.
- Text: primary `#101828`, secondary `#667085`, muted `#98A2B3`
- Accent blue `#2F6BFF`; positive `#16A34A` on `#E8F9EF`; negative `#EF4444` on `#FEECEC`; pending `#F59E0B` on `#FEF4E6` (StatusPill component)
- Inputs: white, radius 12, border `#E4E9F0`, leading gray Ionicon, min height 48
- Filter chips: pill; active solid `#2F6BFF` white text; inactive white + border
- Tab bar: white, rounded top, inactive `#98A2B3`, active `#2F6BFF`; **center circular gradient FAB "Pay"** (56px, elevated above bar)
- Tap targets ≥44px. Verify at 375px width (iPhone SE-class). Portrait only.

## Navigation (owned by agent F1 ONLY — F2/F3 must not edit navigation files)
Tabs: Home, Groups, [Pay FAB → opens SettleUp modal], Activity, Profile.
Stack modals (existing): AddExpense, GroupDetail, CreateGroup, SettleUp, KYC, TopUp, ScanReceipt, Wallet, Reports (Wallet & Reports move from tabs to stack screens).
New stack screens: Onboarding (initial route on first launch), SignIn. After SignIn (or "Do this later"/skip) → Tabs.

## Screen specs (match the PNG, adapt content we have; initials avatars instead of photos; emoji/Ionicons instead of illustrations)
- **Onboarding** (design-07): logo header, hero area (emoji/icon composition ok), headline "Split expenses the smart way" ("smart way" teal), sub-copy, dots, GradientButton "Get Started" → SignIn, text button "Sign In".
- **SignIn** (design-06): "Welcome back", email + password inputs, "Forgot Password?" right-aligned, GradientButton "Sign In", OR divider, two side-by-side cards "Sign in with Biometrics"/"Sign in with OTP" (visual only), footer "Don't have an account? Create Account →" (inline register form or same screen toggle), "🔒 Secure & encrypted" caption. Wire to `src/services/api.ts` auth when available; mock fallback must still navigate to Tabs.
- **Home** (design-08): header logo + bell; "Hello, {name} 👋 / Share smarter. Live better."; Total Balance card ₱ amount + "+12.5% vs last month" pill + bar-chart icon (tap → Reports); 4 quick-action cards: Add Expense, Split Bill (→AddExpense equal split), Request (→SettleUp), Scan (→ScanReceipt); Recent Activity list (icon, title, "Split N ways", date, signed ₱ amount colored); promo banner card "Smart sharing, made simple".
- **Groups** (design-05): big title + sub-copy, search input, group cards (leading rounded image/emoji block, name, avatar row, signed ₱ balance, "N unpaid"/"All settled" caption), blue circular FAB "Add Group" → CreateGroup.
- **GroupDetail** (design-04): cover header block, group name + dates, member avatar row (+N), Total Expenses card (₱, "+% vs last trip", chart icon), Expenses list (View All), Split Type card "Equal Split / Each Member Owes ₱X", Member Balances list w/ StatusPill (Paid/Pending), GradientButton "Request Payment", caption "🛡 Secure payments via Stellar".
- **AddExpense** (design-02): back arrow + title + logo; fields: Expense Title, Amount (₱ prefix, PHP chip), Category select, Date + Group side-by-side, Participants avatar row + add, Split Method 3 cards (Equal/Custom/Percentage, selected = blue border tint), Note optional, Receipt upload dashed box, GradientButton "Save Expense".
- **Activity** (design-03): title + sub-copy, chips All/Sent/Received/Pending, sections by date, rows: icon bubble, title, "You paid/Received from X · Split N ways", time, signed ₱ amount + StatusPill.
- **Profile** (design-01): user card (avatar, name, email, "⭐ Premium Member" chip); sections: Payment & Wallet → "Linked Payment Methods" (→Wallet, subtitle "2 cards · 1 e-wallet"); Preferences → Notification Settings; Security → Security & Privacy, Two-Factor Authentication; Support & Information → Help & Support, About MyShare (App version 1.0.0); red "Sign Out" button (→SignIn).
- **KYC** (design-10 intro + design-09 selfie): intro state "Verify Your Identity" w/ 3-step list (Personal Information / Valid ID Upload / Selfie Verification), "Takes about 3–5 minutes" note, GradientButton "Start Verification", "Do this later"; step flow ending in Selfie step "Step 3 of 3" w/ face-frame placeholder, 3 tip chips, GradientButton "Take Selfie", then "✅ Verification Submitted" card ("KYC review in progress… Usually within 24 hours"). Keep existing kycService hooks where present; camera can stay stub/simulated on simulator.
- **Wallet / TopUp / SettleUp / Reports / ScanReceipt**: no PNG — restyle with same tokens (cards, pills, GradientButton primary actions, peso), keep existing functionality/mock data.

## Rules
- Keep existing mock data structure; convert visible $ to ₱ with design-like amounts. Mock data stays clearly mock (names like Alex Reyes ok).
- No new deps beyond expo-linear-gradient. No expo-router — React Navigation only.
- Match existing code style (function components, StyleSheet.create, typed navigation props).
- Every changed line traceable to this redesign; do not refactor unrelated code.
