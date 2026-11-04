import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isUser, USER_NAME } from '@/lib/core';
import { addWidgetKey } from '@/lib/repo';
import { fillWidgetScript, hashWidgetKey, newWidgetKey } from '@/lib/widgetkey';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = join(process.cwd(), 'scripts', 'widget.js');

// The widget script, ready to paste, with a new key for whoever this phone
// says it is. Behind the PIN gate. Each call mints a key (revocable in
// Settings): only hashes are stored, so an old key cannot be put back.
export async function POST() {
  const me = (await cookies()).get('ride_me')?.value;
  if (!isUser(me)) return NextResponse.json({ error: 'צריך לבחור מי את/ה' }, { status: 400 });
  const key = newWidgetKey();
  const filled = fillWidgetScript(await readFile(SOURCE, 'utf8'), key);
  if (!filled) return NextResponse.json({ error: 'בסקריפט חסרה שורת המפתח' }, { status: 500 });
  await addWidgetKey(me, await hashWidgetKey(key), `סקריפט של ${USER_NAME[me]}`);
  return new Response(filled, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
