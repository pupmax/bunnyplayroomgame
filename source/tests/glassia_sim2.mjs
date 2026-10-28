// PENALTY PUP v2 (Read & Shoot) game-clock model. Same harness as glassia_sim.mjs; the bot reads his LEAN on green and shoots the other corner.
// The real-touch bots on this box are limited by the headless renderer (5-20 fps, CDP touch acks once per frame), which adds
// ~250-600 ms of game time to every reaction, far more than a phone does. This model runs the SAME player profiles inside the
// page on the game clock: it watches the same visible-event channel (__pr.st.vis), waits reaction + swipe + touch latency
// and then shoots through the scene's own fire() path (the same path onUp uses after a swipe or tap). It measures the
// difficulty curve (tells, feints, windows, early saves), not touch handling, which glassia_realtouch.mjs covers.
// usage: node tests/glassia_sim.mjs [url] [realistic|sloppy|pro] [games] [parallel] [speed]
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://127.0.0.1:4311/', PROF = process.argv[3] || 'realistic', GAMES = +process.argv[4] || 20, PAR = +process.argv[5] || 4, SPEED = +process.argv[6] || 2;
const LAT = +(process.env.LAT || 100);
// early: kicks before green; jump: on shots 4-6 commits to his FIRST (yellow) lean; wrong: shoots at his lean by mistake; mid: tries the middle
// tail: on the bluff shots (7-8) reads the tail instead of the lean; notice: re-aims after a sneaky swap if it shows >=250 ms before release
// bonk: rebound-bonk reaction to the BONK HIM! prompt [mean, sd] ms (a new, celebratory moment, so slower than a shot read),
// aim: sd of the aim error at his head (px in the 720-wide world), skip: chance they just enjoy the goal and ignore it
const PROFILES = {
  realistic: { rt: [320, 60], swipe: 140, early: 0.06, jump: 0.15, wrong: 0.05, mid: 0.08, tap: 0.3, tail: 0.7, notice: 0.8, bonk: [430, 110], aim: 75, skip: 0.05 },
  sloppy: { rt: [420, 90], swipe: 170, early: 0.15, jump: 0.35, wrong: 0.1, mid: 0.05, tap: 0.4, tail: 0.45, notice: 0.55, bonk: [560, 150], aim: 110, skip: 0.15 },
  pro: { rt: [260, 40], swipe: 120, early: 0.02, jump: 0.03, wrong: 0.02, mid: 0.1, tap: 0.2, tail: 0.95, notice: 0.95, bonk: [320, 60], aim: 50, skip: 0 },
};
const P = PROFILES[PROF];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
async function worker(id, n, out) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
  await p.evaluate(() => ['glassia_pen2', 'playroom.tut.glassia_pen2', 'playroom-test.tut.glassia_pen2'].forEach(k => localStorage.setItem(k, '1')));
  for (let g = 0; g < n; g++) {
    await p.evaluate(() => { window.__pr = null; const G = window.__game; G.scene.getScenes(true).forEach(x => G.scene.stop(x.scene.key)); G.scene.start('Football'); });
    await p.waitForFunction(() => window.__pr?.scene === 'Football' && window.__game.scene.isActive('Football'), null, { timeout: 30000 });
    if (await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 4000 }).then(() => 1, () => 0)) { await p.waitForTimeout(900); const bb = await p.locator('canvas').boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }
    await p.evaluate(({ P, LAT, SPEED, DBG }) => { window.__simDbg = DBG; if (!window.__noRender) { window.__noRender = 1; window.__game.scene.render = () => {}; } // logic only: no drawing, so frames stay ~16 ms like a phone
      const Sc = window.__game.scene.getScene('Football'), pr = window.__pr; Sc.time.timeScale = Sc.tweens.timeScale = SPEED;
      const gauss = ([m, s]) => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.max(150, m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); };
      const gauss0 = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
      const Z = pr.zones(); let shot = -1, pend = null, early = null, jump = false, prevG = pr.now(); window.__simLog = [];
      const plan = (now, target) => { const zs = Z.filter(z => z.side === target), tap = Math.random() < P.tap; return { at: now + gauss(P.rt) + (tap ? 60 : P.swipe) + LAT, z: zs[Math.floor(Math.random() * zs.length)] }; };
      const aim = side => { const r = Math.random(); return r < P.wrong ? side : r < P.wrong + P.mid ? 0 : -side; };
      const vis0 = Object.getPrototypeOf(Sc).vis.bind(Sc); Sc.vis = (k, side = 0, tail) => { vis0(k, side, tail); const st = pr.st, now = pr.now();
        if (window.__simDbg) window.__simLog.push(`${st.shot}:${k}${side}${tail ? 't' + tail : ''}@${Math.round(now)}${pend ? 'P' + Math.round(pend.at) : ''}`);
        if (st.shot !== shot || k === 'ready') { if (st.shot !== shot) { early = Math.random() < P.early ? { at: 0 } : null; jump = Math.random() < P.jump; } shot = st.shot; pend = null; }
        if ((k === 'read' || k === 'lean') && early && !early.at) early.at = now + 150 + Math.random() * 400;
        if (k === 'lean' && jump && !pend) { jump = false; pend = plan(now, aim(side)); }
        if (k === 'swap' && pend && !pend.green) { /* yellow swap: the impatient bot is already swiping */ }
        if (k === 'swap' && pend && pend.green) { if (pend.at - now >= 250 && Math.random() < P.notice) pend = null; }
        if (k === 'green' && !pend) { const read = tail && Math.random() < P.tail ? tail : side; pend = { ...plan(now, aim(read)), green: true }; }
        if (k === 'up') pend = null;
        if (k === 'bonk' && Math.random() >= P.skip) { const tap = Math.random() < P.tap; bonkAt = now + gauss(P.bonk) + (tap ? 60 : P.swipe) + LAT; bonkTap = tap; } };
      let bonkAt = 0, bonkTap = false;
      const tick = () => {
        const st = pr.st, now = pr.now(), half = (now - prevG) / 2; prevG = now;
        if (bonkAt && now >= bonkAt - half) { bonkAt = 0; if (pr.bonk() === 'open') { const h = pr.head(), ex = gauss0() * P.aim, ey = gauss0() * P.aim; pr.bonkAt(h.x + ex, bonkTap ? h.y + ey : h.y, bonkTap); } }
        if (!st.ready || st.fired || st.over) return;
        if (early?.at && !pend && now >= early.at - half) { early = null; const zs = Z.filter(z => z.side !== 0); Sc.fire(zs[Math.floor(Math.random() * zs.length)]); window.__simLog.push('early-try'); return; }
        if (pend && now >= pend.at - half) { if (window.__simDbg) window.__simLog.push(`FIRE${pend.z.side}@${Math.round(now)}`); Sc.fire(pend.z); pend = null; }
      };
      Sc.events.on('postupdate', tick); Sc.events.once('shutdown', () => { Sc.events.off('postupdate', tick); delete Sc.vis; });
    }, { P, LAT, SPEED, DBG: !!process.env.DBG });
    await p.waitForFunction(() => !!window.__pr?.ended, null, { timeout: 240000, polling: 500 });
    if (process.env.DBG) console.log(await p.evaluate(() => window.__simLog.join(' ')));
    const r = await p.evaluate(() => ({ ended: window.__pr.ended, goals: window.__pr.st.goals, results: window.__pr.st.results, ww: window.__pr.wrongWay || 0, bonk: window.__pr.st.bonk, score: window.__pr.st.score }));
    out.push(r); console.log(`[w${id} g${g}] ${r.ended.toUpperCase()} ${r.goals} goals | ${r.results.join(',')}`);
  }
  if (errs.length) console.log(`[w${id}] errors`, errs.slice(0, 3)); out.errs = (out.errs || 0) + errs.length; await ctx.close();
}
const out = []; const per = Math.ceil(GAMES / PAR); await Promise.all(Array.from({ length: PAR }, (_, i) => worker(i, Math.max(0, Math.min(per, GAMES - i * per)), out))); await b.close();
const wins = out.filter(o => o.ended === 'win').length, cnt = {}, byShot = Array.from({ length: 8 }, () => ({}));
out.forEach(o => o.results.forEach((r, i) => { if (!r) return; cnt[r] = (cnt[r] || 0) + 1; byShot[i][r] = (byShot[i][r] || 0) + 1; }));
console.log('per shot #:', byShot.map((c, i) => `${i + 1}:${JSON.stringify(c)}`).join(' '));
const bk = out.reduce((a, o) => { for (const k in o.bonk) a[k] = (a[k] || 0) + o.bonk[k]; return a; }, {});
console.log(`rebound bonk: offered ${bk.offered}, hit ${bk.hit} (${(100 * bk.hit / Math.max(1, bk.offered)).toFixed(0)}%), fast ${bk.fast}, too slow ${bk.slow}, missed ${bk.miss}, avg bonk pts/game ${(bk.pts / out.length).toFixed(0)}, avg score ${(out.reduce((a, o) => a + o.score, 0) / out.length).toFixed(0)}`);
console.log(`wrong-way gags: ${out.reduce((a, o) => a + o.ww, 0)}`);
console.log(`SIM2 ${PROF} lat ${LAT}ms speed ${SPEED}x: ${wins}/${out.length} wins = ${(100 * wins / out.length).toFixed(0)}% | ${JSON.stringify(cnt)} | errors ${out.errs || 0}`);
process.exit(out.errs ? 1 : 0);
