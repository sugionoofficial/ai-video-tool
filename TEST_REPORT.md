# GEN-Z.AI V15 — End-to-End / Production Readiness Test Report

Date: 2026-09-10
Baseline: Production V14

## Automated static tests

| Test | Result | Notes |
|---|---|---|
| Worker JavaScript syntax | PASS | `node --check worker.js` |
| User frontend syntax | PASS | `node --check public/js/app.js` |
| Admin frontend syntax | PASS | `node --check public/js/admin.js` |
| Project/package structure | PASS | Worker, assets, schema, Wrangler config present |
| Service-role key references | PASS | References are server-side (`worker.js`, `.env.example`, docs); no provider/service key is embedded in `public/` |
| Provider key masking | PASS | Admin provider response returns only masked key metadata |
| API config exposure | PASS | `/api/config` exposes Supabase URL + publishable key only |
| Video proxy authorization path | PASS | Requires authenticated user + owned completed job + matching provider |
| Generation idempotency path | PASS | `Idempotency-Key` + request fingerprint + DB unique index/RPC |
| Credit transaction ledger | PASS | generation/refund/topup/admin adjustment paths present |
| Stale-job recovery | PASS | Scheduled RPC and stale-job refund path present |
| Job state constraint/trigger | PASS | Reserved/processing/terminal transitions enforced in SQL |

## Static security checks

- Provider API keys are selected by the Worker and are not returned by public provider APIs: PASS.
- Normal frontend only receives Supabase publishable key: PASS.
- Service-role key is not referenced by `public/`: PASS.
- `/api/video` no longer accepts an arbitrary provider file ID/target URL from the browser: PASS.
- Admin APIs require the admin role: PASS.
- Browser RLS policies are limited; provider secrets and credit ledger remain Worker-only: PASS.
- Generation request body has a byte-size check after reading the body, including when `Content-Length` is absent: PASS.

## Database review

- `credit_transactions`: present.
- `credit_topup_requests`: present with one-pending-request partial unique index.
- `video_jobs` idempotency unique index: present.
- Video job state constraint and trigger: present.
- Stale recovery RPC: present and revoked from PUBLIC.
- Admin top-up approval/rejection RPCs: present and revoked from PUBLIC.
- Admin removal RPC: present and revoked from PUBLIC.

## BLOCKED / requires real environment

The following cannot be honestly marked PASS from the local package alone:

1. Supabase login with a real project.
2. RLS/RPC execution against the deployed Supabase database.
3. Real provider generation for Veo, MiniMax, and Luma.
4. Real provider polling/completion/failure/refund.
5. Cloudflare Worker deployment and Cron execution.
6. Real browser/mobile UI flow against deployed services.
7. Cross-user video access test against production data.
8. Real top-up approval and credit balance reconciliation.

These require valid Supabase/Cloudflare/provider credentials and a deployed environment. No provider API keys are included in this test package.

## Important findings

1. The project is structurally ready for an integration test, but a true end-to-end production PASS cannot be claimed without deploying V15 and running against a real Supabase project/provider accounts.
2. The per-isolate generation rate limit is an abuse guard, not a globally distributed rate limiter. For stronger production enforcement, use a durable Cloudflare mechanism or equivalent centralized limiter.
3. A future provider can be registered only after its Worker adapter is implemented; entering an arbitrary API key alone does not create API protocol support.

## Release recommendation

**CONDITIONAL GO** for staging/integration testing.

**NOT YET a production PASS** until the blocked real-environment tests above are executed.
