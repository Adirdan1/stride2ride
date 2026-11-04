// A tiny in-memory PostgREST for screenshots: only what lib/repo.js asks of
// it (select / insert / update / delete with eq, is.null and lt filters, and
// the vapid rpc). Not a test double for behaviour — Postgres is that.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export function seed(now = Date.now()) {
  const H = 3600_000;
  const t = (rider, car, s, e) => ({ id: randomUUID(), rider, car, started_at: new Date(s).toISOString(), ended_at: e == null ? null : new Date(e).toISOString() });
  // The real log of the first three days (2026-11-01..03), as it stood when
  // this was written, so the screens are judged against real shapes.
  const real = [
    ['adir', 'star', '2026-11-01T07:02:00Z', '2026-11-01T07:35:00Z'],
    ['adi', 'corsa', '2026-11-01T13:14:42Z', '2026-11-02T00:38:48Z'],
    ['or', 'star', '2026-11-01T14:55:32Z', '2026-11-01T17:06:13Z'],
    ['adi', 'corsa', '2026-11-02T10:30:00Z', '2026-11-02T11:30:00Z'],
    ['adi', 'corsa', '2026-11-02T14:04:00Z', '2026-11-02T22:00:00Z'],
    ['adir', 'star', '2026-11-02T16:30:00Z', '2026-11-02T17:18:00Z'],
    ['adi', 'corsa', '2026-11-03T13:45:00Z', '2026-11-03T14:14:00Z'],
    ['adir', 'star', '2026-11-03T17:04:00Z', '2026-11-03T18:31:00Z'],
  ].map(([r, c, s, e]) => t(r, c, Date.parse(s), Date.parse(e)));
  return {
    trips: [...real.filter((x) => Date.parse(x.started_at) < now - H), t('adi', 'corsa', now - 0.7 * H, null)],
    settings: [{ id: 1, tracking_start: '2026-11-01', decision_date: null, savings_home_agorot: 135200, savings_adi_agorot: 81600, capital_agorot: 2575000, annual_return_bp: 700 }],
    widget_keys: [],
    push_subscriptions: [],
  };
}

function filters(params) {
  const out = [];
  for (const [k, v] of params) {
    if (['select', 'order', 'on_conflict', 'columns', 'limit'].includes(k)) continue;
    const [op, ...rest] = v.split('.');
    const arg = rest.join('.');
    out.push((row) => {
      const x = row[k];
      if (op === 'eq') return String(x) === arg;
      if (op === 'is') return arg === 'null' ? x == null : x != null;
      if (op === 'lt') return x < arg;
      throw new Error(`filter ${op} not supported`);
    });
  }
  return (row) => out.every((f) => f(row));
}

export function startFakePostgrest(port, db = seed()) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let body = '';
    for await (const c of req) body += c;
    const send = (status, data) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(data === undefined ? '' : JSON.stringify(data));
    };
    const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?(\w+)$/);
    if (!m) return send(404, { message: 'not found' });
    if (m[1]) return send(200, null);
    const table = db[m[2]];
    if (!table) return send(404, { message: `no table ${m[2]}` });
    const where = filters(url.searchParams);
    const single = (req.headers.accept || '').includes('vnd.pgrst.object');
    const reply = (rows) => (single ? (rows.length ? send(200, rows[0]) : send(406, { message: 'no rows' })) : send(200, rows));
    if (req.method === 'GET') {
      let rows = table.filter(where);
      const order = url.searchParams.get('order');
      if (order) {
        const [col, dir] = order.split('.');
        rows = [...rows].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
      }
      return reply(rows);
    }
    if (req.method === 'POST') {
      const input = [].concat(JSON.parse(body));
      const rows = input.map((r) => ({ id: randomUUID(), created_at: new Date().toISOString(), ...r }));
      if (m[2] === 'trips' && rows.some((r) => r.ended_at == null && table.some((x) => x.rider === r.rider && x.ended_at == null))) {
        return send(409, { code: '23505', message: 'duplicate key' });
      }
      table.push(...rows);
      return reply(rows);
    }
    if (req.method === 'PATCH') {
      const patch = JSON.parse(body);
      const rows = table.filter(where);
      for (const r of rows) Object.assign(r, patch);
      return reply(rows);
    }
    if (req.method === 'DELETE') {
      for (let i = table.length - 1; i >= 0; i--) if (where(table[i])) table.splice(i, 1);
      return send(204);
    }
    send(405, { message: 'method' });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ db, close: () => server.close() })));
}
