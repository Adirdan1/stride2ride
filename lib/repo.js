// The only module that knows table and column names.
// The database says `rider`; core says `user` (USER is reserved in Postgres).
import { db } from './db.js';

const TRIP_COLS = 'id, rider, car, started_at, ended_at';

function toTrip(r) {
  return {
    id: r.id,
    user: r.rider,
    car: r.car,
    startedAt: Date.parse(r.started_at),
    endedAt: r.ended_at ? Date.parse(r.ended_at) : null,
  };
}

const iso = (ms) => (ms == null ? null : new Date(ms).toISOString());

function check(error) {
  if (error) throw new Error(error.message);
}

export async function listTrips() {
  const { data, error } = await db().from('trips').select(TRIP_COLS).order('started_at', { ascending: true });
  check(error);
  return data.map(toTrip);
}

export async function insertTrip({ user, car, startedAt, endedAt }) {
  const { data, error } = await db()
    .from('trips')
    .insert({ rider: user, car, started_at: iso(startedAt), ended_at: iso(endedAt) })
    .select(TRIP_COLS)
    .single();
  if (error?.code === '23505') return { conflict: true };
  check(error);
  return { trip: toTrip(data) };
}

// Close whichever trip this person has open. null if there is none.
export async function closeOpenTrip(user, endedAt) {
  const { data, error } = await db()
    .from('trips')
    .update({ ended_at: iso(endedAt) })
    .eq('rider', user)
    .is('ended_at', null)
    .lt('started_at', iso(endedAt))
    .select(TRIP_COLS);
  check(error);
  return data.length ? toTrip(data[0]) : null;
}

export async function updateTrip(id, { car, startedAt, endedAt }) {
  const { data, error } = await db()
    .from('trips')
    .update({ car, started_at: iso(startedAt), ended_at: iso(endedAt) })
    .eq('id', id)
    .select(TRIP_COLS);
  if (error?.code === '23505') return { conflict: true };
  check(error);
  return { trip: data.length ? toTrip(data[0]) : null };
}

export async function deleteTrip(id) {
  const { error } = await db().from('trips').delete().eq('id', id);
  check(error);
}

// ─── push ──────────────────────────────────────────────────────────────────

export async function vapidPublicKey() {
  const { data, error } = await db().rpc('vapid_public_key');
  check(error);
  return data;
}

// One row per device, keyed by its push endpoint. Subscribing again from the
// same phone, or switching who the phone belongs to, updates that row.
export async function savePushSubscription({ user, endpoint, p256dh, auth, label }) {
  const { error } = await db()
    .from('push_subscriptions')
    .upsert({ rider: user, endpoint, p256dh, auth, device_label: label }, { onConflict: 'endpoint' });
  check(error);
}

export async function findPushSubscription(endpoint) {
  const { data, error } = await db().from('push_subscriptions').select('rider').eq('endpoint', endpoint).maybeSingle();
  check(error);
  return data ? { user: data.rider } : null;
}

// Asks Postgres to call ride-notify with { kind: 'test', endpoint }. Async:
// the push leaves within a second or two.
export async function sendTestPush(endpoint) {
  const { data, error } = await db().rpc('send_test_push', { p_endpoint: endpoint });
  check(error);
  return data;
}

function toSettings(r) {
  return {
    trackingStart: r.tracking_start,
    decisionDate: r.decision_date,
    savingsHomeAgorot: r.savings_home_agorot,
    savingsAdiAgorot: r.savings_adi_agorot,
    capitalAgorot: r.capital_agorot,
    annualReturnBp: r.annual_return_bp,
  };
}

export async function getSettings() {
  const { data, error } = await db().from('settings').select('*').eq('id', 1).single();
  check(error);
  return toSettings(data);
}

export async function saveSettings(s) {
  const { data, error } = await db()
    .from('settings')
    .update({
      tracking_start: s.trackingStart,
      decision_date: s.decisionDate,
      savings_home_agorot: s.savingsHomeAgorot,
      savings_adi_agorot: s.savingsAdiAgorot,
      capital_agorot: s.capitalAgorot,
      annual_return_bp: s.annualReturnBp,
    })
    .eq('id', 1)
    .select('*')
    .single();
  check(error);
  return toSettings(data);
}
