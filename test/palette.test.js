import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Contrast, asserted rather than reviewed once. Tokens are read out of the
// real app/globals.css — light from :root, dark from the prefers-color-scheme
// block — so a token change that breaks a pair fails here, in both themes.
// Text needs 4.5:1 (WCAG 1.4.3); a control's only boundary needs 3:1 (1.4.11).

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

function tokens(block) {
  const out = {};
  for (const [, name, value] of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) out[name] = value;
  return out;
}
const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')));
const darkBlock = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
const dark = { ...light, ...tokens(darkBlock.slice(0, darkBlock.indexOf('--lift'))) };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = [
  ['ink', 'paper'], ['ink', 'surface'], ['ink', 'break-wash'], // body; a collision row
  ['ink-2', 'paper'], ['ink-2', 'surface'], ['ink-2', 'sunken'], // labels, hours, the range track
  ['ink-3', 'paper'], ['ink-3', 'surface'], // faint meta lines
  ['paper', 'ink'], // the hero button
  ['road', 'paper'], ['road', 'surface'], // the house's share, links, today in the timeline
  ['lane', 'paper'], ['lane', 'surface'], // Adi's share
  ['break', 'paper'], ['break', 'surface'], ['break', 'break-wash'], // collisions, the warning
];
const BOUNDARY = [
  ['edge-control', 'surface'], ['edge-control', 'paper'], // fields, an unchosen car, secondary buttons
  ['road', 'paper'], // the focus ring
  ['ink', 'paper'], // the hollow "back home" button
];

describe.each([['light', light], ['dark', dark]])('%s theme', (_, t) => {
  it('reads every token it is about to test', () => {
    for (const [a, b] of [...TEXT, ...BOUNDARY]) {
      expect(t[a], a).toMatch(/^#/);
      expect(t[b], b).toMatch(/^#/);
    }
  });
  it.each(TEXT)('text %s on %s clears 4.5:1', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(BOUNDARY)('boundary %s on %s clears 3:1', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(3);
  });
});

it('ink-3 is not used on the sunken track, where it is under 4.5:1', () => {
  expect(ratio(light['ink-3'], light.sunken)).toBeLessThan(4.5);
  expect(css).toMatch(/\.segmented__item \{[^}]*color: var\(--ink-2\)/);
});

it('controls are outlined in --edge-control, never --line-strong', () => {
  for (const sel of ['input, textarea {', '.btn {', '.chip {', '.car {']) {
    const block = css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)));
    expect(block, sel).toMatch(/var\(--edge-control\)/);
  }
});
