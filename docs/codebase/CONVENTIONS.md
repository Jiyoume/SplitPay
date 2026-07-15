# Coding Conventions

> Nothing here is tool-enforced — there is **no ESLint/Prettier config anywhere in the repo**
> (verified by find at root and `backend/`). Everything below is de-facto convention observed
> consistently in the source. Frontend and backend differ on several points; both are listed.

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Frontend files | PascalCase components/screens; camelCase services/utils/constants | `GroupDetailScreen.tsx`, `apiService.ts` | `src/screens/`, `src/services/` |
| Backend files | camelCase, role-suffixed, colocated per module | `groups.routes.ts` / `groups.schemas.ts` / `groups.service.ts` | `backend/src/modules/groups/` |
| Functions/vars | camelCase both sides | `calculateEqualSplit`, `requireMember` | `backend/src/domain/splitCalculator.ts` |
| Types/interfaces | PascalCase; backend derives types from zod (`z.infer`) where a schema exists | `GroupRow`, `RootStackParamList` | `backend/src/modules/groups/groups.service.ts:8-21` |
| DB columns | snake_case | `password_hash`, `from_user_id` | `backend/src/db/schema.sql:7,68-69` |
| API JSON fields | camelCase; snake→camel mapping done **manually inline per service function** (no shared mapper) | `createdBy`, `txHash` | `groups.service.ts:70-82,145-156` |
| Constants/env vars | SCREAMING_SNAKE env; PascalCase const objects (`Colors`) | `WALLET_ENCRYPTION_KEY`, `Colors.primary` | `backend/src/config/env.ts`, `src/constants/colors.ts` |

### 2) Formatting and Linting

- Formatter/Linter: **none configured or installed.** Root `package.json:11` declares `lint: eslint . --ext .ts,.tsx` but eslint is in no dependency list and `npx --no-install eslint` fails; the four `// eslint-disable-next-line no-console` comments in `backend/src/config/env.ts` are vestigial.
- De-facto style (consistent in every file sampled): 2-space indent, semicolons, trailing commas in multi-line literals.
- **Quote style diverges by side:** frontend single quotes; backend double quotes. Unwritten convention — match the side you're editing.
- TypeScript strictness is the real enforcement: `strict: true` on both sides (`tsconfig.json:4`, `backend/tsconfig.json`); backend also compiles with NodeNext and `npm run typecheck`.

### 3) Import and Module Conventions

- Relative imports only, both sides. The `@/*` alias in root `tsconfig.json:6-10` is dead (zero uses; not wired into Babel so it wouldn't resolve anyway).
- Backend: ESM with explicit `.js` extensions (`from "./types.js"`, `backend/src/domain/netting.ts:14`); uses `import type` for type-only imports fairly consistently. Frontend: plain value imports, no `import type`.
- Barrels: frontend only (`src/services/index.ts` — deliberately excludes the dead `storageService`; `src/components/index.ts`). Backend imports by direct path.

### 4) Error and Logging Conventions

- Frontend: every async handler follows `try { … } catch (error: any) { Alert.alert('Error', error.message ?? fallback) }`; all transport failures normalize to one `ApiError {code,status,details}` class (`src/services/apiClient.ts:36-48,96-115`). Screens that need richer UX switch on `ApiError.code` (`SettleUpScreen.tsx:102-117`, `CreateGroupScreen.tsx:75-83`). No React error boundaries.
- Backend: throw `AppError(code, message, details?)` (14-code union, `backend/src/utils/errors.ts`); the single `setErrorHandler` renders AppError/ZodError/Fastify-validation/unknown into `{error:{code,message,details?}}` and never leaks internals on 500 (`backend/src/plugins/errorHandler.ts:11-64`).
- Logging: Pino via Fastify; one `onResponse` line per request (method, path, status, ms, userId). Redaction: Pino `redact.paths` (authorization header, `req.body.password`) + `logSafe()` deep-stripper for secrets/XDR (`backend/src/utils/logger.ts:28-44`) — note `logSafe` currently has no call sites. Login failure message is identical for unknown-email and wrong-password (non-enumerating, `backend/src/modules/auth/auth.service.ts:67-79`).

### 5) Testing Conventions

- Test file location: co-located with source, `.test.ts` suffix (`backend/src/domain/netting.test.ts`). No test framework — `node:assert/strict` + a hand-rolled `test()` runner executed by `tsx` (see TESTING.md).
- Mocking norm: none established; the only Stellar-touching suite hits real testnet services.
- Coverage expectation: none configured. Frontend has zero tests.

### 6) Evidence

- `src/services/{apiClient,apiService,index}.ts`, `src/screens/{GroupDetailScreen,SettleUpScreen,CreateGroupScreen}.tsx`, `src/constants/colors.ts`
- `backend/src/modules/groups/*`, `backend/src/utils/{errors,logger}.ts`, `backend/src/plugins/errorHandler.ts`, `backend/src/config/env.ts`
- Verified-absent configs: no `.eslintrc*` / `eslint.config.*` / `.prettierrc*` anywhere

## Extended: side-by-side differences to respect

| Topic | Frontend | Backend |
|---|---|---|
| Quotes | single | double |
| `any` usage | 27 hits (mostly `catch (error: any)`, two `useNavigation<any>()`) | **zero** `any` |
| Runtime validation | none (trusts API shapes) | zod on every body/param via inline `.parse()` (`fastify-type-provider-zod` installed but unused — `backend/DEVIATIONS.md` #2) |
| Comments | sparse inline | heavy spec-citing header blocks (`ARCHITECTURE.md §X`, `ruling #N`) — keep citing the spec when editing backend files |
| Styling | `StyleSheet.create` at file bottom; `Colors` tokens (minor drift: shadow hexes hardcode `#1A2320` = `Colors.black`) | n/a |
| Shared types | `src/models/types.ts` (Date objects) | `backend/src/domain/types.ts` mirrors it with ISO-string dates — **copy-maintained on purpose**; update both when shapes change |
