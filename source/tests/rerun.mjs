// Repeated-start stress for /ruby/: PLAY AGAIN x N, MENU->PLAY x N, reload x R. Tracks AudioContexts, WebGL contexts, textures, listeners, heap.
import { chromium, devices } from 'playwright';
const URL = process.env.RUBY_URL || 'http://localhost:4200/', N = +(process.env.N || 10), R = +(process.env.R || 5);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await b.newContext({ ...devices['iPhone 15 Pro Max'], viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
await ctx.addInitScript(() => {
  const W = window; W.__cnt = { audio: 0, webgl: 0, listeners: {} };
  const AC = W.AudioContext || W.webkitAudioContext; if (AC) { const Wrap = function (...a) { W.__cnt.audio++; return new AC(...a); }; Wrap.prototype = AC.prototype; W.AudioContext = Wrap; W.webkitAudioContext = Wrap; }
  const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { if (/webgl/.test(t) && !this.__counted) { this.__counted = true; W.__cnt.webgl++; } return gc.call(this, t, ...a); };
  for (const T of [window, document]) { const add = T.addEventListener.bind(T), rem = T.removeEventListener.bind(T), tag = T === window ? 'w:' : 'd:';
    T.addEventListener = (ty, ...a) => { W.__cnt.listeners[tag + ty] = (W.__cnt.listeners[tag + ty] || 0) + 1; return add(ty, ...a); };
    T.removeEventListener = (ty, ...a) => { W.__cnt.listeners[tag + ty] = (W.__cnt.listeners[tag + ty] || 0) - 1; return rem(ty, ...a); }; }
});
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
const stat = (label) => p.evaluate((label) => { window.gc && window.gc(); const G = window.__game, keys = G.textures.getTextureKeys(); const S = G.scene.getScene('Boxing');
  const evc = (em) => em ? em.eventNames().reduce((a, n) => a + em.listenerCount(n), 0) : 0;
  const L = Object.entries(window.__cnt.listeners).reduce((a, [k, v]) => a + v, 0);
  return { label, heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), tex: keys.filter(k => !/^[0-9a-f]{8}-/.test(k)).length, textTex: keys.filter(k => /^[0-9a-f]{8}-/.test(k)).length, audio: window.__cnt.audio, webgl: window.__cnt.webgl, domListeners: L,
    gameEv: evc(G.events), scaleEv: evc(G.scale), inputEv: S && S.input ? evc(S.input) : -1, bxDisp: S && S.sys.isActive() ? S.children.list.length : -1, bxTweens: S && S.sys.isActive() ? S.tweens.getTweens().length : -1, bxTimers: S && S.sys.isActive() ? S.time.getAllEvents?.().length ?? -1 : -1, fps: Math.round(G.loop.actualFps) }; }, label);
const boot = async () => { await p.waitForFunction(() => window.__game?.scene.isActive('SoloTitle'), null, { timeout: 120000 }); };
const P = async (x, y) => { const bx = await p.locator('canvas').boundingBox(); return [bx.x + x * bx.width / 720, bx.y + y * bx.height / 1280]; };
const cardUp = () => p.waitForFunction(() => window.__game.scene.getScene('Boxing').children.list.some(o => o.depth === 960 && o.alpha >= 0.99), null, { timeout: 60000, polling: 50 });
const running = () => p.waitForFunction(() => window.__game.scene.isActive('Boxing') && window.__pr?.st?.running && !window.__pr.ended, null, { timeout: 60000, polling: 50 });
const play = async () => { await p.mouse.click(...await P(360, 1150)); await p.waitForFunction(() => window.__game.scene.isActive('Boxing'), null, { timeout: 30000 });
  for (let i = 0; i < 10 && !(await p.evaluate(() => window.__pr?.st?.running)); i++) { await p.waitForTimeout(700); if (await p.evaluate(() => window.__tutorialOpen)) await p.mouse.click(...await P(360, 930)); } await running(); };
const rows = []; const t0 = Date.now(); const log = (s) => { s.t = Math.round((Date.now() - t0) / 1000); rows.push(s); console.log(JSON.stringify(s)); };
await p.goto(URL, { timeout: 120000 }); await boot(); log(await stat('boot'));
await play(); log(await stat('match1'));
for (let i = 0; i < N; i++) { await p.waitForTimeout(1500); await p.evaluate((w) => window.__pr.force(w), i % 2 === 0); await cardUp(); await p.mouse.click(...await P(215, 1010)); await running(); if (i % 3 === 2 || i === N - 1) log(await stat('again' + (i + 1))); }
for (let i = 0; i < N; i++) { await p.waitForTimeout(1200); await p.evaluate(() => window.__pr.force(false)); await cardUp(); await p.mouse.click(...await P(505, 1010)); await boot(); await p.waitForTimeout(400); await play(); if (i % 3 === 2 || i === N - 1) log(await stat('menu' + (i + 1))); }
for (let i = 0; i < R; i++) { await p.reload({ timeout: 120000 }); await boot(); await play(); await p.waitForTimeout(1500); log(await stat('reload' + (i + 1))); }
console.log('lowq', await p.evaluate(() => localStorage.getItem('playroom.lowq')), 'ERRORS', errs.length, errs.slice(0, 5).join(' | '));
await b.close();
