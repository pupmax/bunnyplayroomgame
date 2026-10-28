// 28 Oct nudge: shots of the leash moment (Interlude walk / win + loss cards / Champion) at a few times. URL=... OUT=prefix SPECS=inter:4,card:Acorn:win,card:Boxing:lose,champ TIMES=ms,ms
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL); await p.evaluate(() => { for (const pf of ['playroom.', 'playroom-test.']) for (const k of ['bunny2','glassia_pen2','iris1','linye1','midnight1','nana2','noir3','rubybag','tail1','tailmock','zoe1']) localStorage.setItem(pf + 'tut.' + k, '1'); });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && (window.__artReady ?? true), null, { timeout: 180000 });
const times = (process.env.TIMES || '1700,2300').split(',').map(Number);
const NAMES = ['Ruby', 'Glassia', 'Zoe', 'Nana', 'Midnight', 'Noir', 'Iris', 'Linye'];
for (const spec of (process.env.SPECS || 'inter:4,card:Acorn:win,card:Boxing:lose,champ').split(',')) {
  const [kind, a, r] = spec.split(':'); let t0;
  if (kind === 'inter') { const idx = Number(a);
    await p.evaluate(([i, n]) => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Interlude', { name: n, idx: i }); }, [idx, NAMES[idx]]);
    await p.waitForFunction(() => { const s = window.__game.scene.getScene('Interlude'); if (!s?.sys.isActive()) return false; let f = false;
      const walk = l => l.forEach(o => { if (o.list) walk(o.list); if (o.texture && /bun_sip/.test(o.texture.key)) f = true; }); walk(s.children.list); return f; }, null, { timeout: 30000, polling: 50 }); t0 = Date.now(); }
  else if (kind === 'champ') { await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Champion', { score: 2920 }); });
    await p.waitForFunction(() => window.__game.scene.isActive('Champion'), null, { timeout: 20000 }); t0 = Date.now(); }
  else { const win = r !== 'lose';
    await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); window.__cardArmed = undefined; window.__pr = undefined; g.scene.start(k); }, a);
    await p.waitForFunction(k => window.__pr?.scene === k && window.__pr.force, a, { timeout: 30000 }); await p.waitForTimeout(1200);
    await p.evaluate(w => window.__pr.force(w), win); await p.waitForFunction(() => window.__pr?.ended, null, { timeout: 30000 }); t0 = Date.now(); }
  if (process.env.ROPE) { // wait for the leash Graphics (new, opaque, many commands) then shoot at ROPE delays from detection; retry up to 4 teases
    const scn = kind === 'inter' ? 'Interlude' : kind === 'champ' ? 'Champion' : null;
    if (process.env.ROPE_AFTER) await p.waitForTimeout(Number(process.env.ROPE_AFTER));
    await p.evaluate(() => { const walk = l => l.forEach(o => { if (o.list) walk(o.list); if (o.type === 'Graphics') o.__old = 1; }); window.__game.scene.getScenes(true).forEach(s => walk(s.children.list)); });
    const ok = await p.waitForFunction((dep) => { let f = false; const walk = l => l.forEach(o => { if (o.list) walk(o.list); if (o.type === 'Graphics' && !o.__old && (!dep || o.depth === dep) && o.x === 0 && o.y === 0 && o.alpha > 0.95 && (o.commandBuffer?.length || 0) > 120) f = true; });
      window.__game.scene.getScenes(true).forEach(s => walk(s.children.list)); return f; }, Number(process.env.ROPE_DEPTH || 0), { timeout: Number(process.env.ROPE_TO || 40000), polling: 30 }).then(() => true, () => false);
    console.log('rope', spec, ok, scn); const td = Date.now();
    for (const t of process.env.ROPE.split(',').map(Number)) { const w = td + t - Date.now(); if (w > 0) await p.waitForTimeout(w);
      const f = `${process.env.OUT}${spec.replace(/:/g, '_')}_rope${t}.png`; await p.screenshot({ path: f }); console.log('shot', f); }
    continue; }
  for (const t of times) { const w = t0 + t - Date.now(); if (w > 0) await p.waitForTimeout(w);
    const f = `${process.env.OUT}${spec.replace(/:/g, '_')}_${t}.png`; await p.screenshot({ path: f }); console.log('shot', f); }
}
console.log('ERRORS', errs.length, errs.slice(0, 3)); await b.close();
