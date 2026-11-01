import { describe, it, expect } from 'vitest';
import { fromLocal } from '../lib/core.js';
import { timeWindow, elapsed, hours, shekels, names, percent } from '../lib/format.js';

const strip = (s) => s.replace(/[⁦⁩]/g, '');

describe('format', () => {
  it('a same-day window keeps start before end, isolated as LTR', () => {
    const s = timeWindow(fromLocal(2026, 11, 2, 18, 0), fromLocal(2026, 11, 2, 23, 0));
    expect(strip(s)).toBe('ב׳ 2.11 · 18:00–23:00');
    expect(s).toContain('⁦18:00–23:00⁩');
  });
  it('a window crossing midnight names both days', () => {
    expect(strip(timeWindow(fromLocal(2026, 11, 3, 22, 0), fromLocal(2026, 11, 4, 1, 30)))).toBe('ג׳ 3.11 22:00 עד ד׳ 4.11 01:30');
  });
  it('durations, totals, money, names', () => {
    expect(elapsed(45 * 60000)).toBe('45 דק׳');
    expect(elapsed(125 * 60000)).toBe('2:05 שע׳');
    expect(hours(90 * 60000)).toBe('1.5 שע׳');
    expect(shekels(135200)).toBe('1,352\u00a0₪');
    expect(shekels(0)).toBe('0\u00a0₪');
    expect(names(['adir', 'or', 'adi'])).toBe('אדיר, אור ועדי');
    expect(percent(0.096)).toBe('9.6%');
    expect(percent(0)).toBe('0%');
  });
});
