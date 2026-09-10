# GEN-Z.AI V12 Migration Notes

V12 is based on Production V11 and adds final database lifecycle hardening.

## Database
Run `supabase/schema.sql` in the Supabase SQL editor. The migration adds:
- strict `video_jobs.status` values
- a state-transition trigger preventing terminal jobs from being changed back to active states
- `refund_video_job()` now refunds only `reserved`/`processing` jobs, preventing accidental double/late refunds

The migration remains idempotent for the existing schema.

## Worker
- JSON mutation endpoints reject non-JSON generation/top-up requests.
- JSON API responses add basic hardening headers (`nosniff`, `no-referrer`).
- Existing idempotency, stale-job recovery, provider isolation, and server-side API key handling remain enabled.

## Deployment
1. Apply `supabase/schema.sql`.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` as a Cloudflare secret; never expose it to the browser.
3. Keep `SUPABASE_PUBLISHABLE_KEY` public only through `/api/config`.
4. Deploy with Wrangler.
5. Verify login, generation, polling, video playback, top-up approval, provider toggle/delete, and stale-job recovery.
