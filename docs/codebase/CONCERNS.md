# Codebase Concerns

> Ranked honestly for the project's actual context: a hackathon demo with a real audience.
> "Production concern" items are labeled as such rather than inflated. First-party code is
> TODO/FIXME-clean (`grep -rn "TODO|FIXME|HACK" src backend/src` → zero).

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| High | **Hardcoded API base URL breaks real-device demos** — `localhost:3000` (iOS) / `10.0.2.2:3000` (Android emulator); `setBaseUrl()` exported but never called; no env override | `src/services/apiClient.ts:6-9` | App on a physical device (Expo Go) cannot reach the backend at all | Add `EXPO_PUBLIC_API_URL` (or LAN-IP config) before demo day |
| High | **Root README is stale and hides the backend** — claims Expo SDK 51 (actual 54), omits `backend/` from the tree, "Next Steps" still lists backend + auth as unbuilt | `README.md:20,73,80-81` vs `package.json:22` | New contributor/panelist gets a false picture of the project | Rewrite once the `backend` branch lands |
| High | **24 `dist/` files tracked in git despite the ignore rule** (added before `.gitignore:3`; includes a 1.1MB bundle + fonts) | `git ls-files \| grep '^dist/'` → 24 | Repo bloat, confusing status output | `git rm -r --cached dist/` in a follow-up commit |
| Med | `npm test` (backend) runs only 3 of the 16 unit tests TEST_REPORT.md attributes to it; integration suite wired to nothing | `backend/package.json:15` vs `backend/TEST_REPORT.md:34-37` | "16/16 PASS" not reproducible by following the docs | Fix script (`&& tsx src/domain/splitCalculator.test.ts`) or the doc |
| Med | JWT stored in AsyncStorage (unencrypted) | `src/services/apiClient.ts:1,22,27` | Token readable on rooted device/backups — fine for demo, not production | `expo-secure-store` later |
| Med | Dev-mode console logs request bodies, including login/register **passwords** | `src/services/apiClient.ts:69` (`__DEV__`-guarded) | Plaintext password in Metro console during dev/screen-shares | Redact body fields in the dev logger |
| Med | Login timing side-channel (unknown email returns faster than wrong password; messages already identical) | `backend/src/modules/auth/auth.service.ts:73-80` | Email enumeration by timing — low practical risk at demo scale | Dummy `bcrypt.compare` on the missing-row path |
| Med | Wildcard CORS + `Authorization` allowed | `backend/src/config/env.ts:30`, `backend/src/app.ts:24-27` | Harmless for the RN client; risky if a web client ever appears | Tighten `CORS_ORIGIN` before any web use |
| Med | `WALLET_ENCRYPTION_KEY` is a demo-day single point of failure — rotating/losing it permanently orphans every wallet (every settle 500s); key lives in the same `.env` it protects against | `backend/stellar/crypto.ts`, `backend/README.md:60-71`, `backend/TRADEOFFS.md:71-83` | One misconfigured env kills the live demo's core feature | Keep one canonical `.env` for the demo dataset; documented, accepted risk |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Dead frontend code: mock `storageService`, all 4 `src/components/` (+ barrel), `src/utils/splitCalculator.ts` | Superseded by API migration (logic moved server-side; screens inline their own markup) | `src/services/storageService.ts`, `src/components/`, `src/utils/` — zero import sites each (grep-verified) | Duplication/confusion; two sources of truth for visual patterns | Delete, or re-wire components — decide, don't leave both |
| Types duplicated 3 ways with visible drift | Deliberate copy-maintenance (`backend/src/domain/types.ts:1-5` header) + ad-hoc wire shapes | `src/models/types.ts` ↔ `backend/src/domain/types.ts` ↔ interfaces in `src/services/apiService.ts` | Silent shape drift; `as any` casts already appearing (`apiService.ts:193`) | Single shared types package if project continues |
| Dead config: `HORIZON_POLL_INTERVAL_MS` env (validated, never read), `DEMO_PEG` const, `setBaseUrl()`, `@/*` tsconfig alias, root `lint`/`test` scripts, `fastify-type-provider-zod` dep, vestigial eslint-disable comments | Accumulated during fast build | `backend/src/config/env.ts`, `backend/src/config/constants.ts`, `src/services/apiClient.ts:14`, `tsconfig.json:6-10`, `package.json:11-12` | Misleads readers about actual behavior | Remove or wire up, one-line each |
| No graceful shutdown (SQLite handle never closed on SIGTERM) | Not in spec | `backend/src/server.ts` | Fine for WAL demo; a gap for a long-lived service | `onClose` hook + signal handler later |
| Huge uncommitted WIP: 26 files ~9.5k insertions + 10 untracked files (the entire mock→API migration) | In-progress `backend` branch | `git status` | Loss risk; unreviewable as one blob | Commit in logical chunks soon |
| bcryptjs cost 10 (pure-JS, deliberate per `TRADEOFFS.md:22`) | Avoids a second native dep | `backend/src/modules/auth/auth.service.ts:9` | Marginally weaker KDF | Cost 12 / native bcrypt if prod |

### 3) Security Concerns

What's **solid** (verified, worth knowing): every `/groups/:id/**` route has `requireMember` (no gaps found); settle requires caller === debtor (`settlements.service.ts:146-147`); all SQL is parameterized (no string-built SQL found); AES-256-GCM correctly implemented (random IV, tag verified, non-leaking errors); Pino redaction real; 500s never leak internals; login message non-enumerating; `.env` and DB files properly gitignored.

| Risk | OWASP | Evidence | Current mitigation | Gap |
|------|-------|----------|--------------------|-----|
| Token in AsyncStorage | A02 | `apiClient.ts:22` | — | SecureStore (prod) |
| Password in dev console | A09 | `apiClient.ts:69` | `__DEV__` guard only | Redact body logging |
| Timing enumeration on login | A07 | `auth.service.ts:73-80` | Identical messages | Constant-time path |
| CORS `*` with Authorization | A05 | `app.ts:24-27` | RN client sends no ambient creds | Tighten if web client added |
| Custodial key SPOF | A02 | `crypto.ts` + `.env` colocation | Boot-fails on bad key; documented warning | No rotation path (accepted, testnet-only) |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Balances recomputed from ALL group expenses+settlements on every read (`GET /groups` does it per group) | `backend/src/modules/balances/balances.service.ts:90-107`, `groups.service.ts:61` | None at demo size | O(expenses) per request as groups grow | Cache or materialize if it ever matters |
| Live Horizon call in `GET /users/me` | `backend/src/stellar/wallet.ts:46-57` | Already bounded to 2s, returns null on timeout — **fixed, not open** | — | — |
| `GroupDetailScreen` makes 3 sequential fetches per load | `src/screens/GroupDetailScreen.tsx:75-86` | Minor latency | Low | `Promise.all` |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| Every frontend screen | All 10 rewritten in uncommitted WIP; typed loosely (27 `any`s) | 9.5k-line uncommitted diff | Commit first; then small reviewed diffs |
| `backend/src/domain/splitCalculator.ts` | Float rounding is contractually frozen ("DO NOT 'fix' the rounding") — "improving" it breaks parity with documented behavior and tests | Header warning + 13 tests pinning behavior | Never touch rounding without updating spec + tests + frontend expectations |
| `settlements.service.ts` + `stellar/payment.ts` | State machine + idempotency window + real-money-shaped side effects | Core demo path | Read `backend/ARCHITECTURE.md §5` first; test against testnet |
| `.gitignore` interplay | `backend/.gitignore:6` (`backend/*.md`) is a **no-op** (patterns are relative to their own file → matches `backend/backend/*.md`); the real doc-ignoring is root `.gitignore:12-16` | Two "stop tracking" commits already | Understand both files before touching ignore rules |

### 6) `[ASK USER]` Questions

1. [ASK USER] Root `lint`/`test` scripts reference eslint/jest that aren't installed and have no configs — install + configure them, or remove the scripts until real?
2. [ASK USER] `backend/package.json:15` vs `TEST_REPORT.md`: wire `splitCalculator.test.ts` into `npm test` (recommended — one-line change) or correct the doc?
3. [ASK USER] The five backend design docs (`ARCHITECTURE/DEVIATIONS/RESEARCH/TRADEOFFS/TEST_REPORT.md`) are gitignored — the repo's best "why" documentation exists only on this machine. Deliberate (process docs stay local) or should they be committed?
4. [ASK USER] Delete the dead frontend code (`storageService.ts`, `src/components/*`, `src/utils/splitCalculator.ts`) or keep for reference?
5. [ASK USER] Is a physical-device demo planned? If yes, the hardcoded `localhost` base URL (H-risk above) must be fixed first — env-driven URL or LAN IP.
6. [ASK USER] OK to run `git rm -r --cached dist/` to untrack the 24 stale build files?
7. [ASK USER] Package/app name is `myshare`/"MyShare" while repo + all docs say "SplitPay" — which is the intended final name (affects app.json, bundle id `com.myshare.app`, token key `myshare_auth_token`)?
8. [ASK USER] iOS New Architecture is off (no `newArchEnabled` in `ios/Podfile.properties.json`) — intentional for stability, or should it be enabled?

### 7) Evidence

- `git status --short`, `git diff --stat`, `git ls-files` greps, `git check-ignore -v backend/.env`
- `src/services/apiClient.ts`, `backend/src/modules/auth/auth.service.ts`, `backend/src/stellar/crypto.ts`, `backend/src/config/env.ts`, `backend/src/app.ts`
- `backend/TRADEOFFS.md`, `backend/TEST_REPORT.md`, `backend/DEVIATIONS.md`, `README.md`, `.gitignore`, `backend/.gitignore`
