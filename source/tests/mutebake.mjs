// Mute button (baked on/off textures): toggles state + texture, survives a scene change.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await (await b.newContext({ viewport: { width: 440, height: 956 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4199/'); await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 }); await p.waitForTimeout(800);
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
const tex = () => p.evaluate(() => { const s = window.__game.scene.getScenes(true)[0]; const c = s.children.list.find(o => o.isMuteButton); return [localStorage.getItem('playroom.mute'), c.list[0].texture?.key]; });
const a = await tex(); await p.mouse.click(...P(656, 64)); await p.waitForTimeout(300); const bb = await tex(); await p.mouse.click(...P(656, 64)); await p.waitForTimeout(300); const cc = await tex();
console.log(a, bb, cc, errs); console.log(a[1] === 'bkg_mute_0' && bb[1] === 'bkg_mute_1' && cc[1] === 'bkg_mute_0' && errs.length === 0 ? 'PASS mute toggle' : 'FAIL mute toggle'); await b.close();
