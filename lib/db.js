import { createClient } from '@supabase/supabase-js';

let client;

// Built lazily so `next build` does not need secrets.
export function db() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  client = createClient(url, key, {
    db: { schema: 'ride' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
