// Cheeky pass: phone-size (390x844) shots of the end cards / interludes / hub / champion. Usage: URL=... OUT=dir node tests/cheekyshots.mjs
import { chromium, devices } from 'playwright';
const URL_ = process.env.URL || 'http://localhost:4501/', OUT = process.env.OUT || '/tmp/cheekyshots/';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(URL_); await p.evaluate(() => { for (let i = 0; i < 12; i++) ['Boxing','Football','Hive','Acorn','Dive','Pounce','Trash','Shadow','Lasso','Tail','bunny2','glassia_pen2','iris1','linye1','midnight1','nana2','noir2','rubybag','tail1','tailmock','zoe1'].forEach(k => localStorage.setItem('playroom.tut.' + k, '1')); });
await p.reload(); await p.waitForFunction(() => window.__game?.scene.isActive('Title') && (window.__artReady ?? true), null, { timeout: 120000 });
const W = ms => p.waitForTimeout(ms);
const go = (k, d) => p.evaluate(([k, d]) => { const g = window.__game; g.scene.getScenes(true).forEach(s => g.scene.stop(s.scene.key)); g.scene.start(k, d); }, [k, d]);
const shot = async (n) => { if (ONLY && !ONLY.some(o => n.includes(o))) return; await p.screenshot({ path: OUT + n + '.png' }); console.log('shot', n); };
const want = n => !ONLY || ONLY.some(o => n.includes(o));
// CARDWAIT=ms: shoot that long after the end card appears (else a fixed wait after forcing the result)
const level = async (key, win, n, wait = 4200) => { if (!want(n)) return; await go(key); await p.waitForFunction(k => window.__pr?.scene === k && window.__pr.force, key, { timeout: 15000 }); await W(1500);
  await p.evaluate(() => { window.__tutorialOpen && document.dispatchEvent(new Event('x')); });
  await p.evaluate(() => { window.__cardArmed = undefined; }); await p.waitForFunction(() => window.__pr?.force, null, { timeout: 15000 }); await p.evaluate(w => window.__pr.force(w), win);
  if (process.env.CARDWAIT) { await p.waitForFunction(() => !!window.__cardArmed, null, { timeout: 30000 }); await W(Number(process.env.CARDWAIT)); } else await W(wait); await shot(n); };
if (want('hub')) { await go('Hub'); await W(1300); await shot('01_hub_greeting'); }
for (const [nm, idx] of [['Midnight', 4], ['Noir', 5], ['Ruby', 0]]) { if (!want('interlude_' + nm)) continue;
  await go('Interlude', { name: nm, idx }); await W(2300); await shot(`02_interlude_${nm}_victory`); await W(1500); await shot(`03_interlude_${nm}_teaser`); await W(2300); await shot(`04_interlude_${nm}_walk`); await W(1300); await shot(`05_interlude_${nm}_walk2`); }
await level('Dive', true, '06_card_win_Midnight');
await level('Pounce', false, '07_card_lose_Noir');
await level('Football', false, '08_card_lose_Glassia', 3500);
await level('Hive', true, '09_card_win_Zoe');
await level('Tail', true, '10_card_win_Tail', 6000);
await level('Tail', false, '11_card_lose_Tail', 3500);
await level('Lasso', false, '12_card_lose_Lasso', 3500);
if (want('champion')) { await go('Champion', { score: 4321 }); await W(1500); await shot('13_champion'); await W(1700); await shot('14_champion_b'); }
console.log('ERRORS', errs.length, errs.slice(0, 5)); await b.close();
