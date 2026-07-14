# SplitPay Backend — ARCHITECTURE (v2, final)

> **Phase 2 deliverable, revised per Phase 3.** Single source of truth the Developer (Phase 4) implements from.
> A mid-level developer must build this with **zero clarifying questions**. Ambiguity is a defect.
>
> Read order for any agent: `DECISIONS.md` → `RESEARCH.md` → **this file** → (`TRADEOFFS.md` for the why).
> Locked upstream decisions live in `DECISIONS.md §2`. Orchestrator rulings on `RESEARCH.md §7` and the
> Advisor's `TRADEOFFS.md` changes are adjudicated in the **Decision Log (§11)** and applied throughout.
>
> _Architect (Phase 2) · v1 2026-07-14 · **v2 2026-07-14** (applies all 8 TRADEOFFS items as adjudicated by
> the orchestrator). Targets `@stellar/stellar-sdk` v16.0.1, Node 20 LTS._

**What changed v1 → v2 (all subtractions + one precision add; see §11 for the ledger):** cut the settle-path
timeout race → plain `await` + `catch`→202; deleted the Stellar auto-retry; simplified idempotency to a
check-before-insert on in-flight settlements only; kept AES-GCM encryption but de-risked it (boot-validated key,
explicit decrypt error); merged balances + settle-suggestions into one endpoint; cut per-group activity; marked
`/users/me/summary` deferrable; **specified settlement→balance netting exactly (§5.7) with a required unit test.**
Endpoint count **18 → 16** (15 functional + health).

---

## 0. Table of contents

1. System overview + component diagram
2. Tech stack (with one-line justifications)
3. Data models (tables, types, indexes, relations, frontend mapping)
4. API spec — **every endpoint**, full request/response/error schemas
5. Stellar integration layer (custody, build→sign→submit→confirm, conversion, idempotency, **netting**, reconcile)
6. Config + environment variables
7. Folder / module structure (implement exactly)
8. Non-functional requirements (logging, validation, error format, security)
9. Ordered milestones M1..M7 (each ends runnable)
10. Future (parked — NOT in scope)
11. **Decision Log** (every TRADEOFFS item: Accepted / Modified / Overridden + rationale)

---

## 1. System overview + component diagram

SplitPay's existing React Native app (`../src`, untouched) currently reads from an in-memory mock
(`storageService.ts`). This backend replaces that mock with a real HTTP API backed by SQLite, and adds a
**Stellar testnet settlement layer** so "Settle Up" moves real (test) XLM on-chain, debtor → creditor.

The API is a single Fastify process. All business logic (auth, groups, expenses, balances) is local and
synchronous against SQLite. Only the **settlement** path reaches out of process — to Horizon testnet and
Friendbot over HTTPS. There is no message queue, no background worker, no external cache: settlement is a plain
`await submitTransaction` with a **catch → 202** fallback for the rare Horizon 504, resolved later by a one-shot
poll on read (ruling #4, trimmed per TRADEOFFS §2.2).

```
┌──────────────────────────┐         HTTPS / JSON            ┌───────────────────────────────────────────┐
│  React Native + Expo app │  ───────────────────────────▶  │            Fastify API (Node 20 + TS)         │
│  (../src, UNTOUCHED)     │  ◀───────────────────────────  │                                             │
│  screens → fetch()       │      { data } / { error }       │  ┌─────────────────────────────────────┐    │
└──────────────────────────┘                                 │  │ HTTP layer                          │    │
                                                             │  │  plugins: jwt-auth, error-handler,   │    │
                                                             │  │  zod validation, request logging     │    │
                                                             │  ├─────────────────────────────────────┤    │
                                                             │  │ modules (routes → service)          │    │
                                                             │  │  auth · users · groups · expenses ·  │    │
                                                             │  │  balances · settlements · activity   │    │
                                                             │  ├──────────────┬──────────────────────┤    │
                                                             │  │ domain       │ stellar/              │    │
                                                             │  │ splitCalc,   │ client · wallet ·     │    │
                                                             │  │ netting,     │ payment · conversion ·│    │
                                                             │  │ types        │ crypto (AES-GCM)      │    │
                                                             │  └──────┬───────┴─────────┬────────────┘    │
                                                             │         │                 │                 │
                                                             │  ┌──────▼───────┐         │                 │
                                                             │  │ better-sqlite3│        │                 │
                                                             │  │ data/splitpay.db│      │                 │
                                                             │  └──────────────┘         │                 │
                                                             └───────────────────────────┼─────────────────┘
                                                                                         │ HTTPS
                                                            ┌────────────────────────────▼──────────────────┐
                                                            │  Stellar TESTNET (external)                    │
                                                            │   • Horizon  https://horizon-testnet.stellar.org│
                                                            │   • Friendbot https://friendbot.stellar.org    │
                                                            │   passphrase: "Test SDF Network ; September 2015"│
                                                            └────────────────────────────────────────────────┘
```

**Request lifecycle (every request):** `onRequest` → JWT verify (protected routes) → zod validation of
params/query/body → route handler → service (SQLite tx and/or Stellar call) → response → `onResponse` structured
log. Any thrown `AppError` is caught by the global error handler and rendered as `{ error: { code, message, details? } }`.

---

## 2. Tech stack

| Concern | Choice | One-line justification |
|---|---|---|
| Runtime | **Node.js 20 LTS** | Locked in DECISIONS.md; global `fetch`, `crypto.randomUUID`, stable `node:crypto` AES-GCM — no polyfills. |
| Language | **TypeScript 5.x** (strict) | Shares model shapes with the RN/TS frontend; `any` in request bodies is banned by guardrail. |
| HTTP framework | **Fastify 4.x** | Locked; fast, first-class TS, hooks for auth/logging, built-in Pino logger with redaction. |
| SQLite driver | **`better-sqlite3`** | Synchronous API → simplest correct code for a single-process demo (no pool, no await-per-query); fast; battle-tested. Only native dep (mitigate build risk R3: pin Node 20, commit lockfile, `npm ci` on the demo machine ahead of time). |
| Validation + types | **`zod`** + **`fastify-type-provider-zod`** | One schema is both the runtime validator **and** the compile-time type. Request validation is mandatory; response-body schemas are optional (§8.2). |
| Auth / sessions | **`@fastify/jwt`** | Official plugin; stateless bearer tokens; `request.jwtVerify()` in an `onRequest` hook. |
| Password hashing | **`bcryptjs`** (pure JS) | Zero native build (keeps `better-sqlite3` the only native dep → reliable `npm i` on demo day). Cost factor 10. |
| Stellar SDK | **`@stellar/stellar-sdk` v16.0.1** | Locked; `stellar-base` folded in as of v16 (RESEARCH §1); use `Horizon.Server` namespaced form. |
| Encryption at rest | **`node:crypto` (AES-256-GCM)** | Built-in, zero dependency; encrypts the wallet secret column (§5.6, ruling #6 upheld + de-risked). |
| ID generation | **`crypto.randomUUID()`** (built-in) | String UUIDs match the frontend's `string` id fields; no `uuid`/`nanoid` dependency. |
| Config | **`dotenv`** + zod-validated `env.ts` | Fail-fast at boot if a required secret/URL/key is missing/malformed or the network isn't testnet. |
| Dev runner | **`tsx`** (`tsx watch`) + `tsc` for typecheck/build | Fast TS execution without a separate build step in dev. |

**Dependency list (exact):**
`fastify`, `@fastify/jwt`, `zod`, `fastify-type-provider-zod`, `better-sqlite3`, `bcryptjs`,
`@stellar/stellar-sdk`, `dotenv`.
**Dev:** `typescript`, `tsx`, `@types/node`, `@types/better-sqlite3`, `@types/bcryptjs`.

---

## 3. Data models

**Conventions.** SQLite affinities: `TEXT` for ids (UUID strings), names, enums, ISO-8601 timestamps, and the
XLM amount string; `REAL` for **fiat** money (matches the frontend's `number` and `splitCalculator`'s cent
rounding); `INTEGER` (0/1) for booleans. All timestamps are **ISO-8601 UTC strings** (`new Date().toISOString()`).
`PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` on every connection.

> **Fiat as REAL:** acceptable for a demo and keeps 1:1 parity with the frontend's `number` amounts and
> `splitCalculator` rounding. XLM amounts are stored as **strings** (`xlm_amount`) because Stellar amounts are
> exact 7-dp strings and must never pass through a float on the way to `Operation.payment`.

### 3.1 `users`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `randomUUID()` |
| `name` | TEXT NOT NULL | maps `User.name` |
| `email` | TEXT NOT NULL UNIQUE | maps `User.email`; lowercased before insert |
| `password_hash` | TEXT NOT NULL | bcrypt; **never** returned in any response |
| `avatar` | TEXT NULL | maps `User.avatar?` |
| `phone` | TEXT NULL | maps `User.phone?` |
| `created_at` | TEXT NOT NULL | ISO-8601 |

Indexes: `UNIQUE(email)`.
**Frontend mapping:** row → `User{id,name,email,avatar?,phone?}` (drop `password_hash`, `created_at`).

### 3.2 `wallets` (one per user — the custodial Stellar keypair)

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `randomUUID()` |
| `user_id` | TEXT NOT NULL UNIQUE | FK → `users.id`; 1:1 |
| `public_key` | TEXT NOT NULL | Stellar `G...` — safe to expose |
| `encrypted_secret` | TEXT NOT NULL | AES-256-GCM of the `S...` secret; format `v1:<iv_hex>:<tag_hex>:<ciphertext_hex>` (§5.6). **Never logged or returned.** |
| `funding_status` | TEXT NOT NULL | `'funded' \| 'unfunded'`; `'funded'` after Friendbot confirms, else `'unfunded'` |
| `created_at` | TEXT NOT NULL | ISO-8601 |

Indexes: `UNIQUE(user_id)`.
**Frontend mapping:** exposed only as additive fields on `GET /users/me` → `wallet:{ publicKey, fundingStatus, xlmBalance }`. `encrypted_secret` never leaves the process.

### 3.3 `groups`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `randomUUID()` |
| `name` | TEXT NOT NULL | maps `Group.name` |
| `description` | TEXT NULL | maps `Group.description?` |
| `type` | TEXT NOT NULL | `'family'\|'friends'\|'roommates'\|'trip'\|'other'` (matches `Group.type` + `CreateGroupScreen`) |
| `created_by` | TEXT NOT NULL | FK → `users.id`; maps `Group.createdBy` |
| `created_at` | TEXT NOT NULL | ISO-8601; maps `Group.createdAt` |

`Group.members` and `Group.totalExpenses` are **computed** (join `group_members` + sum `expenses`), not stored.

### 3.4 `group_members` (junction — many-to-many users↔groups)

| Column | Type | Notes |
|---|---|---|
| `group_id` | TEXT NOT NULL | FK → `groups.id` |
| `user_id` | TEXT NOT NULL | FK → `users.id` |
| `joined_at` | TEXT NOT NULL | ISO-8601 |

Primary key: `PRIMARY KEY(group_id, user_id)`. Indexes: `INDEX(group_id)`, `INDEX(user_id)`.
**Membership is the authorization boundary** for every `/groups/:id/**` route (§4.0).

### 3.5 `expenses`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `randomUUID()` |
| `group_id` | TEXT NOT NULL | FK → `groups.id` |
| `description` | TEXT NOT NULL | maps `Expense.description` |
| `amount` | REAL NOT NULL | fiat; maps `Expense.amount` |
| `currency` | TEXT NOT NULL | maps `Expense.currency` (default `'USD'`) |
| `category` | TEXT NOT NULL | one of `EXPENSE_CATEGORIES` ids (`src/constants`) |
| `paid_by` | TEXT NOT NULL | FK → `users.id`; maps `Expense.paidBy` |
| `split_method` | TEXT NOT NULL | `'equal'\|'exact'\|'percentage'` |
| `date` | TEXT NOT NULL | ISO-8601; maps `Expense.date` |
| `created_at` | TEXT NOT NULL | ISO-8601 |
| `receipt` | TEXT NULL | maps `Expense.receipt?` |
| `notes` | TEXT NULL | maps `Expense.notes?` |

Indexes: `INDEX(group_id)`. **Frontend mapping:** row + its splits → `Expense{...,splits:Split[]}`.

### 3.6 `expense_splits`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `randomUUID()` |
| `expense_id` | TEXT NOT NULL | FK → `expenses.id` (ON DELETE CASCADE) |
| `user_id` | TEXT NOT NULL | FK → `users.id`; maps `Split.userId` |
| `amount` | REAL NOT NULL | fiat share; maps `Split.amount` |
| `is_paid` | INTEGER NOT NULL | 0/1; maps `Split.isPaid` |

Indexes: `INDEX(expense_id)`. **Frontend mapping:** row → `Split{userId,amount,isPaid:boolean}`.

### 3.7 `settlements` (distinct from the frontend's `Payment` — the on-chain settle-up record)

Authoritative record of a Stellar settle-up; a **superset** of `Payment`. The API maps it down to a
`Payment`-compatible shape (`settled = status === 'settled'`) plus additive Stellar fields.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `randomUUID()` |
| `group_id` | TEXT NOT NULL | FK → `groups.id`; maps `Payment.groupId` |
| `from_user_id` | TEXT NOT NULL | debtor; FK → `users.id`; maps `Payment.fromUserId` |
| `to_user_id` | TEXT NOT NULL | creditor; FK → `users.id`; maps `Payment.toUserId` |
| `amount` | REAL NOT NULL | **fiat** amount; maps `Payment.amount` |
| `currency` | TEXT NOT NULL | fiat currency label (default `'USD'`) |
| `xlm_amount` | TEXT NOT NULL | 7-dp XLM string from `toStellarAmount(amount)` (§5.4) |
| `status` | TEXT NOT NULL | `'pending'\|'submitting'\|'settled'\|'failed'` (§5.5) |
| `tx_hash` | TEXT NULL | Stellar tx hash; computed at build time, persisted before submit |
| `source_public_key` | TEXT NOT NULL | debtor `G...` (immutable tx record; intentionally denormalized from `wallets`) |
| `dest_public_key` | TEXT NOT NULL | creditor `G...` |
| `note` | TEXT NULL | maps `Payment.note?` |
| `failure_code` | TEXT NULL | machine code on failure (e.g. `INSUFFICIENT_XLM`, a Horizon result code) |
| `failure_message` | TEXT NULL | human-readable failure detail (never contains secret/XDR) |
| `created_at` | TEXT NOT NULL | ISO-8601; maps `Payment.date` |
| `updated_at` | TEXT NOT NULL | ISO-8601; bumped on every status change |
| `settled_at` | TEXT NULL | ISO-8601; set when `status → 'settled'` |

> **v2 change (ruling #3):** the `idempotency_key` column + its unique index are **removed**. Dedup is a
> check-before-insert on in-flight rows (§5.5); no client header, no extra column.

Indexes: `INDEX(group_id)`, `INDEX(status)`, `INDEX(group_id, from_user_id, to_user_id, status)` (supports the
in-flight dedup lookup).
**Frontend mapping (`Payment` superset):**
`{ id, groupId, fromUserId, toUserId, amount, date:created_at, note?, settled:(status==='settled'), status, xlmAmount, txHash, explorerUrl, currency, conversionNote }`.

### 3.8 `activities`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `randomUUID()` |
| `type` | TEXT NOT NULL | `'expense_added'\|'payment_made'\|'group_created'\|'member_added'` |
| `group_id` | TEXT NOT NULL | FK → `groups.id` |
| `user_id` | TEXT NOT NULL | actor; FK → `users.id` |
| `description` | TEXT NOT NULL | e.g. `added "Groceries"` (matches `ActivityScreen` copy) |
| `amount` | REAL NULL | maps `Activity.amount?` |
| `date` | TEXT NOT NULL | ISO-8601; maps `Activity.date` |

Indexes: `INDEX(group_id)`, `INDEX(user_id)`, `INDEX(date)`. Written on: group create, member add, expense add,
settlement settled.

### 3.9 Entity relationships

```
users 1───1 wallets
users 1───* expenses (paid_by)
users *───* groups            (via group_members)
groups 1───* expenses
expenses 1───* expense_splits
groups 1───* settlements       (from_user_id, to_user_id → users)
groups 1───* activities        (user_id → users)
```

---

## 4. API spec

### 4.0 Conventions (apply to every endpoint)

- **Base path:** none (routes are absolute, e.g. `POST /auth/register`). JSON in, JSON out.
- **Error envelope (uniform):** `{ "error": { "code", "message", "details"? } }`. Codes = §8.3 enum.
- **Auth:** protected routes require `Authorization: Bearer <jwt>`. Missing/invalid → `401 UNAUTHORIZED`.
- **Validation:** params, query, body are zod-validated. Failure → `400 VALIDATION_ERROR`, `details` = zod issues.
- **Membership guard:** every `/groups/:id/**` route requires the caller to be a member of `:id`; non-member → `403 FORBIDDEN`; unknown group → `404 NOT_FOUND`.
- **Money:** fiat = JS `number`; XLM = 7-dp `string`. **Timestamps:** ISO-8601 strings.

**Endpoint inventory — 16 total (15 functional + health), 8 resource groups:**

| # | Method | Path | Auth | Resource group |
|---|---|---|---|---|
| 1 | POST | `/auth/register` | no | auth |
| 2 | POST | `/auth/login` | no | auth |
| 3 | GET | `/users/me` | yes | users + wallet |
| 4 | GET | `/users/me/summary` | yes | users + wallet (**deferrable — see #4**) |
| 5 | POST | `/users/me/wallet/fund` | yes | users + wallet |
| 6 | GET | `/groups` | yes | groups |
| 7 | POST | `/groups` | yes | groups |
| 8 | GET | `/groups/:id` | yes (member) | groups |
| 9 | GET | `/groups/:id/expenses` | yes (member) | expenses |
| 10 | POST | `/groups/:id/expenses` | yes (member) | expenses |
| 11 | GET | `/groups/:id/balances` | yes (member) | balances + suggestions (**merged**) |
| 12 | POST | `/groups/:id/settlements` | yes (member) | settlements |
| 13 | GET | `/groups/:id/settlements` | yes (member) | settlements |
| 14 | GET | `/settlements/:id` | yes | settlements |
| 15 | GET | `/activity` | yes | activity |
| 16 | GET | `/health` | no | ops |

---

### 4.1 Auth

#### 1. `POST /auth/register`
Creates a user, **provisions a custodial Stellar wallet** (generate keypair → AES-GCM encrypt secret → store →
Friendbot-fund; ruling #5), and returns a JWT. Funding is **resilient**: if Friendbot is slow/down the user is
still created with `funding_status:'unfunded'` and the response is `201` with `wallet.fundingStatus:'unfunded'`
(retry via #5). Registration never fails solely because Friendbot failed.

**Request body**
```json
{ "name":"John Doe", "email":"john@example.com", "password":"hunter2xx", "phone":"+1 234 567 890", "avatar":"https://…" }
```
Rules: `name` 1–80 chars; `email` valid + unique (lowercased); `password` ≥ 8 chars; `phone?`, `avatar?` optional.

**Success `201`**
```json
{
  "user": { "id":"u_uuid","name":"John Doe","email":"john@example.com","phone":"+1 234 567 890" },
  "wallet": { "publicKey":"G…","fundingStatus":"funded" },
  "token": "eyJhbGciOi…"
}
```
**Errors:** `400 VALIDATION_ERROR` · `409 EMAIL_TAKEN` · `500 WALLET_KEY_ERROR` (encryption key missing/invalid — boot should have caught it; §5.6).
> A funding failure is still `201` with `fundingStatus:'unfunded'`, not an error.

#### 2. `POST /auth/login`
**Request body:** `{ "email":"john@example.com", "password":"hunter2xx" }`
**Success `200`:** `{ "user":{ "id","name","email","phone"? }, "token":"eyJ…" }`
**Errors:** `400 VALIDATION_ERROR` · `401 UNAUTHORIZED` (wrong email or password — **same** message `"Invalid email or password"` to avoid user enumeration).

**JWT:** payload `{ sub:userId, email }`, `HS256`, signed with `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (default `7d`). The `authenticate` hook sets `request.user = { id, email }`.

---

### 4.2 Users + wallet

#### 3. `GET /users/me` (auth)
Profile + wallet public key + **live** XLM balance. The Horizon balance fetch is wrapped in a **~2s timeout**
(TRADEOFFS §2.5): on timeout **or** Horizon error, return the cached `funding_status` with `xlmBalance: null`
rather than hanging or failing the request.
**Success `200`**
```json
{
  "user": { "id":"u_uuid","name":"John Doe","email":"john@example.com","phone":"+1 234 567 890","avatar":null },
  "wallet": { "publicKey":"G…","fundingStatus":"funded","xlmBalance":"9999.9999900" }
}
```
**Errors:** `401 UNAUTHORIZED`.

#### 4. `GET /users/me/summary` (auth) — **DEFERRABLE (lowest build priority)**
Aggregates for `HomeScreen` across all the caller's groups, computed from expenses **net of settled settlements**
(§5.7). **Build priority: implement in M4 only if time allows; it is the first endpoint to drop under time
pressure** — HomeScreen totals can be derived client-side from `#6` per-group balances + `#15` recent items
(TRADEOFFS §2.1, ruling #7). If shipped:
```json
{
  "netBalance": 125.50, "youOwe": 45.00, "youAreOwed": 170.50,
  "recentActivity": [ { "id":"a_uuid","type":"expense_added","groupId":"g_uuid","userId":"u_uuid","description":"added \"Dinner\"","amount":85.0,"date":"2026-07-14T19:30:00.000Z" } ]
}
```
`recentActivity` = the 5 most recent activities across the caller's groups (empty array if none).
**Errors:** `401 UNAUTHORIZED`.

#### 5. `POST /users/me/wallet/fund` (auth)
Idempotent Friendbot retry (ruling #5, cheap insurance vs Friendbot flakiness R1). If already funded, returns
current status without re-calling Friendbot.
**Request body:** none.
**Success `200`:** `{ "wallet": { "publicKey":"G…","fundingStatus":"funded","xlmBalance":"10000.0000000" } }`
**Errors:** `401 UNAUTHORIZED` · `502 FRIENDBOT_FAILED` (Friendbot unreachable/errored — safe to retry).

---

### 4.3 Groups

#### 6. `GET /groups` (auth)
Groups the caller is a member of, each enriched for `GroupsScreen`: caller's net balance in that group, member
count, last-activity timestamp.
**Success `200`**
```json
{
  "groups": [
    { "id":"g_uuid","name":"Apartment 4B","description":null,"type":"roommates","createdBy":"u_uuid",
      "createdAt":"2026-07-10T…","memberCount":3,"totalExpenses":450.0,"balance":45.0,"lastActivity":"2026-07-14T…" }
  ]
}
```
`balance` = caller's `netBalance` in that group (net of settled settlements, §5.7). `lastActivity` = max `activities.date` for the group (or `createdAt` if none).
**Errors:** `401 UNAUTHORIZED`.

#### 7. `POST /groups` (auth)
Creates a group; the caller is auto-added as a member and `created_by`. Additional members are supplied by
**email** (matches `CreateGroupScreen`) and must resolve to **existing registered users**.
**Request body**
```json
{ "name":"Apartment 4B", "description":"Rent & utils", "type":"roommates", "memberEmails":["sarah@example.com","mike@example.com"] }
```
Rules: `name` 1–80; `type` ∈ the 5 enum values; `memberEmails?` array of valid emails (deduped; caller's own email ignored if included).
**Success `201`:** the full group with members:
```json
{
  "group": {
    "id":"g_uuid","name":"Apartment 4B","description":"Rent & utils","type":"roommates",
    "createdBy":"u_uuid","createdAt":"2026-07-14T…","totalExpenses":0,
    "members":[ {"id":"u_uuid","name":"John Doe","email":"john@example.com"}, {"id":"…","name":"Sarah","email":"sarah@example.com"} ]
  }
}
```
Side effect: `activities` row `type:'group_created'`, plus `type:'member_added'` per added member.
**Errors:** `400 VALIDATION_ERROR` · `401 UNAUTHORIZED` · `422 MEMBERS_NOT_FOUND` (`details:{unknownEmails:[…]}` — whole create rejected; no partial group).

#### 8. `GET /groups/:id` (auth, member)
Full detail for `GroupDetailScreen`: group + members + a `balances` block (the **same** `Balance[]` shape as §4.5
`#11`) so the screen renders member balances in one call.
**Success `200`**
```json
{
  "group": { "id":"g_uuid","name":"Apartment 4B","description":null,"type":"roommates","createdBy":"u_uuid","createdAt":"…","totalExpenses":450.0,
             "members":[ {"id":"u1","name":"You","email":"…"}, … ] },
  "balances": [ { "userId":"u1","owes":[],"isOwed":[{"fromUserId":"u2","amount":25.0}],"netBalance":45.0 }, … ]
}
```
**Errors:** `401` · `403 FORBIDDEN` · `404 NOT_FOUND`.

---

### 4.4 Expenses

#### 9. `GET /groups/:id/expenses` (auth, member)
**Success `200`:** `{ "expenses": Expense[] }` — full frontend shape incl. `splits`, ordered by `date` desc.
**Errors:** `401` · `403` · `404`.

#### 10. `POST /groups/:id/expenses` (auth, member)
Adds an expense. Server computes/validates splits from `splitMethod`:
- **`equal`**: client omits `splits`; server computes via ported `calculateEqualSplit(amount, memberIds)` over **all** group members (rounding parity with the frontend, §8.5 — residual cents not redistributed).
- **`exact`**: client sends `splits:[{userId,amount}]`; server validates Σamount == expense amount (±0.01) and every `userId` is a member.
- **`percentage`**: client sends `splits:[{userId,percentage}]`; server validates Σpercentage == 100 (±0.01), computes `amount = round(amount*pct/100, 2)`, members validated.

**Request body**
```json
{
  "description":"Groceries","amount":85.0,"currency":"USD","category":"groceries",
  "paidBy":"u_uuid","splitMethod":"equal","date":"2026-07-14T…",
  "splits":[ {"userId":"u2","amount":42.5} ],   // required for exact; percentage uses {userId,percentage}; omit for equal
  "receipt":null,"notes":null
}
```
Rules: `amount` > 0; `category` ∈ `EXPENSE_CATEGORIES` ids; `paidBy?` defaults to caller, must be a member; `splitMethod` ∈ enum; `date?` defaults to now.
**Success `201`:** `{ "expense": Expense }` (server-computed `splits`, each `isPaid:false`).
Side effect: `activities` row `type:'expense_added'`, `amount` = expense amount.
**Errors:** `400 VALIDATION_ERROR` (bad split sums → `details.reason`) · `401` · `403` · `404` · `422 MEMBERS_NOT_FOUND` (a split/`paidBy` user isn't a group member).

---

### 4.5 Balances + settle-suggestions (**merged — ruling #5**)

#### 11. `GET /groups/:id/balances` (auth, member)
**One** endpoint returning both the per-group balances and the minimal settle-up transaction set (v2 merges the
old standalone `settle-suggestions` here). Balances are computed by ported `calculateBalances(expenses, memberIds)`
(§8.5), then adjusted for settled settlements (§5.7). `suggestions` = ported `simplifyDebts(balances)`, enriched
with names + `xlmAmount` + `conversionNote`, carrying **exactly** the params `SettleUpScreen`/`GroupDetailScreen`
pass (`groupId,fromUserId,toUserId,amount`).
**Success `200`**
```json
{
  "balances": [ { "userId":"u3","owes":[{"toUserId":"u1","amount":25.0}],"isOwed":[],"netBalance":-25.0 }, … ],
  "suggestions": [
    { "fromUserId":"u3","fromName":"Mike","toUserId":"u1","toName":"You","amount":25.0,
      "xlmAmount":"25.0000000","currency":"USD",
      "conversionNote":"Demo peg: 1 USD = 1 XLM on Stellar testnet. Not a real exchange rate." }
  ]
}
```
**Errors:** `401` · `403` · `404`.

---

### 4.6 Settlements (Stellar)

#### 12. `POST /groups/:id/settlements` (auth, member)
Builds, signs (custodial), and submits an on-chain **native XLM** payment debtor → creditor on testnet, then
records status. **Plain synchronous submit with a 202 fallback** (ruling #4, trimmed per TRADEOFFS §2.2): the
handler does `await submitTransaction(tx)` under a generous Horizon client timeout (`HORIZON_TIMEOUT_MS`). On
success → `201` `status:'settled'`. In a `catch` for a Horizon **504 / client timeout** → set `status:'submitting'`
→ return **202** for the client to poll via `#14`. **No timeout race, no dangling promise.**

**Authorization rule:** the caller **must be the debtor** — `request.user.id === fromUserId` (you settle your own
debt; the server signs with your custodial key). Otherwise `403 FORBIDDEN`.

**Idempotency (ruling #3, corrected):** **before insert**, inside a SQLite transaction, query for an existing
settlement with the same `(group_id, from_user_id, to_user_id)` in status **`pending` or `submitting` only**. If
one exists → return it as `409 SETTLEMENT_IN_PROGRESS` (`details.settlement`) and build no tx. A prior **`settled`**
settlement between the same pair does **NOT** block a new settle-up (repeat settlements for new debt must work).
Only if no in-flight row exists → insert `status:'pending'` and proceed. Envelope-level Stellar dedupe (RESEARCH
§4.5) is the backstop.

**Request body**
```json
{ "fromUserId":"u3", "toUserId":"u1", "amount":25.0, "currency":"USD", "note":"July rent share" }
```
Rules: `fromUserId` == caller and a member; `toUserId` a member ≠ `fromUserId`; `amount` > 0; `currency?` default `'USD'`; `note?` ≤ 140 chars.

**Success `201`** (settled synchronously) — settlement (Payment superset):
```json
{
  "settlement": {
    "id":"s_uuid","groupId":"g_uuid","fromUserId":"u3","toUserId":"u1",
    "amount":25.0,"currency":"USD","xlmAmount":"25.0000000",
    "status":"settled","settled":true,
    "txHash":"ed9e96…","explorerUrl":"https://stellar.expert/explorer/testnet/tx/ed9e96…",
    "note":"July rent share","date":"2026-07-14T…","createdAt":"2026-07-14T…","updatedAt":"2026-07-14T…","settledAt":"2026-07-14T…",
    "conversionNote":"Demo peg: 1 USD = 1 XLM on Stellar testnet. Not a real exchange rate."
  }
}
```
**Accepted `202`** (Horizon 504 / timeout — poll `#14`): same shape with `status:'submitting'`, `settled:false`, `txHash` present (computed pre-submit), `settledAt:null`.

**Errors:**
- `400 VALIDATION_ERROR` — bad body.
- `401 UNAUTHORIZED`.
- `403 FORBIDDEN` — caller ≠ debtor, or not a member.
- `404 NOT_FOUND` — group / user not found.
- `409 SETTLEMENT_IN_PROGRESS` — an existing `pending|submitting` settlement for the same `(group,from,to)` (returned in `details.settlement`).
- `422 WALLET_UNFUNDED` — debtor or creditor wallet not funded (`details.who`).
- `422 DEST_NOT_FOUND` — creditor account doesn't exist on-chain (`PAYMENT_NO_DESTINATION`).
- `422 INSUFFICIENT_XLM` — reserve pre-check failed: `balance < amount + fee + 1 XLM` (ruling #2; `details:{balance,required}`).
- `422 PAYMENT_UNDERFUNDED` — Horizon rejected for underfunding despite pre-check (race).
- `502 STELLAR_ERROR` — any other definite `tx_failed`/`op_*` result; settlement marked `failed`, `failure_code` = the Horizon result code, `details.resultCodes` echoed. **The client re-taps to retry** (the in-flight dedup guard makes that safe) — the server does **not** auto-rebuild (ruling #2 / §5.9).
- `500 WALLET_KEY_ERROR` — secret could not be decrypted (§5.6).

#### 13. `GET /groups/:id/settlements` (auth, member)
All settlements for the group (any status), newest first. **This is requirement §3.8's transaction history**
(judge-facing).
**Success `200`:** `{ "settlements": Settlement[] }` (same shape as `#12`'s `settlement`).
**Errors:** `401` · `403` · `404`.

#### 14. `GET /settlements/:id` (auth)
Poll a settlement's status. If `status === 'submitting'`, the service **reconciles once** against Horizon by
`tx_hash` (§5.8) before responding: found+success → `settled`; timebound expired + still 404 → `failed`. Caller
must be the settlement's `from_user_id` or `to_user_id`.
**Success `200`:** `{ "settlement": Settlement }`.
**Errors:** `401` · `403 FORBIDDEN` (not a party) · `404 NOT_FOUND`.

---

### 4.7 Activity

#### 15. `GET /activity` (auth)
Global feed across all the caller's groups, newest first. Query `?limit=` (default 50, max 100). This is the only
activity endpoint — `ActivityScreen` uses the global feed; per-group activity is parked (§10).
**Success `200`:** `{ "activities": Activity[] }` (frontend `Activity` shape).
**Errors:** `401 UNAUTHORIZED`.

---

### 4.8 Ops

#### 16. `GET /health` (no auth)
**Success `200`:** `{ "status":"ok", "network":"testnet", "time":"2026-07-14T…" }`. Liveness only — does **not** call Horizon.

---

## 5. Stellar integration layer

All Stellar code lives under `src/stellar/`. **Testnet only** — `client.ts` asserts the passphrase equals
`Test SDF Network ; September 2015` at boot and throws otherwise (guardrail). Uses `Horizon.Server` (RESEARCH §1)
and native `fetch` for Friendbot.

### 5.1 Horizon client (`stellar/client.ts`)
```ts
import { Horizon, Networks } from "@stellar/stellar-sdk";
export const server = new Horizon.Server(env.HORIZON_URL); // https://horizon-testnet.stellar.org
export const NETWORK_PASSPHRASE = Networks.TESTNET;        // must equal env.STELLAR_NETWORK_PASSPHRASE
// boot assertion: if (NETWORK_PASSPHRASE !== "Test SDF Network ; September 2015") throw
```
Horizon calls are made with a generous client timeout (`HORIZON_TIMEOUT_MS`) so a hung request surfaces as a
catchable timeout (→ 202 for submit; → `xlmBalance:null` for the #3 balance read).

### 5.2 Custody / signing flow (`stellar/wallet.ts`, `stellar/crypto.ts`)
1. **Provision (register):** `Keypair.random()` → `publicKey` (`G…`), `secret` (`S…`).
2. **Encrypt** the secret with AES-256-GCM (§5.6) → store `encrypted_secret`; **never** persist plaintext.
3. **Fund** via Friendbot HTTP GET (RESEARCH §2). Success → `funding_status='funded'`; failure → `'unfunded'` (register still succeeds).
4. **Sign (settle-up):** fetch `encrypted_secret` → decrypt → `Keypair.fromSecret(secret)` → `tx.sign(kp)` → let the `Keypair` go out of scope immediately (RESEARCH §5). Decrypted secret exists only for the sign call; never logged, cached, or returned.

### 5.3 Build → sign → submit → confirm (`stellar/payment.ts`)
Sequence for `POST /groups/:id/settlements` (native XLM, `setTimeout(STELLAR_TX_TIMEOUT_SECONDS)`):

```
1. loadAccount(debtorPublicKey)              // fresh sequence number
2. reserve pre-check (ruling #2):            // native balance ≥ amount + BASE_FEE + 1 XLM
      if fail → status='failed', code=INSUFFICIENT_XLM → 422
3. TransactionBuilder(acc,{fee:BASE_FEE,networkPassphrase})
      .addOperation(Operation.payment({destination, asset:Asset.native(), amount:xlmAmount}))
      .setTimeout(30).build()
4. txHash = tx.hash().toString("hex")        // compute BEFORE submit; persist tx_hash + status='submitting'
5. tx.sign(debtorKeypair)                    // §5.2 step 4
6. try { result = await server.submitTransaction(tx) }   // plain await under HORIZON_TIMEOUT_MS — NO race
      • result.successful (tx_success)  → status='settled', settled_at, mark splits paid, activity 'payment_made' → 201
   catch (e):
      • Horizon 504 / client timeout    → keep status='submitting' → 202 (client polls #14)
      • tx_failed / op error            → status='failed', failure_code=<result code>, failure_message → 422/502 (§5.9)
```

> `tx_hash` is computed from the built envelope (step 4) so it is available even when submit times out — the
> client can poll and the server can reconcile the exact same envelope (idempotency-safe, §5.5). No auto-retry:
> a hard failure ends at `failed`; the user re-taps (ruling #2).

### 5.4 Fiat → XLM conversion (`stellar/conversion.ts`) — ruling #1
**One** helper; the **only** place fiat becomes an XLM amount. **1:1 numeric demo peg** (locked). Output is a 7-dp
string safe for `Operation.payment`.
```ts
/** Demo peg only: 1 unit of fiat == 1 XLM on testnet. NOT a real FX rate. */
export function toStellarAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError("VALIDATION_ERROR", "amount must be > 0");
  return amount.toFixed(7); // e.g. 25 → "25.0000000"
}
export const CONVERSION_NOTE = (currency: string) =>
  `Demo peg: 1 ${currency} = 1 XLM on Stellar testnet. Not a real exchange rate.`;
```
Every settlement/suggestion response **must** carry `conversionNote` so the UI never implies a real rate
(data-integrity rule). Both fiat `amount` and `xlmAmount` are stored (§3.7).

### 5.5 Idempotency + status lifecycle (ruling #3, corrected)
**Lifecycle:** `pending → submitting → settled | failed` (both terminal). `pending`/`submitting`/`settled` are
never rebuilt; only a `failed` settle-up is retried (as a fresh request → fresh row → fresh envelope).

- **Check-before-insert dedup (in a SQLite transaction):** before creating a settle-up, query for an existing
  row `(group_id, from_user_id, to_user_id)` with `status IN ('pending','submitting')`. If found → return it
  (`409 SETTLEMENT_IN_PROGRESS`), build no tx. **`settled` is deliberately excluded** so a legitimate new
  settle-up for new debt between the same pair is not blocked (orchestrator correction to TRADEOFFS §2.4).
- **Row creation is the anchor:** only when no in-flight row exists, insert `status:'pending'` and proceed to §5.3.
- **Stellar-level backstop:** the same signed envelope (same sequence) is what a client re-poll relies on; Horizon
  de-dupes an already-included envelope at the protocol layer (RESEARCH §4.5).

### 5.6 Secret-at-rest — **AES-256-GCM (ruling #6 upheld + de-risked)**
**Decision: encrypt** (orchestrator overrode the Advisor's plaintext challenge — Kiel's production-grade ethos;
protects a committed/shared testnet DB file). De-risked against the demo-day landmine (R4):
```
key   = decode WALLET_ENCRYPTION_KEY (must be exactly 32 bytes; boot-validated — see below)
enc   : iv=randomBytes(12); c=createCipheriv('aes-256-gcm',key,iv); ct=c.update(secret)+final(); tag=c.getAuthTag()
store : "v1:" + iv.hex + ":" + tag.hex + ":" + ct.hex
dec   : split → createDecipheriv → setAuthTag(tag) → update+final → secret
```
De-risking (all four required):
- **(a) No dead gate:** the `ALLOW_PLAINTEXT_SECRETS` env var is **removed entirely** (was speculative/dead code).
- **(b) Hard-fail boot:** if `WALLET_ENCRYPTION_KEY` is missing or not exactly 32 bytes after decoding, the
  process exits non-zero with the explicit message: `FATAL: WALLET_ENCRYPTION_KEY must be 32 bytes (run: openssl rand -hex 32)`.
- **(c) Documented key-gen:** `.env.example` and `README.md` show `openssl rand -hex 32` to generate the key, and
  warn that changing it makes existing wallets unspendable (testnet → just re-provision).
- **(d) Explicit decrypt error:** a decrypt failure throws `AppError('WALLET_KEY_ERROR', 'wallet secret could not be decrypted — check WALLET_ENCRYPTION_KEY')` → **500 `WALLET_KEY_ERROR`**, never a raw crash.

### 5.7 Settlement → balance netting (**precise — ruling #8; required by R5**)
Balances returned by `#11`/`#8`/`#6`/`#4` are `calculateBalances(expenses, memberIds)` (raw, §8.5) **then** each
**`settled`** settlement is applied. For a settled settlement of debtor **D** → creditor **C** with fiat amount **X**:

```
D.owes[C]      -= X          // D owes C less
C.isOwed[D]    -= X          // C is owed less by D
D.netBalance   += X          // D's net moves up toward 0 (was negative)
C.netBalance   -= X          // C's net moves down toward 0 (was positive)
after all settlements: drop any owes/isOwed pair entry whose |amount| < 0.01 (epsilon)
```

A **full** settlement (X == the pair's outstanding debt) zeroes that pair: the `owes`/`isOwed` entries are
dropped and both nets return to 0 for that relationship. Only `settled` settlements net (never `pending`/
`submitting`/`failed`). Netting is a pure function in `domain/netting.ts` (`applySettlements(balances, settlements)`).

> **Required unit test (M5/M6):** *"expense creates a debt → settle the full amount → that balance pair == 0."*
> Concretely: 2 members, one $50 expense split equally (each owes $25), then a settled settlement D→C of $25 →
> `balances` for that pair has **no** `owes`/`isOwed` entry and both `netBalance == 0`. This is the highest-
> visibility demo bug (R5); it must be covered.

### 5.8 Reconciliation on read (`GET /settlements/:id`, ruling #4)
For a `submitting` settlement, **one-shot** poll `server.transactions().transaction(tx_hash)` (RESEARCH §3.6) —
not a background poller:
- success → `status='settled'`, `settled_at`, mark splits paid, write `payment_made` activity (once).
- 404 **and** the envelope timebound (`setTimeout` window) has expired → `status='failed'`, `failure_code='tx_too_late'`.
- 404 within the timebound → still `submitting` (not an error); client keeps polling.
Reconciliation is **idempotent** (guard on current status) so repeated polls don't double-apply side effects.

### 5.9 Error mapping (Horizon → API), from RESEARCH §4 — **no auto-retry (ruling #2)**
| Horizon signal | API status | `code` | Server action |
|---|---|---|---|
| reserve pre-check fail (pre-submit) | 422 | `INSUFFICIENT_XLM` | mark `failed`, return `{balance,required}` |
| `PAYMENT_UNDERFUNDED` / `op_underfunded` | 422 | `PAYMENT_UNDERFUNDED` | mark `failed` |
| `PAYMENT_NO_DESTINATION` | 422 | `DEST_NOT_FOUND` | mark `failed` |
| HTTP 504 / client timeout | **202** | — (`status:submitting`) | keep `submitting`; client polls #14 |
| any other `tx_failed` / `op_*` (incl. `tx_bad_seq`, `tx_insufficient_fee`) | 502 | `STELLAR_ERROR` | mark `failed`, `failure_code`=result code, echo `details.resultCodes`; **user re-taps** |
| Friendbot non-2xx | 502 | `FRIENDBOT_FAILED` | (register still 201 / fund endpoint 502) |

> **v2 removed the `tx_bad_seq` / `tx_insufficient_fee` rebuild-and-resign path.** We `loadAccount` fresh right
> before build, one wallet settles one debt at a time, testnet is uncongested — these effectively never fire; the
> recovery code was error-handling for errors that won't happen (TRADEOFFS §2.2). Any hard failure ends at
> `failed`; the client re-taps and the §5.5 dedup guard makes that safe.

### 5.10 Rate limiting (RESEARCH §6)
Testnet Horizon = 3600 req/hr/IP. Wrap Horizon calls with **one** backoff-retry on HTTP 429 (`Retry-After` or 1s).
No queue for demo scale. (This 429 backoff is distinct from — and not a reinstatement of — the removed tx-result
auto-retry.)

---

## 6. Config + environment variables

Loaded via `dotenv`, validated by zod in `config/env.ts` at boot (process exits non-zero on any invalid/missing
value). Secrets are **placeholders** in `.env.example`; real values never committed.

| Var | Purpose | Example / default |
|---|---|---|
| `NODE_ENV` | mode | `development` |
| `PORT` | HTTP port | `3000` |
| `HOST` | bind address | `0.0.0.0` (LAN access for Expo device) |
| `DATABASE_PATH` | SQLite file | `./data/splitpay.db` |
| `JWT_SECRET` | JWT signing key (≥ 32 chars; boot-validated) | `__set_me__` |
| `JWT_EXPIRES_IN` | token TTL | `7d` |
| `WALLET_ENCRYPTION_KEY` | AES-256-GCM key — **exactly 32 bytes**, hex (boot hard-fails otherwise). Generate: `openssl rand -hex 32` | `__set_me_openssl_rand_hex_32__` |
| `STELLAR_NETWORK` | network label (enforced) | `testnet` |
| `HORIZON_URL` | Horizon endpoint | `https://horizon-testnet.stellar.org` |
| `FRIENDBOT_URL` | Friendbot endpoint | `https://friendbot.stellar.org` |
| `STELLAR_NETWORK_PASSPHRASE` | passphrase (boot-asserted) | `Test SDF Network ; September 2015` |
| `STELLAR_TX_TIMEOUT_SECONDS` | tx `setTimeout` timebound | `30` |
| `HORIZON_TIMEOUT_MS` | Horizon HTTP client timeout (submit + reads); a 504/timeout here → 202 on submit (repurposed from v1's removed `SETTLEMENT_SYNC_TIMEOUT_MS`) | `30000` |
| `USER_BALANCE_FETCH_TIMEOUT_MS` | short timeout for the live-balance fetch in `GET /users/me` → `xlmBalance:null` on expiry | `2000` |
| `HORIZON_POLL_INTERVAL_MS` | reconcile-on-read poll pacing | `2000` |
| `LOG_LEVEL` | Pino level | `info` |
| `CORS_ORIGIN` | allowed origin(s) for Expo dev | `*` (dev) |

Boot fails (non-zero exit, explicit message) if: `JWT_SECRET` unset/short; `WALLET_ENCRYPTION_KEY` not exactly
32 bytes; or `STELLAR_NETWORK_PASSPHRASE !== "Test SDF Network ; September 2015"`.
> **v2:** `ALLOW_PLAINTEXT_SECRETS` (v1) is **deleted** — encryption is unconditional (§5.6).

---

## 7. Folder / module structure (implement exactly)

```
backend/
├── package.json
├── tsconfig.json                 # strict:true, target ES2022, module NodeNext
├── .env.example                  # every var from §6, placeholders only; includes `openssl rand -hex 32` note
├── .gitignore                    # node_modules, data/, .env
├── README.md                     # run instructions + key-gen step (Phase 4 writes)
├── data/                         # SQLite file lives here (gitignored)
└── src/
    ├── server.ts                 # loads+validates env, buildApp(), app.listen(PORT,HOST)
    ├── app.ts                    # buildApp(): Fastify instance, plugins, route registration, error handler
    ├── config/
    │   ├── env.ts                # zod-validated process.env → typed `env` (hard-fail on bad key/passphrase)
    │   └── constants.ts          # NETWORK_PASSPHRASE, DEMO_PEG=1, EXPENSE category ids, etc.
    ├── db/
    │   ├── index.ts              # better-sqlite3 connection + PRAGMAs (FK on, WAL)
    │   ├── schema.sql            # DDL for all §3 tables + indexes
    │   └── migrate.ts            # runs schema.sql idempotently on boot
    ├── plugins/
    │   ├── auth.ts               # @fastify/jwt; `authenticate` decorator (onRequest)
    │   ├── errorHandler.ts       # setErrorHandler → uniform {error:{code,message,details?}}
    │   └── requestLogging.ts     # Pino config + redaction paths
    ├── hooks/
    │   └── requireMember.ts      # preHandler: caller ∈ group_members(:id) else 403/404
    ├── modules/
    │   ├── auth/        { auth.routes.ts, auth.service.ts, auth.schemas.ts }
    │   ├── users/       { users.routes.ts, users.service.ts, users.schemas.ts }
    │   ├── groups/      { groups.routes.ts, groups.service.ts, groups.schemas.ts }
    │   ├── expenses/    { expenses.routes.ts, expenses.service.ts, expenses.schemas.ts }
    │   ├── balances/    { balances.routes.ts, balances.service.ts }   # #11 balances+suggestions
    │   ├── settlements/ { settlements.routes.ts, settlements.service.ts, settlements.schemas.ts }
    │   └── activity/    { activity.routes.ts, activity.service.ts }   # global #15 only
    ├── stellar/
    │   ├── client.ts             # Horizon.Server singleton + testnet boot assertion + client timeout
    │   ├── wallet.ts             # keypair gen, friendbot fund, live balance (with short timeout)
    │   ├── payment.ts            # build/sign/submit (plain await + catch→202) + reconcile (§5.3, §5.8)
    │   ├── conversion.ts         # toStellarAmount + CONVERSION_NOTE (§5.4)
    │   └── crypto.ts             # AES-256-GCM encrypt/decrypt + WALLET_KEY_ERROR (§5.6)
    ├── domain/
    │   ├── splitCalculator.ts    # PORTED + verified from ../src/utils (§8.5)
    │   ├── netting.ts            # applySettlements(balances, settlements) (§5.7) + its unit test
    │   └── types.ts              # shared TS types mirroring ../src/models/types.ts + Settlement
    └── utils/
        ├── errors.ts             # AppError class + ERROR_CODES map → HTTP status
        ├── logger.ts             # re-export app.log helpers; redaction constants
        └── id.ts                 # newId() = crypto.randomUUID()
```

**Layering rule:** `routes` (validate + auth) → `service` (business logic + DB tx + Stellar) → `stellar`/`db`.
Routes never touch SQLite or Stellar directly; services never parse HTTP. `domain/*` is pure (no I/O).

---

## 8. Non-functional requirements

### 8.1 Structured logging
- Fastify's built-in Pino, `LOG_LEVEL` from env. One line per request (`onResponse`): method, path, status, ms, `userId` if authed.
- **Redaction (mandatory).** Pino `redact` paths: `req.headers.authorization`, `req.body.password`; and never log
  `secret`, decrypted keypairs, `encrypted_secret`, or **signed XDR**. Stellar logs may contain only `publicKey`,
  `txHash`, `status`, result codes (RESEARCH §5). A `logSafe()` helper strips these before any manual log.

### 8.2 Request validation
Every route declares zod schemas for `params`/`query`/`body` via `fastify-type-provider-zod`. No handler receives
`any`. **Response-body zod schemas are optional** (nice-to-have for shape-drift safety) — keep them if they don't
slow M4/M5; request validation is non-negotiable (TRADEOFFS §2.5).

### 8.3 Uniform error format + code enum
All errors render as `{ "error": { "code", "message", "details"? } }`. `AppError(code, message, details?)` maps to
HTTP status via `ERROR_CODES`:

| code | HTTP | meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | bad params/query/body (`details` = zod issues) |
| `UNAUTHORIZED` | 401 | missing/invalid token or bad credentials |
| `FORBIDDEN` | 403 | not a member / not the debtor / not a settlement party |
| `NOT_FOUND` | 404 | resource missing |
| `EMAIL_TAKEN` | 409 | register email exists |
| `SETTLEMENT_IN_PROGRESS` | 409 | an in-flight (`pending\|submitting`) settlement for the same `(group,from,to)` exists |
| `MEMBERS_NOT_FOUND` | 422 | referenced email/user not a registered member |
| `WALLET_UNFUNDED` | 422 | debtor/creditor wallet not funded |
| `DEST_NOT_FOUND` | 422 | creditor account absent on-chain |
| `INSUFFICIENT_XLM` | 422 | reserve pre-check failed |
| `PAYMENT_UNDERFUNDED` | 422 | Horizon underfunded result |
| `FRIENDBOT_FAILED` | 502 | Friendbot unreachable |
| `STELLAR_ERROR` | 502 | other definite Horizon/tx failure (`details.resultCodes`) |
| `WALLET_KEY_ERROR` | 500 | wallet secret could not be decrypted (bad `WALLET_ENCRYPTION_KEY`) |
| `INTERNAL` | 500 | uncaught / unexpected |

The global handler maps Fastify's own validation errors → `VALIDATION_ERROR` and unknown throwables → `INTERNAL`
(log full, return generic message).

### 8.4 Security basics
- Passwords hashed with bcryptjs (cost 10); never returned. Login uses a single non-enumerating error.
- JWT bearer auth; `authenticate` hook on all protected routes.
- **Testnet enforced** at boot (§5.1). No mainnet path exists in code.
- Secrets: env-only; wallet secrets **encrypted at rest** with a boot-validated key (§5.6); redaction in logs (§8.1).
- CORS from `CORS_ORIGIN` (permissive in dev for Expo; tighten via env if needed).
- SQLite access is **parameterized** (`better-sqlite3` prepared statements) — no string-built SQL.

### 8.5 splitCalculator port + rounding verification (DECISIONS §3.5)
Port `calculateEqualSplit`, `calculateBalances`, `simplifyDebts` verbatim into `domain/splitCalculator.ts` (pure,
no I/O). **Document the known rounding behavior:** equal splits round each share to cents, so for amounts not
divisible by member count the shares sum to ≤ (n−1) cents **less** than the total (`100/3 → 33.33×3 = 99.99`).
Parity with the frontend is intentional (balances must match the client's mental model); the residual cent is
**not** redistributed. `simplifyDebts` uses a `< 0.01` settle epsilon — preserve it. The settlement-netting step
(§5.7) lives in `domain/netting.ts` and **must** ship with the "settle → 0" unit test. Any deviation → `DEVIATIONS.md`.

---

## 9. Ordered milestones (each ends in a runnable state)

| # | Milestone | Deliverable | Runnable proof |
|---|---|---|---|
| **M1** | **Scaffold** | `package.json`, `tsconfig`, `app.ts`/`server.ts`, `GET /health` | `npm run dev` → `curl /health` returns `{status:"ok",network:"testnet"}` |
| **M2** | **Config + data layer** | `config/env.ts` (boot validation: key length + testnet assert), `db/` (connection, `schema.sql`, `migrate` on boot), error handler, logging+redaction | boot creates `data/splitpay.db` with all §3 tables; a bad/short `WALLET_ENCRYPTION_KEY` exits non-zero with the §5.6 message |
| **M3** | **Auth + wallet** | register/login, `@fastify/jwt`, wallet provisioning (keypair→AES-GCM encrypt→Friendbot fund), `GET /users/me` (2s balance timeout), `POST /users/me/wallet/fund` | register → login → `GET /users/me` shows `publicKey` + live `xlmBalance`; fund retry works; `WALLET_KEY_ERROR` on a tampered key |
| **M4** | **Core CRUD + activity** | groups (create/list/detail + members), expenses (add/list, all 3 split methods), activity writes, `GET /activity`. **`GET /users/me/summary` only if time allows — first to drop** | create group → add expense → list; global activity feed populated |
| **M5** | **Balances + suggestions + netting** | ported `splitCalculator`, `domain/netting.ts`, merged `GET /groups/:id/balances` → `{ balances, suggestions }` (with `xlmAmount` + `conversionNote`) | balances + suggestions match hand-computed values; **"settle → 0" netting unit test passes** (§5.7) |
| **M6** | **Stellar settle-up** | `POST /groups/:id/settlements` (build→sign→submit plain-await, reserve pre-check, catch→202, in-flight dedup), `GET /settlements/:id` (one-shot reconcile), `GET /groups/:id/settlements`, live netting of settled settlements | end-to-end: two funded users → settle → `txHash` on testnet → `GET /groups/:id/balances` shows the pair at 0 → poll returns `settled` |
| **M7** | **Polish** | redaction audit (no secret/XDR in logs), error-format sweep, `.env.example` (+ `openssl rand -hex 32`), `README.md`, full typecheck | `tsc --noEmit` clean; grep logs show no secrets; README run steps verified on the demo machine (`npm ci`) |

M6 depends on M3 (funded wallets) + M5 (suggestions feed the settle params **and** netting proves the balance
zeroes). Everything before M6 is fully demoable without any Stellar network dependency — protects the "ship
partial-but-working" guardrail (and de-risks Horizon/Friendbot flakiness, R1/R2).

---

## 10. Future (parked — NOT in scope)

Recorded so they don't leak into the build (→ `FUTURE.md` if pursued):
- **Per-group activity feed** = `GET /activity` filtered by `group_id` (cut from v2 — no screen maps to it yet).
- Real fiat FX rates; multi-currency per group.
- Push/websocket settlement status (v2 uses one-shot poll-on-read).
- AsyncStorage/session refresh tokens; JWT revocation.
- Rate-limiter middleware beyond the 429 backoff.
- Wallet withdrawal/off-ramp; non-member email invitations with a pending state.
- Soroban / custom assets / trustlines (explicitly excluded by DECISIONS.md).
- Admin/audit endpoints; pagination cursors beyond simple `limit`.

---

## 11. Decision Log

Every `TRADEOFFS.md` change item, as adjudicated by the orchestrator. **A = Accepted, M = Modified, O = Overridden.**

| # | TRADEOFFS item | Ruling | What v2 does | One-line rationale |
|---|---|---|---|---|
| 1 | Cut the settle sync-timeout race | **A** | `POST /settlements` uses plain `await submitTransaction` under `HORIZON_TIMEOUT_MS`; `catch` 504/timeout → `submitting` → **202**. Lifecycle unchanged. `SETTLEMENT_SYNC_TIMEOUT_MS` repurposed → `HORIZON_TIMEOUT_MS` (§4.6, §5.3, §6). | Testnet closes in ~5s; the race was the fiddliest code guarding a rare event. |
| 2 | Delete the Stellar auto-retry | **A** | Removed `tx_bad_seq`/`tx_insufficient_fee` rebuild-and-resign; any `tx_failed`/`op_*` → `failed` + `502 STELLAR_ERROR`; user re-taps (§5.9). Reserve pre-check (#2) and reconcile-on-read (#14) **kept**. | Fresh `loadAccount` + one-debt-at-a-time + uncongested testnet ⇒ those codes don't fire. |
| 3 | Idempotency: drop header, fix guard | **A + orchestrator correction** | Removed `Idempotency-Key` header, `idempotency_key` column + unique index. Check-before-insert on `(group_id,from_user_id,to_user_id)` in **`pending`\|`submitting` ONLY (NOT `settled`)** → `409` (§3.7, §5.5). | Header is public-API infra a demo doesn't need; **excluding `settled` preserves repeat settlements for new debt** (correction to the Advisor's scope). |
| 4 | Reconsider encryption | **O (override — keep AES-GCM)** | Encryption stays, de-risked: deleted dead `ALLOW_PLAINTEXT_SECRETS`; hard-fail boot on bad-length key; documented `openssl rand -hex 32`; decrypt failure → explicit `500 WALLET_KEY_ERROR` (§5.6, §6). | Kiel's production-grade ethos + protects a committed/shared DB file; landmine (R4) mitigated by boot-validation + stable `.env`. (Kiel may later veto → plaintext, a trivial change.) |
| 5 | Merge #11 into #12 | **A** | One `GET /groups/:id/balances` → `{ balances, suggestions }`; standalone `settle-suggestions` dropped; inventory renumbered (§4.5). | Balances now live in 2 places, not 3; suggestions need the same compute. |
| 6 | Cut per-group activity | **A** | Removed `GET /groups/:id/activity`; kept global `GET /activity` (#15); per-group parked to Future (§10). | No screen maps to it — `ActivityScreen` uses the global feed. |
| 7 | Mark `/users/me/summary` deferrable | **A** | Kept #4 but flagged **lowest build priority (M4; first to drop)** (§4.2, §9 M4). | Preserves HomeScreen 1:1 coverage while honoring the Advisor's priority call. |
| 8 | Specify §5.7 netting precisely | **A** | Exact netting formula (D.owes−=X, C.isOwed−=X, D.net+=X, C.net−=X, drop <0.01) + full settlement zeroes the pair (§5.7); **required "settle → 0" unit test** in M5/M6. | R5 (a settled debt not zeroing on screen) is the highest-visibility demo bug. |

**Endpoint count:** 18 (v1) → **16** (v2): −1 merge (balances+suggestions) −1 cut (per-group activity).
**Encryption override (#4)** and **idempotency-scope correction (#3)** are both recorded above and applied in the spec.

---

_End ARCHITECTURE v2 (final) — Architect. Phases 3→2 revision complete; ready for Phase 4 (Developer)._
