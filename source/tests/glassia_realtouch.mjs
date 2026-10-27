// PENALTY PUP real-touch bots (iPhone 390x844, hasTouch/isMobile, CDP touch events only: no scene method calls for input).
// The bot "sees" what is on screen through the scene's visible-cue hook vis() (tell / dive / fake / down / up), stamped in page
// GAME clock when it happens (a 5 fps headless frame can swallow a 260 ms hop-back, a phone would show it), then reacts like a person: reaction time + swipe time + ~100 ms touch latency.
// All bot timing runs on the game's own clock (__pr.now()), so a slow headless renderer (this box: ~10 fps, game clock at
// ~0.5x wall time) cannot hand the bot extra reaction time. Frame quantisation then only ever adds delay (conservative).
// usage: node tests/glassia_realtouch.mjs [url] [profile: realistic|sloppy|pro] [games] [parallel]
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://127.0.0.1:4311/', PROF = process.argv[3] || 'realistic', GAMES = +process.argv[4] || 6, PAR = +process.argv[5] || 3;
const PROFILES = {
  // rt: ms from the dive becoming visible to the finger starting to move; early: jumps the gun during a tell (per shot);
  // fool: still shoots when a dive turns out to be a FAKE; wrong: shoots at the side he dived to; mid: goes for the noggin chip
  realistic: { rt: [320, 60], swipe: 140, early: 0.06, fool: 0.35, wrong: 0.04, mid: 0.12, tap: 0.3 },
  sloppy: { rt: [420, 90], swipe: 170, early: 0.15, fool: 0.6, wrong: 0.08, mid: 0.05, tap: 0.4 },
  pro: { rt: [260, 40], swipe: 120, early: 0.02, fool: 0.1, wrong: 0.01, mid: 0.2, tap: 0.2 },
};
const P = PROFILES[PROF]; const LAT = +(process.env.LAT || 100), FCOMP = +(process.env.FCOMP ?? 1.5), CAL = process.env.CAL !== '0';
// CAL (default on): the box renders at 5-20 fps under load, so a touch lands far later (in game time) than on a phone.
// The bot measures its own overhead (measured dive->shot minus intended rt+lat+swipe) and starts that much earlier next time.
const cal = { v: 150, n: 0 }, cals = [];
// ...but never start a touch before a fake-out's hop-back (230 ms after the lurch) could have been seen: a person moving at
// rt >= 300 ms has seen it, and an over-calibrated bot that starts earlier would be fooled by every feint (FAKE_SEEN floor).
const FAKE_SEEN = +(process.env.FAKE_SEEN || 300);
const gauss = ([m, s]) => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.max(150, m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); };
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ZONES = [{ x: 175, y: 525, side: -1, high: true }, { x: 175, y: 700, side: -1, high: false }, { x: 360, y: 548, side: 0, high: true }, { x: 545, y: 525, side: 1, high: true }, { x: 545, y: 700, side: 1, high: false }];

async function worker(id, nGames, out) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const cdp = await ctx.newCDPSession(p);
  await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
  const bb = await p.locator('canvas').boundingBox(); const k = bb.width / 720, oy = (bb.height - 1280 * k) / 2; const S = (x, y) => ({ x: bb.x + x * k, y: bb.y + oy + y * k });
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...S(x, y), id: 1 }] });
  // frame compensation: on a phone a visible change + the touch both land within ~1.5 frames of 16.7 ms; here a frame is 60-200 ms
  // of game time, so the bot starts that much earlier (FCOMP=0 disables). Measured game-ms per frame:
  const fr = { g: 0, n: 0, v: 50 }; const fg = () => fr.v;
  const rate = { r: 1, g: 0, w: 0 }; // game-ms per wall-ms, measured live
  // Touch events are fired on a fixed schedule and NOT awaited one by one: CDP only acks a touch after the renderer's next
  // frame, so awaiting each move on a slow headless box would stretch a 140 ms flick to ~0.7 s.
  const gesture = async pts => { const q = []; let t = 0; for (const [type, x, y, dt] of pts) { t += dt; const tt = t; q.push(new Promise(r => setTimeout(() => r(touch(type, x, y)), tt))); } await Promise.all(q); };
  const tap = (x, y) => gesture([['touchStart', x, y, 0], ['touchEnd', x, y, 60 / rate.r]]);
  const swipeTo = z => { // flick from the ball toward the zone; only direction matters
    const x0 = 360 + (Math.random() - 0.5) * 60, y0 = 1120 + (Math.random() - 0.5) * 70, a = Math.atan2(z.y - y0, z.x - x0) + (Math.random() - 0.5) * 0.14, L = 150 + Math.random() * 130, n = 4, dt = P.swipe / n / rate.r;
    const pts = [['touchStart', x0, y0, 0]]; for (let i = 1; i <= n; i++) pts.push(['touchMove', x0 + Math.cos(a) * L * i / n, y0 + Math.sin(a) * L * i / n, dt]);
    pts.push(['touchEnd', x0 + Math.cos(a) * L, y0 + Math.sin(a) * L, 5]); return gesture(pts); };
  const shoot = async z => { if (Math.random() < P.tap) await tap(z.x + (Math.random() - 0.5) * 60, z.y + (Math.random() - 0.5) * 60); else await swipeTo(z); };
  for (let g = 0; g < nGames; g++) {
    await p.evaluate(g => { if (!g) localStorage.clear(); const G = window.__game; G.scene.getScenes(true).forEach(x => G.scene.stop(x.scene.key)); G.scene.start('Football'); window.__ev = []; }, g);
    await p.waitForFunction(() => window.__pr?.scene === 'Football' && window.__game.scene.isActive('Football'), null, { timeout: 30000 });
    rate.w = 0; fr.n = 0; await p.evaluate(() => { const Sc = window.__game.scene.getScene('Football'); let last = 0; window.__ev = []; window.__fpsN = 0; window.__t0 = performance.now(); window.__g0 = window.__pr.now();
      window.__reacts = []; let sh = 0; const tick = () => { window.__fpsN++; const st = window.__pr.st; if (st.shot !== sh) { sh = st.shot; window.__reacts.push([st.results[sh - 1], st.react == null ? null : Math.round(st.react)]); } }; Sc.events.on('postupdate', tick); // the Scene object is reused on restart: unhook on shutdown, never stack wrappers
      const vis0 = Object.getPrototypeOf(Sc).vis.bind(Sc); Sc.vis = (k, side = 0) => { vis0(k, side); window.__ev.push({ k, side, g: window.__pr.now(), shot: window.__pr.st.shot }); };
      Sc.events.once('shutdown', () => { Sc.events.off('postupdate', tick); delete Sc.vis; }); });
    if (g === 0) { await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 20000 }).catch(() => {}); await sleep(900); await tap(360, 640); }
    const wants = []; let plan = null, pend = null, shotIdx = -1, earlyArm = null; const log = [];
    while (true) {
      const s = await p.evaluate(() => { const ev = window.__ev.splice(0); const st = window.__pr.st; return { ev, frames: window.__fpsN, now: window.__pr.now(), wall: performance.now(), shot: st.shot, over: st.over, fired: st.fired, ended: window.__pr.ended, rl: window.__reacts.length ? window.__reacts[window.__reacts.length - 1] : null }; });
      if (s.ended) break;
      if (fr.n && s.frames - fr.n >= 5) { fr.v = fr.v * 0.6 + 0.4 * (s.now - fr.g) / (s.frames - fr.n); fr.g = s.now; fr.n = s.frames; } else if (!fr.n) { fr.g = s.now; fr.n = s.frames || 1; }
      if (rate.w && s.wall - rate.w > 400) { const r = (s.now - rate.g) / (s.wall - rate.w); if (r > 0.05 && r < 2) rate.r = rate.r * 0.7 + r * 0.3; rate.g = s.now; rate.w = s.wall; } else if (!rate.w) { rate.g = s.now; rate.w = s.wall; }
      if (s.shot !== shotIdx) { if (CAL && pend?.started && s.rl && s.rl[1] != null) { const ov = s.rl[1] - pend.want; cal.v = Math.max(0, Math.min(900, cal.v + 0.5 * ov)); cal.n++; cals.push(Math.round(cal.v)); } shotIdx = s.shot; pend = null; earlyArm = Math.random() < P.early ? { at: null } : null; }
      for (const e of s.ev) {
        if (e.k === 'tell' && earlyArm && earlyArm.at === null) earlyArm.at = e.g + 250 + Math.random() * 600;
        if (e.k === 'dive' && !pend) { // something launched: react
          const r = Math.random(); const target = r < P.wrong ? e.side : r < P.wrong + P.mid ? 0 : -e.side; const zs = ZONES.filter(z => z.side === target);
          const rt = gauss(P.rt); pend = { at: Math.max(e.g + Math.min(rt, FAKE_SEEN), e.g + rt + LAT - (CAL ? cal.v : FCOMP * Math.max(0, fg() - 16.7))), want: rt + LAT + P.swipe, z: zs[Math.floor(Math.random() * zs.length)], fooled: Math.random() < P.fool, side: e.side };
        }
        if (e.k === 'fake' && pend && !pend.fooled && !pend.started) pend = null; // saw him hop back: hold the shot
        if (e.k === 'up') pend = null;
      }
      if (earlyArm?.at && !pend && !s.fired && s.now >= earlyArm.at) { const zs = ZONES.filter(z => z.side !== 0); earlyArm = null; log.push({ shot: s.shot, kind: 'early-try' }); await shoot(zs[Math.floor(Math.random() * zs.length)]); continue; }
      if (pend && !pend.started && !s.fired && s.now >= pend.at) { pend.started = true; await shoot(pend.z); log.push({ shot: s.shot, aim: pend.z.side, dive: pend.side, want: Math.round(pend.want) }); wants.push(pend.want); continue; }
      await sleep(15);
    }
    const r = await p.evaluate(() => { const st = window.__pr.st, Sc = window.__game.scene.getScene('Football'); return { ended: window.__pr.ended, goals: st.goals, noggins: st.noggins, results: st.results, fps: window.__fpsN / ((performance.now() - window.__t0) / 1000), clock: (window.__pr.now() - window.__g0) / (performance.now() - window.__t0), react: window.__reacts || [], hint: window.__pr.hint || 0 }; });
    out.push({ id, g, ...r, wants, errs: errs.length }); console.log(`[w${id} g${g}] ${r.ended.toUpperCase()} goals ${r.goals} noggin ${r.noggins} | ${r.results.join(',')} | fps ${r.fps.toFixed(1)} clock ${r.clock.toFixed(2)} hint ${r.hint} errs ${errs.length}`); if (process.env.DBG) console.log(JSON.stringify(r.react), JSON.stringify(log));
    await sleep(2500);
  }
  if (errs.length) console.log(`[w${id}] errors:`, errs.slice(0, 3)); await ctx.close();
}
const out = []; const per = Math.ceil(GAMES / PAR); await Promise.all(Array.from({ length: PAR }, (_, i) => worker(i, Math.min(per, GAMES - i * per), out))); await b.close();
const wins = out.filter(o => o.ended === 'win').length, all = out.flatMap(o => o.results.filter(Boolean)), cnt = {}; all.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
const reacts = out.flatMap(o => o.react.filter(x => x[0] === 'goal' || x[0] === 'noggin' || x[0] === 'block' || x[0] === 'late').map(x => x[1])), wl = out.flatMap(o => o.wants), avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
console.log(`model shot delay (rt+lat+swipe) avg ${avg(wl)} ms; measured dive->shot in game avg ${avg(reacts)} ms (n=${reacts.length}), max ${Math.max(0, ...reacts)} ms`);
if (CAL) console.log(`bot start-early calibration (box overhead it removes): first ${cals[0]} ms, last ${cals[cals.length - 1]} ms, median ${[...cals].sort((a, b) => a - b)[cals.length >> 1]} ms over ${cals.length} shots`);
console.log(`PROFILE ${PROF} lat ${LAT}ms: ${wins}/${out.length} wins = ${(100 * wins / out.length).toFixed(0)}% | per-shot ${JSON.stringify(cnt)} | errors ${out.reduce((a, o) => a + o.errs, 0)}`);
process.exit(out.length && out.every(o => !o.errs) ? 0 : 1);
