// Boxing KO check: play a few real exchanges (dodge away from "!" then punch), then KO Puppy and capture the flop.
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4199}/`;
const b = await chromium.launch(); const errs = [];
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', e => errs.push(String(e)));
await page.goto(BASE); await page.evaluate(() => { for (const k of ['ruby2', 'ruby3', 'ruby4', 'ruby']) localStorage.setItem('playroom.tut.' + k, '1'); });
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
await page.evaluate(() => { window.__game.scene.getScene('Title').scene.start('Boxing'); });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
await page.waitForTimeout(1500);
if (await page.evaluate(() => window.__tutorialOpen)) { await page.mouse.click(...P(360, 930)); await page.waitForTimeout(500); }
await page.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 10000 });
const hp0 = await page.evaluate(() => window.__pr.st.pupHp);
const t0 = Date.now();
// Force swing-backs so a slow (loaded) box still sees exchanges: dodge the safe way, then mash PUNCH while the bag is open.
while (Date.now() - t0 < 40000 && (await page.evaluate(() => window.__pr.st.pupHp)) >= hp0) {
  const s = await page.evaluate(() => ({ state: window.__pr.st.state, side: window.__pr.st.side, dizzy: window.__pr.st.dizzy }));
  if (s.state === 'guard' && s.dizzy <= 0) { await page.evaluate(() => window.__pr.swingBack(1)); }
  else if (s.state === 'windup') { await page.waitForFunction(() => window.__pr.dodgeCue() || window.__pr.st.state !== 'windup', null, { timeout: 20000, polling: 16 }).catch(() => {}); await page.mouse.click(...P(s.side > 0 ? 110 : 610, 1190)); await page.waitForFunction(() => window.__pr.st.state !== 'windup', null, { timeout: 20000 }).catch(() => {}); }
  else if (s.state === 'open' || s.state === 'stun') await page.mouse.click(...P(360, 1190));
  await page.waitForTimeout(90);
}
const mid = await page.evaluate(() => window.__pr.st);
console.log(`${mid.pupHp < hp0 ? 'PASS' : 'FAIL'} boxing plays: Puppy HP ${hp0} -> ${mid.pupHp}, Ruby HP ${mid.rubyHp}`);
await page.evaluate(() => { window.__pr.st.pupHp = 0; window.__pr.force(true); });
await page.waitForTimeout(700); await page.screenshot({ path: 'screenshots/v6/boxing_ko.png' });
console.log(`${await page.evaluate(() => window.__pr.ended === 'win') ? 'PASS' : 'FAIL'} KO win registered`);
console.log(`${errs.length ? 'FAIL' : 'PASS'} no errors ${errs.join(' | ')}`); await b.close();
