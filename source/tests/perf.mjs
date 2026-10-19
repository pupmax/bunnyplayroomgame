// Frame-time profile, iPhone Pro Max-like (440x956 CSS, DPR 3, iOS UA). node tests/perf.mjs <throttle> [scenes,comma] ; URL env
import { chromium, devices } from 'playwright';
const thr = +(process.argv[2] || 4), scenes = (process.argv[3] || 'Hub,Boxing,Football,Hive').split(',');
const URL = process.env.URL || 'http://localhost:4199/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(URL, { timeout: 120000 });
await p.evaluate(() => { for (const n of ['playroom', 'playroom-ruby']) for (const k of ['rubybag', 'ruby2', 'glassia3', 'zoe', 'hive', 'acorn', 'dive', 'pounce', 'trash', 'shadow', 'lasso']) localStorage.setItem(n + '.tut.' + k, '1'); });
await p.evaluate(q => localStorage.setItem('playroom.lowq', q === '1' ? JSON.stringify({ t: Date.now(), loads: 0 }) : q), process.env.LOWQ || '0'); await p.reload({ timeout: 120000 }); await p.waitForFunction(() => window.__game && window.__artReady, null, { timeout: 180000 });
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
const out = [];
for (const key of scenes) {
  await p.evaluate(k => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== k && s.scene.stop()); G.scene.start(k); }, key);
  await p.waitForTimeout(2500);
  if (await p.evaluate(() => window.__tutorialOpen)) { await p.mouse.click(220, 700); await p.waitForTimeout(800); }
  const r = await p.evaluate(() => new Promise(res => { const G = window.__game, step = G.loop.callback, js = [], fr = []; let last = performance.now();
    G.loop.callback = (t, d) => { const a = performance.now(); step(t, d); js.push(performance.now() - a); };
    const raf = () => { const n = performance.now(); fr.push(n - last); last = n; if (fr.length < 400 && n - fr.t0 < 6000) requestAnimationFrame(raf); else { G.loop.callback = step; done(); } };
    fr.t0 = performance.now(); requestAnimationFrame(raf);
    const done = () => { const q = (a, x) => { if (!a.length) return -1; const s = [...a].sort((u, v) => u - v); return +s[Math.min(s.length - 1, Math.floor(s.length * x))].toFixed(1); };
      let gfx = 0, txt = 0, objs = 0, tw = 0; for (const s of G.scene.getScenes(true)) { tw += s.tweens.getTweens().length; const walk = l => { for (const o of l) { objs++; if (o.type === 'Graphics') gfx++; if (o.type === 'Text') txt++; if (o.list) walk(o.list); } }; walk(s.children.list); }
      res({ frames: fr.length, frameP50: q(fr, 0.5), frameP95: q(fr, 0.95), jsP50: q(js, 0.5), jsP95: q(js, 0.95), canvas: G.canvas.width + 'x' + G.canvas.height, objs, gfx, txt, tw }); }; }));
  r.scene = key; out.push(r); console.log(JSON.stringify(r));
  // keep Boxing busy: a few taps
}
console.log('ERRORS', errs.length, errs.slice(0, 3)); await b.close();
