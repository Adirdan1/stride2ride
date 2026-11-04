import { SIDE_NAME } from '@/lib/core';
import { hours, names, timeWindow } from '@/lib/format';

const pct = (x) => `${(x * 100).toFixed(3)}%`;

function Bars({ list, className }) {
  return list.map((iv, i) => (
    <span key={i} className={className} style={{ insetInlineStart: pct(iv.a), inlineSize: pct(iv.b - iv.a) }} />
  ));
}

// Today at a glance: one large day, the same lanes as the weekly timeline,
// with a mark at the current time. Independent of the range tabs.
export default function Today({ day, stats }) {
  const clashes = stats.collisions;
  return (
    <section className="card today">
      <div className="section-head">
        <h2 className="h2">היום</h2>
        <span className="muted small">
          {SIDE_NAME.home} {hours(stats.perSide.home)} · {SIDE_NAME.adi} {hours(stats.perSide.adi)}
        </span>
      </div>
      <div className="today__track tl-day__track">
        <span className="tl-lane tl-lane--home"><Bars list={day.home} className="tl-bar tl-bar--home" /></span>
        <span className="tl-lane tl-lane--adi"><Bars list={day.adi} className="tl-bar tl-bar--adi" /></span>
        <Bars list={day.clash} className="tl-clash" />
        {day.now != null && <span className="today__now" style={{ insetInlineStart: pct(day.now) }} role="img" aria-label="עכשיו" />}
      </div>
      <div className="tl-hours__track" aria-hidden="true">
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h} style={{ insetInlineStart: pct(h / 24) }}>{h}</span>
        ))}
      </div>
      {clashes.length === 0 ? (
        <p className="muted small today__line">היום אין התנגשויות.</p>
      ) : (
        <ul className="tray tray--flat">
          {clashes.map((c) => (
            <li key={c.s} className="trip trip--clash">
              <span className="trip__main">{timeWindow(c.s, c.e)}</span>
              <span className="trip__side">{names(c.users)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
