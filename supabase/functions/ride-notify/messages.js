// What a push says. Pure, no imports: deployed with the edge function and
// imported by the app's tests.

export const RIDER_NAME = { adir: 'אדיר', or: 'אור', adi: 'עדי' };
export const CAR_NAME = { star: 'ספייס סטאר', corsa: 'קורסה' };

// ─── the daily summary ─────────────────────────────────────────────────────
// The same arithmetic as the app's savings page (lib/core.js lostSoFar), kept
// here because the edge function cannot import the app. A test holds them equal.

function dayNumber(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

// settings is the ride.settings row as the database returns it.
export function lostSoFar(settings, today) {
  const decision = settings.decision_date;
  const end = decision && decision < today ? decision : today;
  const days = Math.max(0, dayNumber(end) - dayNumber(settings.tracking_start));
  const home = Math.round((settings.savings_home_agorot * 12 * days) / 365);
  const adi = Math.round((settings.savings_adi_agorot * 12 * days) / 365);
  return { days, home, adi, total: home + adi, stopped: Boolean(decision && decision <= today) };
}

export function shekels(agorot) {
  return `${Math.round(agorot / 100).toLocaleString('he-IL')}\u00a0₪`;
}

// null once a decision date has passed: the counter has stopped, so there is
// nothing left to remind anyone of.
export function dailyMessage(settings, today) {
  if (!settings || !today) return null;
  const l = lostSoFar(settings, today);
  if (l.stopped) return null;
  return {
    title: `💸 עד היום הפסדנו ${shekels(l.total)}`,
    body: `אדיר ואור ${shekels(l.home)} · עדי ${shekels(l.adi)} · ${l.days} ימים בלי החלטה`,
    tag: `ride-daily-${today}`,
    url: '/savings',
  };
}

// event: { kind: 'left' | 'returned' | 'test', rider?, car?, trip_id? }
//      | { kind: 'daily', settings, today }   (the function fills both in)
// Returns { title, body, tag, url } or null for anything unrecognised.
export function messageFor(event) {
  const kind = event?.kind;
  if (kind === 'daily') return dailyMessage(event.settings, event.today);
  if (kind === 'test') {
    return { title: '🔔 התראת בדיקה', body: 'ההתראות עובדות בטלפון הזה.', tag: 'ride-test', url: '/settings' };
  }
  const rider = RIDER_NAME[event?.rider];
  const car = CAR_NAME[event?.car];
  if (!rider || !car) return null;
  const tag = `ride-${event.trip_id ?? 'trip'}-${kind}`;
  if (kind === 'left') return { title: `🚗 ${rider} יצא עם ה${car}`, body: '', tag, url: '/' };
  if (kind === 'returned') return { title: `🏠 ה${car} חזרה (${rider})`, body: '', tag, url: '/' };
  return null;
}

// Who gets it: everyone except the person who logged the trip. A test goes
// only to the device that asked for it. The daily summary goes to everyone.
export function audience(event) {
  if (event?.kind === 'test') return event.endpoint ? { endpoint: event.endpoint } : null;
  if (event?.kind === 'daily') return { everyone: true };
  if (!RIDER_NAME[event?.rider]) return null;
  return { exceptRider: event.rider };
}

// A push service saying 404 or 410 means the subscription is gone for good.
export function isGone(statusCode) {
  return statusCode === 404 || statusCode === 410;
}
