// Sneaky Pounce bot harness (frame-stepped, deterministic dt). Bots see Puppy's look state with a reaction lag.
// usage: node tests/pouncebots.mjs [modes] [N]   URL=http://localhost:4201/ (test build)
// modes: ignore (hold + pounce whenever in range), walk (hold always, pounce in range when he looks away),
//        spam (hold + pounce every 300 ms from anywhere), lookaway (decent: move/pounce only when away, 250 ms),
//        casual / noob: QC r21 bots (300-400 ms + 15% mistakes / 450-650 ms + 30% mistakes),
//        decent (human-like: moves whenever he looks away, waits behind cover once in range, pounces only early in a window),
//        sneaky (cautious: like lookaway but parks in cover late in a window, pounces only early in a window), noob (350 ms, sloppy)
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:4201/';
const TUNE = JSON.parse(process.env.TUNE || '{}');
const MODES = (process.argv[2] || 'ignore,walk,spam,lookaway,sneaky,noob').split(','), N = +process.argv[3] || 5;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL); await p.evaluate(() => { for (const k of ['noir1']) { localStorage.setItem('playroom-test.tut.' + k, '1'); localStorage.setItem('playroom.tut.' + k, '1'); } });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 90000 }); await p.waitForTimeout(500);
const table = [];
for (const mode of MODES) { const res = [];
  for (let g = 0; g < N; g++) {
    const r = await p.evaluate(async ([mode, tune]) => {
      const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== 'Pounce' && s.scene.stop()); G.scene.start('Pounce');
      const W = ms => new Promise(r => setTimeout(r, ms)); await W(300); const S = G.scene.getScene('Pounce');
      G.loop.sleep(); const RR = G.renderer, sv = [RR.preRender, RR.render, RR.postRender]; RR.preRender = RR.render = RR.postRender = () => {};
      let ft = performance.now(); const DN = Date.now, PN = performance.now.bind(performance), ft0 = ft, d0 = DN(); Date.now = () => d0 + (ft - ft0); performance.now = () => ft;
      const step = n => { for (let i = 0; i < n; i++) { ft += 16.667; G.step(ft, 16.667); } };
      if (window.__pr?.K) { Object.assign(window.__pr.K, tune); if (tune.TIME) S.st.time = tune.TIME; }
      let k = 0; while (!(S.st && S.st.running) && k < 600) { step(6); k++; if (k % 20 == 0) await W(0); }
      const st = S.st, R = Math.random, tNow = () => S.time.now, HIDES = [250, 410];
      const log = { pounces: 0, dodged: 0, dPre: 0, spots: 0, tooFar: 0, scampers: 0 };
      const wrap = (n, f) => { if (!S[n]) return; const o = S[n].bind(S); S[n] = (...a) => { f(); return o(...a); }; };
      wrap('dodged', () => log.dodged++); wrap('spot', () => { if (!st.spotted) log.spots++; }); wrap('scamper', () => log.scampers++);
      const opn = S.pounce.bind(S); S.pounce = () => { if (!st.busy && st.running) { log.pounces++; if (st.px - st.x > 280) log.tooFar++; else if (st.look !== 'away' && !(st.yarnT > 0)) log.dPre++; } return opn(); };
      const hist = []; const seen = lag => { const t = tNow() - lag; let v = hist.length ? hist[0] : { l: 'away', a: 0 }; for (const h of hist) { if (h.t <= t) v = h; else break; } return v; };
      let frames = 0, lastP = -1e9, awayFrom = 0, prevL = 'away';
      // QC r21 casual/noob (ported 1:1 from playtest-bpg/pounce21.mjs): per-turn reaction 300-400 ms (+250 ms 20%) / 450-650 ms (+300 ms 30%),
      // 15% / 30% mistakes (moves late, pounces early), random stop distance, casual waits in cover 35% of the time
      const qSeen = lag => { const t = tNow() - lag; let v = 'away', since = -1e9; for (const h of hist) { if (h.t <= t) { if (h.l !== v) { v = h.l; since = h.t; } } else break; } return { v, age: t - since }; };
      let curLag = mode === 'noob' ? 520 : 350, lastSeenV = 'away', plan = {};
      while (!st.over && frames < 30000) {
        const l = st.yarnT > 0 ? 'away' : st.look; if (l !== prevL) { if (l === 'away') awayFrom = tNow(); prevL = l; }
        hist.push({ t: tNow(), l, a: awayFrom }); if (hist.length > 400) hist.shift();
        const d = st.px - st.x, now = tNow(), can = !st.busy && st.running, inR = d <= 280;
        if (mode === 'ignore') { st.hold = true; if (inR && can) S.pounce(); }
        else if (mode === 'walk') { st.hold = true; if (inR && can && seen(250).l === 'away') S.pounce(); }
        else if (mode === 'spam') { st.hold = true; if (now - lastP > 300) { lastP = now; S.pounce(); } }
        else if (mode === 'lookaway') { const v = seen(250); st.hold = v.l === 'away'; if (inR && can && v.l === 'away') S.pounce(); }
        else if (mode === 'sneaky') { const v = seen(250), age = (now - 250 - v.a) / 1000, hid = HIDES.some(h => Math.abs(st.x - h) < 40), coverAhead = HIDES.some(h => h - st.x > 0 && h - st.x < 60);
          st.hold = v.l === 'away' && (age < 1.0 || (!hid && coverAhead)) && !(hid && (d <= 280 || age > 0.6));
          if (inR && can && v.l === 'away' && age < 0.5) S.pounce(); }
        else if (mode === 'decent') { const v = seen(250), age = (now - 250 - v.a) / 1000, hid = HIDES.some(h => Math.abs(st.x - h) < 40);
          st.hold = v.l === 'away' && !(hid && inR && age > 0.4); if (inR && can && v.l === 'away' && age < 0.6) S.pounce(); }
        else if (mode === 'casual' || mode === 'noob') { const cas = mode === 'casual', q = qSeen(curLag);
          if (q.v !== lastSeenV) { lastSeenV = q.v; curLag = cas ? 300 + R() * 100 + (R() < 0.2 ? 250 : 0) : 450 + R() * 200 + (R() < 0.3 ? 300 : 0); plan.dec = null; }
          const away = q.v === 'away', mis = cas ? 0.15 : 0.3;
          if (!plan.stopD) plan.stopD = cas ? (R() < 0.6 ? 200 + R() * 70 : 120 + R() * 80) : 90 + R() * 120;
          if (plan.dec == null) plan.dec = { late: R() < mis ? 200 + R() * 300 : 0, early: R() < mis, coverWait: cas && R() < 0.35, t: now };
          const inCover = HIDES.some(c => Math.abs(st.x - c) < 40);
          let want = away && d > plan.stopD; if (plan.dec.coverWait && inCover && away && q.age > 600) want = false;
          if (!away && now - plan.dec.t < plan.dec.late) want = d > plan.stopD;
          st.hold = want;
          if (can && d <= 280) { if (away && (d <= plan.stopD + 10 || !st.hold)) { if (R() < 0.25) S.pounce(); } else if (!away && plan.dec.early && R() < 0.02) { S.pounce(); plan.dec.early = false; } }
          if (st.busy) plan.stopD = null; }
        step(1); frames++; if (frames % 60 == 0) await W(0);
      }
      step(5); Date.now = DN; performance.now = PN; [RR.preRender, RR.render, RR.postRender] = sv; G.loop.wake();
      return { ended: window.__pr.ended, catches: st.catches, escapes: st.escapes, timeLeft: +st.time.toFixed(1), frames, ...log };
    }, [mode, TUNE]);
    res.push(r); console.log(mode, g, JSON.stringify(r));
  }
  const w = res.filter(r => r.ended === 'win'), avg = (a, f) => a.length ? (a.reduce((s, r) => s + f(r), 0) / a.length).toFixed(1) : '-';
  const row = { mode, wins: `${w.length}/${N}`, timeLeftWin: avg(w, r => r.timeLeft), catches: avg(res, r => r.catches), escapes: avg(res, r => r.escapes), dodged: avg(res, r => r.dodged), dPre: avg(res, r => r.dPre || 0), spots: avg(res, r => r.spots) };
  table.push(row); console.log('SUM', JSON.stringify(row));
}
console.log('TABLE'); for (const r of table) console.log(Object.values(r).join(' | '));
console.log('ERRORS', errs.length, errs.slice(0, 3).join(' / '));
await b.close();
