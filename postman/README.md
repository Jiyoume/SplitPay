Postman collection for SplitPay API

Quick steps

- Start the backend locally (default expected at http://localhost:3000).
- Open Postman → Import → choose `SplitPay.postman_collection.json`.
- Set environment variables in Postman (Manage Environments):
  - `baseUrl` — backend base URL (default: http://localhost:3000)
  - `token` — JWT token returned from `/auth/login` or `/auth/register`
  - `groupId`, `userId1`, `userId2`, `settlementId` — populate as needed from responses

Suggested flow

1. POST `/auth/register` — create a user. Save the returned `token` and `user.id` into environment variables.
2. POST `/auth/login` — login another user (or reuse register). Save `token`.
3. POST `/groups` — create a group; save `group.id` to `groupId`.
4. Use `/groups/:id/expenses`, `/groups/:id/balances`, `/groups/:id/settlements` to exercise flows.

Notes / Test parity

- The Postman collection mirrors the endpoints exercised by `backend/src/integration.test.ts` (16 endpoints).
- Some endpoints interact with Stellar/Friendbot; they may return 502 or other transient statuses. Integration tests accept multiple statuses for those.
- Use the `token` environment variable in Authorization headers: `Bearer {{token}}`.

Files

- SplitPay.postman_collection.json — collection to import.
- README.md — this file.
