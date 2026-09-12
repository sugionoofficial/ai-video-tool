export function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
  };
}

export async function sb(path, options = {}, env) {
  return fetch(
    `${env.SUPABASE_URL}${path}`,
    {
      ...options,
      headers: {
        ...sbHeaders(env),
        ...(options.headers || {})
      }
    }
  );
}
