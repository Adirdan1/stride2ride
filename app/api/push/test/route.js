import { NextResponse } from 'next/server';
import { findPushSubscription, sendTestPush } from '@/lib/repo';

// POST { endpoint } — a test push to this device only.
export async function POST(req) {
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== 'string' || !endpoint) return NextResponse.json({ error: 'אין מנוי במכשיר הזה' }, { status: 400 });
  if (!(await findPushSubscription(endpoint))) return NextResponse.json({ error: 'המכשיר לא רשום להתראות' }, { status: 404 });
  await sendTestPush(endpoint);
  return NextResponse.json({ ok: true });
}
