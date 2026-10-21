// TAIL CATCH (bonus): you are Bunny. DRAG (or tap) to chase Puppy around the playroom. He darts in short zigzag dashes, skids
// to a pause, and ONLY while he pauses does his tail GLOW: get BEHIND him and TAP him to grab it. Then TAP TAP to win the
// tug-of-war. A grab from the front or on a dim tail makes him yelp and zoom off. 6 tails in 60 s.
import Phaser from 'phaser';
import { GAME_W as W, COLORS } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, artScale, ensureArt } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { txt, bubble, comic } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, sparks } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { Hud } from '../systems/level';
import { bakeG } from '../systems/bake';
import { TailBunny, TailPup, TAIL_FLAT } from '../systems/tailRigs';

/** Tuning (exposed as __pr.K for the bot harness). */
export const TK = { TIME: 40, NEED: 6, BSPD: 470, DSPD: 410, DSPD_UP: 5, DASH_MIN: 150, DASH_MAX: 300, LEGS: 5, LEGS_RND: 3, PAUSE: 1.8, PAUSE_DN: 0.03, PAUSE_MIN: 1.4, STUN: 0.6, TURN_P: 0.25, TURN_EXTRA: 0.45, TUG_UP: 0, SKID: 0.16,
  FAKE_P: 0.16, FAKE_T: 0.4, REACH: 200, BEHIND: -30, FRONT_R: 130, TUG0: 0.42, TIP_R: 140, SLOW: 0.35, TUG_TAP: 0.18, TUG_PULL: 0.3, TUG_SURGE: 0.18, CATCH: 2.0, MIN_SKIP: 0.5, PTS: 600, COOL: 1.0 };
const X0 = 90, X1 = 630, Y0 = 905, Y1 = 1175;
export const TAIL_KEYS_LEVEL = ['pt_stand', 'pt_panic', 'pt_dizzy', 'pt_tail', 'bun_rig2_wink', 'bun_rig2_laugh', 'bun_rig2_stern', 'bun_rig2_unimpressed', 'bun_rig2_sneaky', 'bun_full_sneaky', ...[0, 1, 2, 3, 4, 5].map(i => 'pt_run' + i)];
type PupState = 'dash' | 'skid' | 'pause' | 'fake';

export class TailScene extends Phaser.Scene {
  st = { time: TK.TIME, tails: 0, score: 0, running: false, over: false, phase: 'play' as 'play' | 'tug' | 'catch', pup: 'pause' as PupState, glow: false,
    px: 470, py: 1010, face: -1, bx: 200, by: 1060, tx: 200, ty: 1060, tug: 0, catchT: 0, grabs: 0, yelps: 0, slips: 0, cool: 0, lead: false };
  private bun!: TailBunny; private pup!: TailPup; private hud!: Hud;
  private glowImg!: Phaser.GameObjects.Image; private ring!: Phaser.GameObjects.Graphics; private zone!: Phaser.GameObjects.Graphics; private lines!: Phaser.GameObjects.Graphics;
  private grabTxt!: Phaser.GameObjects.Text; private meter!: Phaser.GameObjects.Graphics; private meterTxt: Phaser.GameObjects.Text[] = [];
  private dust: { i: Phaser.GameObjects.Image; l: number }[] = []; private dustT = 0;
  private pt = 0; private pDur = 0; private from = { x: 0, y: 0 }; private to = { x: 0, y: 0 }; private lastDy = 1; private boost = 1; private legs = 0; private stunned = false; private firstLeg = true; private bvx = 0; private bvy = 0; private pupB?: Phaser.GameObjects.Container; private hand?: Phaser.GameObjects.Text; private hearts: Phaser.GameObjects.Text[] = []; private hudF = 0; private hint?: Phaser.GameObjects.Text; private turnAt = -1;
  private skidV = 0; private grabT = 0; private bunDustT = 0; private tugDustT = 0;
  private catchFx?: Phaser.GameObjects.Container; private surgeT = 0; private surge = 0; private dragOK = false; private bunFaceT = 0; private ready = false;
  constructor() { super('Tail'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x2a1840, 0x7a4a2a);
    this.st = { time: TK.TIME, tails: 0, score: 0, running: false, over: false, phase: 'play', pup: 'pause', glow: false, px: 470, py: 1010, face: -1, bx: 200, by: 1060, tx: 200, ty: 1060, tug: 0, catchT: 0, grabs: 0, yelps: 0, slips: 0, cool: 0, lead: false };
    this.skidV = 0; this.grabT = 0; this.bunDustT = 0; this.tugDustT = 0;
    this.dust = []; this.meterTxt = []; this.hudF = 0; this.catchFx = undefined; this.ready = false; this.pt = 0; this.pDur = 1.2; this.boost = 1;
    art(this, 0, 0, 'bg_room'); this.arena();
    this.hud = new Hud(this, 'TAIL CATCH  🐾', 0xff5c8a); this.hud.set(`TAILS 0/${TK.NEED}`, TK.TIME, 0);
    makeMuteButton(this); makePauseButton(this, () => this.st.running && !this.st.over);
    (window as any).__pr = { scene: 'Tail', st: this.st, K: TK, ready: false, force: (win: boolean) => this.finish(win), tap: (x: number, y: number) => this.tapAt(x, y), move: (x: number, y: number) => this.moveTo(x, y),
      tip: () => this.pup ? this.pup.tipPos() : null, hand: () => this.bun ? this.bun.handPos() : null };
    ensureArt(this, TAIL_KEYS_LEVEL).then(() => { if (!this.sys.isActive() && !this.sys.isPaused()) return; this.build(); });
  }
  private build() {
    this.zone = this.add.graphics().setDepth(4); this.lines = this.add.graphics().setDepth(8);
    this.pup = new TailPup(this, this.st.px, this.st.py, 1.15); this.pup.flip(true);
    this.bun = new TailBunny(this, this.st.bx, this.st.by, 1.0, 'wink');
    this.glowImg = this.add.image(0, 0, 'su_dust').setScale(artScale('su_dust', 1.5)).setTint(0x7dff9a).setBlendMode(Phaser.BlendModes.ADD).setDepth(29).setVisible(false);
    this.ring = this.add.graphics().setDepth(30);
    this.grabTxt = txt(this, 0, 0, 'GRAB!', 40, '#7dff9a', '#22252b', 8).setDepth(31).setAngle(-6).setVisible(false);
    this.hand = txt(this, 0, 0, '▼', 46, '#7dff9a', '#22252b', 8).setDepth(31).setVisible(false); // bouncing pointer onto the glowing tail
    this.meter = this.add.graphics().setDepth(60).setVisible(false);
    this.meterTxt = [txt(this, 360, 450, 'TAP TAP TAP to reel him in!', 30, '#fff', '#22252b', 6), txt(this, 160, 580, 'BUNNY', 30, '#ff5c8a', '#22252b', 7), txt(this, 570, 580, 'PUPPY', 30, '#ffb06b', '#22252b', 7)].map(t => t.setDepth(61).setVisible(false));
    for (let i = 0; i < 20; i++) this.dust.push({ i: this.add.image(0, 0, 'su_dust').setVisible(false).setDepth(9), l: 9 });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.tapAt(w.x, w.y); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (!p.isDown || !this.dragOK) return; const w = worldPoint(this, p); this.moveTo(w.x, w.y); });
    this.input.on('pointerup', () => { this.dragOK = false; });
    this.ready = true; (window as any).__pr.ready = true;
    this.pose(0);
    tutorialCard(this, 'tail1', 'CATCH PUPPY\nBY THE TAIL!', ['You are BUNNY 🤠🐰', 'DRAG to chase Puppy around', 'When he STOPS, his tail GLOWS 🟢\nget BEHIND him and TAP him!', `TAP TAP to win the tug. ${TK.NEED} tails wins!`], () => this.begin());
  }
  private arena() {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0xff9fc0, 0.28).fillEllipse(360, 1050, 640, 230).lineStyle(6, 0xffffff, 0.25).strokeEllipse(360, 1050, 600, 200);
    g.fillStyle(0xffffff, 0.12).fillEllipse(360, 1050, 380, 110);
    // toys along the back wall (static, baked)
    const toy = (x: number, y: number, c: number, s: string) => { g.fillStyle(c, 1).lineStyle(4, COLORS.INK, 1).fillRoundedRect(x, y, 54, 54, 10).strokeRoundedRect(x, y, 54, 54, 10); return s; };
    toy(40, 800, 0xff5c8a, 'A'); toy(98, 800, 0x3a86ff, 'B'); toy(68, 748, 0xffdf6b, 'C');
    g.fillStyle(0x7dff9a, 1).lineStyle(4, COLORS.INK, 1).fillCircle(640, 820, 32).strokeCircle(640, 820, 32).lineStyle(4, 0xffffff, 0.8).beginPath(); g.arc(640, 820, 22, 3.6, 4.6); g.strokePath();
    bakeG(this, g, 'tc_arena', 0, 700, W, 520);
    for (const [x, y, s] of [[67, 829, 'A'], [125, 829, 'B'], [95, 777, 'C']] as const) txt(this, x, y, s, 30, '#fff', '#22252b', 5).setDepth(3);
  }
  private begin() {
    popBanner(this, 'CATCH THAT TAIL!', 640, 0xff5c8a, 800);
    this.time.delayedCall(700, () => { if (this.st.over) return; bubble(this, 360, 560, pick(LINES.tailStart), 22).setDepth(800).setAlpha(1); this.st.running = true; this.newDash(); });
    let first = false; try { first = !localStorage.getItem('playroom-tail.hint1'); localStorage.setItem('playroom-tail.hint1', '1'); } catch { first = true; }
    if (first) { const h = this.hint = txt(this, W / 2, 745, 'Chase Puppy and grab his tail!', 36, '#fff27a', '#22252b', 8).setDepth(801).setAlpha(0); // first-run hint
      this.tweens.add({ targets: h, alpha: 1, duration: 200, delay: 300 }); this.tweens.add({ targets: h, alpha: 0, delay: 3200, duration: 300, onComplete: () => h.destroy() }); }
    this.time.delayedCall(2600, () => this.children.list.filter((o: any) => o.depth === 800).forEach((o: any) => this.tweens.add({ targets: o, alpha: 0, duration: 250, onComplete: () => o.destroy() })));
  }
  moveTo(x: number, y: number) { this.st.tx = Phaser.Math.Clamp(x, X0, X1); this.st.ty = Phaser.Math.Clamp(y, Y0, Y1); }
  /** one tap: during the catch = skip, during the tug = pull, near Puppy = grab attempt, elsewhere = run there */
  tapAt(x: number, y: number) {
    const s = this.st; if (!s.running || s.over || !this.ready) return;
    if (s.phase === 'catch') { if (s.catchT >= TK.MIN_SKIP) this.release(); return; }
    if (s.phase === 'tug') { s.tug = Math.min(1.05, s.tug + TK.TUG_TAP); this.bun.p.lean = -32; this.bun.p.sq = -0.07; Fx.step(); if (s.tug >= 1) this.startCatch(); return; }
    const tip = this.pup.tipPos();
    // a grab is a tap ON Puppy or his tail (above the floor line); floor taps, even right behind him, just move Bunny
    const onPup = y < s.py - 30 && (Phaser.Math.Distance.Between(x, y, s.px, s.py - 90) < 140 || Phaser.Math.Distance.Between(x, y, tip.x, tip.y) < TK.TIP_R);
    const inReach = Phaser.Math.Distance.Between(s.bx, s.by - 95, tip.x, tip.y) <= TK.REACH;
    if (!onPup || !inReach) { this.dragOK = true; this.moveTo(x, y); return; }
    if (s.cool > 0) return;
    const behind = (s.bx - s.px) * s.face < -TK.BEHIND;
    if (behind && s.glow) this.startTug(); else this.yelp(behind ? 'dim' : 'front');
  }
  private yelp(why: string) {
    const s = this.st; s.yelps++; s.cool = TK.COOL; this.stunned = true; s.tx = s.bx; s.ty = s.by; this.bvx = this.bvy = 0; floatText(this, s.bx, s.by - 260, '@_@', '#fff', 30); Fx.ouch(); this.bun.setFace('stern'); this.bunFaceT = 0.7;
    const t = comic(this, s.px, s.py - 250, 'YELP!', 52).setDepth(70).setAngle(Phaser.Math.Between(-10, 10)); t.setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, delay: 500, duration: 250, onComplete: () => t.destroy() });
    if (Math.random() < 0.6) floatText(this, Phaser.Math.Clamp(s.px, 150, 570), s.py - 330, why === 'front' ? 'From BEHIND!' : pick(LINES.tailEscape), '#fff', 28);
    this.pup.setFrame('panic'); this.newDash(1.35);
  }
  private newDash(boost = 1, fresh = true) {
    const s = this.st; this.boost = boost; this.firstLeg = fresh; if (fresh) this.legs = TK.LEGS + Math.floor(Math.random() * (TK.LEGS_RND + 1)) + (boost > 1.3 ? 2 : boost > 1 ? 1 : 0); this.legs--; let best = -1e9, bx = s.px, by = s.py;
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(TK.DASH_MIN, TK.DASH_MAX) * (boost > 1 ? 1.2 : 1);
      const x = Phaser.Math.Clamp(s.px + Math.cos(a) * d, X0, X1), y = Phaser.Math.Clamp(s.py + Math.sin(a) * d * 0.6, Y0, Y1);
      const moved = Phaser.Math.Distance.Between(x, y, s.px, s.py); if (moved < TK.DASH_MIN * 0.6) continue;
      const away = Phaser.Math.Distance.Between(x, y, s.bx, s.by), zig = Math.sign(y - s.py) !== this.lastDy ? 90 : 0;
      const sc = Math.min(away, 420) + zig + Math.random() * 140; if (sc > best) { best = sc; bx = x; by = y; }
    }
    this.lastDy = Math.sign(by - s.py) || 1; this.from = { x: s.px, y: s.py }; this.to = { x: bx, y: by };
    const spd = (TK.DSPD + TK.DSPD_UP * s.tails) * boost; this.pDur = Math.max(0.22, Phaser.Math.Distance.Between(bx, by, s.px, s.py) / spd);
    if (this.legs === 0) this.pDur *= 1 + TK.SLOW; // last leg: a visible 'about to stop' slowdown before the skid + glow pause
    s.pup = 'dash'; s.glow = false; this.pt = 0; s.face = bx >= s.px ? 1 : -1; this.pup.flip(s.face < 0); if (fresh) Fx.whoosh();
  }
  private startTug() {
    this.dropHint(); const s = this.st; s.phase = 'tug'; s.grabs++; s.tug = TK.TUG0; s.glow = false; this.surgeT = 0.4; this.surge = 0; Fx.punch();
    this.pup.setFrame('panic'); this.bun.setFace('laugh'); this.grabT = 0.22; this.bun.p.sq = 0.16; this.cameras.main.shake(90, 0.004);
    this.children.list.filter((o: any) => o.depth === 800).forEach((o: any) => this.tweens.add({ targets: o, alpha: 0, duration: 120, onComplete: () => o.destroy() })); // intro bubble off the tug meter
    const t = comic(this, 360, 380, 'TUG!', 76).setDepth(62).setAngle(-8); t.setScale(0.3); this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 300, onComplete: () => t.destroy() });
    this.meter.setVisible(true); this.meterTxt.forEach(o => o.setVisible(true));
    if (Math.random() < 0.7) this.pupSay(pick(LINES.tailProtest));
    // grab feedback: ring burst + sparks + 'GOT IT!' right on the tail
    const tp = this.pup.tipPos(), rb = this.add.circle(tp.x, tp.y, 30).setStrokeStyle(10, 0xfff27a).setDepth(64);
    this.tweens.add({ targets: rb, scale: 3.2, alpha: 0, duration: 320, ease: 'Quad.Out', onComplete: () => rb.destroy() });
    sparks(this, tp.x, tp.y, 14, true);
    const gi = txt(this, Phaser.Math.Clamp(tp.x, 120, W - 120), tp.y - 110, 'GOT IT!', 44, '#fff27a', '#22252b', 9).setDepth(65).setScale(0.4);
    this.tweens.add({ targets: gi, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: gi, alpha: 0, y: gi.y - 40, delay: 450, duration: 250, onComplete: () => gi.destroy() });
  }
  /** little hearts floating up from Puppy's head (catch + win card) */
  puppyHearts(x: number, y: number, n = 5, depth = 75, into?: Phaser.GameObjects.Container) {
    for (let i = 0; i < n; i++) { const h = txt(this, x + Phaser.Math.Between(-40, 40), y, '♥', Phaser.Math.Between(30, 44), '#ff5c8a', '#3b1f10', 5).setDepth(depth).setAlpha(0);
      into?.add(h); this.tweens.add({ targets: h, alpha: 1, duration: 120, delay: i * 140 });
      this.tweens.add({ targets: h, y: y - 80 - Math.random() * 50, x: h.x + Phaser.Math.Between(-30, 30), angle: Phaser.Math.Between(-25, 25), delay: i * 140, duration: 1100, ease: 'Sine.Out', onComplete: () => this.tweens.add({ targets: h, alpha: 0, duration: 200, onComplete: () => h.destroy() }) }); }
  }
  private endTug() { this.meter.setVisible(false).clear(); this.meterTxt.forEach(o => o.setVisible(false)); }
  private slip() {
    const s = this.st; s.slips++; s.phase = 'play'; this.endTug(); Fx.boing(); this.bun.setFace('unimpressed'); this.bunFaceT = 0.9; this.bun.p.sq = -0.25; s.cool = 0.5; this.stunned = false;
    floatText(this, Phaser.Math.Clamp(s.px, 150, 570), s.py - 300, pick(['Slippery fluff!', 'Nyoom!', 'He wriggled free!']), '#fff', 30);
    this.newDash(1.3);
  }
  private startCatch() {
    const s = this.st; s.phase = 'catch'; s.catchT = 0; s.tails++; s.score += TK.PTS; this.endTug(); Fx.combo(s.tails + 3); this.cameras.main.shake(140, 0.006);
    if (this.pupB?.active) this.pupB.destroy(); // the tug protest bubble goes when the catch bubbles come (no stacking)
    this.bun.setFace('sneaky'); // smug half-grin, narrowed eyes, raised brow
    const line = pick(LINES.tailCatch); s.lead = line === 'Come, Puppy, follow me!';
    const c = this.catchFx = this.add.container(0, 0).setDepth(70);
    const g = this.add.graphics({ x: W / 2, y: 470 }); const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 20; i++) { const r = i % 2 ? 70 : 150; const a = i / 20 * Math.PI * 2; pts.push(new Phaser.Math.Vector2(Math.cos(a) * r * 1.35, Math.sin(a) * r)); }
    g.fillStyle(0xff5c8a, 1).lineStyle(7, COLORS.INK, 1).fillPoints(pts, true).strokePoints(pts, true).fillStyle(0xffffff, 1).fillEllipse(0, 0, 300, 140); g.setAngle(-8);
    const st = bakeG(this, g, 'tc_stamp', -215, -160, 430, 320); st.setAngle(-8);
    const w = comic(this, W / 2, 470, 'GOTCHA!', 84).setAngle(-8);
    const stars = [[-1.4, -1], [1.3, -0.8], [1.2, 1], [-1.3, 0.9]].map(([dx, dy]) => txt(this, W / 2 + dx * 150, 470 + dy * 110, '★', 44, '#ffdf6b', '#22252b', 5));
    c.add([st, w, ...stars]); c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.Out' }); c.setPosition(W / 2 * 0, 0);
    c.setScale(1); [st, w, ...stars].forEach(o => { (o as any).setScale?.(0); this.tweens.add({ targets: o, scale: 1, duration: 220, ease: 'Back.Out' }); });
    const pop = txt(this, 590, 640, `+${TK.PTS}`, 40, '#7dff9a', '#22252b', 8).setAngle(8); c.add(pop); this.tweens.add({ targets: pop, y: 600, duration: 900 });
    const sb = bubble(this, Phaser.Math.Clamp(s.bx, 250, W - 250), Math.min(s.by - 340, 750), line, 28); c.add(sb);
    this.time.delayedCall(450, () => { if (this.st.phase === 'catch' && this.catchFx === c) { const pb = this.pupSay(pick(LINES.tailProtest)); if (pb) c.add(pb); } });
    this.puppyHearts(s.px, s.py - 195, 6, 76, c); // hearts float up from Puppy's head
    const sk = txt(this, W / 2, 1235, 'tap to skip ▸', 26, '#fff', '#22252b', 5).setAlpha(0); c.add(sk); this.tweens.add({ targets: sk, alpha: 0.85, delay: TK.MIN_SKIP * 1000, duration: 200 });
    this.hud.set(`TAILS ${s.tails}/${TK.NEED}`, s.time, this.hudF); this.hud.pop(); (window as any).__pr.hud = `TAILS ${s.tails}/${TK.NEED}`;
    // a '+1 tail' token flies from Puppy up into the counter
    const tok = txt(this, s.px, s.py - 160, '+1 TAIL', 34, '#7dff9a', '#22252b', 8).setDepth(610);
    this.tweens.add({ targets: tok, x: 170, y: 210, scale: 0.6, duration: 520, ease: 'Cubic.In', onComplete: () => { tok.destroy(); } });
  }
  private release() {
    const s = this.st; if (s.phase !== 'catch') return; s.phase = 'play'; const c = this.catchFx; this.catchFx = undefined;
    if (c) this.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
    const t = comic(this, s.px, s.py - 220, 'POP!', 50).setDepth(70); this.tweens.add({ targets: t, alpha: 0, y: t.y - 50, duration: 600, onComplete: () => t.destroy() });
    Fx.boing(); this.bun.setFace('wink'); this.pup.tailStretch = 1; s.cool = 0.4; this.stunned = false;
    if (s.tails >= TK.NEED) return this.finish(true);
    this.newDash(1.25);
  }
  /** the first-run hint gets out of the way of the first grab / Puppy bubble */
  private dropHint() { const h = this.hint; this.hint = undefined; if (h?.active) { this.tweens.killTweensOf(h); this.tweens.add({ targets: h, alpha: 0, duration: 150, onComplete: () => h.destroy() }); } }
  private pupSay(line: string) { this.dropHint(); const s = this.st; if (this.pupB?.active) this.pupB.destroy(); const b = this.pupB = bubble(this, Phaser.Math.Clamp(s.px, 170, W - 170), Math.max(600, s.py - 235), line, 22).setDepth(78);
    this.tweens.add({ targets: b, alpha: 0, delay: 1300, duration: 250, onComplete: () => b.destroy() }); return b; }

  update(_t: number, dms: number) {
    if (!this.ready) return;
    const s = this.st, dt = Math.min(dms, 50) / 1000;
    this.bunFaceT -= dt; if (this.bunFaceT < 0 && this.bunFaceT > -1 && s.phase === 'play') { this.bunFaceT = -2; this.bun.setFace('wink'); }
    if (s.running && !s.over) {
      if (s.phase !== 'catch') { s.time -= dt; if (s.time <= 0) { s.time = 0; return this.finish(s.tails >= TK.NEED); } }
      if (s.phase === 'play') { s.cool -= dt; this.puppyAI(dt); }
      else if (s.phase === 'tug') this.tugTick(dt);
      else if (s.phase === 'catch') { s.catchT += dt; if (s.catchT >= TK.CATCH) this.release(); }
      this.hudF += (s.tails / TK.NEED - this.hudF) * Math.min(1, dt * 6); this.hud.set(`TAILS ${s.tails}/${TK.NEED}`, s.time, this.hudF); (window as any).__pr.hud = `TAILS ${s.tails}/${TK.NEED}`;
    }
    this.pose(dt);
  }
  private puppyAI(dt: number) {
    const s = this.st; this.pt += dt;
    if (s.pup === 'dash') {
      const k = Math.min(1, this.pt / this.pDur), e = this.firstLeg ? (this.legs > 0 ? Phaser.Math.Easing.Sine.In(k) * 0.7 + k * 0.3 : Phaser.Math.Easing.Sine.InOut(k)) : this.legs > 0 ? k : Phaser.Math.Easing.Quadratic.Out(k) * 0.75 + k * 0.25; // smooth burst: ease in, run through the zigzag at speed, carry momentum into the skid
      s.px = this.from.x + (this.to.x - this.from.x) * e; s.py = this.from.y + (this.to.y - this.from.y) * e;
      if (k >= 1 && this.legs > 0) this.newDash(this.boost, false);
      else if (k >= 1) { this.pt = 0; if (Math.random() < TK.FAKE_P && this.boost === 1) { s.pup = 'fake'; this.pDur = TK.FAKE_T; floatText(this, Phaser.Math.Clamp(s.px, 150, 570), s.py - 250, '?!', '#fff', 34); }
        else { s.pup = 'skid'; this.pDur = TK.SKID; this.skidV = 120 * this.boost; this.skidDust(); } }
    } else if (s.pup === 'skid') { // momentum carries him on a little after the last leg
      s.px = Phaser.Math.Clamp(s.px + s.face * this.skidV * dt, X0, X1); this.skidV *= Math.pow(0.0005, dt); if (Math.random() < 0.5) this.puff(s.px - s.face * 20, s.py - 4);
      if (this.pt >= this.pDur) { s.pup = 'pause'; this.pt = 0; this.pDur = Math.max(TK.PAUSE_MIN, TK.PAUSE - TK.PAUSE_DN * s.tails); s.glow = true; this.turnAt = Math.random() < TK.TURN_P ? this.pDur * (0.3 + Math.random() * 0.25) : -1; } }
    else if (s.pup === 'fake') { if (this.pt >= this.pDur) this.newDash(); }
    else if (s.pup === 'pause') {
      const front = (s.bx - s.px) * s.face > 0 && Phaser.Math.Distance.Between(s.bx, s.by, s.px, s.py) < TK.FRONT_R;
      if (this.turnAt > 0 && this.pt >= this.turnAt) { this.turnAt = -1; s.face = -s.face; this.pup.flip(s.face < 0); this.pDur += TK.TURN_EXTRA; floatText(this, Phaser.Math.Clamp(s.px, 150, 570), s.py - 250, 'hm?', '#fff', 30); }
      if (front && this.pt > 0.25) { floatText(this, Phaser.Math.Clamp(s.px, 150, 570), s.py - 250, '!', '#ff6b6b', 44); this.newDash(1.15); }
      else if (this.pt >= this.pDur) this.newDash();
    }
    // Bunny runs toward the drag target
    const dx = s.tx - s.bx, dy = s.ty - s.by, d = Math.hypot(dx, dy), step = TK.BSPD * dt;
    if (s.cool > TK.COOL - TK.STUN && s.phase === 'play' && s.yelps > 0 && this.stunned) return;
    // smoothed run: velocity eases toward the target speed and slows on arrival (no jerks)
    const sp = d > 2 ? TK.BSPD * Math.min(1, d / 50) : 0, wx = d > 2 ? dx / d * sp : 0, wy = d > 2 ? dy / d * sp : 0, a = Math.min(1, dt * 14);
    this.bvx += (wx - this.bvx) * a; this.bvy += (wy - this.bvy) * a; void step;
    const mv = Math.hypot(this.bvx, this.bvy) * dt; if (mv > d && d > 0) { s.bx = s.tx; s.by = s.ty; } else { s.bx += this.bvx * dt; s.by += this.bvy * dt; }
  }
  private tugTick(dt: number) {
    const s = this.st; this.surgeT -= dt; if (this.surgeT <= 0) { this.surgeT = 0.45 + Math.random() * 0.35; this.surge = Math.random() < 0.45 ? TK.TUG_SURGE / 0.3 : 0; }
    const sg = this.surgeT > 0.15 ? this.surge : 0; s.tug -= (TK.TUG_PULL + TK.TUG_UP * s.tails + sg) * dt;
    if (s.tug <= 0) return this.slip();
    const m = this.meter, y = 520, f = Phaser.Math.Clamp(s.tug, 0, 1); m.clear();
    m.fillStyle(0x22252b, 1).fillRoundedRect(90, y - 30, 540, 60, 30);
    m.fillStyle(0xff5c8a, 1).fillRoundedRect(98, y - 22, Math.max(24, 524 * f), 44, { tl: 22, bl: 22, tr: 0, br: 0 });
    if (f < 0.99) m.fillStyle(0xc27230, 1).fillRoundedRect(98 + 524 * f, y - 22, 524 * (1 - f), 44, { tl: 0, bl: 0, tr: 22, br: 22 });
    m.fillStyle(0xffffff, 1).lineStyle(5, 0x22252b, 1).fillCircle(98 + 524 * f, y, 28).strokeCircle(98 + 524 * f, y, 28);
  }
  private skidDust() { const s = this.st; for (let i = 0; i < 5; i++) this.puff(s.px - s.face * (10 + i * 14), s.py - 4 - (i % 2) * 10, -i * 0.02); Fx.step(); }
  private puff(x: number, y: number, l = 0) { const d = this.dust.find(o => o.l >= 0.45) ?? this.dust[0]; d.l = l; d.i.setPosition(x, y).setVisible(true); }
  /** all rig posing + effects; runs every frame (also before start so the scene looks alive under the tutorial) */
  private pose(dt: number) {
    const s = this.st, pup = this.pup, bun = this.bun, T = this.time.now / 1000;
    const dashing = s.pup === 'dash' && s.phase === 'play' && s.running;
    // Puppy
    pup.root.setPosition(s.px + (s.phase === 'tug' ? Math.sin(T * 60) * 3 : 0), s.py);
    if (s.phase === 'play') {
      if (dashing) { pup.update(dt, 1.8 * this.boost, 0.4); pup.tail.setTint(0xb8a898); pup.inner.setAngle(8 * s.face); pup.root.y -= Math.abs(Math.sin(T * 22)) * 8;
        const k = this.pt / this.pDur; pup.squash(k < 0.15 ? 0.94 : 1.1, k < 0.15 ? 1.06 : 0.92); } // push-off, then stretched along the dash
      else { pup.setFrame(s.pup === 'skid' ? 'run4' : s.pup === 'fake' ? 'panic' : 'stand'); pup.wagSpd = s.glow ? 7 : 12; pup.wagAmp = s.glow ? 26 : 16; pup.update(dt, 0, 1);
        if (s.glow) pup.tail.setTint(Phaser.Display.Color.GetColor(Math.round(195 + 60 * (0.5 + 0.5 * Math.sin(T * 14))), 255, 200)); else pup.tail.clearTint(); // the TAIL itself pulses green, readable even under Bunny
        const sk = s.pup === 'skid'; pup.inner.setAngle(sk ? -18 * s.face : 0); pup.squash(sk ? 1.1 : 1, sk ? 0.88 : 1); if (sk) pup.root.y += 6; }
      pup.tailStretch += (1 - pup.tailStretch) * Math.min(1, dt * 10);
    } else if (s.phase === 'tug') { pup.update(dt, 2.6, 0); pup.tail.clearTint().setAngle(TAIL_FLAT + 4); pup.tailStretch = 1.2 + (1 - s.tug) * 0.3; pup.inner.setAngle(14 * s.face); pup.squash(1, 1);
      pup.root.y -= Math.abs(Math.sin(T * 30)) * 6; this.tugDustT -= dt; if (this.tugDustT <= 0) { this.tugDustT = 0.07; this.puff(s.px + s.face * 20, s.py - 4); } // scrambling to get away
      if (this.grabT > 0) { this.grabT -= dt; pup.root.y -= Math.sin(Math.max(0, this.grabT) / 0.22 * Math.PI) * 26; } }
    else { // catch: cartoon-running in place / towed backwards
      if (s.lead) { const dir = -s.face; s.bx = Phaser.Math.Clamp(s.bx + dir * 110 * dt, X0, X1); s.px = Phaser.Math.Clamp(s.px + dir * 110 * dt, X0, X1); pup.update(dt, 1.4, 0); }
      else pup.update(dt, 2.8, 0);
      pup.tail.clearTint(); pup.squash(1, 1); if (s.lead) pup.setFrame('dizzy'); pup.tail.setAngle(TAIL_FLAT - 6); pup.tailStretch = 1.25; pup.inner.setAngle(Math.sin(T * 30) * 6);
    }
    pup.root.setDepth(10 + Math.max(s.py, s.glow && s.phase === 'play' ? s.by + 0.2 : 0) * 0.01); // glowing tail draws over Bunny so it never hides behind her
    // dash fx
    this.lines.clear();
    if (dashing) { this.lines.lineStyle(6, 0xffffff, 0.8); for (const [dy, l] of [[-150, 70], [-110, 120], [-70, 90], [-30, 60]]) this.lines.lineBetween(s.px - s.face * 70, s.py + dy, s.px - s.face * (70 + l), s.py + dy);
      this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.05; this.puff(s.px - s.face * 30, s.py - 4); } }
    // Bunny
    const moving = s.phase === 'play' && Math.hypot(s.tx - s.bx, s.ty - s.by) > 4 && s.running;
    if (s.phase === 'play') { const wantLeft = moving ? s.tx < s.bx - 2 : s.px < s.bx; if (wantLeft !== bun.left && (moving || Math.abs(s.px - s.bx) > 30)) bun.flip(wantLeft); }
    bun.root.setPosition(s.bx, s.by).setDepth(10 + s.by * 0.01 + 0.001);
    bun.update(dt, moving || (s.phase === 'catch' && s.lead) ? 1 : 0);
    const tip = pup.tipPos();
    if (moving) { this.bunDustT -= dt; if (this.bunDustT <= 0) { this.bunDustT = 0.12; this.puff(s.bx + (bun.left ? 26 : -26), s.by - 2); } }
    if (s.phase === 'play') { bun.p.lean += ((moving ? 14 : 2) - bun.p.lean) * Math.min(1, dt * 10); bun.p.sq += (0 - bun.p.sq) * Math.min(1, dt * 8);
      const near = Phaser.Math.Distance.Between(s.bx, s.by - 95, tip.x, tip.y);
      if (near < TK.REACH + 60 && s.glow) { bun.reachTo(tip.x, tip.y); bun.p.el = -10; } else { const pump = Math.sin(T * 16); bun.p.sh += ((moving ? 10 + pump * 55 : 20 + Math.sin(T * 8) * 4) - bun.p.sh) * Math.min(1, dt * 14); bun.p.el += ((moving ? -40 - pump * 25 : -10) - bun.p.el) * Math.min(1, dt * 14); } // arm pumps with the stride (bent elbow)
      // back arm: swings OPPOSITE the front arm, in phase with the legs (never hangs limp); ready-forward while she reaches for a glowing tail
      const pump2 = Math.sin(T * 16), a2 = Math.min(1, dt * 14), reach = near < TK.REACH + 60 && s.glow;
      bun.p.sh2 += ((reach ? -25 : moving ? -10 - pump2 * 55 : -16 + Math.sin(T * 8) * 4) - bun.p.sh2) * a2; bun.p.el2 += ((reach ? 35 : moving ? 40 - pump2 * 25 : 12) - bun.p.el2) * a2;
      bun.apply();
    } else { // hold the tail: arm on the tip, body pulled to arm's length
      const tug = s.phase === 'tug'; bun.p.lean += ((tug ? -22 + Math.sin(T * 40) * 2 : -6) - bun.p.lean) * Math.min(1, dt * (tug ? 6 : 12)); bun.p.kn = tug ? 24 : 10; // heels dug in, leaning back
      bun.p.sq += ((tug ? -0.04 : 0) - bun.p.sq) * Math.min(1, dt * 10);
      // always on the FAR side of the tail tip (behind Puppy), facing him, hand on the tip
      if (bun.left !== (s.face < 0)) bun.flip(s.face < 0);
      for (let i = 0; i < 3; i++) { bun.reachTo(tip.x, tip.y); const sh = bun.shoulderPos(), L = bun.armLen() * 0.92, dy = tip.y - sh.y;
        s.bx += tip.x - s.face * Math.sqrt(Math.max(0, L * L - dy * dy)) - sh.x; bun.root.x = s.bx; }
      // near a wall the pair slides back onto the floor together (Bunny never ends up off-screen)
      const cx = Phaser.Math.Clamp(s.bx, 115, W - 115) - s.bx; if (cx) { s.bx += cx; s.px = Phaser.Math.Clamp(s.px + cx, 40, W - 40); bun.root.x = s.bx; pup.root.x += cx; }
      bun.reachTo(tip.x + cx, tip.y);
      if (tug) bun.pose({ sh2: 55 + Math.sin(T * 30) * 12, el2: 70 }); // free arm braced, elbow out, jerking with the pull (stays visible beside her)
      else if (s.lead) { const sw = Math.sin(T * 16); bun.pose({ sh2: -10 - sw * 50, el2: 40 - sw * 25 }); } // leading him off: free arm swings with the walk
      else bun.pose({ sh2: 130 + Math.sin(T * 9) * 8, el2: -45 }); // free arm out and up: a little victory fist while she holds him
    }
    // glow, ring, behind-zone
    const glow = s.glow && s.phase === 'play' && s.running;
    this.glowImg.setVisible(glow); this.grabTxt.setVisible(glow); this.hand?.setVisible(glow); this.ring.clear(); this.zone.clear();
    if (glow) { const k = Math.min(1, this.pt / this.pDur), rr = 40 + 70 * (1 - k);
      // closing-in cue: in reach AND behind him -> everything turns yellow 'TAP NOW!'
      const now = (s.bx - s.px) * s.face < -TK.BEHIND && Phaser.Math.Distance.Between(s.bx, s.by - 95, tip.x, tip.y) <= TK.REACH, col = now ? 0xfff27a : 0x7dff9a, css = now ? '#fff27a' : '#7dff9a', pr = 38 + 5 * Math.sin(T * 12);
      if (this.grabTxt.text !== (now ? 'TAP NOW!' : 'GRAB!')) this.grabTxt.setText(now ? 'TAP NOW!' : 'GRAB!').setColor(css);
      const hb = Math.abs(Math.sin(T * 9)) * (now ? 22 : 14); this.hand?.setPosition(tip.x, tip.y - 58 - hb).setColor(css).setScale(now ? 1.15 : 1);
      this.glowImg.setPosition(tip.x, tip.y).setAlpha(0.45 + 0.25 * Math.sin(T * 14));
      this.ring.lineStyle(10, 0x22252b, 1).strokeCircle(tip.x, tip.y, pr).lineStyle(6, col, 1).strokeCircle(tip.x, tip.y, pr).lineStyle(4, 0xffffff, 0.9).strokeCircle(tip.x, tip.y, rr);
      this.grabTxt.setPosition(Phaser.Math.Clamp(tip.x + s.face * 70, 110, W - 110), tip.y - 118 - hb * 0.5); // above his tail, shifted toward Puppy: off Bunny's ears
      const zx = Phaser.Math.Clamp(s.px - s.face * 245, X0 - 40, X1 + 40); this.zone.fillStyle(0x7dff9a, 0.22).fillEllipse(zx, s.py + 8, 170, 54).lineStyle(5, 0x7dff9a, 0.7).strokeEllipse(zx, s.py + 8, 170, 54); }
    for (const d of this.dust) { if (d.l >= 0.45) { d.i.setVisible(false); continue; } d.l += dt; const k = Math.max(0, d.l) / 0.45; d.i.setScale(artScale('su_dust', 0.8 + k * 1.1)).setAlpha(Math.max(0, 0.85 * (1 - k))); }
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; (window as any).__pr.ended = win ? 'win' : 'lose';
    this.endTug(); if (this.catchFx) { this.catchFx.destroy(); this.catchFx = undefined; } s.phase = 'play'; s.glow = false;
    popBanner(this, win ? 'TAIL-TASTIC!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => { endCard(this, 'Bunny', 9, win, s.score + (win ? Math.round(s.time) * 20 : 0), `${s.tails} tails`); if (!win) this.cheekyCard(); else this.winHearts(); });
  }
  /** win card: hearts keep floating up from (dizzy, flopped) Puppy's head */
  private winHearts() { this.time.addEvent({ delay: 900, loop: true, callback: () => this.puppyHearts(470, 700, 3, 965) }); this.puppyHearts(470, 700, 3, 965); }
  /** lose card: the shared card shows a heart-eyed Puppy; here he is a cheeky winner instead, tail wagging, with a slapstick line */
  private cheekyCard() {
    const c = this.children.list.filter((o: any) => o.depth === 960 && o.list).pop() as Phaser.GameObjects.Container | undefined; if (!c) return;
    const old = c.list.find((o: any) => o.texture?.key === 'pup_hearts') as Phaser.GameObjects.Image | undefined; if (!old) return;
    old.setVisible(false); this.tweens.killTweensOf(old);
    const p = new TailPup(this, old.x + 20, old.y, 1.1).flip(false).setFrame('stand'); p.wagAmp = 30; p.wagSpd = 14; c.addAt(p.root, c.getIndex(old));
    this.time.addEvent({ delay: 16, loop: true, callback: () => p.update(0.016, 0, 1) });
    this.tweens.add({ targets: p.root, y: old.y - 24, yoyo: true, repeat: -1, duration: 220, ease: 'Quad.Out' });
    const sub = c.list.find((o: any) => o.type === 'Text' && /^Puppy:/.test(o.text)) as Phaser.GameObjects.Text | undefined;
    sub?.setText(pick(['Puppy: Still got my tail! Nyoom!', 'Puppy: Tail 1, Bunny 0!', 'Puppy: Zoomies win again!']));
  }
}
