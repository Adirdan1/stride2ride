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

  const maxUser = Math.max(...USERS.map((x) => r.perUser[x]), 1);

  return (
    <Shell current="/usage" aside={isUser(me) ? <MeChip me={me} /> : null}>
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
        <>
          {/* The question this screen answers: how often did we both need it? */}
          <section className={`hero${r.collisionMs > 0 ? ' hero--clash' : ''}`}>
            <span className="hero__value">{percent(r.collisionRate)}</span>
            <span className="hero__label">מהזמן שהרכב בחוץ, שני הבתים היו צריכים אותו</span>
            <span className="hero__sub">
              {r.collisionMs > 0
                ? `${hours(r.collisionMs)} של התנגשות · ${r.collisionTripCount} נסיעות נפגעו`
                : 'אף נסיעה לא התנגשה בטווח הזה'}
            </span>
          </section>

          {/* Each side's share: one road, two lanes. Home solid, Adi striped. */}
          <section className="tray split">
            <div className="split__head">
              <span className="split__side">
                <span className="split__pct ink-home">{r.share.home}%</span>
                <span>{SIDE_NAME.home}</span>
                <small>{hours(r.perSide.home)}</small>
              </span>
              <span className="split__side split__side--end">
                <span className="split__pct ink-adi">{r.share.adi}%</span>
                <span>{SIDE_NAME.adi}</span>
                <small>{hours(r.perSide.adi)}</small>
              </span>
            </div>
            <div className="split__bar" role="img" aria-label={`${SIDE_NAME.home} ${r.share.home}%, ${SIDE_NAME.adi} ${r.share.adi}%`}>
              <span className="split__fill split__fill--home" style={{ inlineSize: `${r.share.home}%` }} />
              <span className="split__fill split__fill--adi" style={{ inlineSize: `${r.share.adi}%` }} />
            </div>
            <ul className="bars">
              {USERS.map((u) => {
                const side = USERS_OF.home.includes(u) ? 'home' : 'adi';
                return (
                  <li key={u} className="bars__row">
                    <span className="bars__name">{USER_NAME[u]}</span>
                    <span className="bars__track">
                      <span className={`bars__fill bars__fill--${side}`} style={{ inlineSize: `${(r.perUser[u] / maxUser) * 100}%` }} />
                    </span>
                    <span className="bars__value">{hours(r.perUser[u])}</span>
                  </li>
                );
              })}
            </ul>
            <p className="muted small">כשאדיר ואור בחוץ יחד, זה נספר פעם אחת לבית. הרכב עמד בבית {percent(r.windowMs ? r.gapMs / r.windowMs : 0)} מהזמן.</p>
          </section>
        </>
      )}

      <Today day={todayDay} stats={todayStats} />

      <Timeline grid={grid} week={week} prevHref={q({ w: String(week - 1) })} nextHref={week < 0 ? q({ w: String(week + 1) }) : null} />

      {r.collisions.length > 0 && (
        <section className="stack">
          <h2 className="h2">כל ההתנגשויות בטווח</h2>
          <ul className="tray">
            {[...r.collisions].reverse().map((c) => (
              <li key={c.s} className="trip trip--clash">
                <span className="trip__main">{timeWindow(c.s, c.e)}</span>
                <span className="trip__side">{names(c.users)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}
