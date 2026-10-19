// Champion HALL hammer: 12 fast taps (and QC r22's 20 taps over 1.8 s) on HALL must land in the Hall and never open a door; a fresh tap after a pause still works.
import { chromium, devices } from 'playwright';
const URLS = (process.env.URLS || 'http://localhost:4199/,http://localhost:4201/').split(',');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); let fails = 0;
const check = (n, ok, info = '') => { console.log(ok ? 'PASS' : 'FAIL', n, info); if (!ok) fails++; };
for (const url of URLS) for (const [gap, N] of [[35, 12], [70, 12], [120, 12], [95, 20]]) { // [95, 20] = QC r22: 20 taps over 1.8 s
  const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.evaluate(() => { for (const k of ['playroom.beaten', 'playroom-test.beaten']) localStorage.setItem(k, '9'); }); await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && window.__artReady !== false, null, { timeout: 90000 });
  await p.evaluate(() => { window.__starts = []; const G = window.__game; G.scene.scenes.forEach(s => s.sys.events.on('create', () => window.__starts.push(s.sys.settings.key)));
    G.scene.getScenes(true).forEach(s => s.scene.stop()); G.scene.start('Champion'); });
  await p.waitForFunction(() => window.__game.scene.isActive('Champion'), null, { timeout: 20000 }); await p.waitForTimeout(1500);
  const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280];
  // QC r21-style hammer: synthetic touches (every 4th a two-finger touch) on HALL, all doors open (Football sits right above HALL)
  await p.evaluate(([gap, N]) => new Promise(res => { const c = document.querySelector('canvas'); let id = 1; const r = c.getBoundingClientRect();
    for (let i = 0; i < N; i++) setTimeout(() => { const pts = i % 4 === 3 ? [[180, 1176], [200, 1184]] : [[180 + (i % 3) * 5, 1176]];
      const ts = pts.map(([gx, gy]) => { const x = r.left + gx * r.width / 720, y = r.top + gy * r.height / 1280; return new Touch({ identifier: id++, target: c, clientX: x, clientY: y, pageX: x, pageY: y, radiusX: 4, radiusY: 4, force: 1 }); });
      c.dispatchEvent(new TouchEvent('touchstart', { touches: ts, targetTouches: ts, changedTouches: ts, bubbles: true, cancelable: true }));
      setTimeout(() => c.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: ts, bubbles: true, cancelable: true })), 12);
      if (i === N - 1) setTimeout(res, 60); }, i * gap); }), [gap, N]);
  await p.waitForTimeout(2000);
  const r1 = await p.evaluate(() => ({ act: window.__game.scene.getScenes(true).map(s => s.sys.settings.key).join(','), starts: window.__starts.join(',') }));
  check(`${url} gap ${gap}ms x${N}: hammer lands in Hall, no door opened`, r1.act === 'Hub' && !/Boxing|Football|Hive|Acorn|Shadow|Trash|Pounce|Dive|Lasso/.test(r1.starts), JSON.stringify(r1));
  await p.waitForTimeout(400); await p.touchscreen.tap(...P(90, 1080)); await p.waitForTimeout(1500);
  const r2 = await p.evaluate(() => window.__game.scene.getScenes(true).map(s => s.sys.settings.key).join(','));
  check(`${url} gap ${gap}ms x${N}: fresh tap on the Boxing door opens it`, r2.includes('Boxing'), r2);
  check(`${url} gap ${gap}ms x${N}: 0 errors`, errs.length === 0, errs.slice(0, 2).join(' / '));
  await p.context().close();
}
console.log(fails ? 'RESULT FAIL' : 'RESULT PASS'); await b.close();
