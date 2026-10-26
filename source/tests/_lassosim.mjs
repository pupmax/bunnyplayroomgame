// Frame-stepped Lasso experiment: a player who WATCHES the spin dot (release error ~ N(0, SIG ms) around the green centre),
// aim = Puppy's position + N(0, AIM px). Compares quality falloff .14 vs .20. Finish is disabled so ropes are counted over the full 45 s;
// rope timestamps let us score the old rule (6 by 38 s) too.
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL || 'http://localhost:4201/'); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
const R = +(process.env.ROUNDS || 6), out = [];
const CFG = (process.env.CFG || '0.14:70:0.8,0.20:70:0.8').split(',').map(c => c.split(':').map(Number));
for (const [fall, SIG, cap] of CFG) for (let r = 0; r < R; r++) {
  await p.evaluate(() => { window.__game.scene.getScenes(true).forEach(s => s.scene.stop()); window.__pr = {}; }); await p.waitForTimeout(250);
  await p.evaluate(() => window.__game.scene.start('Lasso')); await p.waitForFunction(() => window.__pr?.scene === 'Lasso', null, { timeout: 15000 }); await p.waitForTimeout(400);
  const res = await p.evaluate(({ fall, SIG, cap }) => {
    const g = window.__game, S = g.scene.getScene('Lasso'); g.loop.sleep(); let T = performance.now();
    const rn = Date.now.bind(Date); let fk = rn(); Date.now = () => fk; const step = n => { for (let i = 0; i < n; i++) { T += 16.667; fk += 16.667; g.scene.update(T, 16.667); } };
    const gauss = () => { let u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    S.quality = function () { const d = Math.abs(((this.st.phase % 1) + 1) % 1 - 0.75); return Math.max(0, 1 - d / fall); };
    S.finish = () => {}; S.trick = function () { if (Math.random() > Math.min(cap, 0.3 + this.st.ropes * 0.15)) return 'none'; return ['hop', 'umbrella', 'decoy', 'shadow', 'crate'][Math.floor(Math.random() * 5)]; }; S.tutClose?.(); 
    // dismiss tutorial by starting directly
    S.begin(); step(60); const s = S.st; const ropesAt = []; const or = S.rope.bind(S); S.rope = (r) => { if (s.time > 0) ropesAt.push(+(45 - s.time).toFixed(1)); or(r); if (s.ropes >= 5) s.time = 0; }; let throws = 0, qs = [];
    let guard = 0;
    while (s.time > 0 && guard++ < 400) {
      while ((s.flying || !s.running) && s.time > 0) step(1);
      if (s.time <= 0) break;
      const aimAt = () => { const pp = window.__pr.pup(); S.setAim(pp.x + gauss() * 45, pp.y + gauss() * 25); };
      step(Math.floor(5 + Math.random() * 15)); // reaction gap between throws
      s.hold = true; S.peakQ = 0; aimAt();
      // release when the dot is at green centre of a cycle at least 0.35 s away, plus timing error
      const frac = ((s.phase % 1) + 1) % 1; let need = (0.75 - frac); while (need * 0.9 < 0.35) need += 1;
      const ms = need * 900 + gauss() * SIG; const n = Math.max(1, Math.round(ms / 16.667));
      for (let i = 0; i < n; i++) { step(1); if (i % 6 === 0) aimAt(); }
      qs.push(+S.quality().toFixed(2)); const before = s.ropes;
      s.hold = false; S.aim.clear(); S.throwLasso(); throws++;
      while (s.flying && s.time > 0) step(1);
    }
    Date.now = rn; g.loop.wake(); return { ropes: ropesAt.length, throws, ropesAt, avgQ: +(qs.reduce((a, b) => a + b, 0) / qs.length).toFixed(2) };
  }, { fall, SIG, cap });
  const old6 = res.ropesAt.filter(t => t <= 38).length >= 6, new5 = res.ropes >= 5;
  out.push({ fall, SIG, cap, ...res, winOld38_6: old6, winNew45_5: new5 }); console.log(JSON.stringify(out[out.length - 1]));
}
const agg = {}; for (const o of out) { const k = `fall${o.fall}_sig${o.SIG}_cap${o.cap}`; agg[k] ??= { n: 0, ropes: 0, old: 0, nw: 0, at5: [] }; const a = agg[k]; a.n++; a.ropes += o.ropes; a.old += o.winOld38_6; a.nw += o.winNew45_5; if (o.ropesAt[4]) a.at5.push(o.ropesAt[4]); }
for (const [k, a] of Object.entries(agg)) console.log(k, 'avg ropes/45s', (a.ropes / a.n).toFixed(1), 'win old(6@38s)', `${a.old}/${a.n}`, 'win new(5@45s)', `${a.nw}/${a.n}`, '5th rope at', a.at5.join(','));
console.log('ERRS', errs.slice(0, 3)); await b.close();
