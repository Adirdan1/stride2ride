// Presentation helpers. Rounding happens here, at the edge, and nowhere else.
import { localParts, HOUR, MINUTE, SIDE_NAME, USER_NAME, ZONE } from './core.js';

const WEEKDAY = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const pad = (n) => String(n).padStart(2, '0');

// Left-to-right isolate. Digits are weak characters: inside an RTL line,
// '18:00–23:00' reorders to '23:00–18:00' unless it is isolated as LTR.
export const ltr = (s) => `\u2066${s}\u2069`;

export function weekdayShort(w) {
  return WEEKDAY[w];
}

export function clock(ms, zone = ZONE) {
  const p = localParts(ms, zone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

// 'ג׳ 3.11'
export function dayLabel(ms, zone = ZONE) {
  const p = localParts(ms, zone);
  return `${WEEKDAY[p.weekday]} ${ltr(`${p.day}.${p.month}`)}`;
}

export function dateLabel(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d}.${m}.${y}`;
}

// Elapsed time, for "out for": '45 דק׳', '2:05 שע׳'.
export function elapsed(ms) {
  const mins = Math.max(0, Math.floor(ms / MINUTE));
  if (mins < 60) return `${mins} דק׳`;
  return `${Math.floor(mins / 60)}:${pad(mins % 60)} שע׳`;
}

// Totals: one decimal place of hours.
export function hours(ms) {
  const h = ms / HOUR;
  const v = h >= 100 ? Math.round(h) : Math.round(h * 10) / 10;
  return `${v.toLocaleString('he-IL')} שע׳`;
}

export function percent(fraction) {
  if (!(fraction > 0)) return '0%';
  const p = fraction * 100;
  return `${p < 10 ? Math.round(p * 10) / 10 : Math.round(p)}%`;
}

// Agorot → '1,352 ₪'. Whole shekels unless the amount is under 10.
export function shekels(agorot) {
  const s = agorot / 100;
  const digits = Math.abs(s) < 10 && s % 1 !== 0 ? 2 : 0;
  return `${s.toLocaleString('he-IL', { minimumFractionDigits: digits, maximumFractionDigits: digits })}\u00a0₪`;
}

// A time window, with the date repeated only when it crosses midnight.
export function timeWindow(s, e, zone = ZONE) {
  const a = dayLabel(s, zone);
  const b = dayLabel(e, zone);
  return a === b
    ? `${a} · ${ltr(`${clock(s, zone)}–${clock(e, zone)}`)}`
    : `${a} ${ltr(clock(s, zone))} עד ${b} ${ltr(clock(e, zone))}`;
}

export function names(users) {
  const list = users.map((u) => USER_NAME[u]);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} ו${list[list.length - 1]}`;
}

// The widget's words, from core's glance(). The shared widget layout: one
// dominant state, one secondary line, one detail row for medium.
export function widgetView(g, zone = ZONE) {
  const who = g.out.map((o) => o.user);
  let hero;
  let sub;
  if (who.length === 0) {
    hero = 'הרכב בבית';
    sub = 'אף אחד לא בחוץ';
  } else {
    hero = `${names(who)} בחוץ`;
    sub = `מ־${clock(g.out[0].since, zone)}`;
  }
  const lost = `${g.lost.stopped ? 'הפסדנו עד ההחלטה' : 'הפסדנו עד היום'} ${shekels(g.lost.total)}`;
  const detail = g.month.tripCount
    ? `החודש ${percent(g.month.collisionRate)} התנגשות · ${SIDE_NAME.home} ${g.month.share.home}% · ${SIDE_NAME.adi} ${g.month.share.adi}%`
    : 'החודש: עוד אין נסיעות';
  return {
    state: g.clashNow ? 'clash' : who.length ? 'out' : 'home',
    hero,
    sub: g.clashNow ? `${sub} · התנגשות` : sub,
    lost,
    detail,
    share: g.month.tripCount ? g.month.share : null,
  };
}
