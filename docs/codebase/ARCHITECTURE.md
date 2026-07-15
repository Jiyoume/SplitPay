# Architecture

> Scope note: this documents the repo as a whole. The backend additionally has its own deep
> spec at `backend/ARCHITECTURE.md` (gitignored, on-disk only) — implementation was verified
> to match it section-for-section with only the minor deviations listed in `backend/DEVIATIONS.md`.

## Core Sections (Required)

### 1) Architectural Style

- Primary style: **two-tier client–server**. Frontend: layered RN app (screens → services → HTTP), server-authoritative data with focus-triggered refetch. Backend: modular monolith (feature modules over shared layers: domain / db / stellar / plugins).
- Why this classification: all business math (splits, balances, debt simplification, netting) lives server-side in `backend/src/domain/` and is recomputed per request; the frontend holds no domain state beyond the auth session (`src/contexts/AuthContext.tsx` is the only context) and renders API responses.
- Primary constraints: (1) testnet-only Stellar settlement, custodial keys, boot-asserted passphrase (`backend/src/stellar/client.ts:1-18`); (2) single-process synchronous SQLite (`backend/src/db/index.ts`); (3) frontend response shapes must stay compatible with `src/models/types.ts` (`backend/DECISIONS.md §4`).

### 2) System Flow

```text
[Screen (useFocusEffect)] -> [apiService (8s TTL cache)] -> [apiClient (JWT header, ApiError)]
  -> HTTP -> [Fastify route (zod .parse)] -> [authenticate / requireMember preHandlers]
  -> [module service (SQL via better-sqlite3)] -> [domain calc / stellar layer]
  -> [{data} | {error:{code,message}} envelope] -> [screen state -> render / Alert]
```

Trace — "add an expense": `AddExpenseScreen` validates split inputs client-side (`src/screens/AddExpenseScreen.tsx:96-161`) → `apiService.addExpense` POSTs `/groups/:id/expenses` and invalidates 6 cache keys (`src/services/apiService.ts:243-248`) → route parses body with zod (`backend/src/modules/expenses/expenses.routes.ts:16`) behind `authenticate`+`requireMember` → `expenses.service.ts:83` computes splits via `domain/splitCalculator.ts`, inserts expense+splits+activity rows → screens refetch on focus (`src/screens/HomeScreen.tsx:71-75`).

Trace — "settle up (Stellar)": `SettleUpScreen` → `POST /groups/:id/settlements` (caller must be the debtor, `backend/src/modules/settlements/settlements.service.ts:146-148`) → idempotency transaction inserts a `pending` row unless a `pending/submitting` twin exists (409) (`settlements.service.ts:80-133`) → decrypt custodial secret (AES-256-GCM, `stellar/crypto.ts`) → `stellar/payment.ts:74-162` loads account, pre-checks reserve, builds/signs/submits native-XLM payment → `settled` (201) | `submitting` on Horizon timeout (202, reconciled one-shot on `GET /settlements/:id`) | `failed` (4xx/5xx mapped via `AppError`).

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| `src/screens/` | UI state, input validation, navigation | Direct fetch, domain math | `src/screens/AddExpenseScreen.tsx` |
| `src/contexts/AuthContext` | Session (user, wallet, isLoading), login/register/logout/refreshUser; hydrates from stored token on mount | Non-auth data (fetch-on-focus instead) | `src/contexts/AuthContext.tsx:15-50` |
| `src/services/` | HTTP transport, token persistence (AsyncStorage), typed `ApiError`, endpoint functions, 8s TTL cache + explicit invalidation after mutations | UI concerns | `src/services/apiClient.ts:54-117`, `apiService.ts:76-118` |
| `backend/src/modules/*` | Routes + zod validation + business logic + SQL per domain | Pure math (delegates to `domain/`), Stellar mechanics (delegates to `stellar/`) | `backend/src/modules/settlements/` |
| `backend/src/domain/` | Pure calculation: equal/exact/percentage splits, balance graph, greedy debt simplification, settlement netting (0.01 epsilon) | Any I/O | `backend/src/domain/netting.ts:25-64` |
| `backend/src/stellar/` | Keypairs, Friendbot funding, payment build/sign/submit, one-shot reconciliation, secret encryption, 1:1 demo conversion | HTTP/DB concerns | `backend/src/stellar/payment.ts` |
| `backend/src/plugins,hooks` | JWT auth decorator, single error envelope, request logging w/ redaction, group-membership guard | Business logic | `backend/src/plugins/errorHandler.ts:11-64`, `hooks/requireMember.ts:10-24` |
| `backend/src/db/` | Singleton connection (WAL, FKs), schema (8 tables), idempotent boot migration | Queries (live in services) | `backend/src/db/schema.sql` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Singleton (DB connection, Horizon server) | `backend/src/db/index.ts:9`, `stellar/client.ts` | One process, one file DB; simple. Cost: not injectable — the integration test can't swap it (see TESTING.md) |
| Feature-module colocation (routes/schemas/service) | `backend/src/modules/*` | 1:1 traceability to spec §4 endpoint table |
| Central error envelope + `AppError(code)` | `backend/src/utils/errors.ts`, `plugins/errorHandler.ts` | Uniform `{error:{code,message,details?}}`; frontend switches on `code` (`src/screens/SettleUpScreen.tsx:102-117`) |
| Read-time computation, no stored balances | `backend/src/modules/balances/balances.service.ts:90-107` | Single source of truth; every read recomputes expenses+settlements from scratch |
| Settlement state machine + idempotency transaction | `settlements.service.ts:80-133`; states in `config/constants.ts:14` + CHECK constraint | `pending → submitting → settled\|failed`; blocks concurrent duplicates (409), deliberately allows a new settlement after `settled` |
| TTL cache + explicit invalidation | `src/services/apiService.ts:76-118` | Cuts refetch chatter from focus-triggered reloads without a global store |
| Focus-triggered refetch (no event bus/store) | `useFocusEffect` in Home/Groups/GroupDetail screens | Server-authoritative simplicity over client state sync |
| Custodial wallet w/ envelope encryption | `stellar/crypto.ts:19-54` (`v1:<iv>:<tag>:<ciphertext>` hex) | One-click settle; secret exists in memory only for the `.sign()` call |

### 5) Known Architectural Risks

- Money is IEEE-754 floats end-to-end (REAL columns, `Math.round(x*100)/100`, 0.01 epsilons) — deliberate and documented ("DO NOT 'fix' the rounding", `backend/src/domain/splitCalculator.ts:1-9`), but fragile beyond demo scale; integer cents is the production fix. XLM amounts are safe (7-dp strings, `stellar/conversion.ts`).
- Hardcoded API base URL (`src/services/apiClient.ts:6-9`) — unreachable from a physical device; `setBaseUrl()` exists but has zero call sites.
- Domain types duplicated three ways (`src/models/types.ts` ↔ `backend/src/domain/types.ts` ↔ wire-shape interfaces inside `src/services/apiService.ts`) — copy-maintained by convention; drift is already visible (see CONCERNS.md).
- No graceful shutdown (no SIGTERM/`onClose` closing the SQLite handle) — acceptable for WAL-mode demo, a gap for anything longer-lived.
- Post-`settled` duplicate window: a retried settle request after a lost success response submits a second real payment (documented decision, `backend/ARCHITECTURE.md:630-631`; demo-runbook mitigation: poll `GET /settlements/:id` before retrying).

### 6) Evidence

- `App.tsx`, `src/navigation/RootNavigator.tsx`, `src/contexts/AuthContext.tsx`, `src/services/{apiClient,apiService}.ts`
- `backend/src/{server,app}.ts`, `backend/src/modules/{expenses,settlements,balances}/`, `backend/src/domain/`, `backend/src/stellar/`, `backend/src/db/schema.sql`
