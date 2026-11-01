import { describe, it, expect } from 'vitest';
import { messageFor, audience, isGone, RIDER_NAME, CAR_NAME } from '../supabase/functions/ride-notify/messages.js';
import { base64UrlToBytes, deviceLabel } from '../lib/push.js';
import { USER_NAME, CAR_NAME as APP_CAR_NAME } from '../lib/core.js';

describe('push messages', () => {
  it('leaving names the rider and the car', () => {
    expect(messageFor({ kind: 'left', rider: 'adi', car: 'corsa', trip_id: 't1' }).title).toBe('🚗 עדי יצא עם הקורסה');
    expect(messageFor({ kind: 'left', rider: 'adir', car: 'star', trip_id: 't1' }).title).toBe('🚗 אדיר יצא עם הספייס סטאר');
  });
  it('returning puts the car first', () => {
    expect(messageFor({ kind: 'returned', rider: 'or', car: 'star', trip_id: 't1' }).title).toBe('🏠 הספייס סטאר חזרה (אור)');
  });
  it('a leave and a return of one trip have different tags; the same event repeated collapses', () => {
    const a = messageFor({ kind: 'left', rider: 'or', car: 'star', trip_id: 't1' });
    const b = messageFor({ kind: 'returned', rider: 'or', car: 'star', trip_id: 't1' });
    expect(a.tag).not.toBe(b.tag);
    expect(messageFor({ kind: 'left', rider: 'or', car: 'star', trip_id: 't1' }).tag).toBe(a.tag);
  });
  it('unknown riders, cars and kinds produce nothing', () => {
    expect(messageFor({ kind: 'left', rider: 'x', car: 'star' })).toBeNull();
    expect(messageFor({ kind: 'left', rider: 'or', car: 'tesla' })).toBeNull();
    expect(messageFor({ kind: 'bogus', rider: 'or', car: 'star' })).toBeNull();
    expect(messageFor(null)).toBeNull();
  });
  it('a test message exists and opens settings', () => {
    expect(messageFor({ kind: 'test' })).toMatchObject({ url: '/settings' });
  });
  it('everyone but the rider; a test only to its own device', () => {
    expect(audience({ kind: 'left', rider: 'adi' })).toEqual({ exceptRider: 'adi' });
    expect(audience({ kind: 'test', endpoint: 'https://x' })).toEqual({ endpoint: 'https://x' });
    expect(audience({ kind: 'test' })).toBeNull();
    expect(audience({ kind: 'left', rider: 'nobody' })).toBeNull();
  });
  it('404 and 410 mean gone; other failures do not', () => {
    expect(isGone(404)).toBe(true);
    expect(isGone(410)).toBe(true);
    expect(isGone(429)).toBe(false);
    expect(isGone(500)).toBe(false);
    expect(isGone(undefined)).toBe(false);
  });
  it('the function uses the same Hebrew names as the app', () => {
    expect(RIDER_NAME).toEqual(USER_NAME);
    expect(CAR_NAME).toEqual(APP_CAR_NAME);
  });
});

describe('push helpers', () => {
  it('decodes a base64url VAPID key to 65 raw bytes starting with 0x04', () => {
    const key = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url');
    const bytes = base64UrlToBytes(key);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
    expect(bytes[1]).toBe(7);
  });
  it('labels devices', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('iPhone');
    expect(deviceLabel('')).toBe('דפדפן');
  });
});
