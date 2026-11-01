'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsForm({ settings: s }) {
  const router = useRouter();
  const [v, setV] = useState({
    trackingStart: s.trackingStart,
    decisionDate: s.decisionDate ?? '',
    savingsHome: String(s.savingsHomeAgorot / 100),
    savingsAdi: String(s.savingsAdiAgorot / 100),
    capital: String(s.capitalAgorot / 100),
    annualReturn: String(s.annualReturnBp / 100),
  });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) });
      const body = await res.json().catch(() => ({}));
      setMsg(res.ok ? { ok: 'נשמר' } : { error: body.error ?? 'משהו השתבש' });
      if (res.ok) router.refresh();
    } catch {
      setMsg({ error: 'אין חיבור. נסו שוב.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={save}>
      <label className="field"><span>תחילת המעקב</span><input type="date" required value={v.trackingStart} onChange={set('trackingStart')} /></label>
      <label className="field">
        <span>תאריך ההחלטה</span>
        <input type="date" value={v.decisionDate} onChange={set('decisionDate')} />
        <small className="muted">ריק עד שמחליטים. כשממלאים, המונה נעצר.</small>
      </label>
      <label className="field"><span>חיסכון חודשי לאדיר ואור (₪)</span><input inputMode="decimal" value={v.savingsHome} onChange={set('savingsHome')} /></label>
      <label className="field"><span>חיסכון חודשי לעדי (₪)</span><input inputMode="decimal" value={v.savingsAdi} onChange={set('savingsAdi')} /></label>
      <label className="field"><span>הון שמתפנה לכל צד (₪)</span><input inputMode="decimal" value={v.capital} onChange={set('capital')} /></label>
      <label className="field"><span>תשואה שנתית (%)</span><input inputMode="decimal" value={v.annualReturn} onChange={set('annualReturn')} /></label>
      {msg?.error && <p className="error" role="alert">{msg.error}</p>}
      {msg?.ok && <p className="muted" role="status">{msg.ok}</p>}
      <button className="btn btn--primary" disabled={busy}>שמירה</button>
    </form>
  );
}
