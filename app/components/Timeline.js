import Link from 'next/link';
import { SIDE_NAME } from '@/lib/core';
import { ltr, weekdayShort } from '@/lib/format';

const pct = (x) => `${(x * 100).toFixed(3)}%`;

function Bars({ list, className }) {
  return list.map((iv, i) => (
    <span key={i} className={className} style={{ insetInlineStart: pct(iv.a), inlineSize: pct(iv.b - iv.a) }} />
  ));
}

// Seven days × 24 hours. In RTL, the day runs from the right, like the text.
// Each day has two lanes — the house on top, Adi beneath — so households are
// told apart by position before colour. A collision is a band across both lanes.
export default function Timeline({ grid, week, prevHref, nextHref }) {
  const [d0, d6] = [grid[0].date, grid[6].date].map((d) => d.split('-').map(Number));
  return (
    <section className="card timeline">
      <div className="timeline__head">
        <Link href={prevHref} className="icon-btn" aria-label="שבוע קודם">›</Link>
        <h2 className="h2">
          {week === 0 ? 'השבוע' : ltr(`${d0[2]}.${d0[1]}–${d6[2]}.${d6[1]}`)}
        </h2>
        {nextHref ? <Link href={nextHref} className="icon-btn" aria-label="שבוע הבא">‹</Link> : <span className="icon-btn icon-btn--off" />}
      </div>

      <div className="timeline__grid">
        {grid.map((day) => (
          <div key={day.date} className={`tl-day${day.today ? ' tl-day--today' : ''}${day.future ? ' tl-day--future' : ''}`}>
            <span className="tl-day__label">
              {weekdayShort(day.weekday)}
              <small>{Number(day.date.slice(8))}.{Number(day.date.slice(5, 7))}</small>
            </span>
            <span className="tl-day__track">
              <span className="tl-lane tl-lane--home"><Bars list={day.home} className="tl-bar tl-bar--home" /></span>
              <span className="tl-lane tl-lane--adi"><Bars list={day.adi} className="tl-bar tl-bar--adi" /></span>
              <Bars list={day.clash} className="tl-clash" />
            </span>
          </div>
        ))}
        <div className="tl-hours" aria-hidden="true">
          <span />
          <span className="tl-hours__track">
            {[0, 6, 12, 18, 24].map((h) => (
              <span key={h} style={{ insetInlineStart: pct(h / 24) }}>{h}</span>
            ))}
          </span>
        </div>
      </div>

      <ul className="legend">
        <li><span className="swatch swatch--home" />{SIDE_NAME.home}</li>
        <li><span className="swatch swatch--adi" />{SIDE_NAME.adi}</li>
        <li><span className="swatch swatch--clash" />התנגשות</li>
      </ul>
    </section>
  );
}
