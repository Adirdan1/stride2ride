// ride-notify: sends Web Push for stride2ride.
//
// Called by Postgres (pg_net) from the ride.trips trigger and by the test
// button, always with the x-ride-secret header. No JWT: the shared secret is
// the authentication.
//
// Body: { kind: 'left' | 'returned', rider, car, trip_id }
//     | { kind: 'test', endpoint }
//     | { kind: 'init' }   — creates the VAPID pair once, stores it in Vault.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { audience, isGone, messageFor } from './messages.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  db: { schema: 'ride' },
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUBJECT = 'https://stride2ride.vercel.app';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

type Secrets = { secret: string | null; vapid_public: string | null; vapid_private: string | null };

async function secrets(): Promise<Secrets> {
  const { data, error } = await db.rpc('notify_secrets');
  if (error) throw new Error(`notify_secrets: ${error.message}`);
  return data as Secrets;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let s: Secrets;
  try {
    s = await secrets();
  } catch (e) {
    console.error(e);
    return json({ error: 'secrets unavailable' }, 500);
  }
  const given = req.headers.get('x-ride-secret') ?? '';
  if (!s.secret || !safeEqual(given, s.secret)) return json({ error: 'unauthorized' }, 401);

  const event = await req.json().catch(() => ({}));

  if (event.kind === 'init') {
    if (s.vapid_public && s.vapid_private) return json({ ok: true, created: false });
    const keys = webpush.generateVAPIDKeys();
    const { data, error } = await db.rpc('store_vapid', { p_public: keys.publicKey, p_private: keys.privateKey });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, created: data === true });
  }

  // Function secrets win, but only as a pair, so the keys always match.
  const envPub = Deno.env.get('VAPID_PUBLIC_KEY');
  const envPriv = Deno.env.get('VAPID_PRIVATE_KEY');
  const pub = envPub && envPriv ? envPub : s.vapid_public;
  const priv = envPub && envPriv ? envPriv : s.vapid_private;
  if (!pub || !priv) return json({ error: 'no VAPID keys yet; call with {"kind":"init"}' }, 503);
  webpush.setVapidDetails(SUBJECT, pub, priv);

  const message = messageFor(event);
  const who = audience(event);
  if (!message || !who) return json({ error: 'unrecognised event' }, 400);

  let q = db.from('push_subscriptions').select('id, rider, endpoint, p256dh, auth');
  q = 'endpoint' in who ? q.eq('endpoint', who.endpoint) : q.neq('rider', who.exceptRider);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const payload = JSON.stringify(message);
  const gone: string[] = [];
  let sent = 0;
  const failed: { rider: string; status?: number; message: string; body?: string }[] = [];

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60, urgency: 'high', topic: message.tag.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, '_') },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (isGone(status)) gone.push(sub.id);
        else failed.push({ rider: sub.rider, status, message: String((e as Error).message ?? e), body: String((e as { body?: string }).body ?? '').slice(0, 300) });
      }
    }),
  );

  if (gone.length) await db.from('push_subscriptions').delete().in('id', gone);
  if (failed.length) console.error('push failures', failed);

  return json({ ok: true, kind: event.kind, targets: subs?.length ?? 0, sent, removed: gone.length, failed });
});
