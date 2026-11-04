import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isUser } from '@/lib/core';
import { deleteWidgetKey, listWidgetKeys } from '@/lib/repo';

export const dynamic = 'force-dynamic';

async function me() {
  const u = (await cookies()).get('ride_me')?.value;
  return isUser(u) ? u : null;
}

export async function GET() {
  const u = await me();
  if (!u) return NextResponse.json({ error: 'צריך לבחור מי את/ה' }, { status: 400 });
  return NextResponse.json({ keys: await listWidgetKeys(u) });
}

// Revoke one of this person's own keys. The widget holding it shows
// "check the key" from its next refresh.
export async function DELETE(req) {
  const u = await me();
  const id = new URL(req.url).searchParams.get('id');
  if (!u || !id) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  await deleteWidgetKey(u, id);
  return NextResponse.json({ ok: true });
}
