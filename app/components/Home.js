'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CAR_NAME, SIDE_OF, USER_NAME, defaultCar } from '@/lib/core';
import { clock, dayLabel, elapsed, timeWindow } from '@/lib/format';
import Wheel from './Wheel';
import TripSheet from './TripSheet';
import CarPicker, { CarTag } from './CarPicker';

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
  const [car, setCar] = useState(() => defaultCar(me));

  async function tap(action) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, user: me, car }),
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
  const carTakenBy = others.filter((o) => o.car === car);
  const working = busy || pending;

  return (
    <>
      {/* Who has a car right now, on the paper: a line, not a card. */}
      <section className={`status${anyoneOut ? ' status--out' : ''}`} aria-live="polite">
        <Wheel moving={anyoneOut} size={34} />
        <div className="status__text">
          {anyoneOut ? (
            out.map((o) => (
              <span key={o.user} className="who-line">
                <span className={`who who--${SIDE_OF[o.user]}`}>{USER_NAME[o.user]} בחוץ מ־{clock(o.since)}</span>
                <CarTag car={o.car} />
              </span>
            ))
          ) : (
            <>
              <strong>הרכב בבית</strong>
              <span className="muted">אף אחד לא בחוץ</span>
            </>
          )}
        </div>
      </section>

      <section className="action">
        {otherSide.length > 0 && (
          <p className="alert" role="status">
            <strong>{otherSide.map((o) => USER_NAME[o.user]).join(' ו')} בחוץ.</strong>{' '}
            {open ? 'זו התנגשות כרגע: שני הבתים צריכים רכב.' : 'יציאה עכשיו תיספר כהתנגשות.'}
          </p>
        )}

        {/* The one thing used daily: one tap, as big as the thumb could want.
            Out: filled. Back: hollow, carrying the open trip inside it. */}
        {open ? (
          <button className="btn btn--hero btn--return" disabled={working} aria-busy={working} onClick={() => tap('return')}>
            <span>חזרתי הביתה</span>
            <span className="btn--hero__sub">
              בחוץ {elapsed(now - open.startedAt)} · מ־{clock(open.startedAt)} · {CAR_NAME[open.car] ?? ''}
            </span>
          </button>
        ) : (
          <button className="btn btn--hero" disabled={working} aria-busy={working} onClick={() => tap('leave')}>
            <span>יצאתי מהבית</span>
            <span className="btn--hero__sub">עם ה{CAR_NAME[car]}</span>
          </button>
        )}

        {!open && (
          <>
            <CarPicker value={car} onChange={setCar} disabled={working} />
            {carTakenBy.length > 0 && (
              <p className="action__note">
                ה{CAR_NAME[car]} כבר בחוץ עם {carTakenBy.map((o) => USER_NAME[o.user]).join(' ו')}.
                {carTakenBy.some((o) => SIDE_OF[o.user] !== SIDE_OF[me]) && ' אם יוצאים ביחד, מספיק שאחד ידווח.'}
              </p>
            )}
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section className="recent">
        <div className="section-head">
          <h2 className="h2">הנסיעות האחרונות שלי</h2>
          <button className="link" onClick={() => setSheet({ trip: null })}>הוספה ידנית</button>
        </div>
        {recent.length === 0 ? (
          <p className="muted empty">עוד אין נסיעות. כשיוצאים, לוחצים על הכפתור למעלה.</p>
        ) : (
          <ul className="tray">
            {recent.map((t) => (
              <li key={t.id}>
                <button className={`trip${t.endedAt == null ? ' trip--open' : ''}`} onClick={() => setSheet({ trip: t })}>
                  <span className="trip__main">
                    <span>{t.endedAt == null ? `${dayLabel(t.startedAt)} · מ־${clock(t.startedAt)}` : timeWindow(t.startedAt, t.endedAt)}</span>
                    <CarTag car={t.car} />
                  </span>
                  <span className="trip__side">
                    {t.endedAt == null ? 'עדיין בחוץ' : elapsed(t.endedAt - t.startedAt)}
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
