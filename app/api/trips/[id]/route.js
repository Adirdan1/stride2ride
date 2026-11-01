import { NextResponse } from 'next/server';
import { parseLocalInput, tripProblem } from '@/lib/core';
import { deleteTrip, listTrips, updateTrip } from '@/lib/repo';

const bad = (error, status = 400) => NextResponse.json({ error }, { status });

export async function PATCH(req, { params }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const trips = await listTrips();
  const current = trips.find((t) => t.id === id);
  if (!current) return bad('הנסיעה לא נמצאה', 404);

  const startedAt = parseLocalInput(body.start);
  const endedAt = body.end ? parseLocalInput(body.end) : null;
  if (startedAt == null) return bad('שעת יציאה לא תקינה');
  if (body.end && endedAt == null) return bad('שעת חזרה לא תקינה');

  const candidate = { id, user: current.user, car: body.car ?? current.car, startedAt, endedAt };
  const problem = tripProblem(candidate, trips, Date.now());
  if (problem) return bad(problem);
  const r = await updateTrip(id, candidate);
  if (r.conflict) return bad('כבר יש נסיעה פתוחה');
  return NextResponse.json({ trip: r.trip });
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await deleteTrip(id);
  return NextResponse.json({ ok: true });
}
