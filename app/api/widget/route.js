import { NextResponse } from 'next/server';
import { glance } from '@/lib/core';
import { widgetView } from '@/lib/format';
import { getSettings, listTrips, userOfWidgetKey } from '@/lib/repo';
import { hashWidgetKey, isWidgetKey } from '@/lib/widgetkey';

export const dynamic = 'force-dynamic';

// What the Scriptable widget draws, already in words. Exempt from the cookie
// gate (a widget has no cookie); it answers only to a widget key, which names
// the person who copied the script.
export async function GET(req) {
  const key = req.headers.get('x-api-key');
  if (!isWidgetKey(key) || !(await userOfWidgetKey(await hashWidgetKey(key)))) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  const [trips, settings] = await Promise.all([listTrips(), getSettings()]);
  return NextResponse.json(
    { view: widgetView(glance(trips, settings, Date.now())) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
