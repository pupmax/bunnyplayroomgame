import { chromium } from 'playwright';
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
page.on('pageerror', e => console.log('ERR', String(e)));
await page.goto('http://localhost:4199/');
await page.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady, null, { timeout: 60000 });
console.log(await page.evaluate(() => { const tm = window.__game.textures; let n = 0, px = 0, big = []; for (const k of tm.getTextureKeys()) { const s = tm.get(k).source[0]; n++; px += s.width * s.height; big.push([k, s.width, s.height]); }
  big.sort((a, b) => b[1] * b[2] - a[1] * a[2]); return JSON.stringify({ n, MB: Math.round(px * 4 / 1e6), top: big.slice(0, 15), res: window.devicePixelRatio, canvas: [window.__game.canvas.width, window.__game.canvas.height] }); }));
await b.close();
