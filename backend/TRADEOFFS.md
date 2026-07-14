# SplitPay Backend — TRADEOFFS (Phase 3, Advisor)

> Independent critique of `ARCHITECTURE.md` v1. I did not write the spec. Lens: this is a
> **hackathon demo** — testnet, native XLM, SQLite, one process, built once, correctly, on a
> deadline. Default instinct is **CUT**. Every abstraction must pay rent in one sentence.
>
> _Advisor · 2026-07-14 · verdict at the bottom._

**Headline:** the architecture is fundamentally sound. Boring-correct stack, clean route→service→data
layering, computed (not stored) balances, testnet enforced at boot, secrets kept out of logs. The
problems are all **over-provisioned robustness on the Stellar path** and a few **screen-unmapped
endpoints** — subtractions, not redesigns. **CHANGES REQUIRED**, but light ones.

---

## 1. Decision analysis

| Decision | Options | Chosen | Why it wins | What it costs | What breaks if wrong |
|---|---|---|---|---|---|
| HTTP framework | Express, Fastify, Hono | **Fastify** | Boring, TS-first, hooks for auth/log, Pino w/ redaction built in | Slightly more ceremony than Express | Little — swappable |
| SQLite driver | better-sqlite3, node:sqlite, sql.js | **better-sqlite3 (sync)** | Sync API = simplest correct code for 1 process; no pool/await-per-query | **Native module** → build risk on demo machine | `npm i` fails on stage = whole demo down (see R3) |
| Password hash | bcrypt, bcryptjs, argon2 | **bcryptjs (pure JS)** | Keeps better-sqlite3 the *only* native dep → reliable install | ~marginally slower hash | Nothing — good call, affirm it |
| Validation | zod, ajv, typebox | **zod + type-provider** | One schema = validator + type; meets "validate every endpoint" | Response-schema typing is nice-to-have overhead | Nothing critical |
| Auth | sessions, JWT | **@fastify/jwt (HS256, 7d)** | Stateless, no session store, boring | No revocation (fine for demo) | Nothing for a demo |
| **Settle response (#4)** | pure-sync, sync+202, fire-and-poll | **sync + 202 + reconcile** | Handles the rare 504 without a worker | **Hand-rolled timeout *race* + 4-state machine + reconcile-on-read** | Race leaves a dangling submit promise; hardest code to get right, guards a rare event → **trim (see §2.2)** |
| **Secret at rest (#6)** | plaintext col, AES-GCM, KMS | **AES-256-GCM** | "We encrypt secrets" talking point; built-in crypto | New **critical-path failure mode**: wrong/missing key ⇒ *every* settle fails; security theater when the key sits in the same `.env` | Botched `WALLET_ENCRYPTION_KEY` on demo day = total settle failure → **challenge (see §2.3)** |
| Balances | stored, computed | **Computed** | No drift, always correct, trivial at demo volume | Recompute per read (cheap) | Nothing — correct, affirm it |
| Fiat→XLM (#1) | 1:1 peg, fake FX | **1:1 peg + conversionNote** | Simplest; `conversionNote` satisfies data-integrity (labels the fake) | None | Nothing — keep |
| Idempotency (#3) | none, row-guard, key-header, both | **Idempotency-Key header + row guard + envelope dedupe** | Belt-and-suspenders vs double-send | Extra column + unique index + header parsing; **and the row guard as written has a gap** | Guard keys on "the row it just created," which can't dedupe a *second* request → **fix + drop header (see §2.4)** |
| Endpoint surface | — | **18 (17 + health)** | 1:1 with screens + status/history | ~3 are screen-unmapped duplicates → surface & test cost | Timeline drag is modest; real long pole is M6, not read routes → **trim a few (see §2.1)** |

**Net:** 8 of 10 decisions are right and should not be touched (Fastify, better-sqlite3, bcryptjs,
zod, JWT, computed balances, 1:1 peg, reserve pre-check #2). The two that need work are the **settle
robustness (#4)** and **encryption (#6)**; idempotency (#3) needs a fix, not a rethink.

---

## 2. Simplicity audit — remove / merge / defer

### 2.1 Endpoint surface — 18 is lightly padded, not bloated
The count is not what threatens the timeline (M6/Stellar is). But three endpoints earn their delete
because they duplicate data a screen already gets elsewhere:

| Endpoint | Verdict | Leaner alternative |
|---|---|---|
| #11 `GET /groups/:id/balances` | **Merge** | #8 already embeds `balances`; #12 needs the same compute. Expose **one** `GET /groups/:id/balances` returning `{ balances, suggestions }` and drop the standalone. Balances now live in exactly 2 places (group-detail embed + this), not 3. |
| #15 `GET /groups/:id/activity` | **Cut** | No screen maps to it (ActivityScreen uses global #17). It's `#17 WHERE group_id=`; add later if a screen needs it. |
| #4 `GET /users/me/summary` | **Defer** | HomeScreen totals = sum of per-group `balance` already returned by #6, plus recent items from #17. Compute client-side. Keep only if M4 finishes early; it's the first thing to drop under time pressure. |

Keep #14 (`GET /groups/:id/settlements`) — it *is* the "transaction history" of requirement §3.8 and
a natural judge-facing screen. Keep #5 (`wallet/fund`) — cheap insurance against Friendbot flakiness
(R1). Keep #16 — needed for the 202 poll.

### 2.2 The settle path is over-built — this is the single most important cut
`POST /groups/:id/settlements` + §5.8 carry robustness for events that essentially cannot occur in a
testnet demo. Trim, don't redesign:

- **Cut the `SETTLEMENT_SYNC_TIMEOUT_MS` race.** Racing `submitTransaction` against an 8s timer is
  the fiddliest code in the spec (the losing promise dangles) and testnet closes ledgers in ~5s, so
  submit almost always resolves first. Just `await submitTransaction` with a generous HTTP timeout;
  in a **catch** for 504/timeout, mark `submitting` → return **202**. Same 202 UX, none of the
  concurrency. Optionally collapse `pending`+`submitting` into one non-terminal state.
- **Cut the `tx_bad_seq` / `tx_insufficient_fee` auto-retry (§5.8).** You `loadAccount` fresh right
  before build, one wallet settles one debt at a time, and testnet is uncongested — neither fires.
  Writing rebuild-and-resign for them is error recovery for errors that won't happen. Map any
  `tx_failed`/`op_*` → `failed` + `502`; the user re-taps (row guard makes that safe).
- **Keep** reconcile-on-read in #16 — it is a *one-shot* Horizon check on read, not a background
  poller, so it's already the lean version. Keep the reserve pre-check (#2): cheap, and turns a
  cryptic `PAYMENT_UNDERFUNDED` into a clean `422 INSUFFICIENT_XLM`.

### 2.3 AES-GCM secret encryption — challenge ruling #6
On testnet the "secrets" control **disposable** Friendbot funds (worth $0), and the encryption key
lives in the **same `.env`** as everything else — so encryption-at-rest protects against a
DB-leak-without-key-leak scenario that doesn't exist for a single local SQLite file. What it *does*
add is a **new critical-path failure mode**: a wrong/missing/rotated `WALLET_ENCRYPTION_KEY` makes
every wallet unspendable and every settle fail — on stage. 40 lines of code isn't the cost; the
demo-day landmine is.

- **Recommended:** documented plaintext `secret` column with a one-line comment ("testnet-only,
  disposable keys, never mainnet"). Removes the landmine and the key-management surface.
- **If kept for the security talking point:** (a) **delete `ALLOW_PLAINTEXT_SECRETS`** — it "exists
  but is unused," i.e. dead code / speculative generality, cut it regardless; (b) hard-fail boot with
  an explicit message on a bad-length key; (c) accept R4.

### 2.4 Idempotency — drop the header, fix the guard (refine ruling #3)
The `Idempotency-Key` header + `UNIQUE(idempotency_key)` column is public-API infra a demo settle
button doesn't need. And the row guard as written — "check by the row it just created" — can't
dedupe a **second** request, because each request inserts its own fresh row before checking. Leaner
**and** more correct:

- Drop the header, the column, and its index.
- **Before insert**, query for an existing settlement with the same `(group_id, from_user_id,
  to_user_id)` in status `pending|submitting|settled`. If found → return it (`409
  SETTLEMENT_IN_PROGRESS` / `200`). Only if none → insert `pending` and proceed. Envelope-level
  Stellar dedupe (RESEARCH §4.5) stays as the backstop.

### 2.5 Minor trims (do if convenient, not blocking)
- `GET /users/me` fetches **live** XLM balance from Horizon on every call — that couples your
  most-used read to Horizon latency. The spec degrades on Horizon *error* but a *slow* Horizon still
  hangs it. Add a short (≈2s) timeout on that balance fetch → fall back to `xlmBalance: null`.
- `settlements.source_public_key` / `dest_public_key` duplicate `wallets.public_key`. Defensible as
  an immutable tx record; drop-and-join if you want the table leaner. Low priority.
- Response-body zod schemas are nice-to-have, not required — keep request validation, treat response
  schemas as optional if they slow M4/M5.

---

## 3. Risk register (top 5)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Friendbot/Horizon flaky on demo day** — testnet infra has intermittent downtime/latency | Med | High | **Pre-provision + pre-fund** the demo accounts *before* presenting (don't rely on live register-time funding on stage); keep #5 fund-retry; record a backup video of a good settle |
| R2 | **Live settle 504s mid-demo** — looks like a failure while the tx may still land | Med | Med | Keep the 202→reconcile path (as exception-map, §2.2); pre-warm one successful settle; show `explorerUrl` on stellar.expert even while the app polls |
| R3 | **better-sqlite3 native build fails** on the demo machine (Node version mismatch) | Low–Med | High | Pin Node 20, commit lockfile, run `npm ci` + boot on the *actual* demo machine ahead of time; bcryptjs already keeps it the only native dep |
| R4 | **`WALLET_ENCRYPTION_KEY` misconfigured ⇒ ALL settles fail** — self-inflicted by ruling #6 | Med (if kept) | High | Cut encryption (§2.3), *or* hard boot-validation + a tested `.env`. Strongest argument for the plaintext cut. |
| R5 | **Settlement→balance netting bug** — a settled settlement that doesn't zero the on-screen debt is the most visible demo failure | Med | Med | Nail down *exactly* how a settled settlement reduces balances (which `owes`/`isOwed` pair, or net) — §5.7 is under-specified; add an explicit "settle → balance goes to 0" unit test in M5/M6 |

---

## 4. Final verdict

### CHANGES REQUIRED

The spec is buildable and mostly right — the changes are all cuts. Numbered, actionable:

1. **Cut the sync-timeout race in `POST /settlements`.** Replace the `SETTLEMENT_SYNC_TIMEOUT_MS`
   race with `await submitTransaction` + a catch that maps 504/timeout → `submitting` → **202**.
   *(Most important cut.)*
2. **Delete the `tx_bad_seq` / `tx_insufficient_fee` auto-retry in §5.8.** Map any `tx_failed`/`op_*`
   → `failed` + `502`; the user re-taps.
3. **Fix idempotency and drop the header (ruling #3 refined).** Remove `Idempotency-Key` +
   `idempotency_key` column/index. Before insert, dedupe on existing non-terminal-or-settled
   `(group_id, from_user_id, to_user_id)`; only then insert + submit.
4. **Reconsider encryption (challenging ruling #6).** Prefer a documented plaintext `secret` column
   for a testnet demo. If AES-GCM is kept, **delete `ALLOW_PLAINTEXT_SECRETS`** (dead code) and
   hard-fail boot on a bad key.
5. **Merge #11 into #12** → one `GET /groups/:id/balances` returning `{ balances, suggestions }`.
6. **Cut #15** (per-group activity — no screen maps to it; #17 covers ActivityScreen).
7. **Mark #4 `/users/me/summary` deferrable** — compute HomeScreen totals client-side from #6 + #17;
   drop first if M4 runs long.
8. **Specify the settlement→balance netting precisely in §5.7** and require a "settle → 0" unit test
   (highest-visibility demo bug, R5).

Minor / optional: short timeout on the live-balance fetch in `GET /users/me` (§2.5).

### Rulings challenged
- **#6 (encrypt secret at rest):** challenged — recommend documented plaintext for a testnet demo;
  at minimum delete the unused plaintext gate. This is my one outright challenge.
- **#3 (idempotency)** and **#4 (sync+202)**: rulings stand; I'm trimming the *implementation*
  (drop the header; drop the timer race + never-fires retries), not the decisions.
- #1, #2, #5: agree, keep as-is.

_End TRADEOFFS — Advisor (Phase 3). Architect revises ARCHITECTURE.md; I do not._
