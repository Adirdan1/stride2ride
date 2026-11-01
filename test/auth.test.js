import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, safeEqual } from '../lib/auth.js';

describe('auth', () => {
  const now = 1_800_000_000_000;
  it('a signed token verifies with the same PIN only', async () => {
    const t = await signToken('1234', now);
    expect(await verifyToken('1234', t, now)).toBe(true);
    expect(await verifyToken('9999', t, now)).toBe(false);
  });
  it('rejects tampering, junk and expiry', async () => {
    const t = await signToken('1234', now);
    expect(await verifyToken('1234', t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a')), now)).toBe(false);
    expect(await verifyToken('1234', `${now + 1}.${t.split('.')[1]}`, now)).toBe(false);
    expect(await verifyToken('1234', 'junk', now)).toBe(false);
    expect(await verifyToken('1234', t, now + 366 * 86400000)).toBe(false);
    expect(await verifyToken('', t, now)).toBe(false);
  });
  it('safeEqual', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
