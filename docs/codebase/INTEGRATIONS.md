# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| Stellar Horizon (testnet) | REST API via `@stellar/stellar-sdk` | Submit native-XLM settlement payments; load accounts/sequence; live wallet balance; tx reconciliation | None (public testnet); payments signed with custodial keys | High for settle-up; app otherwise works offline from it | `backend/src/stellar/{client,payment,wallet}.ts` |
| Stellar Friendbot | HTTP GET | Fund newly created testnet wallets (register + manual re-fund endpoint) | None | Medium (wallet degrades to `unfunded`; retry via `POST /users/me/wallet/fund`) | `backend/src/stellar/wallet.ts:9-57` |
| SplitPay backend | REST (16 endpoints) | The frontend's only data source | JWT Bearer (HS256, 7d expiry) | High | `src/services/apiClient.ts:62-64`, `backend/src/plugins/auth.ts:27-41` |
| stellar.expert | URL construction only (no API call) | `explorerUrl` per settlement, derived at response time — not stored | n/a | Low | `backend/src/modules/settlements/settlements.service.ts:45` |

Network passphrase is boot-asserted to the exact testnet string at module load — the server refuses to start against anything else (never mainnet) (`backend/src/stellar/client.ts:1-18`, `backend/src/config/env.ts:58-64`).

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| SQLite (`backend/data/splitpay.db`) | System of record: 8 tables (users, wallets 1:1, groups, group_members, expenses, expense_splits, settlements, activities) | Singleton `better-sqlite3`, WAL, FKs on, prepared statements everywhere; idempotent `schema.sql` at boot | Singleton isn't injectable (blocks test isolation); single-process only | `backend/src/db/{index.ts,schema.sql,migrate.ts}` |
| AsyncStorage (device) | JWT token only, key `myshare_auth_token` | `src/services/apiClient.ts:20-34` | Unencrypted storage — see CONCERNS.md M2 | `src/services/apiClient.ts` |
| In-memory TTL cache (8s) | Read-through cache per endpoint, invalidated on every mutation | `src/services/apiService.ts:76-118` | None (memory-only, resets on reload) | `apiService.ts:243-248` |

### 3) Secrets and Credentials Handling

- Sources: `backend/.env` only (gitignored — verified via `git check-ignore`); placeholders in `backend/.env.example`. Boot-validated: `JWT_SECRET` ≥32 chars; `WALLET_ENCRYPTION_KEY` exactly 32 bytes hex (`backend/src/config/env.ts`).
- Custodial Stellar secrets: AES-256-GCM at rest as `v1:<iv>:<tag>:<ciphertext>` (random 12-byte IV; any decrypt failure → generic `WALLET_KEY_ERROR`, `backend/src/stellar/crypto.ts:19-54`). Decrypted secret exists in memory only for the `.sign()` call (`stellar/payment.ts:122-123`).
- Hardcoding check: no hardcoded secrets found in first-party code; frontend contains no secrets (only the localhost base URL).
- Rotation: **none.** Changing `WALLET_ENCRYPTION_KEY` permanently orphans every existing wallet secret (documented, `backend/README.md:60-71`) — single biggest demo-day config risk.

### 4) Reliability and Failure Behavior

- Timeouts: Horizon submit wrapped in `withTimeout(HORIZON_TIMEOUT_MS=30s)`; live-balance lookup in `GET /users/me` bounded to `USER_BALANCE_FETCH_TIMEOUT_MS=2s`, returns `null` instead of failing the request (`backend/src/stellar/wallet.ts:46-57`).
- Retry: exactly one 429-backoff retry on submit (`stellar/payment.ts:31-46`); Friendbot call itself has no retry (returns boolean; client re-triggers via the fund endpoint). No general rate limiter.
- Timeout ambiguity path: Horizon timeout/504 → settlement stays `submitting` (HTTP 202); `GET /settlements/:id` performs a **one-shot reconciliation** against Horizon by `tx_hash` (settled / failed `tx_too_late` / still submitting) — request-triggered, no background worker (`settlements.service.ts:250-287`, `stellar/payment.ts:173-187`).
- Idempotency: DB transaction blocks duplicates while `pending/submitting` (409 with the existing settlement in `details`); `tx_hash` computed pre-submit. [TODO] Horizon's protocol-level dedup of a resubmitted identical envelope was carried from `backend/RESEARCH.md`, not independently re-verified.
- Frontend: network failures normalize to `ApiError(code:"NETWORK_ERROR")` (`src/services/apiClient.ts:104-116`); no offline queue or retry.

### 5) Observability for Integrations

- Logging: Pino one-line-per-request with userId + latency (`backend/src/plugins/requestLogging.ts`); redaction of auth header/password paths; `logSafe` secret-stripper exists but currently has no call sites. Frontend logs requests/responses to console only under `__DEV__` (`apiClient.ts:68-70,92-94` — logs request bodies; see CONCERNS.md M3).
- Metrics/tracing: none. Error monitoring (Sentry etc.): none on either side.
- Gaps: no per-call logging around Horizon/Friendbot beyond errors; no alerting on `submitting`-stuck settlements (only reconciled when someone polls).

### 6) Evidence

- `backend/src/stellar/{client,wallet,payment,conversion,crypto}.ts`
- `backend/src/config/env.ts`, `backend/.env.example`, `backend/README.md`
- `backend/src/modules/settlements/settlements.service.ts`, `backend/src/db/index.ts`
- `src/services/{apiClient,apiService}.ts`
