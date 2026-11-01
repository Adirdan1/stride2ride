import { NextResponse } from 'next/server';
import { parseSettings } from '@/lib/core';
import { saveSettings } from '@/lib/repo';

export async function PUT(req) {
  const body = await req.json().catch(() => ({}));
  const r = parseSettings(body);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ settings: await saveSettings(r.value) });
}
