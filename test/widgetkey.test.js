import { describe, it, expect } from 'vitest';
import { fillWidgetScript, hashWidgetKey, isWidgetKey, newWidgetKey } from '../lib/widgetkey.js';

describe('widget keys', () => {
  it('are random, well-formed, and different every time', () => {
    const a = newWidgetKey();
    const b = newWidgetKey();
    expect(isWidgetKey(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(isWidgetKey('rw_short')).toBe(false);
    expect(isWidgetKey(null)).toBe(false);
  });
  it('hash to a stable 64-hex SHA-256', async () => {
    expect(await hashWidgetKey('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('fill only the API_KEY line', () => {
    const k = newWidgetKey();
    const src = 'const APP_URL = "x";\nconst API_KEY = "<paste>"; // edit\nconst API_KEY_NOT = 1;\n';
    const out = fillWidgetScript(src, k);
    expect(out.split('\n')[1]).toBe(`const API_KEY = "${k}"; // yours — do not share`);
    expect(out.split('\n')[2]).toBe('const API_KEY_NOT = 1;');
    expect(fillWidgetScript('no line here', k)).toBeNull();
    expect(fillWidgetScript(src, 'bad')).toBeNull();
  });
});
