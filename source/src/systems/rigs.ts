// Jointed character rigs (Puppy chef thrower + Bunny katana fighter), driven by a tiny keyframe animator.
import Phaser from 'phaser';
import { art, artScale } from '../art/registry';

type Pose = Record<string, number>;
type EaseFn = (t: number) => number;
interface Seg { dur: number; to: Pose; ease: EaseFn; onEnd?: () => void; onUpdate?: (k: number) => void; }
const E = Phaser.Math.Easing;

/** Keyframe animator: plays a queue of segments, each easing from the current pose to a target pose. */
class Animator {
  pose: Pose; private from: Pose = {}; private q: Seg[] = []; private t = 0;
  constructor(p: Pose) { this.pose = { ...p }; }
  get busy() { return this.q.length > 0; }
  play(segs: Seg[]) { this.q = segs; this.t = 0; this.from = { ...this.pose }; }
  update(dt: number) {
    let s = this.q[0];
    while (s) {
      this.t += dt;
      const k = Math.min(1, this.t / s.dur), e = s.ease(k);
      for (const key in s.to) this.pose[key] = this.from[key] + (s.to[key] - this.from[key]) * e;
      s.onUpdate?.(k);
      if (k < 1) return;
      dt = this.t - s.dur; this.q.shift(); this.t = 0; this.from = { ...this.pose };
      s.onEnd?.();
      s = this.q[0];
      if (dt <= 0) return;
    }
  }
}
const worldOf = (o: Phaser.GameObjects.Container) => { const m = o.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; };

// =========================================================================
// PUPPY: shoulder -> upper arm -> elbow -> forearm/paw. Angles in degrees, 0 = hanging down, clockwise +.
// Puppy faces left (towards Bunny), so "back" is to the right (negative angles), "up" = -180.
// =========================================================================
const PUP_IDLE: Pose = { sh: 15, el: 15, lean: 0, sq: 0, dy: 0 };
export class PuppyRig {
  root: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; hat: Phaser.GameObjects.Image;
  private bodyC: Phaser.GameObjects.Container; private shoulder: Phaser.GameObjects.Container; private elbow: Phaser.GameObjects.Container;
  private pawPt: Phaser.GameObjects.Container; private anim = new Animator(PUP_IDLE); private t = 0;
  throwing = false; held?: Phaser.GameObjects.Image;
  constructor(private scene: Phaser.Scene, x: number, y: number, private m = 1.5) {
    this.root = scene.add.container(x, y);
    const sh = scene.add.image(0, 4, 'su_shadow').setScale(artScale('su_shadow', 1.6 * m), artScale('su_shadow', 1.2 * m));
    this.bodyC = scene.add.container(0, 0);
    this.body = art(scene, 0, 0, 'pup_rig_normal', m);
    this.hat = art(scene, -4 * m, -188 * m, 'su_chefhat', 0.95 * m);
    const u = 0.78 * m;
    this.shoulder = scene.add.container(34 * u, -84 * u);
    const upper = art(scene, 0, 0, 'su_pupUpper', 0.95 * m / 1.5 * 1.1);
    this.elbow = scene.add.container(0, 50 * m / 1.5 * 1.1);
    const fore = art(scene, 0, 0, 'su_pupFore', 0.95 * m / 1.5 * 1.1);
    this.pawPt = scene.add.container(0, 50 * m / 1.5 * 1.1);
    this.elbow.add([fore, this.pawPt]);
    this.shoulder.add([upper, this.elbow]);
    this.bodyC.add([this.body, this.hat, this.shoulder]);
    this.root.add([sh, this.bodyC]);
    this.apply();
  }
  setFace(f: 'normal' | 'panic' | 'hearts') { this.body.setTexture('pup_rig_' + f); }
  paw() { return worldOf(this.pawPt); }
  /** Full overhand throw. `img` is shown in the paw until release; onRelease gets the paw position. */
  throw(img: Phaser.GameObjects.Image | undefined, onRelease: (p: { x: number; y: number }) => void) {
    this.throwing = true; this.held = img;
    this.anim.pose.sh = ((this.anim.pose.sh % 360) + 360) % 360; if (this.anim.pose.sh > 180) this.anim.pose.sh -= 360;
    this.anim.play([
      // anticipation: lean back, upper arm swings back & up, elbow cocks (paw up behind head)
      { dur: 0.24, to: { sh: -100, el: -80, lean: 9, sq: -0.07, dy: 4 }, ease: E.Sine.InOut },
      // tiny hold at full cock
      { dur: 0.04, to: { sh: -108, el: -86, lean: 10, sq: -0.08, dy: 5 }, ease: E.Linear },
      // whip: shoulder drives over the top, elbow snaps straight; body stretches and leans forward
      { dur: 0.11, to: { sh: -215, el: -4, lean: -11, sq: 0.08, dy: -6 }, ease: E.Quadratic.In,
        onEnd: () => { const p = this.paw(); this.held = undefined; onRelease(p); } },
      // follow-through: arm keeps going down across the body
      { dur: 0.16, to: { sh: -300, el: 22, lean: -7, sq: 0.02, dy: -2 }, ease: E.Quadratic.Out, onEnd: () => { this.throwing = false; } },
      // settle back to idle with a little overshoot
      { dur: 0.3, to: { sh: -345, el: 15, lean: 0, sq: 0, dy: 0 }, ease: E.Back.Out, onEnd: () => { this.anim.pose.sh = 15; } },
    ]);
  }
  update(dt: number) {
    this.t += dt; this.anim.update(dt); this.apply();
    if (this.held) { const p = this.paw(); this.held.setPosition(p.x, p.y - 8); }
  }
  private apply() {
    const p = this.anim.pose;
    const idle = this.anim.busy ? 0 : 1;
    const bob = Math.sin(this.t * 4.2) * 0.018 * idle, sway = Math.sin(this.t * 2.1) * 2 * idle;
    this.bodyC.setAngle(p.lean + sway * 0.5).setScale(1 - (p.sq + bob) * 0.6, 1 + p.sq + bob).setY(p.dy - bob * 40);
    this.shoulder.setAngle(p.sh + sway); this.elbow.setAngle(p.el + sway);
    this.hat.setAngle(-p.lean * 0.4 + Math.sin(this.t * 4.2 + 1) * 2 * idle);
  }
}

// =========================================================================
// BUNNY: root (feet, moves across floor) -> legs + torso(hips pivot) -> shoulder -> upper -> elbow -> forearm/paw -> katana.
// =========================================================================
const BUN_READY: Pose = { sh: -55, el: -105, tw: 0, sq: 0, dy: 6, lx: 0, kn: 10 };
export class BunnyRig {
  root: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; torso: Phaser.GameObjects.Container;
  private legs: Phaser.GameObjects.Image[]; private shoulder: Phaser.GameObjects.Container; private elbow: Phaser.GameObjects.Container;
  private tip: Phaser.GameObjects.Container; private hilt: Phaser.GameObjects.Container;
  private anim = new Animator(BUN_READY); private t = 0; private targetX: number; private vx = 0; private phase = 0;
  private dir = 1; private lastStrike = -9; swinging = false; private pause = 0;
  private smear: { a: { x: number; y: number }; b: { x: number; y: number }; t: number }[] = [];
  private smearG: Phaser.GameObjects.Graphics; private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  face = 'cool';
  constructor(private scene: Phaser.Scene, x: number, private floorY: number, private m = 1.1, private minX = 90, private maxX = 630) {
    this.targetX = x;
    this.root = scene.add.container(x, floorY);
    const shadow = scene.add.image(4, 2, 'su_shadow').setScale(artScale('su_shadow', 2.0 * m), artScale('su_shadow', 0.9 * m));
    const hipY = -38 * m;
    this.legs = [-21, 21].map(lx => art(scene, lx * m, hipY, 'su_bunLeg', m));
    this.torso = scene.add.container(0, hipY);
    this.body = art(scene, 0, 0, 'bun_rig_cool', m).setOrigin(0.5, 296 / 340);
    this.shoulder = scene.add.container(48 * m, -52 * m);
    const upper = art(scene, 0, 0, 'su_bunUpper', m * 0.95);
    this.elbow = scene.add.container(0, 40 * m * 0.95);
    const fore = art(scene, 0, 0, 'su_bunFore', m * 0.95);
    const kat = art(scene, 0, 44 * m * 0.95, 'su_katana', 0.8).setAngle(170);
    this.hilt = scene.add.container(0, 44 * m * 0.95);
    this.tip = scene.add.container(35, 44 * m * 0.95 + 200);
    this.elbow.add([kat, fore, this.hilt, this.tip]);
    this.shoulder.add([upper, this.elbow]);
    this.torso.add([this.body, this.shoulder]);
    this.root.add([shadow, ...this.legs, this.torso]);
    this.smearG = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.dust = scene.add.particles(0, 0, 'su_dust', { speed: { min: 40, max: 160 }, angle: { min: 190, max: 350 }, scale: { start: artScale('su_dust', 0.5), end: artScale('su_dust', 1.2) },
      alpha: { start: 0.9, end: 0 }, lifespan: 420, gravityY: -60, emitting: false });
    this.apply(0);
  }
  setDepth(d: number) { this.root.setDepth(d); this.smearG.setDepth(d + 1); this.dust.setDepth(d - 1); return this; }
  setFace(expr: string) { this.face = expr; this.body.setTexture('bun_rig_' + expr); }
  setTint(c?: number) { c === undefined ? this.body.clearTint() : this.body.setTint(c); }
  /** Brief freeze of the rig on impact. */
  hitPause(s = 0.05) { if (this.swinging || this.anim.busy) this.pause = Math.max(this.pause, s); }

  /** Dash toward tx and strike toward (tx, ty). swipeDx picks forehand/backhand; quick repeats alternate (combo). */
  strike(tx: number, ty: number, swipeDx = 0) {
    const now = this.scene.time.now / 1000;
    if (now - this.lastStrike < 0.09) return;
    const chained = now - this.lastStrike < 0.42;
    this.lastStrike = now;
    this.dir = chained ? -this.dir : (swipeDx >= 0 ? 1 : -1);
    const nx = Phaser.Math.Clamp(tx - 70 * Math.sign(tx - this.root.x || 1), this.minX, this.maxX);
    if (Math.abs(nx - this.targetX) > 50) this.puff(5);
    this.targetX = nx;
    // aim from the shoulder (approx, using where she will be) to the target
    const sx = nx + 53, sy = this.floorY - 100;
    const aim = Phaser.Math.RadToDeg(Math.atan2(-(tx - sx), ty - sy));
    const p = this.anim.pose, cur = p.sh + p.el;
    const near = (a: number) => { while (a - cur > 180) a -= 360; while (a - cur < -180) a += 360; return a; };
    const d = this.dir;
    const S = near(aim - 115 * d), Eend = S + 205 * d;
    const lunge = Phaser.Math.Clamp((tx - nx) * 0.25, -26, 26);
    this.swinging = false;
    this.anim.play([
      // wind-up: sword cocked back, elbow bent, torso coils
      { dur: 0.07, to: { sh: S + 70 * d, el: -70 * d, tw: -6 * d, sq: -0.06, dy: 10, lx: -lunge * 0.3, kn: 18 }, ease: E.Quadratic.Out,
        onEnd: () => { this.swinging = true; this.smear = []; } },
      // big arc swing: shoulder rotates through the target, elbow extends, body twists & lunges
      { dur: 0.1, to: { sh: Eend, el: 0, tw: 9 * d, sq: 0.07, dy: 2, lx: lunge, kn: 22 }, ease: E.Cubic.In,
        onUpdate: () => this.recordSmear(),
        onEnd: () => { this.swinging = false; this.puff(3); } },
      // recover to the ready stance
      { dur: 0.24, to: { ...BUN_READY, sh: near(-55) }, ease: E.Back.Out },
    ]);
  }
  private puff(n: number) {
    const w = { x: this.root.x, y: this.floorY };
    this.dust.explode(n, w.x - 20, w.y - 4); this.dust.explode(n, w.x + 20, w.y - 4);
  }
  private recordSmear() {
    this.smear.push({ a: worldOf(this.hilt), b: worldOf(this.tip), t: this.scene.time.now });
  }
  update(dt: number) {
    this.t += dt;
    // footwork: critically-damped dash toward target x
    const x = this.root.x, k = 1 - Math.exp(-dt * 16);
    const nx = x + (this.targetX - x) * k;
    this.vx = (nx - x) / Math.max(dt, 1e-4);
    this.root.x = nx;
    const speed = Math.min(1, Math.abs(this.vx) / 900);
    this.phase += dt * (8 + speed * 26);
    if (this.pause > 0) { this.pause -= dt; } else this.anim.update(dt);
    this.apply(speed);
    if (this.swinging) this.recordSmear();
    this.drawSmear();
  }
  private apply(speed: number) {
    const p = this.anim.pose, ready = this.anim.busy ? 0.3 : 1;
    const bounce = Math.abs(Math.sin(this.t * 6.5)) * 4 * ready;
    const step = Math.sin(this.phase) * 28 * speed;
    const hop = Math.abs(Math.sin(this.phase)) * 10 * speed;
    const lean = Phaser.Math.Clamp(this.vx / 200, -6, 6);
    this.legs[0].setAngle(p.kn + step).setY(-38 * this.m + p.dy * 0.4);
    this.legs[1].setAngle(-p.kn - step).setY(-38 * this.m + p.dy * 0.4);
    this.torso.setPosition(p.lx, -38 * this.m + p.dy - bounce - hop).setAngle(p.tw + lean).setScale(1 - p.sq * 0.6, 1 + p.sq);
    this.shoulder.setAngle(p.sh + Math.sin(this.t * 6.5) * 3 * ready); this.elbow.setAngle(p.el);
    this.root.setScale(1, 1);
  }
  private drawSmear() {
    const g = this.smearG, now = this.scene.time.now, LIFE = 130;
    this.smear = this.smear.filter(s => now - s.t < LIFE);
    g.clear();
    for (let i = 1; i < this.smear.length; i++) {
      const s0 = this.smear[i - 1], s1 = this.smear[i];
      const a = (1 - (now - s1.t) / LIFE) * 0.75;
      // fill only the outer 60% of the blade for a crescent-shaped smear
      const mix = (s: typeof s0, f: number) => ({ x: s.a.x + (s.b.x - s.a.x) * f, y: s.a.y + (s.b.y - s.a.y) * f });
      g.fillStyle(0xcfeeff, a * 0.6).fillPoints([mix(s0, 0.35), s0.b, s1.b, mix(s1, 0.35)], true);
      g.fillStyle(0xffffff, a).fillPoints([mix(s0, 0.75), s0.b, s1.b, mix(s1, 0.75)], true);
    }
  }
}

// =========================================================================
// ZOE (Hive): chibi head on a bean body at the bottom of the screen, one noodle arm with a frying pan.
// swingAt(x,y): slide/lean toward the hole, wind-up behind the head, overhead smash onto the target,
// squash + follow-through, then back to idle. Whole swing ≈ 230 ms; only the arm + pan reach the hole.
// =========================================================================
const ZOE_FUR = 0xa8703f, ZOE_FUR_D = 0x6e4422, INK_C = 0x22252b;
export class ZoeRig {
  root: Phaser.GameObjects.Container; head: Phaser.GameObjects.Image;
  private bodyC: Phaser.GameObjects.Container; private bodyG: Phaser.GameObjects.Graphics;
  private armG: Phaser.GameObjects.Graphics; private fx: Phaser.GameObjects.Graphics;
  private hand = { x: 0, y: 0, a: 0 }; private lArmG: Phaser.GameObjects.Graphics; private lHand = { x: -58, y: -88 }; private mood = 'smug'; private trail: { x: number; y: number; a: number }[] = [];
  private homeX: number; private t = 0; private swinging = false; 
  constructor(private scene: Phaser.Scene, x: number, private baseY: number, depth = 40) {
    this.homeX = x;
    this.root = scene.add.container(x, baseY).setDepth(depth);
    this.bodyC = scene.add.container(0, 0);
    this.bodyG = scene.add.graphics();
    const g = this.bodyG;
    g.fillStyle(0x000000, 0.25).fillEllipse(0, 6, 170, 34);
    g.lineStyle(8, INK_C, 1).fillStyle(ZOE_FUR, 1).fillRoundedRect(-62, -150, 124, 150, 56).strokeRoundedRect(-62, -150, 124, 150, 56);
    g.fillStyle(0xf3d2a2, 1).fillEllipse(0, -64, 74, 84); // tummy
    g.fillStyle(0xf28fb0, 1).fillRoundedRect(-58, -112, 116, 22, 10).lineStyle(5, INK_C, 1).strokeRoundedRect(-58, -112, 116, 22, 10); // apron strap
    g.lineStyle(8, INK_C, 1).fillStyle(ZOE_FUR_D, 1).fillEllipse(-34, -4, 52, 28).strokeEllipse(-34, -4, 52, 28).fillEllipse(34, -4, 52, 28).strokeEllipse(34, -4, 52, 28); // feet
    // left paw: no longer baked into bodyG (it never moved); it is a short live arm in lArmG, see drawLeft()
    this.lArmG = scene.add.graphics();
    this.head = art(scene, 0, -230, 'head_Zoe_smug', 0.95);
    this.bodyC.add([this.bodyG, this.lArmG, this.head]);
    this.armG = scene.add.graphics();
    this.root.add([this.bodyC, this.armG]);
    this.fx = scene.add.graphics().setDepth(depth - 1);
    this.hand = this.idleHand();
    scene.events.on('update', this.update, this); scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
    this.draw();
  }
  get x() { return this.root.x; } get y() { return this.root.y; }
  private shoulder() { return { x: 50, y: -110 }; }
  private idleHand() { return { x: 112, y: -150, a: -25 }; }
  setMood(m: 'smug' | 'happy' | 'dizzy') { this.mood = m; this.head.setTexture(`head_Zoe_${m}`); return this; }
  /** where the free (left) paw wants to be when not swinging: resting at her side with a little swing; up for a cheer; flapping when dizzy */
  private lIdle() { const t = this.t;
    if (this.mood === 'happy') return { x: -92 + Math.sin(t * 9) * 8, y: -190 + Math.sin(t * 18) * 10 };
    if (this.mood === 'dizzy') return { x: -86 + Math.sin(t * 11) * 14, y: -120 + Math.cos(t * 11) * 16 };
    return { x: -60 + Math.sin(t * 3) * 5, y: -86 + Math.sin(t * 6 + 0.8) * 3 }; }
  setTint(c: number) { this.head.setTint(c); this.bodyG.setAlpha(0.85); return this; }
  clearTint() { this.head.clearTint(); this.bodyG.setAlpha(1); return this; }
  get busy() { return this.swinging; }
  swingAt(tx: number, ty: number, onSmash?: () => void) {
    const sc = this.scene; sc.tweens.killTweensOf([this.root, this.bodyC, this.hand]);
    const nx = Phaser.Math.Clamp(this.homeX + (tx - this.homeX) * 0.55, 130, 590);
    this.swinging = true; this.trail = [];
    const lean = Phaser.Math.Clamp((tx - nx) / 12, -14, 14);
    sc.tweens.add({ targets: this.root, x: nx, duration: 70, ease: 'Quad.Out' });
    // local coordinates of the target relative to the rig at its new spot
    const lx = tx - nx, ly = ty - this.baseY;
    const up = { x: 150, y: -300, a: -140 }; // pan cocked over the head
    // wind-up 60 ms → smash 70 ms → follow-through 45 ms (body squash/stretch runs in parallel)
    sc.tweens.add({ targets: this.bodyC, angle: -lean * 0.5, scaleX: 0.94, scaleY: 1.08, duration: 60, ease: 'Quad.Out' });
    sc.tweens.add({ targets: this.bodyC, angle: lean, scaleX: 1.12, scaleY: 0.88, delay: 60, duration: 70, ease: 'Quad.In' });
    sc.tweens.add({ targets: this.bodyC, angle: 0, scaleX: 1, scaleY: 1, delay: 130, duration: 120, ease: 'Back.Out' });
    sc.tweens.killTweensOf(this.lHand); // free paw balances the swing: flings up/out on the wind-up, tucks down/back on the smash
    sc.tweens.add({ targets: this.lHand, x: -98, y: -150, duration: 60, ease: 'Quad.Out' });
    sc.tweens.add({ targets: this.lHand, x: -84, y: -64, delay: 60, duration: 70, ease: 'Quad.In' });
    sc.tweens.add({ targets: this.hand, x: up.x, y: up.y, a: up.a, duration: 60, ease: 'Quad.Out' });
    sc.tweens.add({ targets: this.hand, x: lx - 20, y: ly - 30, a: 10, delay: 60, duration: 70, ease: 'Quad.In', onComplete: () => { this.burst(tx, ty); onSmash?.(); } });
    sc.tweens.add({ targets: this.hand, x: lx - 10, y: ly - 14, a: 24, delay: 130, duration: 45, ease: 'Back.Out' });
    sc.time.delayedCall(245, () => { this.swinging = false; this.trail = [];
      sc.tweens.add({ targets: this.hand, ...this.idleHand(), duration: 110, ease: 'Quad.Out' });
      sc.tweens.add({ targets: this.root, x: this.homeX, duration: 220, delay: 40, ease: 'Sine.Out' }); });
  }
  private burst(x: number, y: number) {
    const sc = this.scene, g = sc.add.graphics().setDepth(this.root.depth + 2);
    const pts: number[] = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? 34 : 74, a = i / 16 * Math.PI * 2; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
    g.fillStyle(0xfff27a, 1).lineStyle(6, INK_C, 1); g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fillPath(); g.strokePath();
    g.setPosition(x, y).setScale(0.3);
    const t = sc.add.text(x, y, 'BONK!', { fontFamily: 'Fredoka, Arial Black', fontSize: '34px', fontStyle: '700', color: '#e0243a', stroke: '#ffffff', strokeThickness: 6 }).setOrigin(0.5).setDepth(g.depth + 1).setAngle(-10).setScale(0.4);
    sc.tweens.add({ targets: [g, t], scale: 1.1, duration: 90, ease: 'Back.Out' });
    sc.tweens.add({ targets: [g, t], alpha: 0, delay: 170, duration: 140, onComplete: () => { g.destroy(); t.destroy(); } });
  }
  private update(_t: number, dms: number) {
    this.t += dms / 1000;
    if (!this.swinging) { this.bodyC.y = Math.sin(this.t * 6) * 4; this.hand.y += (this.idleHand().y + Math.sin(this.t * 6) * 4 - this.hand.y) * 0.2;
      const li = this.lIdle(), k = 1 - Math.exp(-dms / 1000 * 10); this.lHand.x += (li.x - this.lHand.x) * k; this.lHand.y += (li.y - this.lHand.y) * k; }
    else { this.trail.push({ ...this.hand }); if (this.trail.length > 5) this.trail.shift(); }
    this.draw();
  }
  /** free left arm: shoulder at the body's left edge, short bent noodle to the paw (lives in bodyC so it squashes/leans with her) */
  private drawLeft() {
    const g = this.lArmG.clear(), sx = -46, sy = -108, h = this.lHand;
    const mx = (sx + h.x) / 2 - 22, my = (sy + h.y) / 2 + 6;
    const pts = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(h.x, h.y)).getPoints(10);
    g.lineStyle(28, INK_C, 1).strokePoints(pts); g.lineStyle(18, ZOE_FUR, 1).strokePoints(pts);
    g.lineStyle(8, INK_C, 1).fillStyle(ZOE_FUR, 1).fillCircle(h.x, h.y, 20).strokeCircle(h.x, h.y, 20);
    g.fillStyle(0xffffff, 0.3).fillCircle(h.x - 6, h.y - 7, 6);
  }
  private drawPan(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number, ghost = false) {
    // a: degrees; pan head extends "up" along the arm direction from the paw
    const r = Phaser.Math.DegToRad(a), dx = Math.sin(r), dy = -Math.cos(r);
    const hx = x + dx * 88, hy = y + dy * 88;
    if (ghost) { g.fillStyle(0xffffff, alpha).fillCircle(hx, hy, 52); return; }
    g.lineStyle(14, INK_C, alpha).lineBetween(x, y, x + dx * 44, y + dy * 44);
    g.lineStyle(8, 0x8a5a2b, alpha).lineBetween(x, y, x + dx * 44, y + dy * 44);
    g.fillStyle(INK_C, alpha).fillCircle(hx, hy, 54).fillStyle(0x3a3f4a, alpha).fillCircle(hx, hy, 46).fillStyle(0x5a6170, alpha).fillCircle(hx - 8 * dy, hy + 8 * dx, 30);
    g.fillStyle(0xffffff, 0.5 * alpha).fillEllipse(hx - 12, hy - 14, 14, 8);
  }
  private draw() {
    const g = this.armG, f = this.fx; g.clear(); f.clear(); this.drawLeft();
    const s = this.shoulder(), h = this.hand;
    // motion-blur arc: fading ghost pans + a white swoosh through the recent hand path
    if (this.trail.length > 1) {
      const ox = this.root.x, oy = this.root.y;
      this.trail.forEach((p, i) => this.drawPan(f, ox + p.x, oy + p.y, p.a, 0.18 + 0.12 * i, true));
      f.lineStyle(16, 0xffffff, 0.55); f.beginPath(); this.trail.forEach((p, i) => { const r = Phaser.Math.DegToRad(p.a), px = ox + p.x + Math.sin(r) * 88, py = oy + p.y - Math.cos(r) * 88; i ? f.lineTo(px, py) : f.moveTo(px, py); }); f.strokePath();
    }
    // stretchy noodle arm (quadratic curve) with a paw
    const mx = (s.x + h.x) / 2 + 40, my = (s.y + h.y) / 2 + 10;
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(s.x, s.y), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(h.x, h.y));
    const pts = curve.getPoints(14);
    g.lineStyle(30, INK_C, 1).strokePoints(pts); g.lineStyle(20, ZOE_FUR, 1).strokePoints(pts);
    this.drawPan(g, h.x, h.y, h.a, 1);
    g.lineStyle(6, INK_C, 1).fillStyle(ZOE_FUR, 1).fillCircle(h.x, h.y, 17).strokeCircle(h.x, h.y, 17);
  }
}

// =========================================================================
// HERO RIG (additive): any CAST heroine as chibi head + bean body + jointed noodle limbs.
// Units match chibiFullSVG (240x340 box, origin at the feet), scaled by m. Angles in degrees:
// 0 = limb hanging straight down, +90 = pointing screen-right, 180 = straight up. Elbow/knee are relative.
// Idle breathes (torso squash) and bobs (head lags a touch); act() plays keyframes then eases back to idle.
// =========================================================================
import { CAST } from '../art/chibi';
export type HeroPose = { ls: number; le: number; rs: number; re: number; lh: number; lk: number; rh: number; rk: number; lean: number; sq: number; dy: number; tilt: number };
export const HERO_IDLE: HeroPose = { ls: -12, le: -10, rs: 12, re: 10, lh: -4, lk: 0, rh: 4, rk: 0, lean: 0, sq: 0, dy: 0, tilt: 0 };
export interface HeroKey { dur: number; to: Partial<HeroPose>; ease?: EaseFn; onEnd?: () => void; }
export interface HeroOpts { wings?: number; number?: string; legs?: boolean; paws?: number; tail?: boolean }
const hx = (c: string) => parseInt(c.replace('#', ''), 16);
export class HeroRig {
  root: Phaser.GameObjects.Container; head: Phaser.GameObjects.Image; held?: Phaser.GameObjects.GameObject & { setPosition: (x: number, y: number) => any; setAngle?: (a: number) => any };
  private bodyC: Phaser.GameObjects.Container; private torso: Phaser.GameObjects.Graphics; private back: Phaser.GameObjects.Graphics; private front: Phaser.GameObjects.Graphics;
  private anim = new Animator(HERO_IDLE as unknown as Pose); private t = Math.random() * 6; private fur: number; private furD: number; private out: number;
  private pts: Record<string, { x: number; y: number }> = {}; private flipX = 1; idleAmp = 1; mood = 'smug';
  constructor(private scene: Phaser.Scene, public name: string, x: number, y: number, private m = 1, private o: HeroOpts = {}) {
    const c = CAST.find(k => k.name === name)!; this.fur = hx(c.fur); this.furD = hx(c.furD); this.out = hx(c.outfit);
    this.root = scene.add.container(x, y); this.root.setScale(m);
    this.back = scene.add.graphics(); this.bodyC = scene.add.container(0, 0); this.torso = scene.add.graphics(); this.front = scene.add.graphics();
    this.head = art(scene, 0, -188, `head_${name}_smug`, 1.04);
    this.bodyC.add([this.torso, this.head]);
    this.root.add([this.back, this.bodyC, this.front]);
    this.drawTorso();
    scene.events.on('update', this.update, this); scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
    this.apply();
  }
  get x() { return this.root.x; } get y() { return this.root.y; }
  get busy() { return this.anim.busy; }
  get pose() { return this.anim.pose as unknown as HeroPose; }
  setPosition(x: number, y: number) { this.root.setPosition(x, y); return this; }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  setFlip(f: boolean) { this.flipX = f ? -1 : 1; this.root.setScale(this.m * this.flipX, this.m); return this; }
  setMood(mood: 'smug' | 'happy' | 'dizzy') { this.mood = mood; this.head.setTexture(`head_${this.name}_${mood}`); return this; }
  /** world position of a paw/foot: 'lp' 'rp' (paws) 'lf' 'rf' (feet). */
  /** Goes through the root's full world matrix (its own scale/flip/rotation AND every parent container's), so it is right
   *  inside a scaled or rotated container too (e.g. Midnight inside Dive's tilting bird container). For a top-level, unrotated
   *  rig this gives exactly the old result (root x/y + local * m * flip). */
  point(k: 'lp' | 'rp' | 'lf' | 'rf') { const p = this.pts[k] ?? { x: 0, y: 0 };
    const mt = this.root.getWorldTransformMatrix(this.wm, this.pm); return mt.transformPoint(p.x, p.y, { x: 0, y: 0 }) as { x: number; y: number }; }
  private wm = new Phaser.GameObjects.Components.TransformMatrix(); private pm = new Phaser.GameObjects.Components.TransformMatrix();
  /** play keyframes, then settle back to idle (unless hold=true). */
  act(keys: HeroKey[], hold = false, settle = 0.26) {
    const segs: Seg[] = keys.map(k => ({ dur: k.dur, to: k.to as Pose, ease: k.ease ?? E.Sine.InOut, onEnd: k.onEnd }));
    if (!hold) segs.push({ dur: settle, to: HERO_IDLE as unknown as Pose, ease: E.Back.Out });
    this.anim.play(segs); return this;
  }
  setPose(p: Partial<HeroPose>) { Object.assign(this.anim.pose, p); this.apply(); return this; }
  destroy() { this.scene.events.off('update', this.update, this); this.root.destroy(); }
  private drawTorso() {
    const g = this.torso, INK = 0x22252b;
    g.fillStyle(0x000000, 0.2).fillEllipse(0, -4, 140, 16);
    if (this.o.tail) g.lineStyle(14, INK, 1).fillStyle(this.fur, 1).fillEllipse(44, -50, 30, 22).strokeEllipse(44, -50, 30, 22);
    g.lineStyle(6, INK, 1).fillStyle(this.out, 1);
    g.beginPath(); g.moveTo(-50, -34); g.lineTo(-38, -84); g.lineTo(38, -84); g.lineTo(50, -34); g.closePath(); g.fillPath(); g.strokePath();
    g.fillRoundedRect(-38, -94, 76, 66, 30).strokeRoundedRect(-38, -94, 76, 66, 30);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(-32, -88, 30, 50, 14);
    g.lineStyle(4, 0xffffff, 0.6).beginPath(); g.arc(-8, -70, 22, Math.PI * 1.1, Math.PI * 1.45); g.strokePath();
    if (this.o.number) { const t = this.scene.add.text(0, -60, this.o.number, { fontFamily: 'Arial Black', fontSize: '30px', color: '#ffffff', stroke: '#22252b', strokeThickness: 4 }).setOrigin(0.5); this.bodyC.add(t); }
  }
  private limb(g: Phaser.GameObjects.Graphics, x: number, y: number, a1: number, a2: number, l1: number, l2: number, w: number, col: number, end: 'paw' | 'foot', key: string) {
    const r1 = Phaser.Math.DegToRad(a1), r2 = Phaser.Math.DegToRad(a1 + a2);
    const ex = x + Math.sin(r1) * l1, ey = y + Math.cos(r1) * l1, px = ex + Math.sin(r2) * l2, py = ey + Math.cos(r2) * l2;
    const INK = 0x22252b;
    g.lineStyle(w + 10, INK, 1).beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.lineTo(px, py); g.strokePath();
    g.fillStyle(INK, 1).fillCircle(x, y, (w + 10) / 2).fillCircle(ex, ey, (w + 10) / 2);
    g.lineStyle(w, col, 1).beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.lineTo(px, py); g.strokePath();
    g.fillStyle(col, 1).fillCircle(x, y, w / 2).fillCircle(ex, ey, w / 2);
    if (end === 'paw') { const pr = this.o.paws ?? 14; g.lineStyle(6, INK, 1).fillStyle(col, 1).fillCircle(px, py, pr).strokeCircle(px, py, pr); g.fillStyle(0xffffff, 0.35).fillCircle(px - 4, py - 5, pr * 0.35); }
    else { g.lineStyle(6, INK, 1).fillStyle(this.furD, 1).fillEllipse(px + Math.sin(r2 + Math.PI / 2) * 6, py, 42, 26).strokeEllipse(px + Math.sin(r2 + Math.PI / 2) * 6, py, 42, 26); }
    this.pts[key] = { x: px, y: py };
    return { ex, ey, px, py };
  }
  private wing(g: Phaser.GameObjects.Graphics, sx: number, sy: number, a: number, side: number) {
    const col = this.o.wings!, INK = 0x22252b; const r = Phaser.Math.DegToRad(a);
    for (let k = 0; k < 4; k++) { const rr = r + side * (k * 0.22 - 0.1); const L = 92 - k * 12;
      const tx = sx + Math.sin(rr) * L, ty = sy + Math.cos(rr) * L;
      g.lineStyle(5, INK, 1).fillStyle(k % 2 ? col : Phaser.Display.Color.ValueToColor(col).darken(15).color, 1);
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(tx + Math.cos(rr) * 14, ty - Math.sin(rr) * 14); g.lineTo(tx, ty); g.lineTo(tx - Math.cos(rr) * 14, ty + Math.sin(rr) * 14); g.closePath(); g.fillPath(); g.strokePath(); }
  }
  private apply() {
    const p = this.anim.pose as unknown as HeroPose, idle = (this.anim.busy ? 0.25 : 1) * this.idleAmp;
    const br = Math.sin(this.t * 3.2), bob = Math.sin(this.t * 3.2 + 0.6);
    const sq = p.sq + br * 0.022 * idle, dy = p.dy + bob * 3 * idle;
    this.bodyC.setAngle(p.lean).setScale(1 - sq * 0.6, 1 + sq).setY(dy);
    this.head.setAngle(p.tilt + Math.sin(this.t * 1.6) * 2.5 * idle).setY(-188 - Math.max(0, bob) * 2 * idle);
    const sway = Math.sin(this.t * 3.2 - 0.4) * 4 * idle;
    const b = this.back.clear(), f = this.front.clear();
    const lean = Phaser.Math.DegToRad(p.lean), rot = (x: number, y: number) => ({ x: x * Math.cos(lean) - (y) * Math.sin(lean), y: x * Math.sin(lean) + y * Math.cos(lean) + dy });
    if (this.o.legs !== false) { this.limb(b, -22, -36, p.lh, p.lk, 20, 18, 20, this.fur, 'foot', 'lf'); this.limb(b, 22, -36, p.rh, p.rk, 20, 18, 20, this.fur, 'foot', 'rf'); }
    const L = rot(-36, -80 * (1 + sq)), R = rot(36, -80 * (1 + sq));
    if (this.o.wings !== undefined) { this.wing(b, L.x, L.y, p.ls + p.le * 0.5 - sway, -1); this.wing(b, R.x, R.y, p.rs + p.re * 0.5 + sway, 1); }
    this.limb(f, L.x, L.y, p.ls - sway + p.lean, p.le, 26, 24, 20, this.fur, 'paw', 'lp');
    this.limb(f, R.x, R.y, p.rs + sway + p.lean, p.re, 26, 24, 20, this.fur, 'paw', 'rp');
    if (this.held) { const q = this.point('rp'); this.held.setPosition(q.x, q.y); }
  }
  private update(_t: number, dms: number) { const dt = Math.min(dms, 50) / 1000; this.t += dt; this.anim.update(dt); this.apply(); }
}

/** Puppy flails: temporary noodle arms + legs windmilling on a Puppy image (follows it, then pops away). Cartoon only.
 *  limbK scales the limb length (both segments; roots stay on the body). Default 1; Dive's airborne Puppy uses a shorter set (Marc fb 28 Oct). */
export function pupFlail(scene: Phaser.Scene, img: Phaser.GameObjects.Image, ms = 700, limbK = 1) {
  const g = scene.add.graphics(); const t0 = scene.time.now; const FUR = 0xc97830, INK = 0x3b1f10;
  const upd = () => {
    if (!img.active) return stop(); const k = (scene.time.now - t0) / ms; if (k >= 1) return stop();
    const mt = img.getWorldTransformMatrix(), u = Math.abs(img.displayHeight) / 244 * (img.parentContainer ? img.parentContainer.scaleY : 1), cx = mt.tx, cy = mt.ty;
    const parentD = img.parentContainer ? img.parentContainer.depth : img.depth; g.setDepth(parentD + 0.5).clear();
    const ang = Phaser.Math.DegToRad(img.angle + (img.parentContainer?.angle ?? 0)), w = 16 * u, fade = k > 0.8 ? (1 - k) / 0.2 : 1, tt = scene.time.now / 1000;
    const lim = (ox: number, oy: number, base: number, sp: number, len: number) => {
      const bx = cx + (ox * Math.cos(ang) - oy * Math.sin(ang)) * u, by = cy + (ox * Math.sin(ang) + oy * Math.cos(ang)) * u;
      const a1 = base + Math.sin(tt * sp) * 55, a2 = a1 + Math.sin(tt * sp + 1.3) * 50; const r1 = Phaser.Math.DegToRad(a1) + ang, r2 = Phaser.Math.DegToRad(a2) + ang;
      const ex = bx + Math.sin(r1) * len * u, ey = by + Math.cos(r1) * len * u, px = ex + Math.sin(r2) * len * 0.9 * u, py = ey + Math.cos(r2) * len * 0.9 * u;
      g.lineStyle(w + 8 * u, INK, fade).beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.lineTo(px, py); g.strokePath();
      g.lineStyle(w, FUR, fade).beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.lineTo(px, py); g.strokePath();
      g.fillStyle(INK, fade).fillCircle(px, py, w * 0.8).fillStyle(0xe7a058, fade).fillCircle(px, py, w * 0.6);
    };
    lim(-70, -100, -115, 31, 50 * limbK); lim(70, -100, 115, 29, 50 * limbK); lim(-34, -14, -45, 27, 40 * limbK); lim(34, -14, 45, 33, 40 * limbK);
  };
  const stop = () => { scene.events.off('update', upd); g.destroy(); };
  scene.events.on('update', upd); scene.events.once('shutdown', stop);
  return stop;
}
