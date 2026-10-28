// Lasso graphics audit (28 Oct): live /test/ at 390x844 iPhone, captures every changing visual into frames/NN_label.png
import { chromium } from 'playwright';
import fs from 'fs';
const URL = process.env.URL || 'https://pupmax.github.io/bunnyplayroomgame/test/', OUT = process.env.OUT || '/workspace/playtest-bpg/lasso28/after/frames/';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await ctx.newCDPSession(p);
await p.goto(URL); await p.waitForFunction(() => window.__game?.scene.isActive('Title') || window.__game?.scene.isActive('SoloTitle'), null, { timeout: 120000 });
const bx = await p.locator('canvas').boundingBox(); const P = (x, y) => ({ x: bx.x + x * bx.width / 720, y: bx.y + y * bx.height / 1280 });
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ ...P(x, y), id: 1 }] });
const wait = ms => p.waitForTimeout(ms);
let n = 0; const log = [];
const shot = async (label) => { n++; await p.evaluate(() => window.__game.loop.sleep()); const f = `${String(n).padStart(2, '0')}_${label.replace(/[^a-zA-Z0-9]+/g, '_')}.png`; await p.screenshot({ path: OUT + f }); const st = await p.evaluate(() => { const s = window.__pr?.st; return s ? `${s.phase}/${s.pup} r${s.round} ropes${s.ropes} t${s.time?.toFixed(1)}` : window.__pr?.scene; }); log.push({ n, f, label, st }); console.log(n, label, st); await p.evaluate(() => window.__game.loop.wake()); };
const burst = async (label, k, gap) => { for (let i = 0; i < k; i++) { await shot(`${label}_${i + 1}`); if (gap) await wait(gap); } };
const ev = (fn, arg) => p.evaluate(fn, arg);
const S = 'window.__game.scene.getScene("Lasso")';
const startLasso = async () => { await ev(() => { for (const k of Object.keys(localStorage)) if (k.includes('.tut.')) localStorage.removeItem(k); window.__pr = null; const g = window.__game; g.scene.getScenes(true).forEach(s => s.scene.stop()); g.scene.start('Lasso'); });
  await p.waitForFunction(() => window.__tutorialOpen === true, null, { timeout: 60000 }); await wait(900); };
const forceHang = k => ev(k => { const L = window.__game.scene.getScene('Lasso'); L.nextHang = function () { this.hangSeq.push(k); window.__pr.hang = k; return k; }; }, k);
const snag = (free = false) => ev(f => { const L = window.__game.scene.getScene('Lasso'); L.st.phase = 'free'; L.snag(f); }, free);
const reel = () => ev(() => window.__game.scene.getScene('Lasso').reeled());
const waitFree = () => p.waitForFunction(() => window.__pr.st.phase === 'free', null, { timeout: 30000, polling: 50 });
const tapN = async (k) => { for (let i = 0; i < k; i++) { await touch('touchStart', 360, 1000); await wait(30); await touch('touchEnd', 360, 1000); await wait(70); } };

await startLasso(); await shot('tutorial_card');
await touch('touchStart', 360, 640); await wait(40); await touch('touchEnd', 360, 640);
await wait(150); await shot('FINAL_ROUND_banner'); await wait(500); await shot('bunny_start_line');
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }); await wait(100); await shot('ROUND1_TROT_banner');
await wait(500); await shot('R1_trot_run_a'); await wait(1300); await shot('hint_HOLD_SLIDE'); await wait(400); await shot('R1_trot_run_or_pause');
// twirl / aim / fling (a deliberate miss: aim at the far left)
const far = await ev(() => window.__pr.st.px < 480 ? 660 : 290); await touch('touchStart', 420, 1000); await wait(250); await shot('twirl_small_loop'); for (let i = 1; i <= 5; i++) { await wait(150); await touch('touchMove', 420 + (far - 420) * i / 5, 1000 + i * 30); } await wait(300); await shot('twirl_BIG_loop_aim_arc');
await touch('touchEnd', far, 1150); await wait(60); await shot('rope_flight_1'); await wait(120); await shot('rope_flight_2'); await wait(260); await shot('MISS_floor_loop'); await wait(900);
// snag + tug
await snag(); await wait(100); await shot('SNAGGED_tug_start'); await tapN(3); await shot('tug_mid_meter'); await wait(600); await shot('tug_puppy_shout_surge');
await ev(() => { const L = window.__game.scene.getScene('Lasso'); L.slip(); }); await wait(120); await shot('SLIP_wriggled_free'); await wait(500); await shot('slip_couch_gasp');
await wait(1200);
// catch 1 -> hang A
await forceHang('A'); await snag(); await tapN(4); await reel(); await wait(60); await shot('CATCH_impact_YEEHAW_swingin_A');
for (const [ms, l] of [[350, 'hangA_swing_bunny_line'], [500, 'hangA_sway'], [500, 'hangA_couch_giggle_pup_line'], [450, 'hangA_hearts']]) { await wait(ms); await shot(l); }
await p.waitForFunction(() => window.__game.scene.getScene('Lasso').hangDrop, null, { timeout: 8000, polling: 20 }); await burst('hangA_DROP_flip', 4, 40);
await waitFree(); await wait(60); await shot('ROUND2_SNEAKY_banner_land_run'); await wait(700); await shot('R2_round_line');
// round 2: fake stop + decoy
await wait(800); await ev(() => { const L = window.__game.scene.getScene('Lasso'); L.st.pup = 'run'; L.makeDecoy(); }); await wait(120); await shot('R2_ZOE_DECOY_cardboard_pop');
await wait(600); await shot('R2_decoy_sneak_away');
await ev(() => { const L = window.__game.scene.getScene('Lasso'); const d = L.decoy; if (d) { L.st.flying = true; L.land(d.x, d.y - 70, 62); } }); await wait(150); await shot('R2_CARDBOARD_hit');
await ev(() => { const L = window.__game.scene.getScene('Lasso'); L.st.pup = 'run'; L.fakeT = 0.01; }); await wait(120); await shot('R2_fake_stop_qmark');
await wait(900);
// catch 2 -> hang B (spin)
await forceHang('B'); await snag(); await tapN(4); await reel(); await wait(60); await shot('CATCH2_SPIN_swingin_B');
await burst('hangB_spin', 8, 120);
await p.waitForFunction(() => window.__game.scene.getScene('Lasso').hangDrop, null, { timeout: 8000, polling: 20 }); await burst('hangB_DROP_flip', 3, 40);
await waitFree(); await wait(1500);
// catch 3 -> hang C (lamp knee hang) -> round 3
await forceHang('C'); await snag(); await tapN(4); await reel(); await wait(60); await shot('CATCH3_swingin_C_lamp');
for (const [ms, l] of [[300, 'hangC_lamp'], [500, 'hangC_sway'], [600, 'hangC_giggle']]) { await wait(ms); await shot(l); }
await p.waitForFunction(() => window.__game.scene.getScene('Lasso').hangDrop, null, { timeout: 8000, polling: 20 }); await burst('hangC_DROP_whoops', 4, 40);
await waitFree(); await wait(60); await shot('ROUND3_ZOOMIES_banner'); await wait(1500);
// round 3: charge, dodge, wall bonk, faceplant
await ev(() => { const L = window.__game.scene.getScene('Lasso'); L.st.pup = 'pause'; L.startCharge(); }); await wait(150); await shot('R3_charge_windup_warning'); await wait(400); await shot('R3_windup_ring_shrink');
await ev(() => window.__game.scene.getScene('Lasso').dodge(1)); await wait(80); await shot('R3_DODGE');
await p.waitForFunction(() => window.__pr.st.pup === 'charge', null, { timeout: 5000, polling: 20 }); await wait(150); await shot('R3_charge_dash');
await p.waitForFunction(() => window.__pr.st.pup === 'crash', null, { timeout: 5000, polling: 20 }); await burst('R3_wall_BONK_tumble', 3, 120);
await p.waitForFunction(() => window.__pr.st.pup === 'plant', null, { timeout: 5000, polling: 20 }); await wait(100); await shot('R3_FACEPLANT_free_rope'); await wait(800); await shot('R3_faceplant_stars');
await snag(true); await wait(100); await shot('R3_FREE_ROPE_tug'); await ev(() => window.__game.scene.getScene('Lasso').slip()); await waitFree(); await wait(1500);
await ev(() => { const L = window.__game.scene.getScene('Lasso'); L.st.pup = 'pause'; L.startCharge(); });
await p.waitForFunction(() => window.__pr.st.pup === 'bonk', null, { timeout: 5000, polling: 20 }); await wait(60); await shot('R3_BONK_bunny_bowled'); await wait(400); await shot('R3_bunny_dizzy');
await waitFree().catch(() => {}); await wait(1200);
// final catch -> win -> outro -> Champion
await ev(() => { window.__game.scene.getScene('Lasso').st.ropes = 4; }); await forceHang('A'); await snag(); await tapN(4); await reel(); await wait(100); await shot('WIN_ROUNDED_UP_banner');
await wait(500); await shot('win_couch_party'); await p.waitForFunction(() => window.__pr.st?.phase === 'outro', null, { timeout: 8000, polling: 20 }).catch(() => {}); await wait(60); await shot('outro_hang_to_tied_puff');
await wait(500); await shot('outro_drag_1'); await wait(1200); await shot('outro_drag_2');
await p.waitForFunction(() => window.__game.scene.isActive('Champion'), null, { timeout: 20000 }); await wait(700); await shot('CHAMPION_intro');
await wait(1500); await shot('champion_tease_leash'); await wait(1200); await shot('champion_bump'); await wait(1500); await shot('champion_loop');
// loss
await startLasso(); await touch('touchStart', 360, 640); await wait(40); await touch('touchEnd', 360, 640);
await p.waitForFunction(() => window.__pr?.st?.running, null, { timeout: 30000 }); await wait(500);
await ev(() => { const s = window.__pr.st; s.ropes = 2; s.round = 2; s.time = 0.3; });
await p.waitForFunction(() => window.__pr.ended === 'lose', null, { timeout: 10000, polling: 20 }); await wait(150); await shot('LOSS_TIME_banner');
await p.waitForFunction(() => window.__pr.cardShown, null, { timeout: 10000 }); await wait(500); await shot('LOSS_card_GOT_AWAY');
fs.writeFileSync(OUT + 'log.json', JSON.stringify({ log, errs, build: await ev(() => fetch('version.json').then(r => r.json())) }, null, 1));
console.log('errs', errs); await b.close();
