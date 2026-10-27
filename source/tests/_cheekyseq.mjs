// Cheeky pass: shots of one scene at given scene-clock times (ms since the scene started). URL=... SCENE=Interlude DATA='{"name":"Nana","idx":3}' TS=1500,3700 OUT=/tmp/ts_
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(process.env.DPR || 2) })).newPage();
await p.goto(process.env.URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 120000 });
const S = process.env.SCENE || 'Interlude', D = JSON.parse(process.env.DATA || '{"name":"Nana","idx":3}');
await p.evaluate(([k, d]) => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k, d); window.__t0 = null; }, [S, D]);
await p.waitForFunction(k => window.__game.scene.isActive(k), S);
await p.evaluate(k => { const sc = window.__game.scene.getScene(k); window.__el = 0; sc.events.on('preupdate', (_t, d) => { window.__el += d; }); }, S); // timers advance by the (smoothed) delta, not by time.now
for (const t of (process.env.TS || '1500,3700').split(',').map(Number)) {
  await p.evaluate(([k, t]) => { const sc = window.__game.scene.getScene(k); void sc; void t; }, [S, t]);
  await p.waitForFunction(([k, t]) => { const sc = window.__game.scene.getScene(k); return !sc.sys.isActive() || window.__el >= t; }, [S, t], { timeout: 60000, polling: 16 });
  await p.evaluate(() => { window.__game.loop.sleep(); }); await p.screenshot({ path: `${process.env.OUT || '/tmp/ts_'}${t}.png` }); await p.evaluate(() => window.__game.loop.wake());
  console.log('shot', t);
}
await b.close();
