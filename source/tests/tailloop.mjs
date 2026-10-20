// Captures the scripted Tail Catch chase loop (dash -> pause+glow -> dash -> pause -> grab -> GOTCHA) frame by frame -> /tmp/tailframes/f%03d.png
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'fs';
const URL = process.env.TM_URL || 'http://localhost:4210/', FPS = 15, SECS = 5.2;
rmSync('/tmp/tailframes', { recursive: true, force: true }); mkdirSync('/tmp/tailframes');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [];
const p = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
p.on('pageerror', e => errs.push(e.message));
await p.goto(`${URL}?tailmock=7&t=0`); await p.waitForFunction(() => window.__mockReady, null, { timeout: 90000 });
const n = Math.round(FPS * SECS);
for (let i = 0; i < n; i++) {
  await p.evaluate((k) => new Promise(r => { const S = window.__game.scene.getScene('MockTail'); for (let j = 0; j < k; j++) S.loopTick(1 / 60); requestAnimationFrame(() => requestAnimationFrame(r)); }), i === 0 ? 0 : 60 / FPS);
  await p.screenshot({ path: `/tmp/tailframes/f${String(i).padStart(3, '0')}.png` });
}
console.log('frames', n, 'errors', JSON.stringify(errs)); await b.close();
