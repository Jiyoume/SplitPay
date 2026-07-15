# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: **none** — backend tests are plain `node:assert/strict` + a hand-rolled `test(name, fn)` runner, executed directly by `tsx` (^4.19.0). No jest/vitest/node:test runner installed on either side.
- Commands (backend/, Node 22):

```bash
npm test                                    # ONLY netting.test.ts (3 tests) — verified passing 2026-07-15
npx tsx src/domain/splitCalculator.test.ts  # 13 tests — NOT in any npm script; verified passing 2026-07-15
npx tsx src/integration.test.ts             # 16-endpoint suite — NOT wired to a script; needs live
                                            # Stellar testnet + Friendbot; NOT isolated (see §4)
npm run typecheck                           # tsc --noEmit
```

- Root `npm test` (`"test": "jest"`) is **broken**: jest isn't installed, has no config, and there are zero frontend test files.

### 2) Test Layout

- Placement: co-located with source, `.test.ts` suffix — `backend/src/domain/netting.test.ts`, `backend/src/domain/splitCalculator.test.ts`, `backend/src/integration.test.ts`.
- No setup files, no config files — each test file is a self-contained executable script.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit (backend domain) | yes — 16 tests, all verified passing live | `netting.ts` (settle→0 invariant, pending doesn't net, partial reduces), `splitCalculator.ts` (incl. the documented 33.33×3=99.99 residual-cents behavior) | Pure logic, no I/O, deterministic |
| Integration (backend HTTP) | written but unverified/not runnable safely | All 16 endpoints via Fastify `app.inject` | Not in any script; hits real Friendbot/Horizon for wallet+settlement endpoints; settlement test self-describes as "may fail" and accepts 8 status codes |
| Frontend unit/component | **no — zero test files** | — | `jest` script is dead config |
| E2E | no | — | — |
| Manual API | yes | `postman/SplitPay.postman_collection.json` — 17 flat requests covering all 16 endpoints | Manual token copy-paste flow per `postman/README.md`; `baseUrl`+`token` collection vars only; no scripted chaining |

### 4) Mocking and Isolation Strategy

- Mocking: **none exists.** Stellar is not mocked anywhere; the integration suite talks to real testnet services.
- **Isolation bug in `integration.test.ts` (found by static read):** the file claims "Uses in-memory SQLite database" and builds a `:memory:` DB in `setupTestApp()` (`backend/src/integration.test.ts:52-71`) — but that DB is never used. `buildApp()` uses the module-level singleton from `backend/src/db/index.ts:9` (not injectable), so the suite **writes to the real `backend/data/splitpay.db`**. Its own comment admits this. Consequences: not repeatable (unique-email conflicts on re-run against leftover rows — the 807KB WAL on disk is evidence of prior runs), and unsafe for CI as-is. Fix path: make the DB injectable or point `DATABASE_PATH` at a temp file for tests.
- Unit tests need no isolation (pure functions).

### 5) Coverage and Quality Signals

- Coverage tool/threshold: none. CI: none (no `.github/`, no pipeline configs). Pre-commit hooks: none.
- Current verified state: backend unit 16/16 pass (3 via `npm test`, 13 via manual command); integration suite [TODO — not executed during this investigation: live-network dependency + non-isolation].
- **`backend/TEST_REPORT.md` accuracy warning:** it claims `npm test` runs both unit files for "16/16 PASS" — false as written; `backend/package.json:15` wires only `netting.test.ts`. The *results* claim holds (both files do pass when run), but the *command* documentation doesn't. Its §2 endpoint matrix is a code-review claim, not an executed-run record (its own §9 says integration needs testnet access or mocks). Treat the report's "READY TO SHIP" verdict accordingly.
- Known gaps (from `TEST_REPORT.md §8/§10`, unaddressed): Stellar mocks for integration tests, response-body schemas, concurrent-settlement load tests, Horizon chaos tests.

### 6) Evidence

- `backend/package.json:15`, `backend/src/domain/{netting,splitCalculator}.test.ts`, `backend/src/integration.test.ts`, `backend/src/db/index.ts`
- `backend/TEST_REPORT.md`, `postman/SplitPay.postman_collection.json`, `postman/README.md`
- Live runs (2026-07-15): `cd backend && npm test` → 3/3 pass; `npx tsx src/domain/splitCalculator.test.ts` → 13/13 pass
