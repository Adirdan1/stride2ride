import { NextResponse } from 'next/server';
import { defaultCar, isCar, isUser, openTripOf, parseLocalInput, tripProblem } from '@/lib/core';
import { closeOpenTrip, insertTrip, listTrips } from '@/lib/repo';

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// { action: 'leave', user, car } / { action: 'return', user } — the big button, stamped with server time.
// { user, car, start, end }                                    — a trip added by hand (local 'YYYY-MM-DDTHH:MM').
// A missing car means the household's own car.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const user = body.user;
  if (!isUser(user)) return bad('משתמש לא מוכר');
  const car = body.car ?? defaultCar(user);
  if (!isCar(car)) return bad('רכב לא מוכר');
  const now = Date.now();

  if (body.action === 'leave') {
    const r = await insertTrip({ user, car, startedAt: now, endedAt: null });
    // Already out (a double tap, or a second device): that is fine, not an error.
    if (r.conflict) return NextResponse.json({ trip: openTripOf(await listTrips(), user) });
    return NextResponse.json({ trip: r.trip });
  }

  if (body.action === 'return') {
    const trip = await closeOpenTrip(user, now);
    if (!trip) return bad('אין נסיעה פתוחה', 409);
    return NextResponse.json({ trip });
  }

  const startedAt = parseLocalInput(body.start);
  const endedAt = body.end ? parseLocalInput(body.end) : null;
  if (startedAt == null) return bad('שעת יציאה לא תקינה');
  if (body.end && endedAt == null) return bad('שעת חזרה לא תקינה');
  const candidate = { user, car, startedAt, endedAt };
  const problem = tripProblem(candidate, await listTrips(), now);
  if (problem) return bad(problem);
  const r = await insertTrip(candidate);
  if (r.conflict) return bad('כבר יש נסיעה פתוחה');
  return NextResponse.json({ trip: r.trip });
}
