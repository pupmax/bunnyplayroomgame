// LASER LURE real-touch bot: iPhone 390x844, real CDP touch drags (no hooks drive input; hooks are only "eyes").
// usage: node tests/laser-realtouch.mjs [profile=realistic] [games=10] [url=http://127.0.0.1:4311/]
import { chromium } from 'playwright';
const PROFILE = process.argv[2] || 'realistic', GAMES = +(process.argv[3] || 10), URL = process.argv[4] || 'http://127.0.0.1:4311/';
const P = {
  //        react ms, finger px/s css, aim noise game px, lead game px, overshoot chance, wiggle delay ms, miss-sniff chance, tea-avoid, distracted / s, regrip px
  pro:       { react: 140, speed: 2600, noise: 14, lead: [230, 300], over: 0.02, wig: 250,  missSniff: 0.0,  tea: 0.95, distract: 0.0,  zone: 150, runup: 260, read: 0.25 },
  realistic: { react: 300, speed: 1400, noise: 38, lead: [260, 400], over: 0.14, wig: 800, missSniff: 0.15, tea: 0.55, distract: 0.06, zone: 110, runup: 200, read: 0.7 },
  sloppy:    { react: 420, speed: 1100, noise: 55, lead: [280, 470], over: 0.22, wig: 1100, missSniff: 0.3,  tea: 0.3,  distract: 0.10, zone: 95, runup: 170, read: 1.0 },
}[PROFILE];
if (!P) throw new Error('profile?');
const R = (a, b) => a + Math.random() * (b - a), gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (let g = 0; g < GAMES; g++) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.DPR || 2), hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
  await p.evaluate(() => { localStorage.removeItem('playroom-test.tut.noir4'); window.__game.scene.getScenes(true)[0].scene.start('Pounce'); });
  await p.waitForFunction(() => window.__pr?.scene === 'Pounce' && window.__pr.ready && window.__tutorialOpen, null, { timeout: 60000 });
  // world -> css mapping from the live camera
  const map = await p.evaluate(() => { const sc = window.__game.scene.getScene('Pounce'), cam = sc.cameras.main, cv = window.__game.canvas.getBoundingClientRect(), gs = window.__game.scale;
    const a = cam.getWorldPoint(0, 0), c = cam.getWorldPoint(gs.width, gs.height); const sx = cv.width / gs.width, sy = cv.height / gs.height;
    return { ax: a.x, ay: a.y, kx: gs.width / (c.x - a.x) * sx, ky: gs.height / (c.y - a.y) * sy, ox: cv.x, oy: cv.y }; });
  const css = (x, y) => ({ x: map.ox + (x - map.ax) * map.kx, y: map.oy + (y - map.ay) * map.ky });
  const touch = (type, pt) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: pt.x, y: pt.y, id: 1, radiusX: 9, radiusY: 9, force: 1 }] });
  // read the tutorial like a person, then tap it away
  await p.waitForTimeout(R(900, 1800)); const tp = css(360, 900); await touch('touchStart', tp); await p.waitForTimeout(60); await touch('touchEnd', tp);
  await p.waitForFunction(() => window.__pr.st.running, null, { timeout: 20000 });
  // LOCKSTEP: freeze the game's RAF loop and advance it 2 frames (1/30 s) per bot decision with real 60 fps deltas, so a loaded test box
  // plays like a phone at 60 fps with a player who updates their thumb 30x a second. Input is still real CDP touch events.
  await p.evaluate(() => { const g = window.__game; g.loop.sleep(); window.__lt = performance.now(); });
  const step = (n = 2) => p.evaluate(n => { const g = window.__game; for (let i = 0; i < n; i++) { window.__lt += 1000 / 60; g.step(window.__lt, 1000 / 60); } }, n);
  const hist = []; let finger = null, gripCool = 0, distractT = 0, wigT = -1, wigDir = 1, missSniff = false, lead = R(...P.lead), aimErr = { x: 0, y: 0 }, last = -1, lastPhase = '';
  const runup = { on: false, pt: null, d: P.runup }; const home = css(200, 1000), t0 = Date.now(); let ticks = 0;
  while (true) {
    const s = await p.evaluate(() => { const pr = window.__pr, st = pr.st; return { gt: st.t, ph: st.phase, over: st.over, ended: pr.ended, c: st.catches, str: st.strikes, time: st.time, teas: st.teas, score: st.score, megas: st.megas, tier: st.tier, heat: st.heat, chainI: st.chainI,
      pup: pr.pup(), dot: pr.dot(), trap: pr.trap(), tea: pr.decoy() }; });
    // all bot timing runs on the GAME clock, so a slow test box plays like a 60 fps phone in slow motion
    const now = s.gt * 1000, dt = last < 0 ? 0 : Math.max(0, (now - last) / 1000); last = now; ticks++;
    if (process.env.DBG && ticks % +process.env.DBG === 0) console.log(((Date.now()-t0)/1000)|0, ticks, s.ph, s.c, s.str, s.time.toFixed(1), s.tier, s.chainI, JSON.stringify([s.pup.x|0, s.pup.y|0, s.dot.x|0, s.dot.y|0, s.trap?.kind, finger && [finger.x|0, finger.y|0]]));
    if (s.over || Date.now() - t0 > 900000) { results.push({ cap: Date.now() - t0 > 900000, ph: s.ph, chainI: s.chainI, win: s.ended === 'win', c: s.c, str: s.str, teas: s.teas, score: s.score, megas: s.megas, left: +s.time.toFixed(1), errs: errs.length, err: errs[0] }); await p.evaluate(() => window.__game.loop.wake()); break; }
    hist.push({ t: now, s }); while (hist.length > 2 && hist[1].t <= now - P.react) hist.shift();
    const seen = hist[0].s; // what the player has reacted to so far
    if (s.ph !== lastPhase) { if (s.ph === 'sniff') { wigT = P.wig * R(0.7, 1.4); missSniff = Math.random() < P.missSniff; } if (s.ph === 'chase') { lead = R(...P.lead); gripCool = Math.max(gripCool, P.read); } lastPhase = s.ph; }
    if (Math.random() < P.distract * dt) distractT = R(0.4, 1.1);
    if (distractT > 0) { distractT -= dt; await step(); continue; }
    if (gripCool > 0) { gripCool -= dt; await step(); continue; }
    if (!finger) { finger = { x: home.x + R(-25, 25), y: home.y + R(-25, 25) }; await touch('touchStart', finger); await step(); continue; }
    let want = null;
    if (s.ph === 'sniff') {
      wigT -= dt * 1000; if (wigT <= 0 && !missSniff) { wigDir *= -1; want = { x: s.dot.x + wigDir * 70, y: s.dot.y }; }
    } else if (seen.ph === 'chase' && seen.trap) {
      const pu = seen.pup, tr = seen.trap; let tx = tr.x, ty = tr.y;
      // route around Bunny's tea table if it sits between him and the trap
      if (seen.tea?.on && Math.random() < P.tea) { const vx = tx - pu.x, vy = ty - pu.y, L = Math.hypot(vx, vy) || 1, ux = vx / L, uy = vy / L;
        const k = Math.max(0, Math.min(L, (seen.tea.x - pu.x) * ux + (seen.tea.y - pu.y) * uy)), cx = pu.x + ux * k, cy = pu.y + uy * k, d = Math.hypot(seen.tea.x - cx, (seen.tea.y - cy) * 1.6);
        if (d < 150 && k > 40 && k < L - 40) { const side = ((seen.tea.x - pu.x) * uy - (seen.tea.y - pu.y) * ux) > 0 ? 1 : -1; tx = seen.tea.x - uy * side * 190; ty = seen.tea.y + ux * side * 120; } }
      // run-up: from crash 2 he needs RUN speed, so take him away for a lap first, then swing back in
      { const L0 = Math.hypot(tx - pu.x, ty - pu.y); if (seen.c >= 1 && seen.tier < 1) { if (L0 < runup.d || runup.on) { runup.on = true;
          if (!runup.pt || Math.hypot(runup.pt.x - pu.x, runup.pt.y - pu.y) < 90) {
            const C = [[110, 900], [360, 900], [610, 920], [620, 1060], [600, 1190], [360, 1195], [110, 1190], [100, 1040]].map(([x, y]) => ({ x, y, d: Math.hypot(x - tr.x, y - tr.y) + R(0, 120) }))
              .filter(c => Math.hypot(c.x - pu.x, c.y - pu.y) > 160 && !(seen.tea?.on && Math.hypot(c.x - seen.tea.x, c.y - seen.tea.y) < 120)).sort((a, b) => b.d - a.d);
            runup.pt = C[0] ?? { x: 360, y: 1040 }; }
          tx = runup.pt.x; ty = runup.pt.y; } } else { runup.on = false; runup.pt = null; } }
      const vx = tx - pu.x, vy = ty - pu.y, L = Math.hypot(vx, vy) || 1;
      let ld = Math.min(L + 60, lead); if (Math.random() < P.over * dt) ld = lead * 1.9; // occasional over-eager fling
      aimErr.x += (gauss() * P.noise - aimErr.x) * Math.min(1, dt * 3); aimErr.y += (gauss() * P.noise - aimErr.y) * Math.min(1, dt * 3);
      want = { x: pu.x + vx / L * ld + aimErr.x, y: pu.y + vy / L * ld + aimErr.y };
    }
    if (want) { want.x = Math.max(75, Math.min(645, want.x)); want.y = Math.max(860, Math.min(1205, want.y));
      const ddx = (want.x - s.dot.x) / 1.25 * map.kx, ddy = (want.y - s.dot.y) / 1.25 * map.ky, dl = Math.hypot(ddx, ddy), mx = P.speed * Math.max(dt, 0.016);
      const f = dl > mx ? mx / dl : 1; const nx = finger.x + ddx * f, ny = finger.y + ddy * f;
      if (nx < 18 || nx > 372 || ny < 330 || ny > 830 || Math.hypot(nx - home.x, ny - home.y) > P.zone * 1.6) { await touch('touchEnd', finger); finger = null; gripCool = R(0.08, 0.22); continue; } // thumb re-grip
      if (dl > 1) { finger = { x: nx, y: ny }; await touch('touchMove', finger); }
    }
    await step();
  }
  const r = results[results.length - 1]; console.log(PROFILE, g + 1, JSON.stringify(r));
  await ctx.close();
}
const w = results.filter(r => r.win).length;
console.log(`SUMMARY ${PROFILE}: ${w}/${results.length} wins (${Math.round(100 * w / results.length)}%), avg catches ${(results.reduce((a, r) => a + r.c, 0) / results.length).toFixed(1)}, page errors ${results.reduce((a, r) => a + r.errs, 0)}`);
await b.close();
