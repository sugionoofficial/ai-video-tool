# GEN-Z.AI — Cloudflare Worker + Supabase

Final architecture for Gemini/Veo, MiniMax and Luma. Provider API keys stay server-side in Supabase `admin_provider_keys`; the browser never receives or submits provider keys. `gemini` is normalized internally to `veo`.

## Deploy
1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Put the Supabase URL and publishable key in `public/js/config.js`.
3. Set Cloudflare Worker secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy with Wrangler.
5. Create an admin by inserting `role=admin` in `user_roles`, then use `/admin.html` to save Gemini/Veo, MiniMax and Luma keys.

## Security
- No provider key in HTML/JS/browser requests.
- Generate/status/video endpoints require a Supabase access token.
- Admin endpoints require the `admin` role.
- Credit deduction is atomic through Supabase RPC.
- Failed provider submission refunds the reserved credit.

## Providers
- Gemini/Veo: Veo 3.1 long-running generation.
- MiniMax: Hailuo 2.3 / 2.3 Fast / 02.
- Luma: Ray 2 / Ray Flash 2.
