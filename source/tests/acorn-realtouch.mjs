// Nana ACORN BARRAGE realistic-player bot: REAL CDP touch events only for play (drag to aim, release to throw), iPhone 390x844.
// Plays like a person: looks at Puppy (2 samples 80 ms apart = a rough sense of his motion), reacts after a human delay,
// drags for a human-ish time, releases with imperfect lead and aim error. Reads tells only from what is on screen (__pr.st flags).
//   realistic: 250-350 ms reaction, often waits a beat for a moving target to stop, else leads 30-70% (capped 160 px), ~30 px aim error,
//              waits out umbrella/leaf/"!" tells, punishes openings (munching) without lead
//   sloppy:    350-450 ms reaction, no lead, ~60 px error, mostly ignores cover and tells
// usage: node tests/acorn-realtouch.mjs [games=6] [realistic|sloppy] [url]   -> per-game result + WINRATE line
import { chromium } from 'playwright';
const N = +(process.argv[2] || 6), MODE = process.argv[3] || 'realistic', URL = process.argv[4] || process.env.URL || 'http://127.0.0.1:4450/';
const SL = MODE === 'sloppy';
// Canvas renderer by default (GL=1 for swiftshader WebGL): on a loaded box swiftshader runs ~6-12 fps with ~250 ms per page round-trip,
// which would make the bot far slower than its stated reaction times. Game logic is identical in both renderers.
const b = await chromium.launch({ args: process.env.GL ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-webgl', '--disable-gpu'] }); const errs = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.DSF || 1), hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
if (process.env.K) await ctx.addInitScript(k => { window.__acornK = JSON.parse(k); }, process.env.K);
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await ctx.newCDPSession(p);
await p.goto(URL, { timeout: 120000 });
await p.evaluate(() => { localStorage.setItem('playroom.tut.nana1', '1'); localStorage.setItem('playroom.tut.nana2', '1'); localStorage.setItem('playroom.beaten', '3'); });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => ({ x: bx.x + x * bx.width / 720, y: bx.y + y * bx.height / 1280 });
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...P(x, y), id: 1 }] });
const sleep = ms => p.waitForTimeout(ms); const R = Math.random, U = (a, b) => a + (b - a) * R();
const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const look = () => p.evaluate(() => { const pr = window.__pr, st = pr?.st; if (!st || pr.scene !== 'Acorn') return null; const q = pr.pup();
  return { x: q.x, y: q.y, t: performance.now(), run: st.running, over: st.over, ended: pr.ended, hits: st.hits, shots: st.shots, time: st.time, cool: st.cool, umb: st.umbrella, hide: st.hiding,
    gold: st.golden, dizzy: st.dizzy, alert: !!st.alert, open: !!st.gloat || !!st.munch, decoy: pr.decoy(), need: pr.need ?? 10, max: pr.throws ?? 24 }; });
let wins = 0; const res = [];
for (let g = 0; g < N; g++) {
  await p.evaluate(() => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== 'Acorn' && s.scene.stop()); G.scene.start('Acorn'); });
  await p.waitForFunction(() => window.__pr?.scene === 'Acorn' && window.__pr.st.running, null, { timeout: 30000 });
  let nextAt = 0, waits = 0, thrown = 0; const lags = [];
  for (;;) {
    const a = await look(); if (!a || a.over || a.ended) break;
    if (!a.run || Date.now() < nextAt) { await sleep(40); continue; }
    // what a person sees: is he covered / showing a tell / wide open?
    const covered = (a.umb || a.hide >= 0) && !a.gold, tell = a.alert && a.dizzy <= 0;
    if (covered && R() < (SL ? 0.3 : 0.85)) { await sleep(SL ? 200 : 120); continue; }
    if (tell && R() < (SL ? 0.25 : 0.8)) { await sleep(120); waits++; continue; }
    await sleep(80); const b2 = await look(); if (!b2 || b2.over || b2.ended) break;
    const dt = Math.max(0.03, (b2.t - a.t) / 1000); const vx = (b2.x - a.x) / dt, vy = (b2.y - a.y) / dt;
    const react = SL ? U(350, 450) : U(250, 350), dragMs = SL ? U(120, 260) : U(160, 380);
    // realistic: a moving target is often worth a beat of patience (he stops, munches, or shows a tell); when it isn't, lead him
    // part of the way (capped: nobody leads a dog 300 px). sloppy: throws at wherever he is right now.
    const spd = Math.hypot(vx, vy);
    if (!SL && spd > 60 && !b2.open && R() < 0.5 && waits < 400) { waits++; await sleep(60); continue; }
    const lag = (react + dragMs) / 1000 + 0.26, k = SL || b2.open ? 0 : U(0.3, 0.7), err = SL ? 60 : 30;
    let lx = vx * lag * k, ly = vy * lag * k; const ll = Math.hypot(lx, ly); if (ll > 160) { lx *= 160 / ll; ly *= 160 / ll; }
    const tx = b2.x + lx + gauss() * err, ty = b2.y - 60 + ly + gauss() * err;
    // timing is measured from the moment he was seen (b2), so page round-trips don't add to the human delays
    const t0 = Date.now(); while (Date.now() - t0 < react) await sleep(Math.min(20, react - (Date.now() - t0)));
    // finger goes down near where he is, slides to the aim point, lets go
    const sx = b2.x + gauss() * 40, sy = b2.y - 60 + gauss() * 40;
    await touch('touchStart', sx, sy); const t1 = Date.now();
    for (;;) { const f = Math.min(1, (Date.now() - t1) / dragMs); await touch('touchMove', sx + (tx - sx) * f, sy + (ty - sy) * f); if (f >= 1) break; await sleep(45); }
    lags.push(Date.now() - t0);
    await touch('touchEnd', tx, ty); thrown++;
    nextAt = Date.now() + (SL ? U(250, 600) : U(350, 750));
  }
  await sleep(300);
  const r = await p.evaluate(() => { const st = window.__pr.st; return { win: window.__pr.ended === 'win', hits: st.hits, shots: st.shots, left: +st.time.toFixed(1), ...(window.__pr.stats?.() || {}) }; }); r.lagMs = Math.round(lags.reduce((a, b) => a + b, 0) / Math.max(1, lags.length));
  if (r.win) wins++; res.push(r); console.log('game', g + 1, MODE, JSON.stringify(r), 'fps', await p.evaluate(() => Math.round(window.__game.loop.actualFps)));
  await sleep(1500);
}
console.log(`WINRATE ${MODE} ${wins}/${N}`, 'errors', errs.length, errs.slice(0, 2).join(' | '));
await b.close();
