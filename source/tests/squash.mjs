// Shadow Tag squash catch: in-game screenshots of each variant + timer/AI freeze, skip rules, no-repeat, cleanup.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:4199/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
let fails = 0; const ok = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
await p.goto(URL); await p.evaluate(() => { localStorage.setItem('playroom.tut.linye1', '1'); localStorage.setItem('playroom-test.tut.linye1', '1'); });
await p.reload(); await p.waitForFunction(() => window.__game && window.__artReady && window.__game.scene.isActive('Title'), null, { timeout: 60000 });
const ev = (f, a) => p.evaluate(f, a);
const startShadow = async () => { await ev(() => { const G = window.__game; G.scene.getScenes(true).forEach(s => s.scene.key !== 'Shadow' && s.scene.stop()); G.scene.start('Shadow'); });
  await p.waitForFunction(() => window.__pr && window.__pr.scene === 'Shadow' && window.__pr.st.running && window.__pr.squash().ready, null, { timeout: 30000 }); };
// tag Puppy now: park him on a free pool and teleport there (the real tapAt path)
const tagNow = (v) => ev((v) => { const S = window.__game.scene.getScene('Shadow'); window.__pr.forceSquash(v); S.st.cool = 0;
  const lit = window.__pr.lit(); const order = [6, 3, 4, 1, 7, 5, 2, 0, 8, 9]; const i = order.find(k => !lit[k]); const [x, y] = window.__pr.pools[i];
  S.pupTw && S.pupTw.stop(); S.pup.setPosition(x + 20, y); S.tapAt(x, y); return { phase: window.__pr.squash().phase, time: S.st.time }; }, v);
await startShadow(); await p.waitForTimeout(+(process.env.SETTLE || 0));
const base = await ev(() => Math.abs(window.__game.scene.getScene('Shadow').pup.scaleY));
for (const v of ['A', 'B', 'C']) {
  await p.waitForFunction(() => !window.__pr.squash().phase, null, { timeout: 10000 });
  const r = await tagNow(v); ok(`${v}: catch starts on tag`, r.phase === 'pounce', JSON.stringify(r));
  const tp = Date.now(); await p.waitForFunction(() => window.__pr.squash().phase === 'hold', null, { timeout: 5000 }); console.log(`  ${v}: pounce took ${Date.now() - tp} ms real`); await p.waitForTimeout(700);
  const s = await ev(() => ({ q: window.__pr.squash(), time: window.__pr.st.time }));
  ok(`${v}: in hold, variant ${v}`, s.q.phase === 'hold' && s.q.v === v, JSON.stringify(s.q));
  ok(`${v}: level timer frozen`, Math.abs(s.time - r.time) < 0.05, `${r.time.toFixed(2)} -> ${s.time.toFixed(2)}`);
  await p.screenshot({ path: `screenshots/v9/squash_${v}.png` });
  await p.waitForFunction(() => !window.__pr.squash().phase, null, { timeout: 5000 }); await p.waitForTimeout(150);
  const after = await ev(() => { const S = window.__game.scene.getScene('Shadow'); return { sc: Math.abs(S.pup.scaleY), vis: S.pup.visible, moving: !!(S.pupTw && S.pupTw.isPlaying()) }; });
  if (!after.moving) after.moving = await p.waitForFunction(() => { const S = window.__game.scene.getScene('Shadow'); return !!(S.pupTw && S.pupTw.isPlaying()); }, null, { timeout: 1000 }).then(() => true, () => false);
  ok(`${v}: Puppy back to roaming size, visible, running again`, Math.abs(after.sc - base) < 1e-3 && after.vis && after.moving, JSON.stringify(after) + " base " + base);
}
// skip rules: the tagging tap cannot skip; taps < 0.5 s into the hold do nothing; a tap after 0.5 s skips to the boing
await ev(() => window.__pr.forceSquash(undefined));
const r2 = await tagNow(undefined);
await ev(() => { const S = window.__game.scene.getScene('Shadow'); S.tapAt(360, 1040); });
ok('tap during pounce ignored', (await ev(() => window.__pr.squash().phase)) === 'pounce');
await p.waitForFunction(() => window.__pr.squash().phase === 'hold'); await p.waitForFunction(() => { const S = window.__game.scene.getScene('Shadow'); return S.time.now - S.sq.holdAt > 150; });
await ev(() => window.__game.scene.getScene('Shadow').tapAt(360, 1040));
ok('tap ~0.15-0.3 s into the hold does not skip', (await ev(() => window.__pr.squash().phase)) === 'hold');
await p.waitForFunction(() => { const S = window.__game.scene.getScene('Shadow'); return S.time.now - S.sq.holdAt > 520; });
const t0 = Date.now(); await ev(() => window.__game.scene.getScene('Shadow').tapAt(360, 1040));
ok('tap after 0.5 s skips to the boing', (await ev(() => window.__pr.squash().phase)) === 'boing');
await p.waitForFunction(() => !window.__pr.squash().phase); ok('boing ends quickly', Date.now() - t0 < 700, `${Date.now() - t0} ms`);
// random variants: never the same twice in a row
const seq = [];
for (let k = 0; k < 24; k++) { await p.waitForFunction(() => !window.__pr.squash().phase && !window.__pr.st.over);
  await ev(() => { window.__pr.st.tags = 0; window.__pr.st.time = 30; }); await tagNow(undefined);
  seq.push(await ev(() => window.__pr.squash().v)); await ev(() => { const S = window.__game.scene.getScene('Shadow'); S.time.delayedCall(560, () => S.tapAt(360, 1040)); }); }
const rep = seq.some((v, i) => i && v === seq[i - 1]); ok('variants random, no repeats', !rep && new Set(seq).size === 3, seq.join(''));
// pause mid-catch keeps state; finishing mid-catch cleans up
await p.waitForFunction(() => !window.__pr.squash().phase); await tagNow('B'); await p.waitForTimeout(500);
await ev(() => window.__pr.force(true)); await p.waitForTimeout(300);
const fin = await ev(() => { const S = window.__game.scene.getScene('Shadow'); return { ph: window.__pr.squash().phase, pupVis: S.pup.visible }; });
ok('force-finish mid-catch cleans up', fin.ph === '' && fin.pupVis, JSON.stringify(fin));
ok('no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(fails ? `${fails} FAILED` : 'ALL PASS'); await b.close(); process.exit(fails ? 1 : 0);
