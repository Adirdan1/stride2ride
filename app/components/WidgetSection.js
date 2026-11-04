'use client';
import { useEffect, useState } from 'react';
import { USER_NAME } from '@/lib/core';

const fetchScript = () =>
  fetch('/api/widget-script', { method: 'POST' }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'ההעתקה נכשלה');
    return res.text();
  });

const when = (ms) => new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' });

// One tap copies a widget script with a key of this person's own on line 2.
// iOS lets a page write the clipboard only inside the tap, so the write starts
// in the tap and waits on the fetch (ClipboardItem takes a promise); an
// `await fetch()` before `writeText()` silently fails on the phone. If the
// write is refused anyway, the script is shown to copy by hand.
export default function WidgetSection({ me }) {
  const [keys, setKeys] = useState(null);
  const [msg, setMsg] = useState(null);
  const [manual, setManual] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch('/api/widget-keys').catch(() => null);
    if (res?.ok) setKeys((await res.json()).keys);
  }
  useEffect(() => { refresh(); }, []);

  async function copy() {
    setBusy(true);
    setMsg(null);
    setManual(null);
    const pending = fetchScript();
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': pending.then((t) => new Blob([t], { type: 'text/plain' })) })]);
      } else {
        await navigator.clipboard.writeText(await pending);
      }
      setMsg({ ok: 'הסקריפט הועתק. ב־Scriptable: + ← הדבקה ← לשמור בשם stride2ride.' });
    } catch (e) {
      const text = await pending.catch(() => null);
      if (text) setManual(text);
      else setMsg({ error: e.message || 'ההעתקה נכשלה. נסו שוב.' });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function revoke(id) {
    if (!confirm('לבטל את המפתח? הווידג׳ט שמשתמש בו יפסיק להתעדכן.')) return;
    await fetch(`/api/widget-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
    refresh();
  }

  return (
    <section className="stack">
      <h3 className="h2">ווידג׳ט למסך הבית</h3>
      <p className="muted small">מי בחוץ עכשיו, כמה הפסדנו עד היום, והחלוקה של החודש. נוגעים בו והאפליקציה נפתחת.</p>
      {/* One tap, nothing to set by hand; the name to save it under beside it. */}
      <div className="copy-row">
        <button className="btn btn--primary" disabled={busy} onClick={copy}>
          העתקת הסקריפט של {USER_NAME[me]}
        </button>
        <span className="small">שומרים בשם <bdi dir="ltr" className="mono">stride2ride</bdi></span>
      </div>
      {msg?.ok && <p className="muted" role="status">{msg.ok}</p>}
      {msg?.error && <p className="error" role="alert">{msg.error}</p>}
      {manual && (
        <label className="field">
          <span>ההעתקה האוטומטית נחסמה. מסמנים הכול ומעתיקים:</span>
          <textarea className="script" readOnly value={manual} rows={6} dir="ltr" onFocus={(e) => e.target.select()} />
        </label>
      )}
      <ol className="steps small">
        <li>ב־Scriptable: <strong>+</strong>, מדביקים, שומרים בשם <bdi dir="ltr">stride2ride</bdi>.</li>
        <li>לחיצה ארוכה על מסך הבית ← <strong>+</strong> ← Scriptable ← קטן או בינוני.</li>
        <li>עריכת הווידג׳ט ← Script: <bdi dir="ltr">stride2ride</bdi>.</li>
      </ol>
      {keys?.length > 0 && (
        <ul className="tray tray--flat">
          {keys.map((k) => (
            <li key={k.id} className="trip">
              <span className="trip__main">
                <span>הועתק ב־{when(k.createdAt)}</span>
                <small className="muted">{k.lastUsedAt ? `בשימוש לאחרונה ${when(k.lastUsedAt)}` : 'עוד לא בשימוש'}</small>
              </span>
              <button className="link link--danger" onClick={() => revoke(k.id)}>ביטול</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
