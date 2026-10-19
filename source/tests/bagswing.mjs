// Mid-swing screenshots of the punching bag at both extremes: node tests/bagswing.mjs <prefix>  -> screenshots/v8/bag_swing_<prefix>_{left,right}.png
import { chromium } from 'playwright';
const pre = process.argv[2] || 'shot'; const b = await chromium.launch(); const errs = [];
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errs.push(String(e)));
await page.goto(process.env.URL || 'http://localhost:4199/');
await page.evaluate(() => localStorage.setItem('playroom.tut.rubybag', '1')); await page.reload();
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 90000 });
await page.evaluate(() => window.__game.scene.getScene('Title').scene.start('Boxing'));
await page.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 60000 });
await page.evaluate(() => { const S = window.__game.scene.getScene('Boxing'); S.time.timeScale = 0.25; S.tweens.timeScale = 0.25; });
for (const [side, sg] of [['left', -1], ['right', 1]]) {
  // guard swing near an extreme (normalised swing s.x ~ ±1), and the drawn angle has caught up with it
  await page.waitForFunction((sg) => { const S = window.__game.scene.getScene('Boxing'), st = S.st; return st.state === 'guard' && st.x * sg > 0.93 && S.ang * st.x > 0 && Math.abs(S.ang) > 0.8 * Math.abs(S.ang / st.x) * Math.abs(st.x) * 0.9; }, sg, { timeout: 60000, polling: 'raf' }).catch(() => console.log('timeout waiting', side));
  await page.evaluate(() => window.__game.loop.sleep()); await page.waitForTimeout(150);
  await page.screenshot({ path: `screenshots/v8/bag_swing_${pre}_${side}.png` }); console.log('saved', side, await page.evaluate(() => { const S = window.__game.scene.getScene('Boxing'); return JSON.stringify({ x: +S.st.x.toFixed(2), ang: +S.ang.toFixed(1) }); }));
  await page.evaluate(() => window.__game.loop.wake());
}
console.log('errors', errs); await b.close();
