// Cheeky pass: every girl's win card (and a few loss cards) shot mid-leash. URL=... OUT=prefix CARDWAIT=ms (after the card shows) LEVELS=Boxing,...
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(process.env.URL); await p.evaluate(() => { for (const k of ['bunny2','glassia_pen2','iris1','linye1','midnight1','nana2','noir2','rubybag','tail1','tailmock','zoe1']) localStorage.setItem('playroom.tut.' + k, '1'); });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && (window.__artReady ?? true), null, { timeout: 120000 });
for (const spec of (process.env.LEVELS || 'Boxing,Football,Hive,Acorn,Dive,Pounce,Trash,Shadow').split(',')) {
  const [key, res] = spec.split(':'); const win = res !== 'lose';
  await p.evaluate(k => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); window.__cardArmed = undefined; window.__pr = undefined; g.scene.start(k); }, key);
  await p.waitForFunction(k => window.__pr?.scene === k && window.__pr.force, key, { timeout: 20000 }); await p.waitForTimeout(1200);
  await p.evaluate(w => window.__pr.force(w), win);
  await p.waitForFunction(() => !!window.__cardArmed, null, { timeout: 30000 }); await p.waitForTimeout(Number(process.env.CARDWAIT || 2000));
  await p.screenshot({ path: `${process.env.OUT}${key}_${win ? 'win' : 'lose'}.png` }); console.log('shot', key, win);
}
console.log('ERRORS', errs.length, errs.slice(0, 3)); await b.close();
