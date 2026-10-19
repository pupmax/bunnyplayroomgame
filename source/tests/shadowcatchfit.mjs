// Shadow catch bubbles: pool is exactly the 6 approved lines, never the same twice in a row,, and bubbles up to ~32 chars stay fully on screen at the edges.
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4201/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.waitForFunction(() => (window.__game?.scene.isActive('Title') || window.__game?.scene.isActive('SoloTitle')), null, { timeout: 90000 });
await p.evaluate(() => { for (const k of ['playroom-test.tut.linye1', 'playroom-linye.tut.linye1', 'playroom.tut.linye1']) localStorage.setItem(k, '1'); const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Shadow'); });
await p.waitForFunction(() => window.__pr?.st?.running && window.__pr.squash().ready, null, { timeout: 60000 });
let fails = 0; const check = (n, ok, info = '') => { console.log(ok ? 'PASS' : 'FAIL', n, info); if (!ok) fails++; };
const POOL = ['Sticky situation, Puppy!', 'Ouch! Wool cushion activated.', "Tag, you're squished!", "That's gonna leave a quill mark!", 'Who left a Puppy on the floor?', 'Fastest hedgehog in the playroom!'];
const LONG = [...POOL, 'Sticky situation, Puppy!', 'Ouch! Wool cushion activated.', 'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW', 'Mmmmmm mmmmm mmmmmmm, Mmmmm-mmmm!'];
const r = await p.evaluate(async (LONG) => { const S = window.__game.scene.getScene('Shadow'), W = 720, H = 1280, out = [];
  for (const t of LONG) for (const x of [0, 360, W]) { const c = S.talk(x, 560, t, 22, 5000); await new Promise(r => setTimeout(r, 400)); const bd = c.getBounds();
    out.push({ t: t.length, x, l: Math.round(bd.left), r: Math.round(bd.right), top: Math.round(bd.top), bot: Math.round(bd.bottom), ok: bd.left >= 0 && bd.right <= W && bd.top >= 0 && bd.bottom <= H }); c.destroy(); }
  return { W, out }; }, LONG);
for (const o of r.out) check(`len ${o.t} at x=${o.x} on screen (W ${r.W})`, o.ok, JSON.stringify(o));
// real catch path: the bubble after a catch comes from the 2-line pool
const seen = new Set(); let prev = '';
for (let i = 0; i < 6; i++) {
  const t = await p.evaluate(async () => { const S = window.__game.scene.getScene('Shadow'); S.tag(); while (window.__pr.squash().phase) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 300));
    const c = S.tagBub; const tx = c?.list?.find(o => o.type === 'Text'); const bd = c?.getBounds(); return { text: tx?.text, l: bd?.left, r: bd?.right, W: 720 }; });
  seen.add(t.text); check(`catch ${i + 1} bubble from pool & on screen`, POOL.includes(t.text) && t.text !== prev && t.l >= 0 && t.r <= t.W, JSON.stringify(t));
  prev = t.text;
  if (await p.evaluate(() => !window.__pr.st.running)) break;
}
check('errors 0', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log('seen', [...seen]); console.log('RESULT', fails ? 'FAIL' : 'PASS'); await b.close(); process.exit(fails ? 1 : 0);
