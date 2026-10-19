// Tester build (/test/): fresh profile -> title tag, all 9 Hall doors open, each launches its level; storage only under playroom-test.*
import { chromium, devices } from 'playwright';
const URL = process.env.TEST_URL || 'http://localhost:4201/';
const DOORS = [[90, 1080], [270, 1080], [450, 1080], [630, 1080], [630, 750], [450, 750], [270, 750], [90, 750], [360, 300]];
const LEVELS = ['Boxing', 'Football', 'Hive', 'Acorn', 'Dive', 'Pounce', 'Trash', 'Shadow', 'Lasso'];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 2 });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
let fails = 0; const ok = (c, m) => { console.log(c ? 'PASS' : 'FAIL', m); if (!c) fails++; };
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
await p.waitForTimeout(1500); await p.screenshot({ path: 'screenshots/v9/test_title.png' });
ok(await p.evaluate(() => window.__game.scene.getScene('Title').children.list.some(o => o.text === 'TEST – all unlocked')), 'title shows TEST – all unlocked tag');
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
await p.touchscreen.tap(...P(360, 1120)); await p.waitForFunction(() => window.__game.scene.isActive('Hub'), null, { timeout: 15000 }); await p.waitForTimeout(1200);
await p.screenshot({ path: 'screenshots/v9/test_hall.png' });
for (let i = 0; i < 9; i++) {
  if (i) { await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Hub'); }); await p.waitForFunction(() => window.__game.scene.isActive('Hub')); await p.waitForTimeout(900); }
  await p.touchscreen.tap(...P(...DOORS[i]));
  const launched = await p.waitForFunction(k => window.__game.scene.isActive(k), LEVELS[i], { timeout: 15000 }).then(() => true, () => false);
  ok(launched, `door ${i} launches ${LEVELS[i]}`);
}
await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 15000 }); await p.waitForTimeout(900); await p.touchscreen.tap(...P(360, 640)); await p.waitForTimeout(400);
const keys = await p.evaluate(() => Object.keys(localStorage));
ok(keys.every(k => !k.startsWith('playroom.') || k === 'playroom.lowq'), 'no normal-progress keys written: ' + keys.join(','));
ok(keys.some(k => k.startsWith('playroom-test.')), 'tester keys under playroom-test.*');
ok(errs.length === 0, 'errors ' + errs.length + ' ' + (errs[0] || ''));
console.log('FAILS', fails); await b.close();
