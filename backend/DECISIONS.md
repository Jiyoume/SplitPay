# SplitPay Backend — DECISIONS (source of truth)

> This file replaces the blank `[PROJECT_REQUIREMENTS]` / `[TECH_STACK]` in the agent-team
> prompt. **Every agent reads this FIRST, before its phase's own artifact.** It records the
> locked decisions, the requirements, the guardrails, and the existing frontend contract the
> backend must serve. Do not relitigate anything marked LOCKED.

_Last updated: 2026-07-14 · Orchestrator (this session)_

---

## 0. What SplitPay is (verified from the existing repo)

A Splitwise-style shared-expense app for APAC HACK 2026. **Frontend already exists** and is
**untouched by this work**: React Native + Expo SDK 51 + TypeScript + React Navigation, in
`../src`. Its data layer today is an **in-memory mock** (`src/services/storageService.ts` —
plain arrays that reset on reload). No auth, no persistence, no payment rail.

This project builds the **backend** that the frontend will eventually call, plus a **Stellar
testnet settlement layer** for "Settle Up". The app name says it: **Split** (existing app) +
**Pay** (this backend).

## 1. Direction — reconciliation outcome (LOCKED)

The README's "Next Steps" roadmap (`../README.md:78`) named "Firebase / Supabase / **custom
API**" + fiat multi-currency and **never mentioned crypto**. The agent-team prompt is entirely
about **Stellar**. That contradiction was surfaced to Kiel and resolved:

**HYBRID** — build the **custom API** the README calls for (auth, groups, expenses, balances,
activity) **and** layer **Stellar testnet XLM settlement** onto "Settle Up" as the
differentiator. This honors both documents. Firebase/Supabase were rejected (a managed BaaS
would make the whole custom-backend pipeline the wrong tool).

## 2. Locked technical decisions (do NOT relitigate)

| Decision | Choice | Rationale |
|---|---|---|
| Language/runtime | **Node.js 20 + TypeScript** | Shares types with the RN/TS frontend; matches the prompt's example stack |
| HTTP framework | **Fastify** | Boring, fast, first-class TS, schema validation built in |
| Persistence | **SQLite** | Free + local (Kiel's M4 Air, 16 GB); zero infra, no Docker, survives restarts |
| Stellar SDK | **`@stellar/stellar-sdk`** (latest stable — Researcher pins exact version) | Official JS SDK |
| Settlement asset | **Native XLM** | Simplest + most demo-reliable: Friendbot funds, single payment op, **no trustlines** |
| Network | **Testnet ONLY** | Passphrase `Test SDF Network ; September 2015`. **Never mainnet.** |
| Key custody | **Custodial** — server holds each user's testnet secret in **env/DB, never in code/logs** | Hackathon scope; keeps the settle flow one-click |
| Funding | **Friendbot only** | Testnet account creation + funding |

The Architect owns final framework/lib justification in `ARCHITECTURE.md`, but may not change
these without flagging Kiel.

## 3. PROJECT_REQUIREMENTS (the surface to build)

Derived from the existing frontend screens + models. Each maps to a real screen so the API is 1:1.

1. **Auth** — register + login (email-based, from the `User` model). Issue a session token (JWT).
2. **Users** — `me` profile; expose the user's **Stellar public key + live XLM balance**.
3. **Groups** — create / list / detail; members; `type` ∈ family|friends|roommates|trip|other.
4. **Expenses** — add / list per group; splits **equal | exact | percentage**; category; `paidBy`.
5. **Balances** — per-group who-owes-whom **+ simplified debts** (mirror `splitCalculator.ts` server-side; verify its rounding).
6. **Settle up via Stellar** — a settlement builds/signs/submits an **on-chain XLM payment**
   debtor→creditor on testnet; backend tracks tx status and marks the `Payment` settled on
   confirmation; stores the **tx hash**. Idempotent (no double-send).
7. **Activity feed** — record `expense_added | payment_made | group_created | member_added`.
8. **Transaction history** — expose Stellar tx hash + status for each settlement.

### Screen → endpoint seed (Architect finalizes the full spec)
| Screen | Needs |
|---|---|
| `HomeScreen` | `GET /users/me`, aggregate balances across groups |
| `GroupsScreen` | `GET /groups` |
| `CreateGroupScreen` | `POST /groups` |
| `GroupDetailScreen` | `GET /groups/:id`, expenses, balances |
| `AddExpenseScreen` | `POST /groups/:id/expenses` (equal/exact/percentage) |
| `SettleUpScreen` | settle suggestions (`simplifyDebts`) + `POST /groups/:id/settlements` (Stellar) |
| `ActivityScreen` | `GET /activity` (and/or per-group) |
| `ProfileScreen` | `GET /users/me` incl. wallet public key + XLM balance |

## 4. Existing frontend contract (backend must stay compatible)

The backend's response shapes should map cleanly onto these existing types in
`../src/models/types.ts` (backend may add fields like `stellarPublicKey`, `txHash`, `status`;
it must not rename existing ones the UI relies on):

`User{id,name,email,avatar?,phone?}` · `Group{id,name,description?,members:User[],createdBy,createdAt,type,totalExpenses}` ·
`Split{userId,amount,isPaid}` · `Expense{id,groupId,description,amount,currency,category,paidBy,splits,splitMethod,date,createdAt,receipt?,notes?}` ·
`Payment{id,groupId,fromUserId,toUserId,amount,date,note?,settled}` ·
`Balance{userId,owes[],isOwed[],netBalance}` · `Activity{id,type,groupId,userId,description,amount?,date}`

Reference server-side logic already written on the client (port + verify, don't reinvent):
`../src/utils/splitCalculator.ts` — `calculateEqualSplit`, `calculateBalances`, `simplifyDebts`.

## 5. Guardrails (non-negotiable, all agents)

- **Testnet only.** Never mainnet. Passphrase `Test SDF Network ; September 2015`.
- **No secret keys** hardcoded, generated for prod, logged, or printed. Secrets in env/DB only;
  `.env.example` shows placeholders.
- **Fund via Friendbot only.**
- **Additive only.** Everything lives under `backend/`. **Do NOT modify the existing RN
  frontend** (`../src`, `../App.tsx`, etc.). If the frontend must later point at the API, that
  is a separate change flagged to Kiel — not part of this build.
- **Ship partial-but-working over complete-but-broken.** 6 solid endpoints beat 15 broken ones.
- **No scope creep.** Anything outside §3 goes to `FUTURE.md`, not the codebase.
- **Input validation on every endpoint.** No `any`-typed request bodies reaching business logic.

## 6. Pipeline (strict order; no phase starts until the prior artifact exists)

| Phase | Agent | Model | Artifact(s) | Lives at |
|---|---|---|---|---|
| 1 | Researcher | sonnet | `RESEARCH.md` | `backend/` |
| 2 | Architect | opus | `ARCHITECTURE.md` (draft→final) | `backend/` |
| 3 | Advisor | opus | `TRADEOFFS.md` → Architect revises (≤2 rounds) | `backend/` |
| 4 | Developer | sonnet | codebase + `README.md` + `DEVIATIONS.md` | `backend/` |
| 5 | QA | haiku | tests + `TEST_REPORT.md` → Dev fixes (≤3 cycles) | `backend/` |

Research scope is **bounded to what §2 needs**: account create + Friendbot funding, native XLM
payment build/sign/submit, sequence numbers, fees, tx-status polling, and the Horizon error
taxonomy. **No trustlines / no custom assets / no Soroban** (we chose XLM).

## 7. Continuity

Any agent at ~80% budget stops cleanly and writes `backend/SESSION_STATE.md` (phase, completed
artifacts, in-flight stopping point, remaining tasks, decisions made, first action next session).
Next session reads it first and resumes — completed phases are never re-run.
