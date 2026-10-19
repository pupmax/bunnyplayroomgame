import { chromium, webkit, devices } from 'playwright';
const URL = process.env.BASE_URL || 'http://localhost:4199/', TITLE = process.env.TITLE || 'Title';
async function run(name, bt, dev, throttle) {
  const b = await bt.launch(); const ctx = await b.newContext({ ...dev }); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  if (throttle) { const s = await ctx.newCDPSession(page); await s.send('Emulation.setCPUThrottlingRate', { rate: 6 }); }
  const t0 = Date.now(); let ok = true, tTitle = 0;
  try { await page.goto(URL); await page.waitForFunction(t => window.__game?.scene.isActive(t), TITLE, { timeout: 120000 }); tTitle = Date.now() - t0; await page.waitForFunction(() => window.__artReady, null, { timeout: 180000 }); } catch (e) { ok = false; errs.push(String(e).slice(0, 200)); }
  const info = ok ? await page.evaluate(() => { const tm = window.__game.textures; let px = 0, n = 0; for (const k of tm.getTextureKeys()) { const s = tm.get(k).source[0]; n++; px += s.width * s.height; } return { n, MB: Math.round(px * 4 / 1e6), canvas: [window.__game.canvas.width, window.__game.canvas.height], gl: window.__game.renderer.type }; }) : {};
  console.log(name, ok ? 'BOOT OK' : 'BOOT FAIL', 'title ' + (tTitle / 1000).toFixed(1) + 's, all art ' + ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(info), errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors');
  await b.close(); return ok && !errs.length;
}
let all = true;
all &= await run('Android(Pixel5,6xCPU)', chromium, devices['Pixel 5'], true);
all &= await run('iPhone13-chromium', chromium, { ...devices['iPhone 13'], defaultBrowserType: undefined }, false);
try { all &= await run('iPhone13-WebKit', webkit, devices['iPhone 13'], false); all &= await run('iPhoneSE-WebKit', webkit, devices['iPhone SE'], false); } catch (e) { console.log('webkit unavailable', String(e).slice(0, 150)); }
process.exit(all ? 0 : 1);
