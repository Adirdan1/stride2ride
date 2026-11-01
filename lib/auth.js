// One shared PIN, one HMAC-signed cookie. Web Crypto only — this runs on the edge.
export const AUTH_COOKIE = 'ride_auth';
export const ME_COOKIE = 'ride_me';
export const YEAR_SECONDS = 365 * 24 * 60 * 60;

const enc = new TextEncoder();

async function hmac(key, message) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time comparison of two strings.
export function safeEqual(a, b) {
  a = String(a ?? '');
  b = String(b ?? '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// The cookie holds an issue time and its HMAC, keyed by the PIN. It cannot be
// turned back into the PIN, and changing the PIN signs everyone out.
export async function signToken(pin, issuedAt) {
  return `${issuedAt}.${await hmac(`stride2ride:${pin}`, String(issuedAt))}`;
}

export async function verifyToken(pin, token, now) {
  if (!pin || !token) return false;
  const [ts, sig] = String(token).split('.');
  const issued = Number(ts);
  if (!Number.isFinite(issued) || !sig) return false;
  if (issued > now + 60_000 || now - issued > YEAR_SECONDS * 1000) return false;
  return safeEqual(sig, await hmac(`stride2ride:${pin}`, ts));
}
