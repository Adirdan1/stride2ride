// Render the real Scriptable widget (scripts/widget.js) to HTML, so it can be
// looked at before it is pasted onto a phone.
//
//   node scripts/widget-preview.mjs <payload.json|offline|nokey|badkey> <small|medium> <light|dark>
//
// The stubs implement only Scriptable API the script uses, and only as it
// exists — a call to anything else throws, as it would on the phone. Output is
// an HTML fragment on stdout, sized like the iPhone widget (small 170×170,
// medium 364×170 points). Fonts are approximations: Georgia-Bold for the
// display face, the system face for the rest, which is what iOS will use.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const [source = 'offline', family = 'medium', look = 'light'] = process.argv.slice(2)
const SCRIPT = readFileSync(fileURLToPath(new URL('./widget.js', import.meta.url)), 'utf8')
// A payload file may hold one view per size ({ small, medium, large }), the
// way the server answers each size's own ?limit=.
const raw = ['offline', 'nokey', 'badkey'].includes(source) ? null : JSON.parse(readFileSync(source, 'utf8'))
const payload = raw && !raw.view ? raw[family] : raw

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
class Color {
  constructor(hex) { this.hex = hex }
  // The look is fixed per preview run, so a dynamic colour resolves at once —
  // which is what iOS does for a widget, per appearance.
  static dynamic(light, dark) { return look === 'dark' ? dark : light }
}
class Size { constructor(w, h) { this.width = w; this.height = h } }
class Rect { constructor(x, y, w, h) { Object.assign(this, { x, y, width: w, height: h }) } }
class Font {
  constructor(name, size) { this.css = `${name.includes('Georgia') ? '700' : '400'} ${size}px ${name.includes('Georgia') ? 'Georgia, serif' : '-apple-system, system-ui, sans-serif'}` }
  static systemFont(n) { return { css: `400 ${n}px -apple-system, system-ui, sans-serif` } }
  static semiboldSystemFont(n) { return { css: `600 ${n}px -apple-system, system-ui, sans-serif` } }
  static boldSystemFont(n) { return { css: `700 ${n}px -apple-system, system-ui, sans-serif` } }
}
class Path { constructor() { this.rects = [] } addRoundedRect(r, rx) { this.rects.push([r, rx]) } }
class DrawContext {
  constructor() { this.items = []; this.fill = '#000' }
  setFillColor(c) { this.fill = c.hex }
  addPath(p) { this.path = p }
  fillPath() { for (const [r, rx] of this.path.rects) this.items.push(`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${rx}" fill="${this.fill}"/>`) }
  getImage() { return { svg: `<svg width="${this.size.width}" height="${this.size.height}" viewBox="0 0 ${this.size.width} ${this.size.height}">${this.items.join('')}</svg>` } }
}
class DateFormatter { string(d) { return d.toTimeString().slice(0, 5) } }
class Stack {
  constructor(vertical) { this.kids = []; this.vertical = vertical; this.align = 'flex-start' }
  layoutVertically() { this.vertical = true }
  centerAlignContent() { this.align = 'center' }
  bottomAlignContent() { this.align = 'flex-end' }
  addStack() { const s = new Stack(false); this.kids.push(s); return s }
  addText(t) { const n = { kind: 'text', t, align: 'left', rightAlignText() { this.align = 'right' } }; this.kids.push(n); return n }
  addSpacer(n) { this.kids.push({ kind: 'spacer', n }) }
  addImage(img) { const n = { kind: 'img', img }; this.kids.push(n); return n }
  setPadding(t, l, b, r) { this.pad = [t, r, b, l] }
  html() {
    const kids = this.kids.map((k) => {
      if (k instanceof Stack) return k.html()
      if (k.kind === 'spacer') return k.n === undefined ? '<div style="flex:1 1 0;min-width:0;min-height:0"></div>' : `<div style="flex:none;${this.vertical ? 'height' : 'width'}:${k.n}px"></div>`
      if (k.kind === 'img') return `<div style="flex:none">${k.img.svg}</div>`
      return `<div dir="auto" style="text-align:${k.align};font:${k.font.css};color:${k.textColor.hex};${k.lineLimit > 1 ? '' : 'white-space:nowrap;'}overflow:hidden;text-overflow:ellipsis;min-width:0">${esc(k.t)}</div>`
    })
    const box = `${this.backgroundColor && !(this instanceof ListWidget) ? `background:${this.backgroundColor.hex};` : ''}${this.cornerRadius ? `border-radius:${this.cornerRadius}px;` : ''}${this.spacing ? `gap:${this.spacing}px;` : ''}${this.size && this.size.height ? `height:${this.size.height}px;overflow:hidden;` : ''}`
    return `<div style="${box}display:flex;flex-direction:${this.vertical ? 'column' : 'row'};align-items:${this.vertical ? 'stretch' : this.align};min-width:0;${this instanceof ListWidget || (this.vertical && this.size) ? 'height:100%;' : ''}${this.size && this.size.width ? `width:${this.size.width}px;flex:none;` : 'flex:0 1 auto;'}${this.size && this.size.height && !this.size.width ? 'flex:none;' : ''}">${kids.join('')}</div>`
  }
}
class ListWidget extends Stack { constructor() { super(true) } }
class Request {
  constructor(url) { this.url = url }
  async loadJSON() {
    if (source === 'offline') throw new Error('offline')
    if (source === 'badkey') { this.response = { statusCode: 401 }; return { error: 'unauthorised' } }
    this.response = { statusCode: 200 }
    return payload
  }
}
const fm = { joinPath: (a, b) => `${a}/${b}`, cacheDirectory: () => '/tmp', fileExists: () => false, writeString() {}, readString() {} }
const env = {
  Color, Size, Rect, Font, Path, DrawContext, DateFormatter, ListWidget, Request,
  FileManager: { local: () => fm },
  config: { runsInWidget: true, widgetFamily: family },
  Script: { setWidget: (w) => (env.out = w), complete() {} },
}
let script = SCRIPT
if (source === 'nokey') script = script.replace(/const API_KEY = "[^"]*"/, 'const API_KEY = "<paste your widget key>"')
else script = script.replace(/const API_KEY = "[^"]*"/, 'const API_KEY = "preview-key"')
const run = new Function(...Object.keys(env), `return (async () => { ${script} })()`)
await run(...Object.values(env))

const w = env.out
const [width, height] = family === 'small' ? [170, 170] : family === 'large' ? [364, 382] : [364, 170]
const [t, r, b, l] = w.pad
process.stdout.write(`<div dir="ltr" style="width:${width}px;height:${height}px;box-sizing:border-box;padding:${t}px ${r}px ${b}px ${l}px;border-radius:22px;background:${w.backgroundColor.hex};overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.18)">${w.html()}</div>`)
