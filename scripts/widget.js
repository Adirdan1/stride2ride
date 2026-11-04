const APP_URL = "https://stride2ride.vercel.app"; // filled in
const API_KEY = "<paste your widget key>"; // the only line to edit

// stride2ride — Scriptable home-screen widget. One self-contained file.
//
// Easiest: in stride2ride, tap the bell → "העתקת הסקריפט של <your name>". That copy
// already carries a key of your own on line 2. Or paste this and fill line 2.
//
// Install: Scriptable → + → paste this → name it "stride2ride".
// Long-press the home screen → + → Scriptable → Small or Medium →
// Edit Widget → Script: stride2ride.
//
// The phone's copy does NOT update when the repo does. A changed widget
// means pasting it again.
//
// The collection's shared widget layout: the wordmark top-left with the
// accent full stop, ONE dominant state (what Home leads with — is the car
// out, and with whom), one secondary line (money lost so far), and a faint
// "updated HH:MM". Medium adds one detail row: this month's split as a bar,
// and the collision rate. Everything it says is shaped on the server
// (glance() in lib/core.js, widgetView() in lib/format.js); this only draws.
//
// Colours are Color.dynamic pairs, so iOS picks light or dark itself. Never
// ask the device for its appearance: inside a widget it reports light on a
// phone in dark mode. The split bar is drawn as stacks, not an image, so it
// follows the theme too.

const pair = (light, dark) => Color.dynamic(new Color(light), new Color(dark));
const C = {
  paper: pair("#f7f4ee", "#141311"),
  ink: pair("#1b1a17", "#f2ede4"),
  ink2: pair("#57534b", "#c9c1b3"),
  ink3: pair("#6f6a61", "#a59c8d"),
  track: pair("#e5ded2", "#302c27"),
  road: pair("#2f6a8a", "#7fb3d1"),
  lane: pair("#8a6008", "#d9a843"),
  brk: pair("#a52f28", "#ec8a80"),
};
const CACHE = FileManager.local().joinPath(FileManager.local().cacheDirectory(), "stride2ride-widget.json");
const RLM = "‏"; // lays a Hebrew line out right to left, so it is cut at its end

async function load() {
  const fm = FileManager.local();
  if (!API_KEY || API_KEY.startsWith("<")) return { problem: "חסר מפתח", hint: "העתיקו את הסקריפט מהאפליקציה" };
  try {
    const req = new Request(`${APP_URL}/api/widget`);
    req.headers = { "x-api-key": API_KEY };
    req.timeoutInterval = 12;
    const body = await req.loadJSON();
    const status = req.response ? req.response.statusCode : 200;
    if (status === 401 || status === 403) return { problem: "בדקו את המפתח", hint: "העתיקו את הסקריפט שוב מהאפליקציה" };
    if (status >= 400 || !body || !body.view) throw new Error(`HTTP ${status}`);
    const at = new Date().toISOString();
    fm.writeString(CACHE, JSON.stringify({ view: body.view, at }));
    return { view: body.view, at, stale: false };
  } catch (e) {
    // Offline: draw the last good answer, marked as old, rather than nothing.
    if (fm.fileExists(CACHE)) {
      const cached = JSON.parse(fm.readString(CACHE));
      return { view: cached.view, at: cached.at, stale: true };
    }
    return { problem: "אין חיבור", hint: "ננסה שוב בעוד כמה דקות" };
  }
}

function text(stack, s, font, colour, lines = 1) {
  const t = stack.addText(s);
  t.font = font;
  t.textColor = colour;
  t.lineLimit = lines;
  return t;
}

function he(stack, s, font, colour, lines = 1) {
  const t = text(stack, RLM + s, font, colour, lines);
  t.rightAlignText();
  return t;
}

function wordmark(stack) {
  const row = stack.addStack();
  row.centerAlignContent();
  text(row, "stride2ride", new Font("Georgia-Bold", 13), C.ink);
  text(row, ".", new Font("Georgia-Bold", 13), C.road);
  row.addSpacer();
}

function hhmm(iso) {
  const f = new DateFormatter();
  f.dateFormat = "HH:mm";
  return f.string(new Date(iso));
}

// The state, in the size of a headline. A collision is said in words as well
// as in red, so it reads without colour.
function hero(stack, v, size) {
  he(stack, v.hero, Font.boldSystemFont(size), v.state === "clash" ? C.brk : C.ink, 2);
  stack.addSpacer(1);
  he(stack, v.sub, v.state === "clash" ? Font.semiboldSystemFont(12) : Font.systemFont(12), v.state === "clash" ? C.brk : C.ink2);
}

function stamp(stack, result) {
  he(stack, result.stale ? `אין חיבור · מ־${hhmm(result.at)}` : `עודכן ${hhmm(result.at)}`, Font.systemFont(9), C.ink3);
}

// This month's split: the house solid, Adi in a lighter step of gold, a hair
// between them. Runs right to left, like the app's bar.
function split(stack, share, width) {
  const bar = stack.addStack();
  bar.size = new Size(width, 6);
  bar.cornerRadius = 3;
  bar.backgroundColor = C.track;
  if (!share) return;
  const home = Math.round((width - 2) * share.home / 100);
  const piece = (w, colour) => {
    if (w <= 0) return;
    const p = bar.addStack();
    p.size = new Size(w, 6);
    p.backgroundColor = colour;
  };
  piece(width - 2 - home, C.lane);
  if (home > 0 && home < width - 2) bar.addSpacer(2);
  piece(home, C.road);
}

function build(result, family) {
  const w = new ListWidget();
  w.backgroundColor = C.paper;
  w.setPadding(14, 15, 12, 15);
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000);

  wordmark(w);
  w.addSpacer();

  if (result.problem) {
    he(w, result.problem, Font.semiboldSystemFont(15), C.ink);
    w.addSpacer(2);
    he(w, result.hint, Font.systemFont(11), C.ink3, 2);
    w.addSpacer();
    return w;
  }

  const v = result.view;
  hero(w, v, family === "small" ? 20 : 24);
  w.addSpacer(6);
  he(w, v.lost, Font.semiboldSystemFont(11), C.ink2, 2);

  if (family !== "small") {
    w.addSpacer(8);
    split(w, v.share, 334);
    w.addSpacer(3);
    he(w, v.detail, Font.systemFont(10), C.ink3);
  }

  w.addSpacer();
  stamp(w, result);
  return w;
}

const family = config.widgetFamily || "medium";
const result = await load();
const widget = build(result, family);
if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (family === "small") {
  await widget.presentSmall();
} else {
  await widget.presentMedium();
}
Script.complete();
