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
  const monthly = s.savingsHomeAgorot + s.savingsAdiAgorot;

  return (
    <Shell current="/savings" aside={isUser(me) ? <MeChip me={me} /> : null}>
      <section className="hero">
        <span className="hero__label">{lost.stopped ? 'הפסדנו עד ההחלטה' : 'הפסדנו עד היום'}</span>
        <span className="hero__value">{shekels(lost.total)}</span>
        <span className="hero__sub">
          {lost.days} ימים מאז {dateLabel(s.trackingStart)}
          {lost.stopped ? ` · הוחלט ב־${dateLabel(s.decisionDate)}, המונה נעצר` : ` · כל חודש של המתנה: ${shekels(monthly)}`}
        </span>
      </section>

      <section className="sides">
        <div className="side side--home">
          <span className="side__name">{SIDE_NAME.home}</span>
          <span className="side__value">{shekels(lost.home)}</span>
          <span className="side__sub">{shekels(s.savingsHomeAgorot)} בחודש</span>
        </div>
        <div className="side side--adi">
          <span className="side__name">{SIDE_NAME.adi}</span>
          <span className="side__value">{shekels(lost.adi)}</span>
          <span className="side__sub">{shekels(s.savingsAdiAgorot)} בחודש</span>
        </div>
      </section>

      <section className="projection">
        <p className="muted small">
          אם משקיעים את החיסכון החודשי ואת ההון שמתפנה ({shekels(s.capitalAgorot)} לכל צד) בתשואה של {s.annualReturnBp / 100}% בשנה:
        </p>
        <ul className="projection__rows">
          {[p5, p10].map((p) => (
            <li key={p.years}>
              <span>בעוד {p.years} שנים</span>
              <strong>{shekels(p.total)}</strong>
              <small className="muted">{SIDE_NAME.home} {shekels(p.home)} · {SIDE_NAME.adi} {shekels(p.adi)}</small>
            </li>
          ))}
        </ul>
      </section>

      <details className="card settings">
        <summary className="h2">הגדרות</summary>
        <SettingsForm settings={s} />
      </details>
    </Shell>
  );
}
