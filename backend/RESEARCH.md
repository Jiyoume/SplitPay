# SplitPay Backend — Stellar Research (Phase 1)

> Scope: custodial, native-XLM, **testnet-only** settlement. No trustlines, no custom assets,
> no Soroban. Written for the Architect (Phase 2) — facts + snippets only, no architecture
> decisions. Every non-obvious claim is cited; version-dependent claims not directly confirmed
> in official docs are marked `[UNVERIFIED]`.

---

## 1. SDK + version + install

- **Package**: `@stellar/stellar-sdk`
- **Latest stable**: **v16.0.1** (published ~25 days before this research, i.e. mid-June 2026).
  Confirmed from two independent sources: the npm registry `dist-tags.latest` field, and the
  package's own GitHub README.
  Sources: [npm registry](https://registry.npmjs.org/@stellar/stellar-sdk),
  [stellar/js-stellar-sdk README](https://github.com/stellar/js-stellar-sdk)
- **Install**: `npm i @stellar/stellar-sdk`
- **Important v16 change**: `@stellar/stellar-base` (the lower-level XDR/tx-building lib) was
  **folded into `@stellar/stellar-sdk` as of v16.0.0** — everything is imported from the one
  package now, no separate `stellar-base` dependency needed.
  Source: [stellar/js-stellar-sdk README](https://github.com/stellar/js-stellar-sdk)

### Import style (current major version)

`Server` **moved to `Horizon.Server`** — the bare top-level `Server` export is the old
(pre-unification) pattern. Current official examples consistently use the namespaced form:

```typescript
import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Asset,
  Memo,
} from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
```

Source: search results citing current Stellar Docs examples, and
[stellar.github.io/js-stellar-sdk](https://stellar.github.io/js-stellar-sdk/) generated API docs.
`[UNVERIFIED]`: whether a bare `Server` export still exists in v16 as a deprecated alias — no
direct citation found either way. **Recommendation: always use `Horizon.Server`**, it's the form
every current doc page and example uses.

---

## 2. Testnet config

| Item | Value | Source |
|---|---|---|
| Horizon endpoint | `https://horizon-testnet.stellar.org` | [Stellar Docs — Networks](https://developers.stellar.org/docs/networks) |
| Network passphrase | `Test SDF Network ; September 2015` | [Stellar Docs — Network Passphrases](https://developers.stellar.org/docs/encyclopedia/network-passphrases) — **matches DECISIONS.md exactly** |
| SDK constant | `Networks.TESTNET` (equals the passphrase above) | standard SDK export |
| Friendbot endpoint | `https://friendbot.stellar.org` | [stellar/friendbot](https://github.com/stellar/friendbot) |

### Friendbot funding

The robust, version-independent way to fund a testnet account is a plain HTTP GET with the
public key as a query param — this is what the official docs' curl example uses and what every
tutorial falls back to:

```typescript
async function fundWithFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Friendbot funding failed: ${res.status} ${body}`);
  }
}
```

Example success response (curl form, GET or POST both accepted):
```json
{
  "hash": "ed9e96e136915103f5d8978cbb2036628e811f2c59c4c3d88534444cf504e360",
  "result": "received",
  "submission_result": "000000000000000a0000000000000001000000000000000000000000"
}
```
Source: [stellar/friendbot README](https://github.com/stellar/friendbot)

`[UNVERIFIED]`: docs for the newer Soroban-RPC-oriented tutorials show a convenience method
`server.requestAirdrop(publicKey)` on what appears to be the `rpc.Server` class (not
`Horizon.Server`) — this is for the RPC/Soroban path, not the classic Horizon path this project
uses. **Recommendation: use the direct HTTP GET above** — it's documented consistently across
every era of Stellar docs and doesn't depend on which server class you're using.

---

## 3. Operations (with snippets)

### 3.1 Generate a keypair

```typescript
import { Keypair } from "@stellar/stellar-sdk";

const kp = Keypair.random();
const publicKey = kp.publicKey(); // starts with "G" — safe to share
const secret = kp.secret();       // starts with "S" — NEVER log or expose
```
Source: pattern confirmed across [Stellar Docs](https://developers.stellar.org/docs/build/guides/transactions/create-account) and SDK examples.

### 3.2 Create + fund a testnet account (Friendbot)

```typescript
import { Keypair, Horizon } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const kp = Keypair.random();

await fundWithFriendbot(kp.publicKey()); // see §2 above

const account = await server.loadAccount(kp.publicKey()); // confirms it landed, gets sequence
```

### 3.3 Load account + build a native XLM payment transaction

```typescript
import {
  Horizon,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

async function buildPaymentTx(sourceSecretKeypair: Keypair, destinationPublicKey: string, amount: string) {
  const sourceAccount = await server.loadAccount(sourceSecretKeypair.publicKey());

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE, // "100" stroops = 0.00001 XLM, the network minimum
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: destinationPublicKey,
        asset: Asset.native(),
        amount: amount, // STRING, e.g. "10.5000000" — up to 7 decimal places
      }),
    )
    .setTimeout(30) // REQUIRED — see §6 gotchas; sets maxTime timebound
    .build();

  return tx;
}
```
Sources: [js-stellar-base building-transactions.md](https://github.com/stellar/js-stellar-base/blob/master/docs/reference/building-transactions.md) (verbatim pattern for `TransactionBuilder`/`Operation.payment`), [Stellar Docs — Networks](https://developers.stellar.org/docs/networks).

### 3.4 Sign + submit, read back tx hash

```typescript
tx.sign(sourceSecretKeypair); // Keypair.fromSecret(theStoredSecret)

const result = await server.submitTransaction(tx);
const txHash = result.hash;
```
Submission blocks until the transaction is either included in a ledger or Horizon gives up
(commonly after ~broadcast + a few ledger closes, ~5–30s) — it does **not** stream. This matches
the "we will POLL, not stream" requirement: `submitTransaction` itself is a single request/response,
and any longer-running status tracking after a timeout is done via polling (§3.6).

### 3.5 Check an account's XLM balance

```typescript
const account = await server.loadAccount(publicKey);
const native = account.balances.find((b) => b.asset_type === "native");
const xlmBalance = native?.balance; // string, e.g. "9999.9999900"
```

### 3.6 Poll a transaction's status by hash

There is no push/stream for this in the plan — poll `GET /transactions/:hash`. Horizon returns
**404 until the transaction lands in a ledger**, so a 404 is not necessarily failure — it can mean
"not yet included" (still pending) as well as "genuinely unknown/rejected".

```typescript
async function pollTransactionStatus(hash: string, timeoutMs = 30_000, intervalMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const tx = await server.transactions().transaction(hash).call();
      return { status: "confirmed" as const, tx };
    } catch (e: any) {
      if (e?.response?.status !== 404) throw e; // real error, not "not found yet"
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return { status: "timeout" as const };
}
```
Source: [Stellar Docs — Error Handling](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/error-handling) ("Polling the transaction hash will return a 404 until it gets included in the ledger").

---

## 4. Error taxonomy + handling

### 4.1 Transaction-level result codes (`extras.result_codes.transaction`)

| Code | Meaning |
|---|---|
| `tx_success` | Transaction succeeded. |
| `tx_failed` | One of the operations failed (none were applied — all-or-nothing). |
| `tx_too_early` | Ledger closeTime was before the tx's minTime. |
| `tx_too_late` | Ledger closeTime was after the tx's maxTime (i.e. it expired — this is what `setTimeout(30)` guards against/causes). |
| `tx_missing_operation` | No operation was specified. |
| `tx_bad_seq` | Sequence number does not match the source account's current sequence. |
| `tx_bad_auth` | Too few valid signatures, or submitted to the wrong network. |
| `tx_insufficient_balance` | Fee would bring the account below its minimum reserve. |
| `tx_no_source_account` | Source account not found (e.g. never funded). |
| `tx_insufficient_fee` | Fee offered is too small. |
| `tx_bad_auth_extra` | Unused/extra signatures attached. |
| `tx_internal_error` | Unknown Horizon-side error. |

Source: [Stellar Docs — Transaction Result Codes](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/result-codes/transactions)

### 4.2 Operation-level + payment-specific codes

General operation codes: `op_bad_auth`, `op_no_source_account`, `op_not_supported`,
`op_too_many_subentries`, `op_exceeded_work_limit`. `op_underfunded` also exists as a general
operation-level code (referenced in [stellar/js-stellar-sdk#431](https://github.com/stellar/js-stellar-sdk/issues/431)) meaning the operation would take the source below its funding requirement.

Source: [Stellar Docs — Operation Result Codes](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/result-codes/operations)

Payment-specific codes (what you'll actually see for `Operation.payment`):

| Code | Meaning |
|---|---|
| `PAYMENT_SUCCESS` | Payment completed. |
| `PAYMENT_MALFORMED` | Invalid input to the payment op. |
| `PAYMENT_UNDERFUNDED` | **Source doesn't have enough XLM to send the amount while keeping its own minimum reserve.** This is the practical equivalent of "op_underfunded" for our native-XLM payment flow. |
| `PAYMENT_NO_DESTINATION` | Destination account doesn't exist (unfunded / never Friendbot'd). |
| `PAYMENT_SRC_NO_TRUST` / `PAYMENT_NO_TRUST` / `PAYMENT_SRC_NOT_AUTHORIZED` / `PAYMENT_NOT_AUTHORIZED` / `PAYMENT_LINE_FULL` / `PAYMENT_NO_ISSUER` | All trustline/issued-asset related — **should never occur for native XLM**, since native XLM has no trustline. Good confirmation that the "native XLM, no trustlines" decision avoids this whole error class. |

Source: [Stellar Docs — Payment Result Codes](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/result-codes/operation-specific/payment)

### 4.3 HTTP-level errors

- **400** — malformed request or `tx_failed`/`op_*` failure; details in `extras.result_codes`.
- **404** — resource not found (account never funded; or a tx not yet in a ledger — see §3.6, not necessarily an error).
- **429** — rate limited (see §6).
- **504** — Horizon gave up waiting for the tx to be included **before a definitive result was known** — this does **not** mean the transaction failed; it may still land. Must poll to resolve.

Source: [Stellar Docs — Error Handling](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/error-handling), [Stellar Docs — Transaction Failed](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/http-status-codes/horizon-specific/transaction-failed)

### 4.4 Recommended handling per error

- **`tx_bad_seq`** — don't blindly resubmit. Call `server.loadAccount()` again to get the fresh
  sequence number, rebuild + re-sign a new transaction, and submit that. (A stale sequence means
  something else already consumed it, or your in-memory account object is out of date.)
- **`tx_insufficient_fee`** — the signed envelope's fee is baked in, so you can't resubmit the
  *same* envelope with a higher fee. Rebuild with a higher fee (bump `BASE_FEE`, or call
  `server.fetchBaseFee()` for the current network minimum) and re-sign.
- **`PAYMENT_UNDERFUNDED`** — a funds problem, not a transient one; retrying the identical tx will
  fail again. Surface to the caller / check balance before building the tx.
- **504 / timeout** — do **not** immediately resubmit. Poll `GET /transactions/:hash` first (§3.6);
  only resubmit the **identical** signed envelope if it's confirmed not found after the timebound
  expires. This is safe (see idempotency below) precisely because it's the same envelope.

Source: [Stellar Docs — Error Handling](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/error-handling) ("resubmitting is only safe when transactions remain unchanged — same operations, signatures, and sequence numbers").

### 4.5 Idempotency for settle-up (avoiding double-send)

Two layers of protection to be aware of:

1. **Stellar/Horizon layer**: submission is designed to be idempotent for the *identical signed
   envelope* — resubmitting a transaction already included in a ledger returns the same cached
   result rather than re-applying it, and a given source-account sequence number can only ever be
   consumed once. So safely retrying "did my last submit actually make it?" by resending the exact
   same signed XDR cannot cause a double payment.
   Source: [Stellar Docs — Submit a Transaction](https://developers.stellar.org/docs/data/apis/horizon/api-reference/submit-a-transaction) ("a client can submit a given transaction to Horizon more than once and Horizon will behave the same each time").
2. **App layer (not covered by #1)**: if the backend *builds a brand-new transaction* for a
   settle-up request it's already processed (e.g. user double-taps "Settle Up"), that's a **new**
   envelope with a **new** sequence number — Stellar has no way to know it's a semantic duplicate,
   and it **will** send twice. This must be de-duplicated in the app's own database (e.g. a unique
   constraint / status check on the `Payment` record before ever building a Stellar tx for it) —
   flagged as an open question for the Architect in §7.

---

## 5. Custodial key handling (testnet demo scope)

- Server holds each user's testnet secret key (`S...`) in **env/DB only**, per DECISIONS.md —
  never in source, never logged, never returned in an API response body.
- Practical flow: fetch the stored secret from DB → `Keypair.fromSecret(secret)` → use
  immediately to `.sign()` the built transaction → let the `Keypair` object go out of scope. Avoid
  holding decrypted secrets in any long-lived cache.
- Because `Keypair.secret()` / the raw secret string must never hit logs: be deliberate about what
  gets logged around the sign/submit call (e.g. log the public key and tx hash, not request/response
  bodies that might carry the secret or full signed XDR carelessly).
- This is testnet-only scope, so there is no mainnet key-custody advice here (per the Researcher
  brief) — but "testnet" doesn't mean "don't bother": these are still real secrets that control
  real (test) funds and could be used to grief a demo if leaked.
- **Encryption-at-rest for the secret column in SQLite is an open question for the Architect**
  (see §7) — plain env vars are fine for a couple of shared demo accounts, but if every user gets
  their own generated keypair stored in the DB, at-rest encryption is worth a line of justification
  either way.

---

## 6. Rate limits + SDK gotchas

- **Rate limit**: public Horizon testnet is limited to **3600 requests/hour per IP** (~1 req/sec
  average); exceeding it returns **429**. For a hackathon demo with a handful of concurrent
  settle-ups this is unlikely to bite, but a burst of parallel requests during a live demo/grading
  session could — worth a basic backoff-and-retry on 429.
  Source: [Stellar Docs — Rate Limiting](https://developers.stellar.org/docs/data/apis/horizon/api-reference/structure/rate-limiting)
- **`setTimeout` is required.** `TransactionBuilder` needs an explicit timebound — either
  `.setTimeout(N)` (seconds) or the transaction has no `maxTime` and is considered invalid for
  submission. Docs explicitly warn `TimeoutInfinite` should generally only be used for
  smart-contract flows, not regular payments — use a real timeout (the example above uses 30s).
  Source: [js-stellar-base TransactionBuilder docs](https://stellar.github.io/js-stellar-base/TransactionBuilder.html)
- **Amounts are strings**, not JS numbers/floats — e.g. `amount: "10.5000000"`. Native XLM
  supports up to **7 decimal places** (the underlying unit is the stroop, 1 XLM = 10,000,000
  stroops). The frontend's `Expense.amount: number` / `Payment.amount: number` will need
  string-formatting before being handed to `Operation.payment` — flagged for the Architect.
- **`BASE_FEE`** is the *network minimum* (currently 100 stroops = 0.00001 XLM), not a fee that's
  guaranteed to be sufficient under congestion. Testnet is rarely congested, but `server.fetchBaseFee()`
  exists if a more defensive minimum is wanted. `[UNVERIFIED]` exact current stroop value beyond
  "100" being the longstanding constant — verify against `BASE_FEE`'s actual runtime value if it matters for the demo.
- **Base reserve**: 1 base reserve = **0.5 XLM**; minimum account balance = `(2 + subentries) × 0.5 XLM`.
  A freshly Friendbot-funded account with zero subentries (no trustlines, no offers, no extra
  signers — which matches our native-XLM/no-trustline design) has a minimum reserve of **1 XLM**.
  This matters for `PAYMENT_UNDERFUNDED` checks: a debtor can't send an amount that would drop
  their balance below 1 XLM.
  Source: [Stellar Docs — Understanding Lumens](https://developers.stellar.org/docs/learn/fundamentals/lumens), [Stellar Docs — Accounts](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts)
- **Friendbot only funds testnet**, and only accounts that don't already exist / are underfunded
  in some setups — not relevant here since every user gets a freshly generated keypair.

---

## 7. Open questions for the Architect

1. **Fiat → XLM conversion**: `Expense`/`Payment` amounts are plain numbers in whatever
   `Expense.currency` says (e.g. USD, PHP). Stellar payments move **XLM**, not fiat. Is the demo
   using a 1:1 numeric peg (send "the same number" as XLM) or does the Architect want a (fake,
   labeled) conversion rate? This is a product decision, not a research one.
2. **Reserve headroom UX**: should the backend pre-check `debtor balance ≥ amount + 1 XLM reserve`
   before attempting a settle-up, and what's the failure UX given guardrails say Friendbot-only
   funding (no other top-up path)?
3. **App-level idempotency key**: per §4.5, Stellar protects against resubmitting the *same*
   envelope, but not against the backend building two *different* envelopes for the same logical
   settle-up. Should `Payment.id` (already in the frontend model) double as a DB-level dedupe key
   with a status check (`pending`/`settled`) before ever building a new Stellar tx?
4. **Sync vs async settle-up response**: `submitTransaction` blocks for roughly one ledger close
   (~5s) but can also 504 while the tx is still in flight. Does `POST /groups/:id/settlements`
   hold the HTTP request open until confirmed (simplest, matches "poll not stream" for the
   Stellar side), or return immediately with a `pending` status and let the frontend poll a
   status endpoint?
5. **Keypair provisioning timing**: generate + Friendbot-fund a Stellar keypair at
   `POST /auth/register` time, or lazily on first settle-up / first `GET /users/me`? Affects
   registration latency (Friendbot round-trip) vs. having every user wallet-ready immediately.
6. **Secret-at-rest**: plain column in SQLite vs. app-level encryption with a server-held key —
   worth a one-line justification either way in `ARCHITECTURE.md` given every registered user
   gets a real (if testnet) secret key stored server-side.

---

_Researcher (Phase 1) — sources cited inline throughout. All web research done via WebFetch/WebSearch
against developers.stellar.org, github.com/stellar/js-stellar-sdk, github.com/stellar/js-stellar-base,
and stellar.github.io/js-stellar-sdk. No architecture decisions made here — that's Phase 2._
