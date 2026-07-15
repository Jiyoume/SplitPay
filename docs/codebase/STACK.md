# Technology Stack

> SplitPay is two stacks in one repo: a React Native (Expo) frontend at the root and a
> Fastify + SQLite + Stellar backend in `backend/`. They share no packages — each has its
> own `package.json`, `tsconfig.json`, and toolchain.

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript (both sides), strict mode | `tsconfig.json:4`, `backend/tsconfig.json` |
| Frontend runtime | React Native 0.81.5 on Expo SDK 54 (Hermes engine; New Architecture **off**) | `package.json:22,28`, `ios/Podfile.properties.json:2` |
| Backend runtime | Node.js — `engines: ">=20"` in manifest, but **Node 22 LTS is the actual required runtime** (Node 20 EOL/uninstallable; Node 26 can't build `better-sqlite3`) | `backend/package.json:7-9`, `backend/README.md:14-28` |
| Root README's "Node 18+" claim | Stale — no `engines` field at root enforces it | `README.md:20` |
| Package manager | npm (lockfileVersion 3 at both roots) | `package-lock.json:4`, `backend/package-lock.json` |
| Module system | Frontend: Metro/Babel (CommonJS-style TS). Backend: **ESM** (`"type": "module"`, NodeNext, `.js` import extensions) | `backend/package.json:7`, `backend/tsconfig.json` |
| Package names | Root: `myshare` v1.0.0 (app display name "MyShare"); backend: `splitpay-backend`. Repo/docs call it "SplitPay" | `package.json:2`, `app.json:3-4`, `backend/package.json` |

### 2) Production Frameworks and Dependencies

Frontend (`package.json:14-34`):

| Dependency | Version | Role in system |
|------------|---------|----------------|
| expo | ^54.0.35 | App platform / build system (README's "SDK 51" claim is 3 majors stale) |
| react / react-dom | ^19.1.0 | UI runtime |
| react-native | ^0.81.5 | Native runtime |
| @react-navigation/native + stack + bottom-tabs | ^6.x | Navigation (RootNavigator uses `@react-navigation/stack`; `native-stack` is installed but unused — `src/navigation/RootNavigator.tsx:3,27`) |
| @react-native-async-storage/async-storage | 2.2.0 | JWT token persistence (`src/services/apiClient.ts`) |
| @expo/vector-icons | ^15.0.3 | Ionicons throughout the UI |
| expo-linear-gradient, expo-font, expo-status-bar | SDK-matched | UI chrome |
| react-native-gesture-handler / safe-area-context / screens | SDK-matched | Navigation prerequisites (`index.js:1`, `App.tsx`) |
| react-native-uuid | ^2.0.2 | ID generation (used by the now-dead mock `storageService`) |
| react-native-web | ^0.21.0 | Web target (`npm run web`) |

Backend (`backend/package.json:17-26`):

| Dependency | Version | Role in system |
|------------|---------|----------------|
| fastify | ^4.28.1 | HTTP framework |
| better-sqlite3 | ^12.11.1 | Synchronous SQLite driver — the only native dependency (caret range, despite ARCHITECTURE.md's "pin exact" language) |
| @stellar/stellar-sdk | ^16.0.1 | Stellar testnet payments (Horizon client, tx building/signing) |
| @fastify/jwt | ^8.0.0 | JWT issue/verify (HS256) |
| bcryptjs | ^2.4.3 | Password hashing, cost 10 (pure JS — deliberate, avoids a second native dep) |
| zod | ^3.23.8 | Env validation at boot + per-route request validation |
| fastify-type-provider-zod | ^2.1.0 | **Installed but unused** — zero imports in `backend/src/` (`backend/DEVIATIONS.md` item #2) |
| dotenv | ^16.4.5 | `.env` loading |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| typescript ~5.9.2 (root) / ^5.5.4 (backend) | Type checking / backend build | `package.json:40`, `backend/package.json` |
| tsx ^4.19.0 | Backend dev server (`tsx watch`) and test runner | `backend/package.json:12,15` |
| babel-preset-expo (+ @babel/core) | Frontend transpilation — the only Babel preset | `babel.config.js:1-6` |
| @react-native-community/cli | Native builds (`expo run:ios/android`) | `package.json:37` |
| eslint | **Referenced by the root `lint` script but NOT installed and has no config file anywhere** — `npm run lint` fails today | `package.json:11`; verified `npx --no-install eslint` fails; no `.eslintrc*`/`eslint.config.*` found |
| jest | **Referenced by the root `test` script but NOT installed, no config, zero frontend test files** — `npm test` (root) fails today | `package.json:12`; `package-lock.json` has no top-level jest entry |

### 4) Key Commands

```bash
# Frontend (repo root)
npm install
npm start                 # expo start (QR code for Expo Go)
npm run ios / android     # native build via expo run
npm run web               # expo web target
# npm run lint / npm test  — BROKEN: eslint/jest not installed (see §3)

# Backend (backend/, requires Node 22 — `nvm use 22`)
npm install
cp .env.example .env      # then fill JWT_SECRET + WALLET_ENCRYPTION_KEY (openssl rand -hex 32)
npm run dev               # tsx watch src/server.ts
npm run build && npm start  # tsc -> dist/, node dist/server.js
npm run typecheck         # tsc --noEmit
npm test                  # tsx src/domain/netting.test.ts ONLY (3 tests — see TESTING.md)
```

### 5) Environment and Config

- Config sources: `backend/.env` (gitignored; template at `backend/.env.example`), `app.json` (Expo), `ios/Podfile.properties.json` (Hermes on, no `newArchEnabled` key → old architecture).
- Frontend has **no** env-based config: the API base URL is hardcoded in `src/services/apiClient.ts:6-9` (`http://localhost:3000` iOS / `http://10.0.2.2:3000` Android emulator).
- Required backend env vars (all 17 validated by zod at boot, `backend/src/config/env.ts:6-31`):
  - **Secrets (no default, boot-fails if invalid):** `JWT_SECRET` (≥32 chars), `WALLET_ENCRYPTION_KEY` (exactly 64 hex chars / 32 bytes)
  - **Server:** `NODE_ENV` (development), `PORT` (3000), `HOST` (0.0.0.0), `DATABASE_PATH` (./data/splitpay.db), `LOG_LEVEL` (info), `CORS_ORIGIN` (*)
  - **Auth:** `JWT_EXPIRES_IN` (7d)
  - **Stellar:** `STELLAR_NETWORK` (testnet), `HORIZON_URL`, `FRIENDBOT_URL`, `STELLAR_NETWORK_PASSPHRASE` (boot-asserted equal to `Test SDF Network ; September 2015` — server refuses to start otherwise, `backend/src/config/env.ts:58-64`), `STELLAR_TX_TIMEOUT_SECONDS` (30), `HORIZON_TIMEOUT_MS` (30000), `USER_BALANCE_FETCH_TIMEOUT_MS` (2000), `HORIZON_POLL_INTERVAL_MS` (2000 — **declared but never read anywhere; dead config**)
- Deployment/runtime constraints: testnet-only by boot assertion; single-process single-file SQLite; internet access to Horizon/Friendbot needed only for the settle-up and wallet flows.

### 6) Evidence

- `package.json`, `package-lock.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `index.js`
- `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`, `backend/src/config/env.ts`, `backend/README.md`
- `ios/Podfile`, `ios/Podfile.properties.json`
