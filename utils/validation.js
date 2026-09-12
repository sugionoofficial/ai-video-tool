/*
 * ============================================================
 * DATA URL
 * ============================================================
 */

export function parseDataUrl(
  value,
  maxBytes =
    12 * 1024 * 1024
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const m =
    value.match(
      /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/s
    );

  if (!m) {
    return null;
  }

  const base64 =
    m[2].replace(
      /\s/g,
      ""
    );

  if (
    base64.length *
      0.75 >
    maxBytes
  ) {
    return null;
  }

  return {
    mimeType:
      m[1],

    base64
  };
}

export function normalizeDuration(
  value,
  allowed,
  fallback
) {
  const n =
    Number(
      value ||
        fallback
    );

  return allowed.includes(
    n
  )
    ? n
    : null;
}
