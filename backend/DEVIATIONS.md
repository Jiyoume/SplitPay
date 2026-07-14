# SplitPay Backend — DEVIATIONS

> Every ambiguity encountered during implementation, and every deviation from ARCHITECTURE.md,
> logged here per the Developer playbook. If a line is missing a topic, it means no deviation was
> needed for that area — spec was followed exactly.

---

## 1. Node.js runtime version (environment risk, flagged in advance by the orchestrator)

**Issue:** ARCHITECTURE.md targets Node 20 LTS; the machine's default `node` is v26.4.0. Node 20
reached end-of-life and is **no longer available at all** via `nvm ls-remote` (fully removed from
the nvm remote index as of this session's date, 2026-07-14) — so "install exactly Node 20" is not
achievable on this machine, not even by version-pinning.

**Attempted:** `npm install` under the default Node v26.4.0 fails compiling `better-sqlite3` from
source (node-gyp/V8 API incompatibility — `v8::PropertyCallbackInfo<v8::Value>` has no member
`This()` in the V8 version bundled with Node 26; see raw error captured during the session).
No prebuilt binary exists for the Node 26 ABI for `better-sqlite3@11.10.0`.

**Resolution:** Used `nvm` (already present on the machine) to install **Node v22.23.1** (latest
Node 22 LTS, "Jod" — the closest available LTS to the spec's Node 20 target with a working
prebuilt `better-sqlite3` binary). Verified: `npm install` succeeds cleanly (prebuild-install
fetches a binary, no compile), and a native round-trip smoke test
(`require('better-sqlite3')(':memory:')`, create table, insert, select) works correctly.

**What this means for anyone running this project:** use Node 22 LTS (`nvm use 22` or
`nvm install 22`), not the machine's default Node 26, and not Node 20 (unobtainable). This is
documented in `backend/README.md`'s prerequisites. No source code changes were needed — this is
purely a runtime/tooling choice, `better-sqlite3` remains the SQLite driver as locked (no driver
swap, per the "do NOT switch away from better-sqlite3" guardrail).

**package.json `engines` field:** left as `"node": ">=20"` (unchanged) since the constraint is a
range, not literally requiring v20; Node 22 satisfies it. Noted in README instead of narrowing the
engines field, to avoid contradicting the spec's "Node 20 LTS" language while being honest that 20
itself is unobtainable.

---

## 2. `fastify-type-provider-zod` v2 API vs. code style

ARCHITECTURE.md's dependency table pins `fastify-type-provider-zod` but does not show exact usage
code. To keep route handlers simple and avoid fighting the type-provider's generic inference across
16 endpoints under time pressure, route schemas use **plain zod `.parse()` calls inside handlers**
(validate `request.body`/`request.params`/`request.query` explicitly, throw `AppError('VALIDATION_ERROR', ...)`
built from `ZodError.issues` on failure) rather than wiring the full `withTypeProvider<ZodTypeProvider>()`
compile-time inference through Fastify's route generics. The **behavioral contract is identical**
(zod is still the runtime validator for every param/query/body, `400 VALIDATION_ERROR` with zod
issues in `details` on failure, no `any` reaches business logic) — this is an implementation-style
simplification, not a spec deviation in behavior. `fastify-type-provider-zod` is still installed
per the dependency list (§2) but the explicit-parse style was chosen for reliability under a
16-endpoint build; flagged here for transparency rather than silently diverging from an implied
"use the type-provider's magic everywhere" reading.

---

## 3. `GET /users/me/summary` (#4) — build priority

Per ARCHITECTURE.md §4.2 and §9 (M4), this endpoint is explicitly the **first to drop** under time
pressure. It **was implemented** (time allowed) — see `src/modules/users/`. No deviation; noted
here only to record that the deferrable endpoint was in fact shipped.

---

## 4. `users.schemas.ts` omitted

§7's folder listing shows `modules/users/ { users.routes.ts, users.service.ts, users.schemas.ts }`.
The three `/users/me*` routes take no body and only `params`-free/`query`-free auth-only input, so
there is nothing for a schemas file to validate — it was omitted rather than committing an empty
placeholder file. All other modules that do take request bodies/params (`auth`, `groups`,
`expenses`, `settlements`) have their `*.schemas.ts` file per spec.

## 5. "mark splits paid" on settlement — exact scope underspecified

ARCHITECTURE §5.3 step 6 says on a settled settlement: "mark splits paid" but does not define
precisely *which* `expense_splits` rows. Balance correctness does **not** depend on `is_paid`
(balances are computed via `domain/netting.ts` against the `settlements` table, not via
`is_paid`), so this is cosmetic bookkeeping only. **Interpretation chosen:** on a settled
settlement debtor→creditor in a group, mark the debtor's currently-unpaid `expense_splits` rows
as paid, restricted to expenses in that group that were paid by the creditor (i.e. the specific
debt relationship being settled) — implemented in
`src/modules/settlements/settlements.service.ts` (`markSplitsPaidBestEffort`). A partial
settlement will still mark all matching splits paid (no partial-split logic), since the frontend
`Split.isPaid` boolean has no partial state. Flagged here since a stricter reading (e.g. only mark
splits up to the settled amount) was possible but out of scope given `is_paid` doesn't drive any
displayed balance.

## 6. No other ambiguities encountered

The spec (DECISIONS.md → RESEARCH.md → ARCHITECTURE.md v2) was unambiguous enough on every other
point (data model, endpoint shapes, error codes, Stellar flow, netting formula) that no further
interpretation calls were needed. Where the spec gave an exact snippet (e.g. RESEARCH.md §3,
ARCHITECTURE.md §5.3/§5.6), it was followed verbatim.
