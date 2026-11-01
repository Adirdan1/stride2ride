import { describe, it, expect } from 'vitest';
import {
  analyse, union, intersect, total, toIntervals, clip, weekGrid, rangeWindow, weekStartDate,
  fromLocal, localParts, localDate, zoneOffsetMinutes, parseLocalInput, toLocalInput,
  dayNumber, fromDayNumber, addDays, weekdayOf, splitPercent,
  tripProblem, openTripOf, whoIsOut, recentTrips,
  daysLost, accrued, lostSoFar, futureValue, projections, parseSettings, HOUR, MINUTE,
} from '../lib/core.js';

// Wall-clock Jerusalem time → ms. November 2026 is winter time, UTC+2.
const J = (d, h, m = 0) => {
  const [y, mo, da] = d.split('-').map(Number);
  return fromLocal(y, mo, da, h, m);
};
let seq = 0;
const trip = (user, s, e) => ({ id: `t${++seq}`, user, startedAt: s, endedAt: e });

describe('zone handling', () => {
  it('knows Israel winter and summer offsets', () => {
    expect(zoneOffsetMinutes(Date.UTC(2026, 10, 1, 12))).toBe(120);
    expect(zoneOffsetMinutes(Date.UTC(2026, 6, 1, 12))).toBe(180);
  });
  it('fromLocal round-trips through localParts', () => {
    const ms = J('2026-11-03', 23, 45);
    expect(ms).toBe(Date.UTC(2026, 10, 3, 21, 45));
    expect(localParts(ms)).toMatchObject({ year: 2026, month: 11, day: 3, hour: 23, minute: 45, weekday: 2 });
  });
  it('local date flips at local midnight, not UTC midnight', () => {
    expect(localDate(Date.UTC(2026, 10, 1, 22, 30))).toBe('2026-11-02'); // 00:30 local
    expect(localDate(Date.UTC(2026, 10, 1, 21, 59))).toBe('2026-11-01');
  });
  it('fall-back hour picks the earlier instant', () => {
    // Israel 2026: clocks go back 02:00 → 01:00 on Sunday 25 October.
    const ms = fromLocal(2026, 10, 25, 1, 30);
    expect(ms).toBe(Date.UTC(2026, 9, 24, 22, 30));
  });
  it('datetime-local inputs round-trip', () => {
    const ms = parseLocalInput('2026-11-05T07:15');
    expect(ms).toBe(Date.UTC(2026, 10, 5, 5, 15));
    expect(toLocalInput(ms)).toBe('2026-11-05T07:15');
    expect(parseLocalInput('2026-02-30T07:15')).toBeNull();
    expect(parseLocalInput('nonsense')).toBeNull();
    expect(parseLocalInput('')).toBeNull();
  });
});

describe('calendar dates', () => {
  it('day numbers match Date.UTC across many years', () => {
    for (let n = -20000; n < 40000; n += 37) {
      const s = new Date(n * 86400000).toISOString().slice(0, 10);
      expect(dayNumber(s)).toBe(n);
      expect(fromDayNumber(n)).toBe(s);
    }
  });
  it('weekday: 2026-11-01 is a Sunday', () => {
    expect(weekdayOf('2026-11-01')).toBe(0);
    expect(weekdayOf('2026-11-07')).toBe(6);
  });
  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('intervals', () => {
  it('union merges overlapping and touching intervals', () => {
    expect(union([{ s: 5, e: 8 }, { s: 0, e: 2 }, { s: 1, e: 3 }, { s: 3, e: 4 }])).toEqual([
      { s: 0, e: 4 }, { s: 5, e: 8 },
    ]);
  });
  it('intersect finds every overlap between two lists', () => {
    const a = [{ s: 0, e: 10 }, { s: 20, e: 30 }];
    const b = [{ s: 5, e: 25 }, { s: 28, e: 40 }];
    expect(intersect(a, b)).toEqual([{ s: 5, e: 10 }, { s: 20, e: 25 }, { s: 28, e: 30 }]);
  });
  it('touching intervals do not collide', () => {
    expect(intersect([{ s: 0, e: 10 }], [{ s: 10, e: 20 }])).toEqual([]);
  });
  it('an open trip runs until now; a future trip contributes nothing', () => {
    const now = 100;
    const ivs = toIntervals([trip('adi', 40, null), trip('adir', 150, null)], now);
    expect(ivs).toHaveLength(1);
    expect(ivs[0]).toMatchObject({ s: 40, e: 100, open: true, side: 'adi' });
  });
  it('clip trims to the window and drops what falls outside', () => {
    expect(clip([{ s: 0, e: 10 }, { s: 20, e: 30 }], 5, 22)).toEqual([{ s: 5, e: 10 }, { s: 20, e: 22 }]);
  });
});

describe('analyse — collisions and shares', () => {
  const day = '2026-11-02';
  const now = J('2026-11-08', 12);
  const window = { from: J('2026-11-01', 0), to: now, now };

  it('a clean cross-household overlap', () => {
    const trips = [trip('adir', J(day, 8), J(day, 10)), trip('adi', J(day, 9), J(day, 12))];
    const r = analyse(trips, window);
    expect(r.collisionMs).toBe(1 * HOUR);
    expect(r.anyMs).toBe(4 * HOUR);
    expect(r.collisionRate).toBeCloseTo(0.25);
    expect(r.collisionTripCount).toBe(2);
    expect(r.collisions).toEqual([{ s: J(day, 9), e: J(day, 10), users: ['adir', 'adi'] }]);
    expect(r.perSide).toEqual({ home: 2 * HOUR, adi: 3 * HOUR });
    expect(r.share).toEqual({ home: 40, adi: 60 });
  });

  it('Adir and Or overlapping is not a collision, and counts once for the household', () => {
    const trips = [trip('adir', J(day, 8), J(day, 11)), trip('or', J(day, 9), J(day, 12))];
    const r = analyse(trips, window);
    expect(r.collisionMs).toBe(0);
    expect(r.collisionTripCount).toBe(0);
    expect(r.perSide.home).toBe(4 * HOUR);
    expect(r.perUser).toMatchObject({ adir: 3 * HOUR, or: 3 * HOUR, adi: 0 });
    expect(r.share).toEqual({ home: 100, adi: 0 });
  });

  it('both Adir and Or overlapping Adi is one collision window, not double-counted', () => {
    const trips = [
      trip('adir', J(day, 8), J(day, 11)),
      trip('or', J(day, 9), J(day, 12)),
      trip('adi', J(day, 10), J(day, 13)),
    ];
    const r = analyse(trips, window);
    expect(r.collisionMs).toBe(2 * HOUR); // 10–12
    expect(r.collisions).toHaveLength(1);
    expect(r.collisions[0].users).toEqual(['adir', 'or', 'adi']);
    expect(r.collisionTripCount).toBe(3);
    expect(r.anyMs).toBe(5 * HOUR);
    expect(r.collisionRate).toBeCloseTo(0.4);
  });

  it('trips crossing midnight collide across the date line', () => {
    const trips = [
      trip('or', J('2026-11-03', 22), J('2026-11-04', 2)),
      trip('adi', J('2026-11-04', 1), J('2026-11-04', 3)),
    ];
    const r = analyse(trips, window);
    expect(r.collisionMs).toBe(1 * HOUR);
    expect(r.collisions[0]).toMatchObject({ s: J('2026-11-04', 1), e: J('2026-11-04', 2) });
  });

  it('an open trip collides up to now, and no further', () => {
    const n = J(day, 15);
    const trips = [trip('adi', J(day, 13), null), trip('adir', J(day, 14), null)];
    const r = analyse(trips, { from: J(day, 0), to: n, now: n });
    expect(r.collisionMs).toBe(1 * HOUR);
    expect(r.perUser.adi).toBe(2 * HOUR);
    expect(r.collisionTripCount).toBe(2);
  });

  it('an open trip against a closed one that ended before now', () => {
    const n = J(day, 20);
    const trips = [trip('adi', J(day, 10), null), trip('or', J(day, 8), J(day, 11))];
    const r = analyse(trips, { from: J(day, 0), to: n, now: n });
    expect(r.collisionMs).toBe(1 * HOUR);
    expect(r.anyMs).toBe(12 * HOUR);
  });

  it('the range clips trips that straddle its start', () => {
    const trips = [trip('adir', J('2026-10-31', 22), J('2026-11-01', 2)), trip('adi', J('2026-10-31', 23), J('2026-11-01', 1))];
    const r = analyse(trips, { from: J('2026-11-01', 0), to: now, now });
    expect(r.collisionMs).toBe(1 * HOUR); // only 00:00–01:00 is inside
    expect(r.perUser.adir).toBe(2 * HOUR);
  });

  it('gaps are the window minus any time out', () => {
    const from = J(day, 0);
    const to = J('2026-11-03', 0);
    const trips = [trip('adir', J(day, 8), J(day, 10)), trip('adi', J(day, 9), J(day, 12))];
    const r = analyse(trips, { from, to, now: to });
    expect(r.gapMs).toBe(20 * HOUR);
  });

  it('no trips means zeros, not NaN', () => {
    const r = analyse([], window);
    expect(r.collisionRate).toBe(0);
    expect(r.share).toEqual({ home: 0, adi: 0 });
    expect(r.collisions).toEqual([]);
  });

  it('two separate collisions are listed separately', () => {
    const trips = [
      trip('adir', J(day, 8), J(day, 9)), trip('adi', J(day, 8, 30), J(day, 9, 30)),
      trip('or', J('2026-11-05', 18), J('2026-11-05', 20)), trip('adi', J('2026-11-05', 19), J('2026-11-05', 19, 15)),
    ];
    const r = analyse(trips, window);
    expect(r.collisions.map((c) => c.users)).toEqual([['adir', 'adi'], ['or', 'adi']]);
    expect(r.collisionMs).toBe(30 * MINUTE + 15 * MINUTE);
    expect(r.collisionTripCount).toBe(4);
  });

  it('splitPercent always sums to 100', () => {
    for (const [a, b] of [[1, 2], [1, 1], [58, 42], [333, 667], [1, 0]]) {
      const s = splitPercent(a, b);
      expect(s.home + s.adi).toBe(100);
    }
  });
});

describe('ranges and the weekly timeline', () => {
  const now = J('2026-11-04', 15); // Wednesday
  it('week starts Sunday, month on the 1st, all at the first log', () => {
    expect(rangeWindow('week', now).from).toBe(J('2026-11-01', 0));
    expect(rangeWindow('month', J('2026-11-20', 9)).from).toBe(J('2026-11-01', 0));
    expect(rangeWindow('all', now, J('2026-11-02', 7)).from).toBe(J('2026-11-02', 7));
    expect(rangeWindow('all', now, null).from).toBe(now);
  });
  it('weekStartDate shifts by weeks', () => {
    expect(weekStartDate(now)).toBe('2026-11-01');
    expect(weekStartDate(now, -1)).toBe('2026-10-25');
  });
  it('a midnight-crossing trip is split across two day rows', () => {
    const grid = weekGrid([trip('or', J('2026-11-03', 22), J('2026-11-04', 3))], '2026-11-01', now);
    expect(grid[2].home).toEqual([{ a: 22 / 24, b: 1 }]);
    expect(grid[3].home).toEqual([{ a: 0, b: 3 / 24 }]);
  });
  it('collisions are marked in the day they happen', () => {
    const grid = weekGrid(
      [trip('adir', J('2026-11-02', 6), J('2026-11-02', 12)), trip('adi', J('2026-11-02', 9), J('2026-11-02', 18))],
      '2026-11-01', now,
    );
    expect(grid[1].clash).toEqual([{ a: 9 / 24, b: 12 / 24 }]);
    expect(grid[0].clash).toEqual([]);
  });
  it('an open trip draws up to now and marks later days as future', () => {
    const grid = weekGrid([trip('adi', J('2026-11-04', 12), null)], '2026-11-01', now);
    expect(grid[3].adi).toEqual([{ a: 12 / 24, b: 15 / 24 }]);
    expect(grid[3].today).toBe(true);
    expect(grid[4].future).toBe(true);
  });
  it('a 25-hour fall-back day still spans its row', () => {
    const t = trip('adi', fromLocal(2026, 10, 25, 0, 0), fromLocal(2026, 10, 26, 0, 0));
    const grid = weekGrid([t], '2026-10-25', J('2026-11-01', 0));
    expect(grid[0].adi).toEqual([{ a: 0, b: 1 }]);
  });
});

describe('home helpers and validation', () => {
  const now = J('2026-11-04', 15);
  const trips = [trip('adir', J('2026-11-04', 9), J('2026-11-04', 10)), trip('adi', J('2026-11-04', 14), null)];
  it('finds open trips and who is out', () => {
    expect(openTripOf(trips, 'adi')).toBe(trips[1]);
    expect(openTripOf(trips, 'adir')).toBeNull();
    expect(whoIsOut(trips)).toEqual([{ user: 'adi', since: J('2026-11-04', 14) }]);
  });
  it('recent trips are mine, newest first, capped', () => {
    const many = Array.from({ length: 8 }, (_, k) => trip('or', J('2026-11-03', k), J('2026-11-03', k, 30)));
    const r = recentTrips([...many, ...trips], 'or');
    expect(r).toHaveLength(5);
    expect(r[0].startedAt).toBe(J('2026-11-03', 7));
  });
  it('rejects bad trips with a reason', () => {
    expect(tripProblem({ user: 'x', startedAt: 1 }, [], now)).toBeTruthy();
    expect(tripProblem({ user: 'or', startedAt: J('2026-11-04', 12), endedAt: J('2026-11-04', 11) }, [], now)).toMatch('אחרי');
    expect(tripProblem({ user: 'or', startedAt: J('2026-11-05', 12) }, [], now)).toMatch('בעתיד');
    expect(tripProblem({ user: 'adir', startedAt: J('2026-11-04', 9, 30), endedAt: J('2026-11-04', 11) }, trips, now)).toMatch('חופף');
    expect(tripProblem({ user: 'adi', startedAt: J('2026-11-04', 14, 30) }, trips, now)).toMatch('פתוחה');
  });
  it('accepts a trip that touches but does not overlap, and an edit of itself', () => {
    expect(tripProblem({ user: 'adir', startedAt: J('2026-11-04', 10), endedAt: J('2026-11-04', 11) }, trips, now)).toBeNull();
    expect(tripProblem({ ...trips[0], startedAt: J('2026-11-04', 8) }, trips, now)).toBeNull();
  });
});

describe('savings', () => {
  const s = {
    trackingStart: '2026-11-01', decisionDate: null,
    savingsHomeAgorot: 135200, savingsAdiAgorot: 81600, capitalAgorot: 2575000, annualReturnBp: 700,
  };
  it('nothing is lost on the start date itself', () => {
    expect(lostSoFar(s, '2026-11-01')).toMatchObject({ days: 0, home: 0, adi: 0, total: 0 });
  });
  it('accrues daily: a year is twelve months', () => {
    expect(lostSoFar(s, '2027-11-01')).toMatchObject({ days: 365, home: 1622400, adi: 979200 });
  });
  it('30 days, rounded once', () => {
    const r = lostSoFar(s, '2026-12-01');
    expect(r.home).toBe(Math.round((135200 * 12 * 30) / 365)); // 133,348 agorot ≈ 1,333 ₪
    expect(r.adi).toBe(Math.round((81600 * 12 * 30) / 365));
    expect(r.total).toBe(r.home + r.adi);
  });
  it('the decision date stops the counter', () => {
    const d = { ...s, decisionDate: '2026-11-11' };
    expect(lostSoFar(d, '2027-01-01')).toMatchObject({ days: 10, stopped: true });
    expect(lostSoFar(d, '2026-11-05')).toMatchObject({ days: 4, stopped: false });
  });
  it('never negative before the start date', () => {
    expect(daysLost(s, '2026-10-01')).toBe(0);
    expect(accrued(135200, 0)).toBe(0);
  });
  it('future value: capital compounded plus a monthly annuity', () => {
    expect(futureValue(0, 100000, 1200, 12)).toBe(Math.round(100000 * 1.01 ** 12));
    expect(futureValue(1000, 0, 0, 10)).toBe(10000);
    const fv = futureValue(135200, 2575000, 700, 60);
    const i = 0.07 / 12;
    expect(fv).toBe(Math.round(2575000 * (1 + i) ** 60 + (135200 * ((1 + i) ** 60 - 1)) / i));
    const [p5, p10] = projections(s);
    expect(p5.years).toBe(5);
    expect(p10.total).toBe(p10.home + p10.adi);
    expect(p10.home).toBeGreaterThan(p5.home);
  });
  it('parses the settings form in shekels', () => {
    const r = parseSettings({ trackingStart: '2026-11-01', decisionDate: '', savingsHome: '1,352', savingsAdi: '816', capital: '25750', annualReturn: '7' });
    expect(r.value).toEqual({ ...s });
    expect(parseSettings({ ...r, trackingStart: 'x' }).error).toBeTruthy();
    expect(parseSettings({ trackingStart: '2026-11-01', decisionDate: '2026-10-01', savingsHome: 1, savingsAdi: 1, capital: 1, annualReturn: 1 }).error).toBeTruthy();
    expect(parseSettings({ trackingStart: '2026-11-01', savingsHome: '-5', savingsAdi: 1, capital: 1, annualReturn: 1 }).error).toBeTruthy();
  });
});
