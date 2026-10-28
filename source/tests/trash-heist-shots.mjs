// node shots.mjs <URL> <prefix>  (390x844 @2x, full-frame). Puppy/Iris are pinned with deterministic state so every option is framed the same.
import { chromium } from 'playwright';
const [,, URL_, prefix, OUTD] = process.argv; const D = OUTD || '/workspace/playtest-bpg/iris28/';
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.addInitScript(() => { localStorage.setItem('playroom.tut.iris1', '1'); localStorage.setItem('playroom-test.tut.iris1', '1'); });
await page.goto(URL_); await page.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
await page.waitForFunction(() => window.__artReady, null, { timeout: 180000 });
const start = async () => { await page.evaluate(() => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start('Trash'); });
  await page.waitForFunction(() => window.__pr?.scene === 'Trash' && window.__pr.st.running, null, { timeout: 20000 }); await page.waitForTimeout(300); };
const meta = {};
// force Puppy's next mode with a stubbed Math.random (0.25 = umbrella, 0.5 = run, 0.9 = walk, 0.1 = sniff/gag) and hold it
const SET = `const force = (r, px, pv, ix, idir) => { const s = sc.st; s.px = px; s.pv = pv; s.ix = ix; s.idir = idir; s.time = 40; const R = Math.random; Math.random = () => r; sc.newMode(); Math.random = R; s.modeT = 99; };`;
const moment = async (name, fn, ms) => {
  await page.evaluate(([f, ms, SET]) => { const sc = window.__game.scene.getScene('Trash'); window.__frozen = false; if (f) { new Function('sc', SET + f)(sc); window.__t0 = sc.time.now; } const t0 = window.__t0;
    const h = () => { window.__el = sc.time.now - t0; if (sc.time.now - t0 >= ms) { sc.events.off('postupdate', h); window.__frozen = true; window.__game.loop.sleep(); } }; sc.events.on('postupdate', h); }, [fn, ms, SET]);
  await page.waitForFunction(() => window.__frozen, null, { timeout: 10000 }); await page.waitForTimeout(60);
  meta[name] = await page.evaluate(() => { const s = window.__pr.st; return { el: Math.round(window.__el), px: Math.round(s.px), ix: Math.round(s.ix), mode: s.mode, umb: s.umbrella, bonks: s.bonks, gfx: window.__pr.gfx?.() }; });
  await page.screenshot({ path: D + prefix + '_' + name + '.png' }); await page.evaluate(() => window.__game.loop.wake(true));
};
await start();
await moment('1_idle', 'force(0.9, 230, 1, 520, -1)', 700);                 // both walking toward each other
await moment('2_aim', 'force(0.6, 380, 1, 300, 1); sc.st.mode = "stop"; sc.st.cool = 0;', 380); // Iris scoots over a sniffing Puppy, ring turns green
await moment('3_drop', 'sc.st.cool = 0; sc.st.ix = sc.st.px; sc.queue[0] = "🥫"; sc.updNext(); sc.drop();', 230); // can mid-fall
await moment('4_hit', '', 520);                                              // ~100 ms after CLONK
await moment('5_stun', '', 1050);                                            // dazed
await page.waitForTimeout(900);
await moment('6_umbrella', 'force(0.25, 400, -1, 400, 1); sc.st.cool = 0; sc.queue[0] = "👟"; sc.updNext(); sc.st.ix = 400; sc.drop();', 700); // BOING off the brolly
await page.waitForTimeout(900);
await moment('7_dream', 'force(0.9, 360, 1, 360, 1); sc.st.photos = 0; sc.st.ko = 0; sc.st.umbrella = false; sc.dropPhoto(); sc.st.modeT = 99;', 1700);
await moment('7b_dream_bonk', 'sc.hit(sc.st.px, false, false, "🥫");', 260);
await page.waitForTimeout(1500);
await moment('8_win', 'sc.st.bonks = 7; force(0.6, 360, 1, 360, 1); sc.st.mode = "stop"; sc.finish(true);', 900);
await start();
await moment('9_lose', 'force(0.6, 360, 1, 500, 1); sc.st.mode = "stop"; sc.finish(false);', 900);
const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log(JSON.stringify({ prefix, meta, fps, errs }));
await b.close();
