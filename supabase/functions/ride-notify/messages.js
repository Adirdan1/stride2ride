// What a push says. Pure, no imports: deployed with the edge function and
// imported by the app's tests.

export const RIDER_NAME = { adir: 'אדיר', or: 'אור', adi: 'עדי' };
export const CAR_NAME = { star: 'ספייס סטאר', corsa: 'קורסה' };

// event: { kind: 'left' | 'returned' | 'test', rider?, car?, trip_id? }
// Returns { title, body, tag, url } or null for anything unrecognised.
export function messageFor(event) {
  const kind = event?.kind;
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
// only to the device that asked for it.
export function audience(event) {
  if (event?.kind === 'test') return event.endpoint ? { endpoint: event.endpoint } : null;
  if (!RIDER_NAME[event?.rider]) return null;
  return { exceptRider: event.rider };
}

// A push service saying 404 or 410 means the subscription is gone for good.
export function isGone(statusCode) {
  return statusCode === 404 || statusCode === 410;
}
