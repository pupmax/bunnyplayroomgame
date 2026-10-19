// Verifies Ball Bonk hits are possible: (A) live bot aiming at moving Puppy over several games, (B) Puppy frozen in the open.
import { chromium } from 'playwright';
const b = await chromium.launch(); const errs = [];
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', e => errs.push(String(e)));
await page.goto('http://localhost:4199/'); await page.evaluate(() => { for (const k of ['glassia3', 'glassia4', 'glassia']) localStorage.setItem('playroom.tut.' + k, '1'); localStorage.setItem('playroom.beaten', '1'); });
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 30000 });
const bx = await page.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const swipe = async (pts) => { await page.mouse.move(...P(...pts[0])); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(...P(...p), { steps: 4 }); await page.mouse.up(); };
const st = () => page.evaluate(() => window.__pr.st);
async function game(freeze) {
  await page.evaluate(() => { window.__game.scene.getScenes(true)[0].scene.start('Football'); });
  await page.waitForTimeout(1200);
  // dismiss tutorial if shown
  if (await page.evaluate(() => window.__tutorialOpen)) { await page.mouse.click(...P(360, 860)); await page.waitForTimeout(300); }
  let kicks = 0;
  while (kicks < 7) {
    await page.waitForFunction(() => window.__pr.st.ready || window.__pr.ended, null, { timeout: 10000 }).catch(() => {});
    if (await page.evaluate(() => window.__pr.ended)) break;
    if (freeze) await page.evaluate(() => { const s = window.__game.scene.getScene('Football'); s.moveTw?.stop(); s.roamId++; s.pup.setPosition(360, 520); });
    const p = await page.evaluate(() => window.__pr.pup()); const dx = p.x - 400, dy = p.y - 70 - 1100, L = Math.hypot(dx, dy), k = 260 / L;
    await swipe([[400, 1100], [400 + dx * k * 0.5, 1100 + dy * k * 0.5], [400 + dx * k, 1100 + dy * k]]); kicks++;
    await page.waitForTimeout(2200);
  }
  const s = await st(); return { hits: s.hits, kicks: s.kick, results: s.results };
}
const live = []; for (let g = 0; g < 3; g++) live.push(await game(false));
const frozen = await game(true);
const liveHits = live.reduce((a, r) => a + r.hits, 0), liveKicks = live.reduce((a, r) => a + r.kicks, 0);
console.log('live games', JSON.stringify(live)); console.log('frozen game', JSON.stringify(frozen));
console.log(`${frozen.hits > 0 ? 'PASS' : 'FAIL'} hit possible (frozen Puppy, straight kick): ${frozen.hits}/${frozen.kicks}`);
console.log(`INFO live bot hit rate: ${liveHits}/${liveKicks}`);
console.log(`${errs.length ? 'FAIL' : 'PASS'} no errors ${errs.join(' | ')}`); await b.close();
