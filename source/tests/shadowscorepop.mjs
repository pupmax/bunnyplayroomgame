// Shadow catches: the '+600' score popup must never overlap the stamp words (BOING / BOING! / SQUASHED! / PLOP!) while it floats.
// (The big starburst behind SQUASHED!/PLOP! is only reported in `per`: the popup draws on top of it.)
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4201/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.waitForFunction(() => (window.__game?.scene.isActive('Title') || window.__game?.scene.isActive('SoloTitle')), null, { timeout: 90000 });
await p.evaluate(() => { for (const k of ['playroom-test.tut.linye1', 'playroom-linye.tut.linye1', 'playroom.tut.linye1']) localStorage.setItem(k, '1'); const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Shadow'); });
await p.waitForFunction(() => window.__pr?.st?.running && window.__pr.squash().ready, null, { timeout: 60000 });
await p.waitForTimeout(1500);
let fails = 0; const check = (n, ok, info = '') => { console.log(ok ? 'PASS' : 'FAIL', n, info); if (!ok) fails++; };
for (const v of ['B', 'A', 'C', 'B']) {
  const r = await p.evaluate(v => new Promise(res => { const S = window.__game.scene.getScene('Shadow'), sq = S.sq; window.__pr.forceSquash(v);
    const before = new Set(S.children.list.filter(o => o.type === 'Text')); S.tag();
    const pop = S.children.list.find(o => o.type === 'Text' && !before.has(o) && /^\+\d/.test(o.text));
    let worst = 0, frames = 0, seenWords = new Set(), popBox = null, boxes = {}, per = {};
    const f = () => { if (!pop || !pop.active || pop.alpha < 0.08) return res({ v, found: !!pop, frames, worst: Math.round(worst), words: [...seenWords], popBox, boxes, per, gy: sq.gy });
      frames++; const a = pop.getBounds(); popBox = [Math.round(a.left), Math.round(a.top), Math.round(a.right), Math.round(a.bottom)];
      for (const w of [sq.w1, sq.w2, sq.burst]) if (w.visible && w.scale > 0.3 && sq.phase === 'hold') { const nm = w.text || 'burst'; seenWords.add(nm); const c = w.getBounds(); boxes[nm] = [Math.round(c.left), Math.round(c.top), Math.round(c.right), Math.round(c.bottom)];
        const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ox > 0 && oy > 0) { if (nm !== 'burst') worst = Math.max(worst, Math.min(ox, oy)); per[nm] = Math.max(per[nm] || 0, Math.round(Math.min(ox, oy))); } }
      requestAnimationFrame(f); };
    f(); }), v);
  check(`${v}: '+600' popup never overlaps the stamp words`, r.found && r.worst === 0, JSON.stringify(r));
  await p.waitForFunction(() => !window.__pr.squash().phase, null, { timeout: 20000 }); await p.waitForTimeout(1200);
  const pt = await p.evaluate(() => window.__pr.st); if (!pt.running) break;
}
check('errors 0', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log('RESULT', fails ? 'FAIL' : 'PASS'); await b.close(); process.exit(fails ? 1 : 0);
