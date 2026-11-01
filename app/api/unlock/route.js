import { NextResponse } from 'next/server';
import { AUTH_COOKIE, YEAR_SECONDS, safeEqual, signToken } from '@/lib/auth';

export async function POST(req) {
  const pin = process.env.APP_PIN;
  const body = await req.json().catch(() => ({}));
  if (!pin || !safeEqual(String(body.pin ?? ''), pin)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'קוד שגוי' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await signToken(pin, Date.now()), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: YEAR_SECONDS,
  });
  return res;
}
