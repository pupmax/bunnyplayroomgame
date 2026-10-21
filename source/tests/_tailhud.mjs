// HUD counter check: play with the bot loop (real frames), read the HUD label text before/after each catch
import { chromium, devices } from 'playwright';
const URL = process.env.URL || 'http://localhost:4213/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
p.on('pageerror', e => errs.push(e.message));
await p.goto(URL); await p.evaluate(() => localStorage.setItem('playroom-tail.tut.tail1', '1')); await p.reload();
await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 90000 });
await p.evaluate(() => { const G = window.__game; G.scene.stop('SoloTitle'); G.scene.start('Tail'); });
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 });
const hud = () => p.evaluate(() => window.__game.scene.getScene('Tail').children.list.filter(o => o.type === 'Text' && /^TAILS/.test(o.text)).map(o => o.text + '@' + o.visible + '/' + o.alpha + '/d' + o.depth));
console.log('start', await hud());
for (let i = 0; i < 3; i++) {
  await p.evaluate(() => { const S = window.__game.scene.getScene('Tail'), st = S.st; st.pup = 'pause'; S.pDur = 99; st.glow = true; S.startTug(); S.startCatch(); });
  await p.waitForTimeout(200); console.log('in catch', i, await hud(), await p.evaluate(() => window.__pr.st.tails));
  await p.evaluate(() => { window.__game.scene.getScene('Tail').st.catchT = 5; }); await p.waitForTimeout(400);
  console.log('after', i, await hud());
}
console.log('errs', errs); await b.close();
