// Trash-Can Drop shot sheet (390x844 phone): freezes the game loop at set moments of each knockout and of the Bunny-photo daydream.
// Uses scene hooks to stage the moments (the real-touch test covers real play). Usage: node tests/trash-shots.mjs [url] [outdir]
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://127.0.0.1:4388/test.html', OUT = process.argv[3] || 'shots';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 12).join(' | ')));
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') || window.__game?.scene.isActive('SoloTitle'), null, { timeout: 120000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Trash'); });
await p.waitForFunction(() => window.__pr?.scene === 'Trash' && window.__tutorialOpen, null, { timeout: 20000 });
await p.waitForTimeout(800); const bx = await p.locator('canvas').boundingBox();
await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height * 0.7);
await p.waitForFunction(() => window.__pr?.st?.running && window.__pr.skin?.(), null, { timeout: 20000 });
// keep the run calm: lots of time, no random photos until we ask, no cooldown
await p.evaluate(() => { const s = window.__pr.st; s.time = 999; s.photoAt = 1e9; });
const freezeAt = (sec) => p.waitForFunction((t) => { const S = window.__game.scene.getScene('Trash'); if (S.skin.mt >= t) { window.__game.loop.sleep(); return true; } return false; }, sec, { polling: 'raf', timeout: 30000 });
const thaw = () => p.evaluate(() => window.__game.loop.wake());
const settle = () => p.waitForFunction(() => { const S = window.__game.scene.getScene('Trash'); return S.st.mode !== 'stop' && S.st.mode !== 'dream' && S.skin.mode !== 'ko' && S.st.px > 200 && S.st.px < 520; }, null, { polling: 200, timeout: 30000 });
const at = { warm: 0.3, pop: 0.42, spin: 0.38, lid: 0.32, peel: 0.4, flat: 0.5, bird: 0.45 };
for (const k of Object.keys(at)) {
  await settle();
  await p.evaluate((k) => { const S = window.__game.scene.getScene('Trash'); S.st.bonks = 0; S.skin.bag = [k === 'warm' ? 'bird' : k]; S.skin.last = null; S.hit(S.st.px, k === 'flat', false, '🥫'); }, k);
  await freezeAt(at[k]); if (k !== 'warm') await p.screenshot({ path: `${OUT}/10_ko_${k}.png` }); await thaw();
}
// Bunny photo: appear (mid-flutter), dreaming (hearts up), DREAM BONK (stamp in)
await settle(); await p.evaluate(() => { const s = window.__pr.st; s.bonks = 0; s.photoAt = 0; s.ko = 0; });
await freezeAt(0.45); await p.screenshot({ path: `${OUT}/11_photo_appears.png` }); await thaw();
await freezeAt(1.7); await p.screenshot({ path: `${OUT}/12_puppy_dreaming.png` }); await thaw();
await p.evaluate(() => { const S = window.__game.scene.getScene('Trash'); S.hit(S.st.px, false, false, '🥫'); });
await freezeAt(0.22); await p.screenshot({ path: `${OUT}/13_dream_bonk.png` }); await thaw();
await freezeAt(0.6); await p.screenshot({ path: `${OUT}/13b_dream_bonk_wake.png` }); await thaw();
// missed window: he pockets it
await settle(); await p.evaluate(() => { const s = window.__pr.st; s.bonks = 0; s.photoAt = 0; s.ko = 0; });
await p.waitForFunction(() => window.__game.scene.getScene('Trash').skin.mode === 'pocket', null, { polling: 'raf', timeout: 30000 });
await freezeAt(0.3); await p.screenshot({ path: `${OUT}/16_photo_pocketed.png` }); await thaw();
console.log('shots ok, errors:', errs.length, errs.slice(0, 3)); await b.close();
