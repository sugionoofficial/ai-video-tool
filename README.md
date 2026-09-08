# AI Video Tool — Vercel Ready

## Deploy

1. Upload this project to a GitHub repository.
2. In Vercel, import the repository.
3. Deploy.
4. In Vercel Project Settings -> Environment Variables, add:
   - `RUNWAYML_API_SECRET`
   - `RUNWAY_MODEL` = `gen4.5`
   - `DEFAULT_PROVIDER` = `runway` (or `mock` for UI testing)
5. Redeploy after adding variables.

The frontend uses same-origin `/api/video/*` routes.

## Local

npm install
npx vercel dev

Then open the local URL shown by Vercel CLI.

## Important production architecture note

Vercel Functions are stateless. The included Mock provider is only for basic testing. For reliable multi-scene jobs and persistent status, add a database/queue such as Vercel KV/Redis/Postgres or another persistent store. The provider-neutral service boundary is already in place.
