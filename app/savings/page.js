import { cookies } from 'next/headers';
import Shell from '../components/Shell';
import { MeChip } from '../components/Me';
import SettingsForm from '../components/SettingsForm';
import { isUser, localDate, lostSoFar, projections, SIDE_NAME } from '@/lib/core';
import { getSettings } from '@/lib/repo';
import { dateLabel, shekels } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Savings() {
  const me = (await cookies()).get('ride_me')?.value;
  const s = await getSettings();
  const today = localDate(Date.now());
  const lost = lostSoFar(s, today);
  const [p5, p10] = projections(s);

  const perDay = Math.round(lost.perDay.home + lost.perDay.adi);

  return (
    <Shell current="/savings" aside={isUser(me) ? <MeChip me={me} /> : null}>
      <section className={`hero${lost.stopped ? '' : ' hero--ticking'}`}>
        <span className="hero__label">{lost.stopped ? 'הפסדנו עד ההחלטה' : 'הפסדנו עד היום'}</span>
        <span className="hero__value">{shekels(lost.total)}</span>
        <span className="hero__sub">
          {lost.stopped
            ? `הוחלט ב־${dateLabel(s.decisionDate)}, המונה נעצר`
            : `עוד ${shekels(perDay)} כל יום בלי החלטה`}
        </span>
        <span className="hero__sub">{lost.days} ימים מאז {dateLabel(s.trackingStart)}</span>
      </section>

      {/* Each side's part of it. Same form as the usage split: the house's rule
          solid, Adi's dashed, so the two read apart in greyscale. */}
      <section className="strip" aria-label="לפי צד">
        <div className="strip__cell strip__cell--home">
          <span className="strip__name">{SIDE_NAME.home}</span>
          <span className="strip__value">{shekels(lost.home)}</span>
          <span className="strip__sub">{shekels(s.savingsHomeAgorot)} בחודש</span>
        </div>
        <div className="strip__cell strip__cell--adi">
          <span className="strip__name">{SIDE_NAME.adi}</span>
          <span className="strip__value">{shekels(lost.adi)}</span>
          <span className="strip__sub">{shekels(s.savingsAdiAgorot)} בחודש</span>
        </div>
      </section>

      <section className="stack">
        <h2 className="h2">מה זה שווה לאורך זמן</h2>
        <p className="muted small">
          אם משקיעים את החיסכון החודשי ואת ההון שמתפנה ({shekels(s.capitalAgorot)} לכל צד) בתשואה של {s.annualReturnBp / 100}% בשנה:
        </p>
        <ul className="tray">
          {[p5, p10].map((p) => (
            <li key={p.years} className="proj">
              <span className="proj__when">בעוד {p.years} שנים</span>
              <strong className="proj__total">{shekels(p.total)}</strong>
              <small className="proj__split">{SIDE_NAME.home} {shekels(p.home)} · {SIDE_NAME.adi} {shekels(p.adi)}</small>
            </li>
          ))}
        </ul>
      </section>

      <details className="tray settings">
        <summary className="h2">הגדרות החישוב</summary>
        <SettingsForm settings={s} />
      </details>
    </Shell>
  );
}
