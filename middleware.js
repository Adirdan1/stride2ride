import { NextResponse } from 'next/server';
import { AUTH_COOKIE, verifyToken } from './lib/auth.js';

// /api/widget checks its own key: a widget has a key but no cookie.
const OPEN = ['/unlock', '/api/unlock', '/api/widget', '/manifest.webmanifest', '/sw.js'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (OPEN.includes(pathname)) return NextResponse.next();

  const pin = process.env.APP_PIN;
  if (!pin) {
    if (process.env.NODE_ENV !== 'production') return NextResponse.next();
    // Fail closed: no PIN configured means nobody gets in.
    return new NextResponse('האפליקציה נעולה: לא הוגדר קוד.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }

  if (await verifyToken(pin, req.cookies.get(AUTH_COOKIE)?.value, Date.now())) return NextResponse.next();

  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'נדרש קוד' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/unlock';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon-|apple-icon|favicon).*)'],
};
