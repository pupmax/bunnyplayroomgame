import { chromium } from 'playwright';
const names = ['', '01_midnight_raven_dive', '02_noir_cat_pounce', '03_zoe_bear_hive_bonk', '04_nana_squirrel_acorns', '05_iris_raccoon_trash_drop', '06_linye_secret', '07_bunny_finale_lasso'];
const b = await chromium.launch(); const errs = [];
for (let n = 1; n <= 7; n++) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(`http://localhost:4199/?mock=${n}`);
  await p.waitForFunction(() => window.__mockReady, null, { timeout: 20000 }); await p.waitForTimeout(400);
  await p.screenshot({ path: `mockups/v2/${names[n]}.png` }); await ctx.close();
}
console.log('errors', errs); await b.close();
