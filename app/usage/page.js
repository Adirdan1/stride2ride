import Link from 'next/link';
import { cookies } from 'next/headers';
import Shell from '../components/Shell';
import { MeChip } from '../components/Me';
import Timeline from '../components/Timeline';
import Today from '../components/Today';
import { analyse, isUser, localDate, rangeWindow, SIDE_NAME, startOfDayMs, USERS, USERS_OF, USER_NAME, weekGrid, weekStartDate, ZONE } from '@/lib/core';
import { listTrips } from '@/lib/repo';
import { hours, names, percent, timeWindow } from '@/lib/format';

export const dynamic = 'force-dynamic';

const RANGES = [
  { key: 'all', label: 'הכל' },
  { key: 'month', label: 'החודש' },
  { key: 'week', label: 'השבוע' },
];

export default async function Usage({ searchParams }) {
  const sp = await searchParams;
  const range = RANGES.some((r) => r.key === sp.r) ? sp.r : 'all';
  const week = Math.min(0, Math.trunc(Number(sp.w) || 0));
  const me = (await cookies()).get('ride_me')?.value;

  const now = Date.now();
  const trips = await listTrips();
  const first = trips.length ? trips[0].startedAt : null;
  const win = rangeWindow(range, now, first);
  const r = analyse(trips, { ...win, now });
  const grid = weekGrid(trips, weekStartDate(now, week), now);
  const today = localDate(now);
  const todayDay = weekGrid(trips, today, now, ZONE, 1)[0];
  const todayStats = analyse(trips, { from: startOfDayMs(today), to: now, now });

  const q = (patch) => {
    const p = new URLSearchParams({ r: range, w: String(week), ...patch });
    if (p.get('r') === 'all') p.delete('r');
    if (p.get('w') === '0') p.delete('w');
    const s = p.toString();
    return s ? `/usage?${s}` : '/usage';
  };

  return (
    <Shell current="/usage" aside={isUser(me) ? <MeChip me={me} /> : null}>
      <Today day={todayDay} stats={todayStats} />

      <nav className="segmented" aria-label="טווח">
        {RANGES.map((x) => (
          <Link key={x.key} href={q({ r: x.key })} className="segmented__item" aria-current={x.key === range ? 'true' : undefined}>
            {x.label}
          </Link>
        ))}
      </nav>

      {r.tripCount === 0 ? (
        <p className="muted empty">אין נסיעות בטווח הזה עדיין.</p>
      ) : (
        <section className="stats">
          <div className="stat stat--clash">
            <span className="stat__value">{percent(r.collisionRate)}</span>
            <span className="stat__label">מהזמן שהרכב בחוץ היה התנגשות</span>
            <span className="stat__sub">{hours(r.collisionMs)} · {r.collisionTripCount} נסיעות נפגעו</span>
          </div>
          <div className="stat">
            <span className="stat__value stat__value--pair">
              <span className="ink-home">{r.share.home}%</span>
              <span className="stat__sep"> / </span>
              <span className="ink-adi">{r.share.adi}%</span>
            </span>
            <span className="stat__label">חלוקת השימוש: {SIDE_NAME.home} / {SIDE_NAME.adi}</span>
            <span className="stat__sub">{hours(r.perSide.home)} / {hours(r.perSide.adi)}</span>
          </div>
        </section>
      )}

      <Timeline grid={grid} week={week} prevHref={q({ w: String(week - 1) })} nextHref={week < 0 ? q({ w: String(week + 1) }) : null} />

      {r.tripCount > 0 && (
        <>
          <section className="card">
            <h2 className="h2">לפי אדם</h2>
            <ul className="bars">
              {USERS.map((u) => {
                const side = USERS_OF.home.includes(u) ? 'home' : 'adi';
                const max = Math.max(...USERS.map((x) => r.perUser[x]), 1);
                return (
                  <li key={u} className="bars__row">
                    <span className="bars__name">{USER_NAME[u]}</span>
                    <span className="bars__track">
                      <span className={`bars__fill bars__fill--${side}`} style={{ inlineSize: `${(r.perUser[u] / max) * 100}%` }} />
                    </span>
                    <span className="bars__value">{hours(r.perUser[u])}</span>
                  </li>
                );
              })}
            </ul>
            <p className="muted small">כשאדיר ואור בחוץ באותו זמן זה נספר פעם אחת לבית.</p>
          </section>

          <section className="card">
            <h2 className="h2">זמן שאף אחד לא בחוץ</h2>
            <p className="big-line">
              {hours(r.gapMs)} <span className="muted">מתוך {hours(r.windowMs)} ({percent(r.windowMs ? r.gapMs / r.windowMs : 0)})</span>
            </p>
          </section>

          <section className="card">
            <h2 className="h2">התנגשויות</h2>
            {r.collisions.length === 0 ? (
              <p className="muted">אין התנגשויות בטווח הזה.</p>
            ) : (
              <ul className="rows rows--static">
                {[...r.collisions].reverse().map((c) => (
                  <li key={c.s} className="row row--clash">
                    <span className="row__main">{timeWindow(c.s, c.e)}</span>
                    <span className="row__side">{names(c.users)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
