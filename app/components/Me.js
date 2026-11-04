'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import WidgetSection from './WidgetSection';
import { USERS, USER_NAME } from '@/lib/core';

const YEAR = 365 * 24 * 60 * 60;

export function setMe(user) {
  document.cookie = `ride_me=${user ? user : ''}; path=/; max-age=${user ? YEAR : 0}; samesite=lax`;
}

// Chosen once per device.
export function WhoAmI() {
  const router = useRouter();
  return (
    <section className="whoami">
      <h1 className="title">מי את/ה?</h1>
      <p className="muted">בוחרים פעם אחת, והטלפון זוכר.</p>
      <div className="whoami__list">
        {USERS.map((u) => (
          <button key={u} className="btn btn--big" onClick={() => { setMe(u); router.refresh(); }}>
            {USER_NAME[u]}
          </button>
        ))}
      </div>
    </section>
  );
}

// The person's account: who this phone is, their widget, and switching.
// The name chip in the top bar opens it — the widget lives where the
// account lives (ship-stride-app, widget rules).
export function MeChip({ me }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="chip" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        {USER_NAME[me]}
      </button>
      {open && <AccountSheet me={me} onClose={() => setOpen(false)} />}
    </>
  );
}

function AccountSheet({ me, onClose }) {
  const router = useRouter();
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Once, with the handler from a ref (stride2palette #1).
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    if (ref.current && !ref.current.contains(document.activeElement)) ref.current.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function switchUser() {
    if (!confirm('להחליף משתמש בטלפון הזה?')) return;
    setMe(null);
    onClose();
    router.refresh();
  }

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="account-title" tabIndex={-1} ref={ref}>
        <div className="section-head">
          <h2 id="account-title" className="title title--sheet">{USER_NAME[me]}</h2>
          <button className="btn" onClick={onClose}>סגירה</button>
        </div>
        <WidgetSection me={me} />
        <div className="sheet__foot">
          <span className="muted small">הטלפון הזה רשום על {USER_NAME[me]}.</span>
          <button className="link" onClick={switchUser}>החלפת משתמש</button>
        </div>
      </div>
    </div>
  );
}
