// Tail Catch look-mockups -> screenshots/tail/*.png (720x1280). Needs a build served at TM_URL (default :4210).
import { chromium } from 'playwright';
const URL = process.env.TM_URL || 'http://localhost:4210/';
const names = ['', '01_hall_bonus_door', '02_chase_tail_glow', '03_grab_tug', '04_catch_gotcha', '05_catch_lead_variant', '06_tutorial'];
const SHOTS = [[1], [3], [4], [5], [6], [7, 1.42, '02a_chase_dash'], [7, 2.55, '02b_chase_pause_glow'], [7, 3.12, '02c_chase_grab']];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
for (const [n, t, nm] of SHOTS) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(n + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(n + ': ' + m.text()); });
  await p.goto(`${URL}?tailmock=${n}${t !== undefined ? '&t=' + t : ''}`);
  await p.waitForFunction(() => window.__mockReady, null, { timeout: 90000 }); await p.waitForTimeout(300);
  await p.screenshot({ path: `screenshots/tail/${nm || names[n]}.png` }); await ctx.close();
}
console.log('errors', JSON.stringify(errs)); await b.close();
