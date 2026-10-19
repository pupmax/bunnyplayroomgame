// Tutorial dismiss race: tap the tutorial card at various moments (incl. double taps), first and second run; check the game loop keeps running.
import { chromium, devices } from 'playwright';
const URL = process.env.RUBY_URL || 'http://localhost:4200/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const delay of [0, 150, 400, 700, 1000, 1400, 2000, 2600]) for (const dbl of [false, true]) {
  const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 120000 });
  const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
  await p.mouse.click(...P(360, 1150)); // PLAY (title clears the tutorial-seen flag so the card shows)
  await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 30000 });
  await p.waitForTimeout(delay);
  // keep tapping until the card closes (like an impatient player), max ~3 s
  for (let i = 0; i < 12 && (await p.evaluate(() => window.__tutorialOpen)); i++) { await p.mouse.click(...P(360, 930)); if (dbl) await p.mouse.click(...P(360, 930)); await p.waitForTimeout(250); }
  const t1 = await p.evaluate(() => window.__game.loop.frame); await p.waitForTimeout(1500); const t2 = await p.evaluate(() => window.__game.loop.frame);
  const st = await p.evaluate(() => ({ running: !!window.__pr?.st?.running, tut: !!window.__tutorialOpen, punches: window.__pr?.st?.hits ?? -1 }));
  const r = { delay, dbl, loopAlive: t2 > t1, ...st, errors: errs.length, err: errs[0] || '' }; results.push(r); console.log(JSON.stringify(r));
  await ctx.close();
}
console.log('HUNG', results.filter(r => !r.loopAlive || !r.running).length, 'of', results.length, 'ERRS', results.filter(r => r.errors).length);
await b.close();
