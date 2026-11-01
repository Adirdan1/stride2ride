'use client';
import { useEffect, useState } from 'react';
import { USER_NAME } from '@/lib/core';
import { PERMISSION_LABEL, base64UrlToBytes, deviceLabel } from '@/lib/push';

function readEnv() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  return { supported, standalone, permission: 'Notification' in window ? Notification.permission : 'unsupported' };
}

async function currentSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

export default function Notifications({ me }) {
  const [env, setEnv] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [endpoint, setEndpoint] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function refresh() {
    const e = readEnv();
    setEnv(e);
    const sub = e.supported ? await currentSubscription().catch(() => null) : null;
    setEndpoint(sub?.endpoint ?? null);
    const q = sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : '';
    const res = await fetch(`/api/push${q}`).then((r) => r.json()).catch(() => ({}));
    setPublicKey(res.publicKey ?? null);
    setSubscribed(Boolean(sub && res.subscribed));
  }

  useEffect(() => {
    refresh();
  }, []);

  // requestPermission is the first thing awaited in the tap, as iOS requires.
  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      setEnv((e) => ({ ...e, permission }));
      if (permission !== 'granted') {
        setMsg({ error: 'ההרשאה לא ניתנה.' });
        return;
      }
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const reg = await navigator.serviceWorker.ready;
      let key = publicKey;
      if (!key) key = (await fetch('/api/push').then((r) => r.json())).publicKey;
      if (!key) throw new Error('no key');
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          user: me,
          label: `${USER_NAME[me]} · ${deviceLabel(navigator.userAgent)}`,
          subscription: sub.toJSON(),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'save failed');
      setMsg({ ok: 'ההתראות הופעלו.' });
      await refresh();
    } catch (e) {
      setMsg({ error: 'לא הצלחנו להפעיל התראות. נסו שוב.' });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      const body = await res.json().catch(() => ({}));
      setMsg(res.ok ? { ok: 'נשלחה. אמורה להגיע תוך כמה שניות.' } : { error: body.error ?? 'השליחה נכשלה' });
      if (res.status === 404) await refresh();
    } catch {
      setMsg({ error: 'אין חיבור. נסו שוב.' });
    } finally {
      setBusy(false);
    }
  }

  if (!env) return <section className="card"><p className="muted">בודק…</p></section>;

  const yes = (b) => (b ? 'כן' : 'לא');
  const canEnable = env.supported && env.standalone && env.permission !== 'denied';

  return (
    <section className="card">
      <h2 className="h2">התראות</h2>
      <p className="muted small">התראה כשמישהו אחר יוצא עם רכב או מחזיר אותו.</p>

      <dl className="status-box">
        <div><dt>הרשאה</dt><dd>{PERMISSION_LABEL[env.supported ? env.permission : 'unsupported']}</dd></div>
        <div><dt>פתוח ממסך הבית</dt><dd>{yes(env.standalone)}</dd></div>
        <div><dt>המכשיר רשום</dt><dd>{yes(subscribed)}</dd></div>
      </dl>

      {!env.standalone && (
        <p className="hint">
          כדי לקבל התראות באייפון צריך לפתוח את האפליקציה ממסך הבית: בספארי לוחצים על <strong>שיתוף</strong>, ואז <strong>הוספה למסך הבית</strong>. אחר כך פותחים אותה מהאייקון וחוזרים לכאן.
        </p>
      )}
      {env.permission === 'denied' && (
        <p className="hint">ההתראות נחסמו. אפשר להפעיל אותן מחדש בהגדרות של האייפון: הגדרות ← התראות ← רכב.</p>
      )}

      {!subscribed ? (
        <button className="btn btn--primary" disabled={busy || !canEnable} onClick={enable}>
          הפעל התראות
        </button>
      ) : (
        <button className="btn" disabled={busy} onClick={test}>
          שלח לי התראת בדיקה
        </button>
      )}
      {msg?.error && <p className="error" role="alert">{msg.error}</p>}
      {msg?.ok && <p className="muted" role="status">{msg.ok}</p>}
    </section>
  );
}
