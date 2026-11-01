// Browser-side helpers for Web Push. Pure where it can be.

// VAPID public keys are base64url; PushManager wants the raw bytes.
export function base64UrlToBytes(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function deviceLabel(userAgent) {
  const ua = String(userAgent ?? '');
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  return 'דפדפן';
}

export const PERMISSION_LABEL = {
  granted: 'מאושרת',
  denied: 'נחסמה',
  default: 'עוד לא נשאלה',
  unsupported: 'לא נתמך כאן',
};
