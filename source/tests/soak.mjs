// Mobile stability soak: iPhone viewport, 4x CPU throttle. node tests/soak.mjs <ruby|main> <seconds>
import { chromium, devices } from 'playwright';
const [which, secs] = [process.argv[2] || 'ruby', +(process.argv[3] || 180)];
const URL = which === 'ruby' ? (process.env.RUBY_URL || 'http://localhost:4200/') : (process.env.URL || 'http://localhost:4199/');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ ...devices['iPhone 13'], defaultBrowserType: undefined });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto(URL, { timeout: 120000 });
await p.evaluate(() => { for (const n of ['playroom', 'playroom-ruby']) { localStorage.setItem(n + '.tut.rubybag', '1'); localStorage.setItem(n + '.tut.ruby2', '1'); } });
await p.reload({ timeout: 120000 });
await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 180000 });
const LEVELS = which === 'ruby' ? ['Boxing'] : ['Boxing', 'Football', 'Hive', 'Acorn', 'Dive', 'Pounce', 'Trash', 'Shadow', 'Lasso'];
const sample = () => p.evaluate(async () => { if (window.gc) window.gc(); const G = window.__game; let disp = 0, tw = 0, tm = 0;
  for (const s of G.scene.getScenes(true)) { const walk = l => { for (const o of l) { disp++; if (o.list) walk(o.list); } }; walk(s.children.list); tw += s.tweens.getTweens().length; tm += (s.time._active || []).length + (s.time._pendingInsertion || []).length; }
  return { heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), tex: Object.keys(G.textures.list).length, disp, tw, tm, scenes: G.scene.getScenes(true).map(s => s.scene.key).join('+'), lost: G.renderer.contextLost || false }; });
const t0 = Date.now(); let i = 0; const rows = [];
while ((Date.now() - t0) / 1000 < secs) {
  const key = LEVELS[i++ % LEVELS.length];
  await p.evaluate((key) => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== key && s.scene.stop()); G.scene.start(key); }, key);
  // play: tap the centre / punch button a few times a second, dodge sometimes
  const end = Date.now() + 25000;
  while (Date.now() < end) { await p.mouse.click(195, 700 + Math.random() * 60).catch(() => {}); await p.waitForTimeout(220); }
  await p.evaluate(() => { const pr = window.__pr; if (pr && pr.force && !pr.ended) try { pr.force(Math.random() < 0.5); } catch (e) {} });
  await p.waitForTimeout(3500);
  const s = await sample(); s.t = Math.round((Date.now() - t0) / 1000); s.level = key; rows.push(s); console.log(JSON.stringify(s));
}
console.log('ERRORS', errs.length, errs.slice(0, 5));
const f = rows[0], l = rows[rows.length - 1]; console.log('DELTA heapMB', (l.heapMB - f.heapMB).toFixed(1), 'tex', l.tex - f.tex, 'disp', l.disp - f.disp);
await b.close();
