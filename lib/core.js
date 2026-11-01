// stride2ride — all of the app's rules, as pure functions.
//
// No imports. No clock: every function that needs "now" takes it as an argument.
// Instants are integer milliseconds since the epoch. Calendar dates are
// 'YYYY-MM-DD' strings, and date arithmetic runs on integer day numbers.

// ─── people ────────────────────────────────────────────────────────────────

export const USERS = ['adir', 'or', 'adi'];

export const USER_NAME = { adir: 'אדיר', or: 'אור', adi: 'עדי' };

// Two households. Adir and Or already share one car, so overlaps between them
// are not collisions — only overlaps across sides are.
export const SIDES = ['home', 'adi'];
export const SIDE_OF = { adir: 'home', or: 'home', adi: 'adi' };
export const SIDE_NAME = { home: 'אדיר ואור', adi: 'עדי' };
export const USERS_OF = { home: ['adir', 'or'], adi: ['adi'] };

export function isUser(u) {
  return USERS.includes(u);
}

// ─── time zones ────────────────────────────────────────────────────────────

export const ZONE = 'Asia/Jerusalem';
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const offsetFormatters = new Map();

// The only time-zone-aware function in the codebase. Everything that decides
// which local day or hour an instant falls in goes through here.
// Returns the zone's offset from UTC, in minutes, at the given instant.
export function zoneOffsetMinutes(ms, zone = ZONE) {
  let f = offsetFormatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    offsetFormatters.set(zone, f);
  }
  const p = {};
  for (const { type, value } of f.formatToParts(new Date(ms))) p[type] = value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - (ms - (ms % 1000 + 1000) % 1000)) / MINUTE);
}

// Wall-clock parts of an instant in a zone. weekday: 0 = Sunday.
export function localParts(ms, zone = ZONE) {
  const d = new Date(ms + zoneOffsetMinutes(ms, zone) * MINUTE);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  };
}

// The instant at which a zone's wall clock reads the given time.
// In a spring-forward gap the time does not exist and the result lands just
// after it; in a fall-back repeat the earlier of the two instants is chosen.
export function fromLocal(year, month, day, hour = 0, minute = 0, zone = ZONE) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wall - zoneOffsetMinutes(wall, zone) * MINUTE;
  guess = wall - zoneOffsetMinutes(guess, zone) * MINUTE;
  const earlier = wall - zoneOffsetMinutes(guess - HOUR, zone) * MINUTE;
  if (earlier < guess && localKey(earlier, zone) === localKey(guess, zone)) return earlier;
  return guess;
}

function localKey(ms, zone) {
  const p = localParts(ms, zone);
  return `${p.year}-${p.month}-${p.day}-${p.hour}-${p.minute}`;
}

const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' of the local calendar day an instant falls on.
export function localDate(ms, zone = ZONE) {
  const p = localParts(ms, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

// Value for <input type="datetime-local">: 'YYYY-MM-DDTHH:MM'.
export function toLocalInput(ms, zone = ZONE) {
  const p = localParts(ms, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

// Parse 'YYYY-MM-DDTHH:MM' as wall-clock time in the zone. null if malformed.
export function parseLocalInput(s, zone = ZONE) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo) || h > 23 || mi > 59) return null;
  return fromLocal(y, mo, d, h, mi, zone);
}

// Start of the local day containing ms.
export function startOfLocalDay(ms, zone = ZONE) {
  const p = localParts(ms, zone);
  return fromLocal(p.year, p.month, p.day, 0, 0, zone);
}

// ─── calendar dates ────────────────────────────────────────────────────────

export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? ''));
  if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return { year: y, month: mo, day: d };
}

export function isDate(s) {
  return parseDate(s) !== null;
}

function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y, m) {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

// Days since 1970-01-01 (civil-from-days, Howard Hinnant). No offsets, no DST.
export function dayNumber(s) {
  const p = parseDate(s);
  if (!p) throw new Error(`bad date: ${s}`);
  let { year: y, month: m, day: d } = p;
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNumber(n) {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function addDays(s, n) {
  return fromDayNumber(dayNumber(s) + n);
}

// 0 = Sunday. 1970-01-01 was a Thursday.
export function weekdayOf(s) {
  return (((dayNumber(s) + 4) % 7) + 7) % 7;
}

export function startOfDayMs(s, zone = ZONE) {
  const p = parseDate(s);
  return fromLocal(p.year, p.month, p.day, 0, 0, zone);
}

// ─── intervals ─────────────────────────────────────────────────────────────
// An interval is [start, end) in ms. Lists are sorted, non-overlapping once
// they have been through union().

// Trips → intervals. An open trip runs until now. A trip that starts in the
// future (a clock skew, a typo) contributes nothing yet.
export function toIntervals(trips, now) {
  const out = [];
  for (const t of trips) {
    const s = t.startedAt;
    const e = t.endedAt ?? now;
    if (!(e > s)) continue;
    out.push({ id: t.id, user: t.user, side: SIDE_OF[t.user], s, e, open: t.endedAt == null });
  }
  return out;
}

export function clip(intervals, from, to) {
  const out = [];
  for (const iv of intervals) {
    const s = Math.max(iv.s, from);
    const e = Math.min(iv.e, to);
    if (e > s) out.push({ ...iv, s, e });
  }
  return out;
}

export function union(intervals) {
  const sorted = intervals.map((iv) => [iv.s, iv.e]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last.e) last.e = Math.max(last.e, e);
    else out.push({ s, e });
  }
  return out;
}

// Intersection of two union()ed lists.
export function intersect(a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const s = Math.max(a[i].s, b[j].s);
    const e = Math.min(a[i].e, b[j].e);
    if (e > s) out.push({ s, e });
    if (a[i].e < b[j].e) i++;
    else j++;
  }
  return out;
}

export function total(list) {
  let sum = 0;
  for (const iv of list) sum += iv.e - iv.s;
  return sum;
}

function overlaps(a, b) {
  return a.s < b.e && b.s < a.e;
}

// ─── usage analysis ────────────────────────────────────────────────────────

// The window a range covers. 'all' starts at the first log; week starts on
// Sunday (the Israeli week); month on the 1st. All end now.
export function rangeWindow(kind, now, firstStart, zone = ZONE) {
  const today = localDate(now, zone);
  let from;
  if (kind === 'week') from = startOfDayMs(addDays(today, -weekdayOf(today)), zone);
  else if (kind === 'month') from = startOfDayMs(today.slice(0, 8) + '01', zone);
  else from = firstStart ?? now;
  return { from: Math.min(from, now), to: now };
}

// Everything screen 2 shows, for trips inside [from, to).
//
// - Household hours are the union of its members' trips: Adir and Or out at
//   the same time is one car out, not two.
// - Collision time is where the two households' unions intersect.
// - Collision rate is collision time over the time anyone had the car out
//   (the union of everything). 100% means every out-hour was a clash.
// - Gap time is the window minus the time anyone was out.
export function analyse(trips, { from, to, now }) {
  const ivs = clip(toIntervals(trips, now), from, to);

  const perUser = Object.fromEntries(USERS.map((u) => [u, 0]));
  for (const iv of ivs) perUser[iv.user] += iv.e - iv.s;

  const sideUnion = {
    home: union(ivs.filter((iv) => iv.side === 'home')),
    adi: union(ivs.filter((iv) => iv.side === 'adi')),
  };
  const perSide = { home: total(sideUnion.home), adi: total(sideUnion.adi) };
  const anyUnion = union(ivs);
  const anyMs = total(anyUnion);

  const segments = intersect(sideUnion.home, sideUnion.adi);
  const collisionMs = total(segments);

  const collisions = segments.map((seg) => {
    const who = new Set();
    for (const iv of ivs) if (overlaps(iv, seg)) who.add(iv.user);
    return { s: seg.s, e: seg.e, users: USERS.filter((u) => who.has(u)) };
  });

  const collidingTrips = new Set();
  for (const iv of ivs) if (segments.some((seg) => overlaps(iv, seg))) collidingTrips.add(iv.id);

  const windowMs = Math.max(0, to - from);
  const sidesMs = perSide.home + perSide.adi;

  return {
    from,
    to,
    windowMs,
    tripCount: new Set(ivs.map((iv) => iv.id)).size,
    perUser,
    perSide,
    anyMs,
    collisionMs,
    collisionRate: anyMs > 0 ? collisionMs / anyMs : 0,
    collisionTripCount: collidingTrips.size,
    collisions,
    share: splitPercent(perSide.home, perSide.adi),
    sidesMs,
    gapMs: Math.max(0, windowMs - anyMs),
  };
}

// Two whole percentages that always sum to 100 (or both 0).
export function splitPercent(a, b) {
  const sum = a + b;
  if (sum <= 0) return { home: 0, adi: 0 };
  const home = Math.round((a / sum) * 100);
  return { home, adi: 100 - home };
}

// Sunday of the local week containing `now`, shifted by `offset` weeks.
export function weekStartDate(now, offset = 0, zone = ZONE) {
  const today = localDate(now, zone);
  return addDays(today, -weekdayOf(today) + 7 * offset);
}

// The weekly timeline: seven local days, each with each household's time out
// and the collisions, as fractions [0, 1] of that day. Fractions are of the
// day's real length, so a 23- or 25-hour DST day still fills its row.
export function weekGrid(trips, startDate, now, zone = ZONE) {
  const ivs = toIntervals(trips, now);
  const days = [];
  for (let k = 0; k < 7; k++) {
    const date = addDays(startDate, k);
    const s = startOfDayMs(date, zone);
    const e = startOfDayMs(addDays(date, 1), zone);
    const len = e - s;
    const inDay = clip(ivs, s, e);
    const home = union(inDay.filter((iv) => iv.side === 'home'));
    const adi = union(inDay.filter((iv) => iv.side === 'adi'));
    const clash = intersect(home, adi);
    const frac = (list) => list.map((iv) => ({ a: (iv.s - s) / len, b: (iv.e - s) / len }));
    days.push({
      date,
      weekday: weekdayOf(date),
      future: s > now,
      today: date === localDate(now, zone),
      home: frac(home),
      adi: frac(adi),
      clash: frac(clash),
    });
  }
  return days;
}

// ─── home screen ───────────────────────────────────────────────────────────

export function openTripOf(trips, user) {
  return trips.find((t) => t.user === user && t.endedAt == null) ?? null;
}

export function whoIsOut(trips) {
  return trips
    .filter((t) => t.endedAt == null)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((t) => ({ user: t.user, since: t.startedAt }));
}

export function recentTrips(trips, user, n = 5) {
  return trips
    .filter((t) => t.user === user)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, n);
}

// ─── trip validation ───────────────────────────────────────────────────────

const SKEW = 5 * MINUTE;

// Returns a Hebrew message, or null if the trip is fine. `others` are the
// other trips in the log; a person cannot be out twice at once.
export function tripProblem({ user, startedAt, endedAt, id }, others, now) {
  if (!isUser(user)) return 'משתמש לא מוכר';
  if (!Number.isFinite(startedAt)) return 'חסרה שעת יציאה';
  if (startedAt > now + SKEW) return 'שעת היציאה בעתיד';
  if (endedAt != null) {
    if (!Number.isFinite(endedAt)) return 'שעת חזרה לא תקינה';
    if (endedAt <= startedAt) return 'החזרה צריכה להיות אחרי היציאה';
    if (endedAt > now + SKEW) return 'שעת החזרה בעתיד';
  }
  const mine = { s: startedAt, e: endedAt ?? Infinity };
  for (const t of others) {
    if (t.id === id || t.user !== user) continue;
    if (endedAt == null && t.endedAt == null) return 'כבר יש נסיעה פתוחה';
    if (overlaps(mine, { s: t.startedAt, e: t.endedAt ?? Infinity })) return 'חופף לנסיעה אחרת שלך';
  }
  return null;
}

// ─── savings ───────────────────────────────────────────────────────────────
// Money is integer agorot throughout; rates are integer basis points.

// Days lost: from the tracking start to today, or to the decision date once
// there is one. Never negative.
export function daysLost(settings, today) {
  const end = settings.decisionDate && settings.decisionDate < today ? settings.decisionDate : today;
  return Math.max(0, dayNumber(end) - dayNumber(settings.trackingStart));
}

// Daily accrual: a month's saving is a twelfth of a year's, spread over 365 days.
export function accrued(monthlyAgorot, days) {
  return Math.round((monthlyAgorot * 12 * days) / 365);
}

export function lostSoFar(settings, today) {
  const days = daysLost(settings, today);
  const home = accrued(settings.savingsHomeAgorot, days);
  const adi = accrued(settings.savingsAdiAgorot, days);
  return {
    days,
    stopped: Boolean(settings.decisionDate && settings.decisionDate <= today),
    home,
    adi,
    total: home + adi,
    perDay: {
      home: settings.savingsHomeAgorot * 12 / 365,
      adi: settings.savingsAdiAgorot * 12 / 365,
    },
  };
}

// Freed capital invested once, plus the monthly saving invested at the end of
// each month, compounded monthly at annual/12.
export function futureValue(monthlyAgorot, capitalAgorot, annualBp, months) {
  const i = annualBp / 10000 / 12;
  if (i === 0) return capitalAgorot + monthlyAgorot * months;
  const g = Math.pow(1 + i, months);
  return Math.round(capitalAgorot * g + (monthlyAgorot * (g - 1)) / i);
}

export function projections(settings, years = [5, 10]) {
  return years.map((y) => {
    const n = y * 12;
    const home = futureValue(settings.savingsHomeAgorot, settings.capitalAgorot, settings.annualReturnBp, n);
    const adi = futureValue(settings.savingsAdiAgorot, settings.capitalAgorot, settings.annualReturnBp, n);
    return { years: y, home, adi, total: home + adi };
  });
}

// Settings arriving from the form. Shekels in, agorot out. Returns
// { value } or { error } with a Hebrew message.
export function parseSettings(input) {
  const shekels = (v) => {
    const n = Number(String(v ?? '').replace(/[,\s₪]/g, ''));
    return Number.isFinite(n) && n >= 0 && n < 1e8 ? Math.round(n * 100) : null;
  };
  const trackingStart = String(input.trackingStart ?? '').trim();
  const decisionDate = String(input.decisionDate ?? '').trim() || null;
  if (!isDate(trackingStart)) return { error: 'תאריך התחלה לא תקין' };
  if (decisionDate && !isDate(decisionDate)) return { error: 'תאריך החלטה לא תקין' };
  if (decisionDate && decisionDate < trackingStart) return { error: 'ההחלטה לא יכולה להיות לפני ההתחלה' };
  const home = shekels(input.savingsHome);
  const adi = shekels(input.savingsAdi);
  const capital = shekels(input.capital);
  if (home == null || adi == null || capital == null) return { error: 'סכום לא תקין' };
  const pct = Number(String(input.annualReturn ?? '').replace(/[%\s]/g, ''));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: 'תשואה לא תקינה' };
  return {
    value: {
      trackingStart,
      decisionDate,
      savingsHomeAgorot: home,
      savingsAdiAgorot: adi,
      capitalAgorot: capital,
      annualReturnBp: Math.round(pct * 100),
    },
  };
}
