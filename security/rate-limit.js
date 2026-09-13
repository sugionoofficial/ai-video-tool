import {
  HttpError
} from "../lib/http.js";

/*
 * ============================================================
 * GEN-Z.AI
 * GENERATE RATE LIMIT
 * ============================================================
 *
 * Limit:
 * - Maksimal 5 request generate
 * - Dalam window 60 detik
 * - Per user
 *
 * Catatan:
 * Rate limiter ini bersifat in-memory pada masing-masing
 * Cloudflare Worker isolate.
 *
 * Untuk rate limit global lintas seluruh isolate/region,
 * gunakan Cloudflare Rate Limiting / Durable Objects / KV
 * sebagai lapisan tambahan.
 * ============================================================
 */

const GENERATE_LIMIT_WINDOW_MS =
  60_000;

const GENERATE_LIMIT_MAX =
  5;

/*
 * Batas maksimum entry yang disimpan
 * agar user ID dalam jumlah sangat besar
 * tidak memenuhi memory isolate.
 */
const MAX_RATE_ENTRIES =
  10_000;

/*
 * Cleanup tidak perlu dilakukan pada setiap request.
 */
const CLEANUP_INTERVAL_MS =
  15_000;

const generateRate =
  new Map();

let lastCleanupAt =
  0;


/* ============================================================
 * NORMALIZE USER ID
 * ============================================================
 */

function normalizeUserId(
  userId
) {
  const value =
    String(
      userId ?? ""
    ).trim();

  if (!value) {
    throw new HttpError(
      "User tidak valid.",
      401
    );
  }

  /*
   * Jangan izinkan key absurd besar
   * masuk ke memory Map.
   */
  if (
    value.length >
    256
  ) {
    throw new HttpError(
      "User tidak valid.",
      401
    );
  }

  return value;
}


/* ============================================================
 * CLEANUP
 * ============================================================
 */

function cleanupExpiredRates(
  now
) {
  for (
    const [
      key,
      hit
    ]
    of generateRate
  ) {
    if (
      !hit ||
      !Number.isFinite(
        hit.startedAt
      ) ||
      now -
        hit.startedAt >=
        GENERATE_LIMIT_WINDOW_MS
    ) {
      generateRate.delete(
        key
      );
    }
  }

  lastCleanupAt =
    now;
}


/* ============================================================
 * EMERGENCY SIZE CONTROL
 * ============================================================
 *
 * Jika isolate menyimpan terlalu banyak user,
 * hapus entry tertua yang sudah expired terlebih dahulu.
 * ============================================================
 */

function enforceMapLimit(
  now
) {
  if (
    generateRate.size <
    MAX_RATE_ENTRIES
  ) {
    return;
  }

  cleanupExpiredRates(
    now
  );

  if (
    generateRate.size <
    MAX_RATE_ENTRIES
  ) {
    return;
  }

  /*
   * Jika semua entry masih aktif,
   * hapus entry paling lama.
   *
   * Ini bukan bypass keamanan karena entry
   * yang dihapus hanya milik user lain.
   */
  const oldest =
    generateRate.keys().next();

  if (
    !oldest.done
  ) {
    generateRate.delete(
      oldest.value
    );
  }
}


/* ============================================================
 * PERIODIC CLEANUP
 * ============================================================
 */

function maybeCleanup(
  now
) {
  if (
    now -
      lastCleanupAt <
    CLEANUP_INTERVAL_MS
  ) {
    return;
  }

  cleanupExpiredRates(
    now
  );
}


/* ============================================================
 * CHECK GENERATE RATE
 * ============================================================
 */

export function checkGenerateRate(
  userId
) {
  const key =
    normalizeUserId(
      userId
    );

  const now =
    Date.now();

  /*
   * Bersihkan entry lama secara berkala.
   */
  maybeCleanup(
    now
  );

  let hit =
    generateRate.get(
      key
    );

  /*
   * User baru atau window lama
   * sudah berakhir.
   */
  if (
    !hit ||
    now -
      hit.startedAt >=
      GENERATE_LIMIT_WINDOW_MS
  ) {
    enforceMapLimit(
      now
    );

    generateRate.set(
      key,
      {
        startedAt:
          now,

        count:
          1
      }
    );

    return;
  }

  /*
   * Pastikan state tidak korup.
   */
  if (
    !Number.isFinite(
      hit.startedAt
    ) ||
    !Number.isInteger(
      hit.count
    ) ||
    hit.count < 1
  ) {
    hit = {
      startedAt:
        now,

      count:
        1
    };

    generateRate.set(
      key,
      hit
    );

    return;
  }

  /*
   * Limit tercapai.
   */
  if (
    hit.count >=
    GENERATE_LIMIT_MAX
  ) {
    const retryAfterSeconds =
      Math.max(
        1,
        Math.ceil(
          (
            GENERATE_LIMIT_WINDOW_MS -
            (
              now -
              hit.startedAt
            )
          ) /
            1000
        )
      );

    throw new HttpError(
      `Terlalu banyak request generate. Coba lagi dalam ${retryAfterSeconds} detik.`,
      429
    );
  }

  /*
   * Tambahkan hit.
   */
  hit.count +=
    1;

  /*
   * Pertahankan object yang sudah
   * ada agar tidak membuat allocation
   * baru setiap request.
   */
  generateRate.set(
    key,
    hit
  );
}
