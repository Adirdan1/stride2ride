'use client';
import { useState } from 'react';

export default function Unlock() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/unlock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) });
      if (res.ok) return window.location.replace('/');
      setError((await res.json().catch(() => ({}))).error ?? 'קוד שגוי');
    } catch {
      setError('אין חיבור. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen unlock">
      <span className="brand brand--big" dir="ltr">stride2ride<span className="brand__mark">.</span></span>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>קוד</span>
          <input type="password" inputMode="numeric" autoComplete="current-password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn--primary" disabled={busy || !pin}>כניסה</button>
      </form>
    </main>
  );
}
