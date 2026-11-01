'use client';
import { useEffect, useRef, useState } from 'react';
import { defaultCar, toLocalInput } from '@/lib/core';
import CarPicker from './CarPicker';

// Edit, delete, or add a trip by hand. Times are local (Jerusalem) wall-clock.
export default function TripSheet({ me, trip, onClose, onSaved }) {
  const isNew = !trip;
  const [start, setStart] = useState(() => (trip ? toLocalInput(trip.startedAt) : ''));
  const [end, setEnd] = useState(() => (trip?.endedAt ? toLocalInput(trip.endedAt) : ''));
  const [car, setCar] = useState(() => trip?.car ?? defaultCar(me));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Once, with the handler read from a ref: a dependency on onClose would
  // re-run this on every render and steal focus from the field being typed in.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (isNew && !start) {
      const now = Date.now();
      setStart(toLocalInput(now - 60 * 60_000));
      setEnd(toLocalInput(now));
    }
  }, [isNew, start]);

  async function send(method, url, body) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
      if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? 'משהו השתבש');
      onSaved();
    } catch {
      setError('אין חיבור. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  function save(e) {
    e.preventDefault();
    const body = { user: me, car, start, end: end || null };
    if (isNew) send('POST', '/api/trips', body);
    else send('PATCH', `/api/trips/${trip.id}`, body);
  }

  function remove() {
    if (confirm('למחוק את הנסיעה?')) send('DELETE', `/api/trips/${trip.id}`);
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabIndex={-1} ref={ref} onSubmit={save}>
        <h2 id="sheet-title" className="h2">{isNew ? 'הוספת נסיעה' : 'עריכת נסיעה'}</h2>
        <div className="field">
          <span>רכב</span>
          <CarPicker value={car} onChange={setCar} disabled={busy} />
        </div>
        <label className="field">
          <span>יציאה</span>
          <input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span>חזרה</span>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          <small className="muted">ריק = עדיין בחוץ</small>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="sheet__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>שמירה</button>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>ביטול</button>
          {!isNew && (
            <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>מחיקה</button>
          )}
        </div>
      </form>
    </div>
  );
}
