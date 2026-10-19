// BUNNY FINALE — LASSO ROUND-UP: you are Bunny. HOLD to spin the lasso and aim (crosshair follows your finger),
// RELEASE when the spin dot is in the GREEN zone for a big loop. Puppy uses tricks from every level. Rope him 5 times in 60s.
import Phaser from 'phaser';
import { leaveOnce } from '../systems/leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art } from '../art/registry';
import { pointerInMute, makeMuteButton, makeButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx, Sfx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg } from '../systems/kit';
import { LINES, pick } from '../lines';
import { Hud, impact } from '../systems/level';
import { Storage } from '../systems/storage';
import { pupFlail } from '../systems/rigs';

/** Bunny (stays white: same bun_rig body + su_bun limb art as BunnyRig) with a jointed lasso arm.
 *  Angles: 0 = arm hanging down, +ve rotates toward -x (clockwise), 180 = straight up, -90 = pointing right. */
class LassoBunny {
  root: Phaser.GameObjects.Container; torso: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image;
  private legs: Phaser.GameObjects.Image[]; private sh: Phaser.GameObjects.Container; private el: Phaser.GameObjects.Container; private hand: Phaser.GameObjects.Container;
  private t = 0; p = { sh: 20, el: -10, lean: 0, sq: 0, kn: 6 }; throwing = false;
  constructor(private scene: Phaser.Scene, x: number, y: number, private m: number) {
    this.root = scene.add.container(x, y);
    const hipY = -38 * m;
    this.legs = [-21, 21].map(lx => art(scene, lx * m, hipY, 'su_bunLeg', m));
    this.torso = scene.add.container(0, hipY);
    this.body = art(scene, 0, 0, 'bun_rig_wink', m).setOrigin(0.5, 296 / 340);
    this.sh = scene.add.container(48 * m, -52 * m);
    const upper = art(scene, 0, 0, 'su_bunUpper', m * 0.95);
    this.el = scene.add.container(0, 40 * m * 0.95);
    const fore = art(scene, 0, 0, 'su_bunFore', m * 0.95);
    this.hand = scene.add.container(0, 44 * m * 0.95);
    this.el.add([fore, this.hand]); this.sh.add([upper, this.el]); this.torso.add([this.body, this.sh]);
    this.root.add([...this.legs, this.torso]);
  }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  setTexture(k: string) { this.body.setTexture(k.replace('bun_full_', 'bun_rig_')); return this; }
  handPos() { const mt = this.hand.getWorldTransformMatrix(); return { x: mt.tx, y: mt.ty }; }
  /** throw: whip the arm from overhead down toward the target, then settle back to the idle carry. */
  throwAt(tx: number, ty: number) {
    this.throwing = true; const sc = this.scene; sc.tweens.killTweensOf(this.p);
    const sx = this.root.x + 48 * this.m, sy = this.root.y - 120 * this.m;
    const aim = Phaser.Math.RadToDeg(Math.atan2(-(tx - sx), ty - sy)); // arm angle that points at the target
    sc.tweens.chain({ targets: this.p, tweens: [
      { sh: 200, el: -40, lean: -8, sq: -0.05, kn: 14, duration: 70, ease: 'Quad.Out' },
      { sh: aim - 15, el: 10, lean: 10, sq: 0.06, kn: 4, duration: 110, ease: 'Cubic.In' },
      { sh: aim + 25, el: 25, lean: 6, sq: 0.02, duration: 140, ease: 'Quad.Out' },
      { sh: 20, el: -10, lean: 0, sq: 0, kn: 6, duration: 320, ease: 'Back.Out', onComplete: () => { this.throwing = false; } }] });
  }
  update(dt: number, twirl: boolean, phase: number) {
    this.t += dt; const p = this.p, br = Math.sin(this.t * 3.4);
    if (twirl && !this.throwing) { // twirl overhead: hand circles the loop, elbow rolls with it, knees dip
      const a = phase * Math.PI * 2, k = 1 - Math.exp(-dt * 18);
      p.sh += (178 + Math.cos(a) * 14 - p.sh) * k; p.el += (Math.sin(a) * 26 - p.el) * k; p.lean += (-5 + Math.sin(a) * 3 - p.lean) * k; p.kn += (14 - p.kn) * k; p.sq += (-0.03 - p.sq) * k;
    } else if (!this.throwing) { const k = 1 - Math.exp(-dt * 8); p.sh += (20 + br * 4 - p.sh) * k; p.el += (-10 - p.el) * k; p.lean += (0 - p.lean) * k; p.kn += (6 - p.kn) * k; p.sq += (0 - p.sq) * k; }
    const breathe = this.throwing ? 0 : br * 0.02, bob = Math.abs(Math.sin(this.t * 3.4)) * 3;
    this.torso.setAngle(p.lean).setScale(1 - (p.sq + breathe) * 0.6, 1 + p.sq + breathe).setY(-38 * this.m - bob + p.kn * 0.4);
    this.sh.setAngle(p.sh); this.el.setAngle(p.el);
    this.legs[0].setAngle(p.kn); this.legs[1].setAngle(-p.kn);
  }
}

const TIME = 38, NEED = 6, HAND = { x: 230, y: 960 }, FLY = 420, HOME = 50, HOME_ROPES = 99, TRICK_CAP = 0.8, GRACE = 0.15;
type Trick = 'none' | 'hop' | 'umbrella' | 'decoy' | 'shadow' | 'crate';
const CRATE = { x: 560, y: 1000 };

export class LassoScene extends Phaser.Scene {
  st = { time: TIME, ropes: 0, throws: 0, score: 0, running: false, over: false, hold: false, phase: 0, tx: 450, ty: 1050, flying: false, umbrella: false, hiding: false };
  private bunny!: LassoBunny; private loop!: Phaser.GameObjects.Graphics; private aim!: Phaser.GameObjects.Graphics; private meter!: Phaser.GameObjects.Graphics;
  private pup!: Phaser.GameObjects.Container; private pupImg!: Phaser.GameObjects.Image; private umb!: Phaser.GameObjects.Image; private decoy?: Phaser.GameObjects.Image;
  private moveTw?: Phaser.Tweens.Tween; private roamId = 0; private hud!: Hud;
  private wasGreen = false; private peakQ = 0; private peakT = 0; private tick!: Phaser.GameObjects.Text; private gGlow!: Phaser.GameObjects.Arc; private dustT = 0; private lpx = 470; private lpy = 1120; private beams: Phaser.GameObjects.Graphics[] = [];
  constructor() { super('Lasso'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x3a1250, 0x8a4a1a);
    this.st = { time: TIME, ropes: 0, throws: 0, score: 0, running: false, over: false, hold: false, phase: 0, tx: 450, ty: 1050, flying: false, umbrella: false, hiding: false };
    art(this, 0, 0, 'bg_stage'); this.wasGreen = false; this.beams = []; this.lpx = 470; this.lpy = 1120;
    this.arena();
    art(this, W / 2, 470, 'pr_logo_glow', 0.9).setAlpha(0.9);
    ['Ruby', 'Glassia', 'Zoe', 'Nana', 'Midnight', 'Noir', 'Iris', 'Linye'].forEach((n, i) => { const h = art(this, 60 + i * 86, 780, `head_${n}_happy`, 0.3).setDepth(2); this.tweens.add({ targets: h, y: 765, yoyo: true, repeat: -1, duration: 300 + i * 30 }); });
    const cr = this.add.graphics().setDepth(14); cr.fillStyle(0xa86a3a, 1).lineStyle(6, 0x2a1408, 1).fillRect(CRATE.x - 70, CRATE.y - 120, 140, 130).strokeRect(CRATE.x - 70, CRATE.y - 120, 140, 130);
    cr.lineStyle(5, 0x6a3a1a, 1).lineBetween(CRATE.x - 70, CRATE.y - 120, CRATE.x + 70, CRATE.y + 10).lineBetween(CRATE.x + 70, CRATE.y - 120, CRATE.x - 70, CRATE.y + 10);
    this.pup = this.add.container(470, 1120).setDepth(10); this.pupImg = art(this, 0, 0, 'pup_idle', 0.78); this.umb = art(this, 0, -130, 'umbrella', 0.9).setVisible(false);
    this.pup.add([this.add.image(0, 4, 'su_shadow').setScale(0.7, 0.5), this.pupImg, this.umb]);
    this.add.ellipse(150, 1236, 190, 40, 0x000000, 0.28).setDepth(19);
    this.bunny = new LassoBunny(this, 150, 1240, 0.9).setDepth(20);
    this.loop = this.add.graphics().setDepth(25); this.aim = this.add.graphics().setDepth(24); this.meter = this.add.graphics().setDepth(26);
    this.gGlow = this.add.circle(HAND.x, HAND.y - 140, 118, 0x7dff9a, 0).setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
    this.tick = txt(this, HAND.x + 120, HAND.y - 230, '✓', 54, '#7dff9a', '#ffffff', 8).setDepth(27).setAlpha(0);
    this.hud = new Hud(this, 'PLAYROOM RODEO', 0xff5c8a);
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; if (!this.st.running || this.st.flying) return; this.st.hold = true; this.peakQ = 0; this.setAim(w.x, w.y); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.st.hold) { const w = worldPoint(this, p); this.setAim(w.x, w.y); } });
    this.input.on('pointerup', () => { if (this.st.hold) { this.st.hold = false; this.aim.clear(); this.throwLasso(); } });
    (window as any).__pr = { scene: 'Lasso', st: this.st, force: (win: boolean) => this.finish(win), pup: () => ({ x: this.pup.x, y: this.pup.y }), green: () => this.quality() };
    this.roam();
    tutorialCard(this, 'bunny1', 'PLAYROOM RODEO!', ['You are BUNNY! 🐰 The grand finale!', 'HOLD to spin + aim, RELEASE to throw', 'Let go in the GREEN zone for a BIG loop', `Puppy knows tricks! Rope him ${NEED} times`], () => this.begin());
  }
  private begin() { popBanner(this, 'FINAL ROUND!', 700, 0xe0243a); this.time.delayedCall(600, () => { this.talk( 400, 600, pick(LINES.start.Bunny), 22); this.st.running = true; }); }
  private setAim(x: number, y: number) { this.st.tx = Phaser.Math.Clamp(x, 80, 660); this.st.ty = Phaser.Math.Clamp(y, 900, 1220); }
  /** 0..1, 1 = dead centre of the green zone. */
  quality() { const d = Math.abs(((this.st.phase % 1) + 1) % 1 - 0.75); return Math.max(0, 1 - d / 0.14); }
  update(_t: number, dms: number) {
    const s = this.st; const dt = Math.min(dms, 50) / 1000; const lg = this.loop.clear(), m = this.meter.clear();
    this.bunny.update(dt, s.hold, s.phase); const hp = this.bunny.handPos();
    if (s.hold) { s.phase += dt / 0.9; const a = s.phase * Math.PI * 2;
      const lx = HAND.x + Math.cos(a) * 30, G = this.quality() > 0.6;
      lg.lineStyle(22, G ? 0x7dff9a : 0xffffff, G ? 0.45 : 0.22).strokeEllipse(lx, HAND.y - 140, 150, 44);
      lg.lineStyle(12, 0xffffff, 1).strokeEllipse(lx, HAND.y - 140, 150, 44).lineBetween(hp.x, hp.y, lx, HAND.y - 140);
      lg.lineStyle(7, 0x8a5a2a, 1).strokeEllipse(lx, HAND.y - 140, 150, 44).lineBetween(hp.x, hp.y, lx, HAND.y - 140);
      lg.lineStyle(2, 0xd9a060, 1).strokeEllipse(lx, HAND.y - 141, 146, 40);
      m.lineStyle(14, 0x22252b, 0.8).strokeCircle(HAND.x, HAND.y - 140, 100);
      m.lineStyle(22, 0xffffff, 1).beginPath(); m.arc(HAND.x, HAND.y - 140, 100, Math.PI * 2 * 0.75 - 0.37 - Math.PI / 2, Math.PI * 2 * 0.75 + 0.37 - Math.PI / 2); m.strokePath();
      m.lineStyle(14, 0x2fd35a, 1).beginPath(); m.arc(HAND.x, HAND.y - 140, 100, Math.PI * 2 * 0.75 - 0.35 - Math.PI / 2, Math.PI * 2 * 0.75 + 0.35 - Math.PI / 2); m.strokePath();
      const da = (s.phase % 1) * Math.PI * 2 - Math.PI / 2; m.fillStyle(0xffffff, 1).lineStyle(4, 0x22252b, 1).fillCircle(HAND.x + Math.cos(da) * 100, HAND.y - 140 + Math.sin(da) * 100, 14).strokeCircle(HAND.x + Math.cos(da) * 100, HAND.y - 140 + Math.sin(da) * 100, 14);
      const r = 50 + 60 * this.quality(); this.aim.clear().lineStyle(5, this.quality() > 0.6 ? 0x7dff9a : 0xffffff, 0.9).strokeEllipse(s.tx, s.ty, r * 2, r * 0.8);
      const qn = this.quality(); if (qn >= this.peakQ || this.time.now - this.peakT > GRACE * 1000) { this.peakQ = qn; this.peakT = this.time.now; }
      if (G && !this.wasGreen) { Sfx.click(); this.tick.setAlpha(1).setScale(2.8); this.tweens.add({ targets: this.tick, scale: 2.2, duration: 140, ease: 'Back.Out' }); }
      if (!G && this.wasGreen) this.tweens.add({ targets: this.tick, alpha: 0, duration: 120 });
      this.gGlow.setFillStyle(0x7dff9a, G ? 0.18 + 0.12 * this.quality() : 0); this.wasGreen = G;
      if (Math.random() < dt * 4) Fx.whoosh();
    } else { lg.lineStyle(10, 0xffffff, 0.9).strokeEllipse(hp.x + 4, hp.y + 22, 60, 40); lg.lineStyle(6, 0x8a5a2a, 1).strokeEllipse(hp.x + 4, hp.y + 22, 60, 40);
      if (this.wasGreen) { this.wasGreen = false; this.tick.setAlpha(0); } this.gGlow.setFillStyle(0x7dff9a, 0); }
    this.beams.forEach((b, i) => b.setRotation(Math.sin(this.time.now / 1400 + i * 2) * 0.18)); this.pupDust(dt);
    if (!s.running || s.over) return;
    s.time -= dt; if (s.time <= 0) { s.time = 0; return this.finish(s.ropes >= NEED); }
    this.hud.set(`ROPED ${s.ropes}/${NEED}`, s.time, s.ropes / NEED);
  }
  private roam() {
    if (this.st.over) return; const id = ++this.roamId; const s = this.st;
    s.hiding = false; this.pupImg.setAlpha(1).setTexture('pup_idle');
    const tx = Phaser.Math.Between(320, 650), ty = Phaser.Math.Between(930, 1220);
    const sp = 230 + s.ropes * 30; const dur = Math.max(300, Phaser.Math.Distance.Between(this.pup.x, this.pup.y, tx, ty) / sp * 1000);
    this.pupImg.setFlipX(tx > this.pup.x);
    this.moveTw = this.tweens.add({ targets: this.pup, x: tx, y: ty, duration: dur, ease: 'Sine.InOut', onUpdate: () => this.pup.setDepth(this.pup.y > CRATE.y ? 15 : 10), onComplete: () => this.time.delayedCall(Phaser.Math.Between(150, 600), () => id === this.roamId && this.roam()) });
    this.tweens.add({ targets: this.pupImg, y: -12, duration: 110, yoyo: true, repeat: Math.floor(dur / 220) });
  }
  private trick(): Trick {
    const r = Math.random(); const lvl = this.st.ropes;
    if (r > Math.min(TRICK_CAP, 0.3 + lvl * 0.15)) return 'none';
    return Phaser.Utils.Array.GetRandom(['hop', 'umbrella', 'decoy', 'shadow', 'crate'] as Trick[]);
  }
  private throwLasso() {
    const s = this.st; if (!s.running || s.over || s.flying) return; s.flying = true; s.throws++;
    const q = Math.max(this.quality(), this.time.now - this.peakT <= GRACE * 1000 ? this.peakQ : 0); const r = 50 + 60 * q; let tx = s.tx, ty = s.ty, homed = false;
    this.tick.setAlpha(0); this.gGlow.setFillStyle(0x7dff9a, 0); this.wasGreen = false;
    if (q > 0.6) floatText(this, HAND.x + 60, HAND.y - 260, q > 0.9 ? 'PERFECT SPIN!' : 'GOOD SPIN!', '#7dff9a', 30);
    this.bunny.setTexture('bun_full_laugh'); Fx.whoosh();
    // Puppy tricks
    const t = this.trick(); const near = Phaser.Math.Distance.Between(tx, ty, this.pup.x, this.pup.y) < r + 60;
    if (near && t !== 'none') this.time.delayedCall(FLY * 0.4, () => this.doTrick(t, tx, ty));
    const rope = this.add.graphics().setDepth(26); const o = { k: 0 };
    this.tweens.add({ targets: o, k: 1, duration: FLY, ease: 'Quad.Out', onUpdate: () => {
      if (!homed && o.k >= 0.5 && s.ropes < HOME_ROPES) { homed = true; const dx = this.pup.x - tx, dy = this.pup.y - ty, dd = Math.hypot(dx, dy); // gentle aim-assist: loop curls toward Puppy
        if (dd < r + HOME * 2) { const k = Math.min(1, HOME / Math.max(dd, 1)) * 0.5; tx += dx * k; ty += dy * k; } }
      if (Math.random() < 0.6) this.spark(HAND.x + (tx - HAND.x) * o.k, HAND.y - 140 + (ty - HAND.y + 140) * o.k - Math.sin(o.k * Math.PI) * 160);
      const x = HAND.x + (tx - HAND.x) * o.k, y = HAND.y - 140 + (ty - HAND.y + 140) * o.k - Math.sin(o.k * Math.PI) * 160;
      const hh = this.bunny.handPos();
      const ew = r * 2 * (0.4 + o.k * 0.6), eh = r * 0.8 * (0.4 + o.k * 0.6);
      rope.clear().lineStyle(11, 0xffffff, 0.9).lineBetween(hh.x, hh.y, x, y).strokeEllipse(x, y, ew, eh).lineStyle(6, 0x8a5a2a, 1).lineBetween(hh.x, hh.y, x, y).strokeEllipse(x, y, ew, eh); },
      onComplete: () => this.land(tx, ty, r, rope) });
    this.bunny.throwAt(s.tx, s.ty);
  }
  private doTrick(t: Trick, tx: number, ty: number) {
    if (this.st.over) return; this.moveTw?.stop(); this.roamId++; const s = this.st;
    floatText(this, this.pup.x, this.pup.y - 240, ({ hop: 'RUBY DODGE!', umbrella: 'NANA UMBRELLA!', decoy: 'ZOE DECOY!', shadow: 'LINYE STEP!', crate: 'GLASSIA HIDE!' } as Record<string, string>)[t], '#ffdf6b', 28);
    if (t === 'hop') { Fx.boing(); const dir = this.pup.x > tx ? 1 : -1; this.tweens.add({ targets: this.pup, x: Phaser.Math.Clamp(this.pup.x + dir * 170, 300, 670), duration: 200 }); this.tweens.add({ targets: this.pupImg, y: -90, duration: 150, yoyo: true }); }
    if (t === 'umbrella') { s.umbrella = true; this.umb.setVisible(true); }
    if (t === 'decoy') { this.decoy = art(this, tx, ty, 'pup_cano', 0.78).setDepth(11); const dx = tx < 480 ? 180 : -180; this.tweens.add({ targets: this.pup, x: Phaser.Math.Clamp(tx + dx, 300, 670), duration: 200 }); }
    if (t === 'shadow') { const c = this.add.circle(this.pup.x, this.pup.y - 60, 60, 0x6b4cc9, 0.6).setDepth(30); this.tweens.add({ targets: c, scale: 2, alpha: 0, duration: 400, onComplete: () => c.destroy() }); this.pup.setPosition(tx < 480 ? 620 : 340, Phaser.Math.Between(940, 1200)); }
    if (t === 'crate') { s.hiding = true; this.pup.setPosition(CRATE.x, CRATE.y - 20).setDepth(9); this.pupImg.setAlpha(0.4); }
    if (Math.random() < 0.5) this.talk( 400, 600, pick(LINES.lassoTrick), 22, 1000);
  }
  private land(x: number, y: number, r: number, rope: Phaser.GameObjects.Graphics) {
    const s = this.st; this.time.delayedCall(250, () => rope.destroy()); this.bunny.setTexture('bun_full_wink');
    const resume = (ms: number) => this.time.delayedCall(ms, () => { s.flying = false; s.umbrella = false; this.umb.setVisible(false); this.decoy?.destroy(); this.decoy = undefined; if (!s.over) this.roam(); });
    if (this.decoy && Phaser.Math.Distance.Between(x, y, this.decoy.x, this.decoy.y) < r + 30) { Fx.block(); floatText(this, x, y - 200, 'DECOY! 🥤', '#ff8a8a', 36); this.tweens.add({ targets: this.decoy, alpha: 0, duration: 400 }); resume(600); return; }
    const d = Phaser.Math.Distance.Between(x, y, this.pup.x, this.pup.y);
    if (d < r + 20 && (s.umbrella || s.hiding)) { Fx.block(); Fx.boing(); floatText(this, x, y - 220, s.umbrella ? 'BOING! UMBRELLA' : 'CRATE!', '#fff', 32); resume(600); return; }
    if (d < r + 20) return this.rope(r);
    this.dustBurst(x, y, 8); const lr = this.add.ellipse(x, y, r * 2, r * 0.8).setStrokeStyle(6, 0x8a5a2a, 1).setDepth(8).setAlpha(0.9); this.tweens.add({ targets: lr, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 500, onComplete: () => lr.destroy() });
    Fx.save(); floatText(this, x, y - 120, 'MISS', '#fff', 30); if (Math.random() < 0.4) this.talk( 400, 600, pick(LINES.lassoMiss), 22, 1000); resume(400);
  }
  private rope(r: number) {
    const s = this.st; s.ropes++; const big = r > 95; const pts = 1000 + (big ? 400 : 0); s.score += pts;
    this.moveTw?.stop(); this.roamId++; this.tweens.killTweensOf(this.pupImg);
    this.confetti(this.pup.x, this.pup.y - 120); this.dustBurst(this.pup.x, this.pup.y, 12); this.cameras.main.shake(140, 0.008);
    this.cameras.main.zoomTo(1.05, 90, Phaser.Math.Easing.Quadratic.Out); this.time.delayedCall(160, () => this.cameras.main.zoomTo(1, 220, Phaser.Math.Easing.Quadratic.InOut));
    Fx.punch(); Fx.goal(); impact(this, this.pup.x, this.pup.y - 110, pick(['YEE-HAW!', 'ROPED!', 'GOTCHA!']), pts, big ? 'BIG LOOP!' : '', true);
    // loop drops around his feet, he sulks, then pops out and scampers off (no tying up - just a rodeo gag)
    const ring = this.add.graphics().setDepth(16); ring.lineStyle(12, 0xffffff, 0.9).strokeEllipse(0, 0, 140, 44).lineStyle(7, 0x8a5a2a, 1).strokeEllipse(0, 0, 140, 44); ring.setPosition(this.pup.x, this.pup.y - 8);
    this.pupImg.setTexture('pup_dizzy'); pupFlail(this, this.pupImg, 900); this.bunny.setTexture('bun_full_laugh'); this.talk( 400, 600, pick(LINES.lassoHit), 22, 1200);
    this.tweens.add({ targets: this.pupImg, angle: { from: -12, to: 12 }, yoyo: true, repeat: 3, duration: 90 });
    this.time.delayedCall(800, () => { Fx.boing(); this.tweens.add({ targets: this.pupImg, y: -120, duration: 200, yoyo: true }); this.tweens.add({ targets: ring, alpha: 0, duration: 300, onComplete: () => ring.destroy() }); });
    if (s.ropes >= NEED) { this.time.delayedCall(1000, () => this.finish(true)); return; }
    this.time.delayedCall(1100, () => { s.flying = false; this.pupImg.setAngle(0); this.bunny.setTexture('bun_full_wink'); this.roam(); });
  }
  private talk(x: number, y: number, t: string, sz?: number, ms?: number) {
    const c: any = (say as any)(this, x, y, t, sz, ms); const tx: any = c?.list?.find((o: any) => o.type === 'Text');
    if (c && tx) { const hw = tx.width / 2 + 34; c.x = Phaser.Math.Clamp(c.x, hw, W - hw); } return c;
  }
  private arena() {
    if (!this.textures.exists('ls_dot')) { const g = this.add.graphics(); g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8); g.generateTexture('ls_dot', 16, 16); g.destroy(); }
    [[150, 0xffe8a0], [570, 0xffb0d0]].forEach(([x, c], i) => { const b = this.add.graphics({ x, y: 0 }).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      b.fillStyle(c, 0.10).fillTriangle(-30, 0, 30, 0, i ? -260 : 260, 1280).fillStyle(c, 0.07).fillTriangle(-60, 0, 60, 0, i ? -340 : 340, 1280); this.beams.push(b); });
    const f = this.add.graphics().setDepth(1); f.fillStyle(0xc88a4a, 0.35).fillEllipse(480, 1090, 600, 330); f.lineStyle(4, 0xffe2a0, 0.35).strokeEllipse(480, 1090, 600, 330);
    for (let k = 0; k < 24; k++) f.fillStyle(0x6a3a18, 0.25).fillCircle(Phaser.Math.Between(200, 700), Phaser.Math.Between(940, 1240), Phaser.Math.Between(3, 7));
    const rail = this.add.graphics().setDepth(40); rail.fillStyle(0x7a4420, 1).lineStyle(4, 0x2a1408, 1).fillRect(0, 1262, W, 18).strokeRect(-4, 1262, W + 8, 18);
    for (let x = 30; x < W; x += 130) rail.fillStyle(0x5a3014, 1).fillRect(x, 1240, 16, 40).strokeRect(x, 1240, 16, 40);
    for (let k = 0; k < 10; k++) { const m = this.add.image(Phaser.Math.Between(20, 700), Phaser.Math.Between(860, 1240), 'ls_dot').setScale(0.25).setAlpha(0.5).setTint(0xffe2a0).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: m, y: m.y - 80, alpha: 0, duration: Phaser.Math.Between(2000, 3600), repeat: -1, delay: k * 300 }); }
  }
  private spark(x: number, y: number) { const p = this.add.image(x, y, 'ls_dot').setDepth(27).setTint(0xfff2b0).setScale(0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: p, scale: 0, alpha: 0, y: y + 20, duration: 300, onComplete: () => p.destroy() }); }
  private dustBurst(x: number, y: number, n: number) { for (let k = 0; k < n; k++) { const d = this.add.circle(x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-8, 8), Phaser.Math.Between(10, 20), 0xd8b080, 0.7).setDepth(17);
    this.tweens.add({ targets: d, x: d.x + Phaser.Math.Between(-50, 50), y: d.y - Phaser.Math.Between(20, 60), scale: 2, alpha: 0, duration: 500, onComplete: () => d.destroy() }); } }
  private confetti(x: number, y: number) { const C = [0xff5c8a, 0xffdf6b, 0x7dff9a, 0x6bc6ff, 0xffffff]; for (let k = 0; k < 22; k++) { const c = this.add.rectangle(x, y, 14, 8, C[k % 5]).setDepth(31).setAngle(Math.random() * 180);
    this.tweens.add({ targets: c, x: x + Phaser.Math.Between(-220, 220), y: y + Phaser.Math.Between(-200, 120), angle: c.angle + 540, alpha: 0, duration: Phaser.Math.Between(600, 1000), ease: 'Cubic.Out', onComplete: () => c.destroy() }); } }
  private pupDust(dt: number) { const dx = this.pup.x - this.lpx, dy = this.pup.y - this.lpy; this.lpx = this.pup.x; this.lpy = this.pup.y; this.dustT -= dt;
    if (Math.hypot(dx, dy) < 1.5 || this.dustT > 0 || this.st.hiding) return; this.dustT = 0.1;
    const d = this.add.circle(this.pup.x - Math.sign(dx) * 30, this.pup.y + 6, Phaser.Math.Between(8, 14), 0xd8b080, 0.6).setDepth(this.pup.depth - 1);
    this.tweens.add({ targets: d, scale: 2, alpha: 0, y: d.y - 16, duration: 400, onComplete: () => d.destroy() }); }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; this.moveTw?.stop(); this.roamId++;
    (window as any).__pr.ended = win ? 'win' : 'lose'; Fx.sting(win);
    const score = s.score + Math.round(s.time) * 30;
    if (win) { Storage.submitLevel('Bunny', score); Storage.setBeaten(9); popBanner(this, 'PUPPY ROUNDED UP!', 600, 0x2fbf5a, 900); this.cameras.main.flash(300, 255, 240, 200);
      this.time.delayedCall(1500, () => { if (!leaveOnce(this)) return; this.cameras.main.fadeOut(300); this.time.delayedCall(320, () => this.scene.start('Champion', { score })); }); return; }
    popBanner(this, 'PUPPY ESCAPED!', 600, 0x6b4cc9, 900);
    this.time.delayedCall(1000, () => {
      (window as any).__pr.cardShown = true;
      this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setDepth(950).setInteractive();
      txt(this, W / 2, 520, 'SO CLOSE, COWBUNNY!', 52, '#ff5c8a', '#22252b', 8).setDepth(960);
      txt(this, W / 2, 600, `${s.ropes}/${NEED} roped • Score ${score}`, 30, '#fff', '#22252b', 5).setDepth(960);
      txt(this, W / 2, 660, pick(LINES.puppyWin), 26, '#fff', '#22252b', 5).setDepth(960);
      makeButton(this, W / 2 - 145, 800, 260, 110, 'RETRY', () => leaveOnce(this) && this.scene.restart(), COLORS.BUTTON, 44).setDepth(970);
      makeButton(this, W / 2 + 145, 800, 260, 110, 'HALL', () => leaveOnce(this) && this.scene.start('Hub'), COLORS.BUTTON_ALT, 44).setDepth(970);
    });
  }
}
