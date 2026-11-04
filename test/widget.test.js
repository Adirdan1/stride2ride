import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fromLocal, glance } from '../lib/core.js';
import { widgetView } from '../lib/format.js';

const SETTINGS = {
  trackingStart: '2026-11-01', decisionDate: null,
  savingsHomeAgorot: 135200, savingsAdiAgorot: 81600, capitalAgorot: 2575000, annualReturnBp: 700,
};
let seq = 0;
const trip = (user, s, e = null) => ({ id: `t${++seq}`, user, car: user === 'adi' ? 'corsa' : 'star', startedAt: s, endedAt: e });
const strip = (s) => s.replace(/[⁦⁩]/g, '');
const NOW = fromLocal(2026, 11, 4, 16, 30);

describe('glance + widgetView', () => {
  it('with nobody out, the car is home and the money still runs', () => {
    const v = widgetView(glance([trip('adir', fromLocal(2026, 11, 4, 8, 0), fromLocal(2026, 11, 4, 9, 0))], SETTINGS, NOW));
    expect(v.state).toBe('home');
    expect(v.hero).toBe('הרכב בבית');
    // three days at (1,352 + 816) × 12 / 365 a day
    expect(v.lost).toBe('הפסדנו עד היום 214 ₪');
  });

  it('one person out: their name, since when', () => {
    const v = widgetView(glance([trip('adi', fromLocal(2026, 11, 4, 14, 10))], SETTINGS, NOW));
    expect(v.state).toBe('out');
    expect(v.hero).toBe('עדי בחוץ');
    expect(strip(v.sub)).toBe('מ־14:10');
  });

  it('both households out at once is a collision now; one household twice is not', () => {
    const clash = widgetView(glance([trip('adir', fromLocal(2026, 11, 4, 15, 0)), trip('adi', fromLocal(2026, 11, 4, 16, 0))], SETTINGS, NOW));
    expect(clash.state).toBe('clash');
    expect(clash.hero).toBe('אדיר ועדי בחוץ');
    expect(clash.sub).toContain('התנגשות');
    const house = widgetView(glance([trip('adir', fromLocal(2026, 11, 4, 15, 0)), trip('or', fromLocal(2026, 11, 4, 16, 0))], SETTINGS, NOW));
    expect(house.state).toBe('out');
  });

  it('the detail row is this month: collision rate and the split', () => {
    const trips = [
      trip('adir', fromLocal(2026, 11, 2, 10, 0), fromLocal(2026, 11, 2, 13, 0)),
      trip('adi', fromLocal(2026, 11, 2, 12, 0), fromLocal(2026, 11, 2, 13, 0)),
    ];
    const v = widgetView(glance(trips, SETTINGS, NOW));
    expect(v.share).toEqual({ home: 75, adi: 25 });
    expect(v.detail).toBe('החודש 33% התנגשות · אדיר ואור 75% · עדי 25%');
  });

  it('a month with no trips says so instead of 0% of nothing', () => {
    const v = widgetView(glance([], SETTINGS, NOW));
    expect(v.share).toBeNull();
    expect(v.detail).toBe('החודש: עוד אין נסיעות');
  });

  it('a decision stops the counter and the line says so', () => {
    const v = widgetView(glance([], { ...SETTINGS, decisionDate: '2026-11-03' }, NOW));
    expect(v.lost).toBe('הפסדנו עד ההחלטה 143 ₪');
  });
});

describe('scripts/widget.js', () => {
  const src = readFileSync(new URL('../scripts/widget.js', import.meta.url), 'utf8');
  it('never asks the device for its appearance — inside a widget it lies', () => {
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/isUsingDarkAppearance/);
  });
  it('opens with the two config lines, and the key line is the placeholder in the repo', () => {
    const [a, b] = src.split('\n');
    expect(a).toBe('const APP_URL = "https://stride2ride.vercel.app"; // filled in');
    expect(b).toMatch(/^const API_KEY = "<[^"]+>";/);
  });
});
