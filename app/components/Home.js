'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SIDE_OF, USER_NAME } from '@/lib/core';
import { clock, dayLabel, elapsed, timeWindow } from '@/lib/format';
import Wheel from './Wheel';
import TripSheet from './TripSheet';

function useNow(serverNow) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Home({ me, now: serverNow, open, out, recent }) {
  const router = useRouter();
  const now = useNow(serverNow);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sheet, setSheet] = useState(null); // null | { trip } | { trip: null }

  async function tap(action) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, user: me }),
      });
      if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? 'משהו השתבש');
      startTransition(() => router.refresh());
    } catch {
      setError('אין חיבור. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  const others = out.filter((o) => o.user !== me);
  const otherSide = others.filter((o) => SIDE_OF[o.user] !== SIDE_OF[me]);
  const anyoneOut = out.length > 0;
  const working = busy || pending;

  return (
    <>
      <section className={`status${anyoneOut ? ' status--out' : ''}`} aria-live="polite">
        <Wheel moving={anyoneOut} />
        <div className="status__text">
          {anyoneOut ? (
            <>
              <strong>בחוץ עכשיו</strong>
              <span>
                {out.map((o, i) => (
                  <span key={o.user} className={`who who--${SIDE_OF[o.user]}`}>
                    {i > 0 && ' · '}
                    {USER_NAME[o.user]} מ־{clock(o.since)}
                  </span>
                ))}
              </span>
            </>
          ) : (
            <>
              <strong>הרכב בבית</strong>
              <span className="muted">אף אחד לא בחוץ</span>
            </>
          )}
        </div>
      </section>

      <section className="action">
        {open ? (
          <>
            <button className="btn btn--hero btn--return" disabled={working} onClick={() => tap('return')}>
              חזרתי הביתה
            </button>
            <p className="action__note">
              בחוץ כבר <strong>{elapsed(now - open.startedAt)}</strong> · מ־{clock(open.startedAt)}
            </p>
          </>
        ) : (
          <>
            <button className="btn btn--hero" disabled={working} onClick={() => tap('leave')}>
              יצאתי מהבית
            </button>
            {otherSide.length > 0 && (
              <p className="action__note action__note--clash">
                {otherSide.map((o) => USER_NAME[o.user]).join(' ו')} בחוץ — יציאה עכשיו תהיה התנגשות
              </p>
            )}
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="recent">
        <div className="section-head">
          <h2 className="h2">הנסיעות האחרונות שלי</h2>
          <button className="link" onClick={() => setSheet({ trip: null })}>+ הוספה ידנית</button>
        </div>
        {recent.length === 0 ? (
          <p className="muted empty">עוד אין נסיעות.</p>
        ) : (
          <ul className="rows">
            {recent.map((t) => (
              <li key={t.id}>
                <button className={`row${t.endedAt == null ? ' row--open' : ''}`} onClick={() => setSheet({ trip: t })}>
                  <span className="row__main">
                    {t.endedAt == null ? `${dayLabel(t.startedAt)} · מ־${clock(t.startedAt)}` : timeWindow(t.startedAt, t.endedAt)}
                  </span>
                  <span className="row__side">
                    {t.endedAt == null ? 'פתוחה' : elapsed(t.endedAt - t.startedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sheet && (
        <TripSheet
          me={me}
          trip={sheet.trip}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); startTransition(() => router.refresh()); }}
        />
      )}
    </>
  );
}
