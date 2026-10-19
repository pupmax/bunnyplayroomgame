// Low-quality flag expiry: fresh flag honoured for 3 loads then dropped; >24 h old or legacy '1' -> normal; recovery after good frames.
import { chromium } from 'playwright';
const URL = process.env.RUBY || 'http://localhost:4200/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await (await b.newContext({ viewport: { width: 440, height: 956 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(URL); await p.waitForFunction(() => window.__game);
const load = async () => { await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 120000 }); return p.evaluate(() => ({ lowq: window.__lowq, stored: localStorage.getItem('playroom.lowq') })); };
const set = (v) => p.evaluate(v => v === null ? localStorage.removeItem('playroom.lowq') : localStorage.setItem('playroom.lowq', v), v);
const out = [];
await set(JSON.stringify({ t: Date.now(), loads: 0 })); for (let i = 1; i <= 4; i++) out.push(['fresh load ' + i, (await load()).lowq]);
await set(JSON.stringify({ t: Date.now() - 25 * 3600e3, loads: 0 })); out.push(['25h old', (await load()).lowq]);
await set('1'); out.push(['legacy 1', (await load()).lowq]);
await set('0'); out.push(['pinned 0', (await load()).lowq]);
await set(JSON.stringify({ t: Date.now(), loads: 0 })); out.push(['fresh again', (await load()).lowq]);
// recovery: play in low quality; headless frames are fast -> after ~10 s the flag is cleared
await p.evaluate(() => { localStorage.setItem('playroom-ruby.tut.rubybag', '1'); window.__game.scene.getScene('SoloTitle').scene.start('Boxing'); });
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 15000 });
await p.evaluate(() => Object.defineProperty(window.__game.loop, 'rawDelta', { configurable: true, get: () => 16.6, set() {} }));
const keep = setInterval(() => p.evaluate(() => { const s = window.__pr?.st; if (s) { s.time = 99; s.rubyHp = 100; } }).catch(() => {}), 1000); // emulate a phone holding 60 fps (swiftshader is slow)
const rec = await p.waitForFunction(() => window.__lowQRecovered, null, { timeout: 120000, polling: 500 }).then(() => true, () => false); clearInterval(keep);
out.push(['recovered after good frames', rec, await p.evaluate(() => localStorage.getItem('playroom.lowq'))]);
out.push(['next load', (await load()).lowq]);
out.forEach(r => console.log(...r)); console.log('ERRORS', errs.length, errs[0] || '');
const want = [true, true, true, false, false, false, false, true]; const ok = want.every((w, i) => out[i][1] === w) && out[8][1] === true && out[9][1] === false;
console.log(ok ? 'PASS lowq expiry' : 'FAIL lowq expiry'); await b.close();
