import { NextResponse } from 'next/server';
import { isUser } from '@/lib/core';
import { findPushSubscription, savePushSubscription, vapidPublicKey } from '@/lib/repo';

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// GET /api/push?endpoint=…  → { publicKey, subscribed, user }
export async function GET(req) {
  const endpoint = req.nextUrl.searchParams.get('endpoint');
  const [publicKey, found] = await Promise.all([vapidPublicKey(), endpoint ? findPushSubscription(endpoint) : null]);
  return NextResponse.json({ publicKey, subscribed: Boolean(found), user: found?.user ?? null });
}

// POST { user, label, subscription: PushSubscription.toJSON() }
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const sub = body.subscription ?? {};
  if (!isUser(body.user)) return bad('משתמש לא מוכר');
  if (typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) return bad('מנוי לא תקין');
  if (!sub.keys?.p256dh || !sub.keys?.auth) return bad('מנוי לא תקין');
  await savePushSubscription({
    user: body.user,
    endpoint: sub.endpoint,
    p256dh: String(sub.keys.p256dh),
    auth: String(sub.keys.auth),
    label: String(body.label ?? '').slice(0, 80) || null,
  });
  return NextResponse.json({ ok: true });
}
