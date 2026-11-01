'use client';
import { useRouter } from 'next/navigation';
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

export function MeChip({ me }) {
  const router = useRouter();
  return (
    <button className="chip" onClick={() => { if (confirm('להחליף משתמש?')) { setMe(null); router.refresh(); } }}>
      {USER_NAME[me]}
    </button>
  );
}
