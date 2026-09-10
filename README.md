# GEN-Z.AI — Cloudflare Worker + Supabase

Arsitektur production untuk AI Video dengan **provider registry dinamis**. Admin dapat menambah provider, menyimpan API key, mengedit, mengaktifkan/nonaktifkan, dan menghapus provider. API key hanya berada di Supabase dan dipakai oleh Cloudflare Worker.

## Arsitektur

```text
Browser
  │ Supabase session token
  ▼
Cloudflare Worker
  ├── Provider Registry (Supabase)
  │    ├── id / name
  │    ├── adapter
  │    ├── encrypted-at-rest provider API key (Supabase)
  │    └── enabled
  └── Provider Adapters
       ├── Veo
       ├── MiniMax
       ├── Luma
       └── adapter baru di masa depan
```

**Penting:** provider management bersifat dinamis, tetapi API provider baru tetap memerlukan adapter di Worker. Menambahkan API key saja tidak membuat Worker otomatis memahami format API baru.

## Provider management

Admin API:
- `GET /api/admin/providers` — daftar provider tanpa membocorkan key
- `POST /api/admin/providers` — tambah provider
- `PUT /api/admin/providers/:id` — edit nama, adapter, status, atau API key
- `POST /api/admin/providers/:id/toggle` — aktif/nonaktif
- `DELETE /api/admin/providers/:id` — hapus provider

Frontend user mengambil hanya provider yang **aktif + memiliki key + adapter tersedia** melalui `GET /api/providers`.

API key tidak pernah dikirim sebagai response ke browser. Admin hanya menerima status `apiKeySet` dan mask `••••••••`.

## Supabase

Jalankan `supabase/schema.sql` di Supabase SQL Editor. Schema ini:
1. membuat tabel `providers` dinamis;
2. memigrasikan key dari tabel legacy `admin_provider_keys` bila tabel tersebut sudah ada;
3. menghapus constraint provider lama pada `video_jobs` agar provider baru dapat digunakan;
4. menjaga fungsi credit reservation/refund;
5. tidak membuat policy browser untuk tabel provider/key.

## Deploy

1. Isi `public/js/config.js` dengan Supabase URL dan publishable/anon key.
2. Jalankan schema Supabase.
3. Set Cloudflare Worker secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Atur `ALLOWED_ORIGIN` ke domain frontend production, jangan `*` untuk production.
5. Deploy: `npm run deploy`.
6. Buat user admin melalui Supabase Auth, lalu beri `role=admin` pada `user_roles`.
7. Buka `/admin.html` untuk mengelola provider.

## Alias

`gemini` tetap dinormalisasi internal menjadi `veo` untuk kompatibilitas konfigurasi lama. ID provider baru sebaiknya unik dan tidak memakai ID reserved tersebut.

## Security

- Provider API keys server-side.
- Generate/status/video membutuhkan Supabase access token.
- Endpoint admin membutuhkan role `admin`.
- Provider nonaktif tidak dapat dipilih untuk generation baru.
- Job yang sudah berjalan tetap dapat dipolling walaupun provider kemudian dinonaktifkan.
- Credit reservation/refund dilakukan secara atomic melalui Supabase RPC.
