import {
  HttpError
} from "../lib/http.js";


/* ============================================================
GEN-Z.AI
GENERATE RATE LIMIT
============================================================

Limit:
- Maksimal 5 request generate
- Dalam window 60 detik
- Per user

Catatan:
Rate limiter ini bersifat in-memory pada masing-masing
Cloudflare Worker isolate.

Untuk rate limit global lintas isolate/region, gunakan
Cloudflare Rate Limiting, Durable Objects, atau KV.
============================================================ */

const GENERATE_LIMIT_WINDOW_MS =
  60_000;

const GENERATE_LIMIT_MAX =
  5;

const MAX_RATE_ENTRIES =
  10_000;

const CLEANUP_INTERVAL_MS =
  15_000;

const MAX_USER_ID_LENGTH =
  256;


/* ============================================================
STATE
============================================================ */

const generateRate =
  new Map();

let lastCleanupAt =
  0;


/* ============================================================
NORMALIZE USER ID
============================================================ */

function normalizeUserId(
  userId
) {
  const value =
    String(
      userId ?? ""
    ).trim();

  if (
    !value ||
    value.length >
      MAX_USER_ID_LENGTH
  ) {
    throw new HttpError(
      "User tidak valid.",
      401
    );
  }

  return value;
}


/* ============================================================
CLEANUP EXPIRED ENTRIES
============================================================ */

function cleanupExpiredRates(
  now
) {
  for (
    const [
      key,
      hit
    ] of generateRate
  ) {
    if (
      !hit ||
      !Number.isFinite(
        hit.startedAt
      ) ||
      !Number.isInteger(
        hit.count
      ) ||
      hit.count < 1 ||
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
PERIODIC CLEANUP
============================================================ */

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
MAP CAPACITY
============================================================ */

function ensureCapacity(
  now,
  currentKey
) {
  /*
   * Jika key user ini sudah ada,
   * tidak membutuhkan entry baru.
   */
  if (
    generateRate.has(
      currentKey
    )
  ) {
    return;
  }

  if (
    generateRate.size <
    MAX_RATE_ENTRIES
  ) {
    return;
  }

  /*
   * Coba bersihkan entry expired
   * sebelum menolak request baru.
   */
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
   * Jangan menghapus entry user lain
   * secara arbitrer.
   *
   * Jika isolate benar-benar penuh,
   * lebih aman menolak request sementara
   * daripada membuat rate limit user lain
   * dapat di-reset secara tidak terduga.
   */
  throw new HttpError(
    "Server sedang menerima terlalu banyak request. Coba lagi beberapa saat.",
    503
  );
}


/* ============================================================
CHECK GENERATE RATE
============================================================ */

export function checkGenerateRate(
  userId
) {
  const key =
    normalizeUserId(
      userId
    );

  const now =
    Date.now();


  /* ==========================================================
  PERIODIC CLEANUP
  ========================================================== */

  maybeCleanup(
    now
  );


  /* ==========================================================
  EXISTING USER
  ========================================================== */

  let hit =
    generateRate.get(
      key
    );


  /*
   * User baru atau window sudah selesai.
   */
  if (
    !hit ||
    !Number.isFinite(
      hit.startedAt
    ) ||
    now -
      hit.startedAt >=
      GENERATE_LIMIT_WINDOW_MS
  ) {
    ensureCapacity(
      now,
      key
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


  /* ==========================================================
  STATE VALIDATION
  ========================================================== */

  if (
    !Number.isInteger(
      hit.count
    ) ||
    hit.count < 1 ||
    hit.count >
      GENERATE_LIMIT_MAX
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


  /* ==========================================================
  RATE LIMIT REACHED
  ========================================================== */

  if (
    hit.count >=
    GENERATE_LIMIT_MAX
  ) {
    const elapsed =
      now -
      hit.startedAt;

    const remainingMs =
      Math.max(
        0,
        GENERATE_LIMIT_WINDOW_MS -
          elapsed
      );

    const retryAfterSeconds =
      Math.max(
        1,
        Math.ceil(
          remainingMs /
            1000
        )
      );

    throw new HttpError(
      `Terlalu banyak request generate. Coba lagi dalam ${retryAfterSeconds} detik.`,
      429
    );
  }


  /* ==========================================================
  INCREMENT COUNTER
  ========================================================== */

  hit.count +=
    1;

  generateRate.set(
    key,
    hit
  );
}
