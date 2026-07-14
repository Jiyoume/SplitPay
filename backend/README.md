# SplitPay Backend

A custom Fastify + SQLite API for the SplitPay app (auth, groups, expenses, balances, activity),
with a **Stellar testnet** settlement layer for "Settle Up" — settling a debt builds, signs, and
submits a real (test) native-XLM payment debtor → creditor on Stellar testnet.

Read `ARCHITECTURE.md` for the full spec this implements, and `DEVIATIONS.md` for every
ambiguity/deviation logged during the build (including the required Node version note below).

---

## Prerequisites

- **Node.js 22 LTS** ("Jod"). **Not** the machine-default Node version, and **not** Node 20 —
  see the note below.
- npm (bundled with Node).
- Internet access to `horizon-testnet.stellar.org` and `friendbot.stellar.org` (only needed for
  the Stellar settle-up flow — everything else is fully local/offline).

### Why Node 22, not Node 20?

`ARCHITECTURE.md` targets Node 20 LTS, matching this project's only native dependency
(`better-sqlite3`, pinned per §2). At build time, Node 20 had reached end-of-life and was no
longer installable via `nvm` at all. The machine's default Node (v26) fails to compile
`better-sqlite3` from source (no prebuilt binary exists yet for that Node ABI, and the source
build fails against that V8 version). **Node 22 LTS is the closest available LTS with a working
prebuilt `better-sqlite3` binary** — verified working during this build. See `DEVIATIONS.md §1`
for the full detail.

If you use `nvm`:

```bash
nvm install 22
nvm use 22
```

---

## Setup

```bash
cd backend
npm install
```

If `npm install` tries to compile `better-sqlite3` from source (instead of downloading a
prebuilt binary) and fails, you are very likely on the wrong Node version — switch to Node 22
and retry.

### Environment variables

```bash
cp .env.example .env
```

Then fill in the two secrets `.env.example` calls out (**never commit `.env`** — it's
gitignored):

```bash
# JWT signing key (>= 32 chars)
openssl rand -hex 32   # paste into JWT_SECRET

# AES-256-GCM key that encrypts custodial Stellar secret keys at rest — MUST be
# exactly 32 bytes (64 hex chars). The server hard-fails at boot otherwise.
openssl rand -hex 32   # paste into WALLET_ENCRYPTION_KEY
```

> **Warning:** changing `WALLET_ENCRYPTION_KEY` after users have registered makes their existing
> wallet secrets permanently undecryptable (the server will 500 `WALLET_KEY_ERROR` on any settle
> attempt for that user). On testnet the only fix is to re-register (fresh wallets) — there is no
> recovery path for the old key. Keep the same `.env` for the life of a demo/dataset.

All other variables in `.env.example` already have sane testnet defaults (Horizon URL, Friendbot
URL, the exact testnet network passphrase, timeouts) — you normally don't need to change them.
**Testnet only.** The server asserts the network passphrase at boot and refuses to start on a
mismatch (never mainnet).

---

## Run

```bash
npm run dev        # tsx watch — auto-restarts on file changes
```

or, for a production-style run:

```bash
npm run build       # tsc -> dist/
npm start            # node dist/server.js
```

On boot, the server:
1. Validates `.env` (zod) — exits non-zero with an explicit message if `JWT_SECRET` is too
   short, `WALLET_ENCRYPTION_KEY` isn't exactly 32 bytes, or the Stellar passphrase isn't the
   exact testnet string.
2. Applies `src/db/schema.sql` idempotently, creating `data/splitpay.db` (gitignored) if it
   doesn't exist yet.
3. Starts listening on `HOST:PORT` (default `0.0.0.0:3000`).

```
{"level":30,...,"msg":"Server listening at http://0.0.0.0:3000"}
```

### Unit tests

```bash
npm test
```

Runs `src/domain/netting.test.ts` — the required "settle → 0" netting test (a settled debt fully
zeroes that balance pair) plus two supporting cases (pending settlements don't net; partial
settlements reduce but don't zero).

### Typecheck

```bash
npm run typecheck
```

---

## Exercising the API

All 16 endpoints are documented in `ARCHITECTURE.md §4`. Quick smoke test with `curl`:

```bash
# Health (no auth)
curl http://localhost:3000/health

# Register (provisions + Friendbot-funds a custodial Stellar wallet)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"hunter2xx"}'
# -> { user, wallet: { publicKey, fundingStatus }, token }

TOKEN="<paste token from above>"

# Profile + live XLM balance
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/users/me

# Create a group (memberEmails must be already-registered users)
curl -X POST http://localhost:3000/groups \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Apartment 4B","type":"roommates","memberEmails":["bob@example.com"]}'

# Add an equal-split expense
curl -X POST http://localhost:3000/groups/<groupId>/expenses \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"description":"Dinner","amount":50,"category":"food","splitMethod":"equal"}'

# Balances + settle-up suggestions
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/groups/<groupId>/balances

# Settle up (the debtor calls this with their own token — signs with their custodial key)
curl -X POST http://localhost:3000/groups/<groupId>/settlements \
  -H "Authorization: Bearer <debtor's token>" -H "Content-Type: application/json" \
  -d '{"fromUserId":"<debtorId>","toUserId":"<creditorId>","amount":25}'
# -> 201 { settlement: { status:"settled", txHash, explorerUrl, ... } } on success,
#    or 202 { settlement: { status:"submitting", ... } } if Horizon timed out (poll below).

# Poll a settlement (reconciles once against Horizon if still "submitting")
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/settlements/<settlementId>
```

Every error response is `{ "error": { "code", "message", "details"? } }` with an appropriate 4xx/5xx
status — see `ARCHITECTURE.md §8.3` for the full code table.

---

## Project layout

Matches `ARCHITECTURE.md §7` exactly:

```
src/
├── server.ts / app.ts        # boot + Fastify instance + route registration
├── config/                   # env.ts (boot validation), constants.ts
├── db/                       # better-sqlite3 connection, schema.sql, migrate.ts
├── plugins/                  # auth (JWT), errorHandler, requestLogging
├── hooks/                    # requireMember (group membership guard)
├── modules/                  # auth, users, groups, expenses, balances, settlements, activity
├── stellar/                  # client, wallet, payment, conversion, crypto (AES-256-GCM)
├── domain/                   # splitCalculator (ported), netting (+ required unit test), types
└── utils/                    # errors (AppError), logger (redaction), id
```

## Security notes

- Wallet secrets are AES-256-GCM encrypted at rest (`stellar/crypto.ts`); the raw secret only
  ever exists in memory for the duration of a single `.sign()` call.
- Passwords are bcrypt-hashed (cost 10); never returned in any response.
- Logs never contain `secret`, `encrypted_secret`, decrypted keypairs, or signed XDR (see
  `utils/logger.ts` redaction paths and `DEVIATIONS.md` for the audit method used).
- `.env` is gitignored; `.env.example` has placeholders only.

## Known limitations (see `DEVIATIONS.md` for the full list)

- Node 20 is unobtainable at build time; Node 22 LTS is the documented, tested runtime.
- `GET /users/me/summary` (#4) was shipped despite being marked deferrable in the spec.
- "mark splits paid" on a settled settlement is best-effort bookkeeping (does not affect any
  displayed balance, which is always computed via `domain/netting.ts`).
