// Widget keys: one per copied script, naming the person who copied it.
// Only the SHA-256 of a key is stored, so a leaked table row cannot be used,
// and a key is revoked by deleting its row. Web Crypto only.

const enc = new TextEncoder();

export function newWidgetKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `rw_${Buffer.from(bytes).toString('base64url')}`;
}

export function isWidgetKey(s) {
  return /^rw_[A-Za-z0-9_-]{32}$/.test(String(s ?? ''));
}

export async function hashWidgetKey(key) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(String(key)));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The repo's script with the key on its API_KEY line. null if the line is
// missing, so a template edit that drops it fails loudly rather than handing
// out a script that cannot sign in.
export function fillWidgetScript(source, key) {
  const line = /^const API_KEY = "[^"\n]*";.*$/m;
  if (!line.test(source) || !isWidgetKey(key)) return null;
  return source.replace(line, `const API_KEY = "${key}"; // yours — do not share`);
}
