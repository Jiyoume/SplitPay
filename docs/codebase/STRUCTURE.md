# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `App.tsx`, `index.js` | Frontend entry (provider stack + `registerRootComponent`) | `index.js:7`, `App.tsx:10-23` |
| `src/` | React Native app source (screens, navigation, services, contexts, models, constants, components, utils) | tree below |
| `backend/` | Fastify + SQLite + Stellar API — fully separate package | `backend/package.json` |
| `backend/data/` | SQLite database files (gitignored, created at boot) | `backend/.gitignore:2` |
| `ios/` | Native iOS project (CocoaPods; `ios/Pods/` is vendored output — never treat as source) | `ios/Podfile` |
| `assets/` | App icons/splash referenced by `app.json` | `app.json` |
| `docs/codebase/` | This documentation set | — |
| `postman/` | Postman collection + README for manual API testing — **gitignored, local-only** | `.gitignore:14` |
| `.claude/agents/` | 5 agent definitions (`sp-researcher/architect/advisor/developer/qa`) — the pipeline that built `backend/`; untracked | git log `f837ccb` |
| `dist/` | Expo web export — gitignored **but 24 files are still tracked in git** (added before the ignore rule; see CONCERNS.md H3) | `.gitignore:3`; `git ls-files \| grep '^dist/'` → 24 |
| `backend/{ARCHITECTURE,DEVIATIONS,RESEARCH,TRADEOFFS,TEST_REPORT}.md` | Backend design/build/QA docs — exist on disk, **deliberately(?) gitignored** via root `.gitignore:12-16`; only `backend/README.md` + `backend/DECISIONS.md` are committable | `.gitignore:12-16` |

### 2) Entry Points

- Frontend: `index.js` → `registerRootComponent(App)`; `App.tsx` composes `GestureHandlerRootView > SafeAreaProvider > AuthProvider > NavigationContainer > RootNavigator` (`App.tsx:10-23`). `RootNavigator` switches Login/Register stack vs. main app on `useAuth().isAuthenticated` (`src/navigation/RootNavigator.tsx:30,75-118`).
- Backend: `backend/src/server.ts:1-14` → `buildApp()` (`backend/src/app.ts:17-52`: migrate → Fastify+Pino → CORS hook → errorHandler → requestLogging → JWT auth → `/health` → 7 route modules) → `app.listen(env.PORT, env.HOST)`.
- Entry selection: `package.json` `main: "expo/AppEntry.js"` + Expo scripts (frontend); `npm run dev`/`start` (backend).

### 3) Module Boundaries

Frontend (`src/`):

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `screens/` (10 files) | Screen components: local UI state, calls into `services/`, navigation | Direct `fetch`; business math (now server-side) |
| `navigation/` | `RootNavigator` (stack + auth gate + param lists), `TabNavigator` (4 tabs) | Data fetching |
| `contexts/` | `AuthContext` — the only context: `user`, `wallet`, `isLoading`, login/register/logout/refreshUser | Non-auth state (none exists; all other data is fetch-on-focus) |
| `services/` | `apiClient` (fetch wrapper, token in AsyncStorage, `ApiError`), `authService`, `apiService` (all endpoints + 8s TTL cache w/ invalidation), barrel `index.ts` | — (`storageService.ts` is the dead pre-backend mock; not in the barrel, zero importers) |
| `models/` | `types.ts` — the original domain interfaces (Date-based) | Wire shapes (those live as parallel interfaces inside `apiService.ts` — see CONCERNS) |
| `constants/` | `Colors` palette, APP_NAME, SPLIT_METHODS, EXPENSE_CATEGORIES | — |
| `components/` | 4 presentational components + barrel — **all currently dead code** (zero call sites; screens inline their own markup) | — |
| `utils/` | `splitCalculator.ts` — **dead on the frontend**; ported verbatim to `backend/src/domain/` which is now the live copy | — |

Backend (`backend/src/`):

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `modules/<domain>/` | Per-domain `*.routes.ts` (Fastify routes + inline zod `.parse()`), `*.schemas.ts`, `*.service.ts` (business logic + SQL) | Cross-domain logic |
| `domain/` | Pure calculation: `splitCalculator.ts` (ported from frontend — "DO NOT 'fix' the rounding"), `netting.ts`, `types.ts` (mirrors frontend types with ISO-string dates) | I/O of any kind |
| `stellar/` | `client` (Horizon singleton + testnet boot assert), `wallet` (keypair/Friendbot/balance), `payment` (build/sign/submit/reconcile), `conversion` (1:1 demo peg), `crypto` (AES-256-GCM secret encryption) | Route/DB concerns |
| `db/` | `index.ts` (singleton better-sqlite3, WAL, FKs on), `schema.sql` (8 tables), `migrate.ts` (idempotent exec at boot) | Business logic |
| `plugins/` | `auth` (@fastify/jwt + `app.authenticate`), `errorHandler` (single `{error:{code,message,details?}}` envelope), `requestLogging` (Pino + redaction) | — |
| `hooks/` | `requireMember` — group-membership preHandler for all `/groups/:id/**` routes | — |
| `config/` | `env.ts` (zod boot validation), `constants.ts` (enums; `DEMO_PEG` is dead) | — |
| `utils/` | `errors.ts` (`AppError` + 14 `ErrorCode`s + status map), `logger.ts` (`logSafe` deep-redactor), `id.ts` | — |

### 4) Naming and Organization Rules

- Frontend files: PascalCase for components/screens (`GroupDetailScreen.tsx`), camelCase for services/utils (`apiService.ts`). Barrels: `src/services/index.ts`, `src/components/index.ts`.
- Backend files: camelCase, role-suffixed and colocated per domain: `groups.routes.ts` / `groups.schemas.ts` / `groups.service.ts`.
- Directory organization: frontend by layer (screens/services/...), backend by feature module + shared layers.
- Import conventions: relative imports everywhere. Root tsconfig defines `@/*` → `src/*` but it is unused **and** not wired into Babel, so it wouldn't resolve at runtime — dead config (`tsconfig.json:6-10`). Backend uses NodeNext ESM with explicit `.js` extensions on imports (`backend/src/domain/netting.ts:14`).

### 5) Evidence

- `docs/codebase/.codebase-scan.txt` (directory tree), `.gitignore`, `backend/.gitignore`
- `index.js`, `App.tsx`, `src/navigation/RootNavigator.tsx`, `src/services/index.ts`
- `backend/src/server.ts`, `backend/src/app.ts`, `backend/src/modules/groups/`
- `git ls-files` checks for `dist/`, `backend/.env`, `backend/data/`

## Notes

- **Uncommitted WIP:** branch `backend` carries a near-total rewrite of the frontend (26 tracked files changed, ~9.5k insertions; 10 new untracked files incl. `src/contexts/`, `src/services/api*`, Login/Register screens). The mock→API migration is structurally complete (zero mock references remain), but none of it is committed yet.
