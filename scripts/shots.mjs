// Screenshots of the real built app, for review — not a test.
//
//   npm run build && node scripts/shots.mjs [outDir]
//
// Starts the fake PostgREST seeded with the real first days of the log plus
// Adi out right now, runs `next start` against it, picks Adir, and captures
// every screen in four looks: light, dark, greyscale (the form-before-colour
// check) and an iPhone 13. Then Adir taps "יצאתי" and Home is captured again,
// mid-collision. Each capture also reports horizontal overflow and any tap
// target under 44px.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startFakePostgrest } from './fake-postgrest.mjs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = process.argv[2] || join(ROOT, 'probe-out', 'shots');
mkdirSync(OUT, { recursive: true });

const APP_PORT = 3241;
const DB_PORT = 54341;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const db = await startFakePostgrest(DB_PORT);
const app = spawn(join(ROOT, 'node_modules', '.bin', 'next'), ['start', '-p', String(APP_PORT), '-H', '127.0.0.1'], {
  cwd: ROOT,
  detached: true,
  env: { ...process.env, APP_PIN: '1234', SUPABASE_URL: `http://127.0.0.1:${DB_PORT}`, SUPABASE_SERVICE_ROLE_KEY: 'shots-fake-key' },
  stdio: 'ignore',
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stop = () => { try { process.kill(-app.pid); } catch {} db.close(); };

const LOOKS = {
  light: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' },
  dark: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' },
  grey: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', grey: true },
  iphone: { ...devices['iPhone 13'], colorScheme: 'light' },
};
const report = [];

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${BASE}/unlock`)).ok) break; } catch {}
    if (i > 60) throw new Error('next start did not come up — run `npm run build` first');
    await sleep(500);
  }
  const res = await fetch(`${BASE}/api/unlock`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: '1234' }) });
  const [pair] = res.headers.get('set-cookie').split(';');
  const [name, ...rest] = pair.split('=');
  const cookies = [
    { name, value: rest.join('='), url: BASE },
    { name: 'ride_me', value: 'adir', url: BASE },
  ];

  const browser = await chromium.launch();
  async function shoot(screen, path, then) {
    for (const [look, opts] of Object.entries(LOOKS)) {
      const { grey, ...ctxOpts } = opts;
      const ctx = await browser.newContext(ctxOpts);
      await ctx.addCookies(cookies);
      const page = await ctx.newPage();
      await page.goto(BASE + path, { waitUntil: 'load' });
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))])).catch(() => {});
      // A full-page capture draws a fixed bar wherever the first viewport ended;
      // put the bar and nav back in the flow, at the ends of the page where a scroll finds them.
      await page.addStyleTag({ content: '.nav, .bar { position: static !important; }' });
      if (grey) await page.addStyleTag({ content: 'html { filter: grayscale(1) }' });
      if (then) await then(page);
      await sleep(300);
      const probe = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const small = [...document.querySelectorAll('a, button, input, summary, textarea, [role=radio]')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.height < 43.5 || r.width < 43.5))
          .map(({ el, r }) => `${el.tagName.toLowerCase()}.${el.className || ''} ${Math.round(r.width)}×${Math.round(r.height)} "${el.textContent.trim().slice(0, 20)}"`);
        return { overflow: document.documentElement.scrollWidth > vw, small };
      });
      report.push({ screen, look, ...probe });
      await page.screenshot({ path: join(OUT, `${screen}-${look}.png`), fullPage: true });
      await ctx.close();
    }
  }

  await shoot('home', '/');
  await shoot('usage', '/usage');
  await shoot('savings', '/savings');
  await shoot('settings', '/settings');
  // The account sheet, where the widget is copied from.
  await shoot('account', '/', async (page) => { await page.click('.bar .chip'); await page.waitForSelector('.sheet'); });
  // Adir leaves while Adi is out: a collision in progress.
  const leave = await fetch(`${BASE}/api/trips`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; ') },
    body: JSON.stringify({ action: 'leave', user: 'adir', car: 'star' }),
  });
  if (!leave.ok) throw new Error(`leave: ${leave.status}`);
  await shoot('home-out', '/');
  await shoot('usage-out', '/usage?r=week');
  await browser.close();
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  for (const r of report) if (r.overflow || r.small.length) console.log(r.screen, r.look, r.overflow ? 'OVERFLOW' : '', r.small.join(' | '));
  console.log(`shots in ${OUT}`);
} finally {
  stop();
}
