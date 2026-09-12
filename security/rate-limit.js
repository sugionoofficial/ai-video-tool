import {
  HttpError
} from "../lib/http.js";

const GENERATE_LIMIT_WINDOW_MS =
  60_000;

const GENERATE_LIMIT_MAX =
  5;

const generateRate =
  new Map();

export function checkGenerateRate(
  userId
) {
  const now =
    Date.now();

  const key =
    String(
      userId
    );

  const hit =
    generateRate.get(
      key
    );

  if (
    !hit ||
    now -
      hit.startedAt >=
      GENERATE_LIMIT_WINDOW_MS
  ) {
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

  if (
    hit.count >=
    GENERATE_LIMIT_MAX
  ) {
    throw new HttpError(
      "Terlalu banyak request generate. Coba lagi dalam satu menit.",
      429
    );
  }

  hit.count++;
}
