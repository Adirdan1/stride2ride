// The home-screen icons, generated from code so the palette lives in one file.
//
//   npm run icons
//
// THE CLIMB is the family's mark, not this app's: four rising bars, the
// tallest live, topped by a summit that says what the app is climbing towards.
// The bars below are Stride's numbers, copied rather than re-derived, so "the
// same bars" is a fact (ship-stride-app, Design language). Only the summit and
// the palette are stride2ride's.
//
// Redesign, 2026-11-03: the old icon drew its own climb — wider bars (0.12),
// shorter heights (0.16–0.40), a wheel of r 0.15 that swallowed the live bar,
// on the shared ink ground. Beside its siblings at 60px it read as a wheel
// with a bar chart behind it rather than as a sibling. Now it is Stride's
// climb on a road-tinted near-black, with a wheel the size of every other
// summit (r 0.078) sunk into the live bar the way Stride's flame is.
//
// PNG is encoded by hand with node:zlib; shapes are predicates sampled 4×4 per pixel.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// Palette roles as Stride defines them: GROUND is the app's paper with the
// lights off; SPENT recessed but never invisible; LIVE the accent; the summit a
// brighter step up from LIVE, so the eye travels to the top and the two layers
// do not fuse.
const GROUND = [0x12, 0x19, 0x1e]; // the road at night
const SPENT = [0x37, 0x47, 0x52];
const LIVE = [0x5b, 0x9a, 0xbf];   // the road, at its illustration value
const TYRE = [0xd6, 0xe8, 0xf2];   // the summit: a step paler than the live bar
const HUB = [0xf2, 0xc2, 0x4e];    // the hub and spokes: warm, so the wheel has a centre at 60px
// The wheel's well is the ground showing through, so the tyre reads as a ring
// rather than a dot — the same trick as stride2palette's thumb hole.
const WELL = GROUND;

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const c = pixel((x + (sx + 0.5) / 4) / size, (y + (sy + 0.5) / 4) / size);
        acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = acc[0] / 16; raw[o + 1] = acc[1] / 16; raw[o + 2] = acc[2] / 16;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const roundRect = (x0, y0, w, h, r) => (x, y) => {
  const x1 = x0 + w, y1 = y0 + h;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// Stride's climb, in a 0–1 square.
const BAR_W = 0.105;
const BAR_GAP = 0.055;
const HEIGHTS = [0.20, 0.30, 0.40, 0.52];
const RADIUS = 0.032;
const BASELINE = 0.82;
// The family's summit size (Stride #7, stride2wealth #7): smaller reads as an
// accessory of the bar rather than its subject.
const R = 0.094;

// inset > 0 pulls the mark into the maskable safe zone.
export function drawing(inset = 0) {
  const k = 1 - inset * 2;
  const at = (v) => inset + v * k;
  const spanW = HEIGHTS.length * BAR_W + (HEIGHTS.length - 1) * BAR_GAP;
  const startX = (1 - spanW) / 2;
  const bars = HEIGHTS.map((h, i) => roundRect(at(startX + i * (BAR_W + BAR_GAP)), at(BASELINE - h), BAR_W * k, h * k, RADIUS * k));
  const cx = at(startX + 3 * (BAR_W + BAR_GAP) + BAR_W / 2);
  // Sunk into the live bar, as Stride's flame is, so there is no lollipop waist.
  const cy = at(BASELINE - HEIGHTS[3] - R * 0.42);
  const r = R * k;
  const tyre = circle(cx, cy, r);
  const well = circle(cx, cy, r * 0.7);
  const hub = circle(cx, cy, r * 0.22);
  // Three spokes, hub to tyre: what makes a ring a wheel rather than a donut.
  // Three, not five — five closed up into a disc at 60px.
  const spoke = (x, y) => {
    const dx = x - cx, dy = y - cy;
    for (let s = 0; s < 5; s++) {
      const th = -Math.PI / 2 + (s * 2 * Math.PI) / 5;
      const along = dx * Math.cos(th) + dy * Math.sin(th);
      const across = -dx * Math.sin(th) + dy * Math.cos(th);
      if (along > 0 && Math.abs(across) < r * 0.09) return true;
    }
    return false;
  };
  return (x, y) => {
    if (tyre(x, y)) {
      if (hub(x, y)) return HUB;
      if (well(x, y)) return spoke(x, y) ? WELL : HUB;
      return TYRE;
    }
    if (bars[3](x, y)) return LIVE;
    for (let i = 0; i < 3; i++) if (bars[i](x, y)) return SPENT;
    return GROUND;
  };
}

export function render(size, inset = 0) {
  return png(size, drawing(inset));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = (name, size, inset) => writeFileSync(new URL(`../public/${name}`, import.meta.url), render(size, inset));
  // Full bleed: iOS rounds the corners itself.
  out('icon-192.png', 192, 0);
  out('icon-512.png', 512, 0);
  out('apple-icon.png', 180, 0);
  out('icon-maskable-512.png', 512, 0.1);
  console.log('icons written');
}
