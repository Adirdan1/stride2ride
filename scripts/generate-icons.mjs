// Generates the home-screen icons from code: the collection's climb — four
// rising bars, the tallest live — with this app's summit, a wheel.
// PNG is encoded by hand with node:zlib; shapes are predicates sampled 4×4 per pixel.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const GROUND = [0x1b, 0x1a, 0x17];   // --ink
const BAR = [0x57, 0x53, 0x4b];      // --ink-2
const LIVE = [0x7f, 0xb3, 0xd1];     // the road, at its bright illustration value
const TYRE = [0xf7, 0xf4, 0xee];     // --paper
const RIM = [0xd9, 0xa8, 0x43];      // a different tone from the bar, so the layers don't fuse
const HUB = [0x1b, 0x1a, 0x17];

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
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const roundRect = (x0, y0, x1, y1, r) => (x, y) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// scale < 1 shrinks the drawing into the maskable safe zone.
function drawing(scale) {
  const t = (v) => 0.5 + (v - 0.5) * scale;
  const s = (v) => v * scale;
  const w = 0.12, gap = 0.045, base = 0.82;
  const heights = [0.16, 0.26, 0.36, 0.40];
  const x0 = 0.5 - (4 * w + 3 * gap) / 2;
  const bars = heights.map((h, i) => {
    const xa = x0 + i * (w + gap);
    return roundRect(t(xa), t(base - h), t(xa + w), t(base), s(0.025));
  });
  // The summit sinks into the live bar, so there is no lollipop waist.
  const liveX = x0 + 3 * (w + gap) + w / 2;
  const cy = base - heights[3] - 0.03;
  const R = 0.15;
  const cx = liveX - 0.03;
  const tyre = circle(t(cx), t(cy), s(R));
  const rimOuter = circle(t(cx), t(cy), s(R * 0.74));
  const rimInner = circle(t(cx), t(cy), s(R * 0.6));
  const hub = circle(t(cx), t(cy), s(R * 0.2));
  // Five spokes: what turns a disc into a wheel.
  const spoke = (x, y) => {
    const dx = x - t(cx), dy = y - t(cy);
    const a = Math.atan2(dy, dx);
    const r = Math.hypot(dx, dy);
    for (let k = 0; k < 5; k++) {
      const th = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
      let d = a - th;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < Math.PI / 2 && Math.abs(r * Math.sin(d)) < s(R * 0.09)) return true;
    }
    return false;
  };
  return (x, y) => {
    if (hub(x, y)) return RIM;
    if (rimInner(x, y)) return spoke(x, y) ? RIM : HUB;
    if (rimOuter(x, y)) return RIM;
    if (tyre(x, y)) return TYRE;
    if (bars[3](x, y)) return LIVE;
    for (let i = 0; i < 3; i++) if (bars[i](x, y)) return BAR;
    return GROUND;
  };
}

const out = (name, size, scale) => writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size, drawing(scale)));
out('icon-192.png', 192, 1);
out('icon-512.png', 512, 1);
out('apple-icon.png', 180, 1);
out('icon-maskable-512.png', 512, 0.78);
console.log('icons written');
