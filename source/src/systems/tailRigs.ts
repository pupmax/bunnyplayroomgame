// Tail Catch bonus rigs. TailBunny: finale Bunny (white bun_rig body, su_bun limbs, lasso coil on the hip) with a jointed reaching arm.
// TailPup: tail-less Puppy frames (pt_*) + the tail (pt_tail) as its own part, so it can wag, glow and stretch in a tug.
import Phaser from 'phaser';
import { art, artScale, PUP_SCALE } from '../art/registry';

export type BunPoseT = { sh: number; el: number; lean: number; kn: number; stride: number; sq: number };
/** Arm angles: 0 = hanging down, +ve swings toward -x, -90 = pointing right, 180 = straight up. */
export class TailBunny {
  root: Phaser.GameObjects.Container; torso: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image;
  private legs: Phaser.GameObjects.Image[]; private sh: Phaser.GameObjects.Container; private el: Phaser.GameObjects.Container; private hand: Phaser.GameObjects.Container;
  p: BunPoseT = { sh: 20, el: -10, lean: 0, kn: 6, stride: 0, sq: 0 }; private t = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, private m = 1, expr = 'wink') {
    this.root = scene.add.container(x, y);
    const shadow = scene.add.image(4, 2, 'su_shadow').setScale(artScale('su_shadow', 2.0 * m), artScale('su_shadow', 0.9 * m));
    const hipY = -38 * m;
    this.legs = [-21, 21].map(lx => art(scene, lx * m, hipY, 'su_bunLeg', m));
    this.torso = scene.add.container(0, hipY);
    this.body = art(scene, 0, 0, 'bun_rig_' + expr, m).setOrigin(0.5, 296 / 340);
    const coil = art(scene, -40 * m, -30 * m, 'lasso', 0.42 * m).setAngle(-20); // finale lasso, coiled on her hip
    this.sh = scene.add.container(48 * m, -52 * m);
    const upper = art(scene, 0, 0, 'su_bunUpper', m * 0.95);
    this.el = scene.add.container(0, 40 * m * 0.95);
    const fore = art(scene, 0, 0, 'su_bunFore', m * 0.95);
    this.hand = scene.add.container(0, 44 * m * 0.95);
    this.el.add([fore, this.hand]); this.sh.add([upper, this.el]); this.torso.add([coil, this.body, this.sh]);
    this.root.add([shadow, ...this.legs, this.torso]);
    this.apply();
  }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  setFace(e: string) { this.body.setTexture('bun_rig_' + e); return this; }
  handPos() { const mt = this.hand.getWorldTransformMatrix(); return { x: mt.tx, y: mt.ty }; }
  shoulderPos() { const mt = this.sh.getWorldTransformMatrix(); return { x: mt.tx, y: mt.ty }; }
  armLen() { return (40 + 44) * 0.95 * this.m; }
  /** straight arm pointing at (x, y); returns how far the hand falls short (+) or overshoots (-) */
  /** face left (mirror the rig) or right */
  flip(left: boolean) { this.root.scaleX = left ? -1 : 1; return this; }
  get left() { return this.root.scaleX < 0; }
  reachTo(x: number, y: number) { const s = this.shoulderPos(), f = this.left ? -1 : 1; this.p.sh = Phaser.Math.RadToDeg(Math.atan2(-(x - s.x) * f, y - s.y)) - this.p.lean; this.p.el = 0; this.apply();
    return Math.hypot(x - s.x, y - s.y) - this.armLen(); }
  pose(o: Partial<BunPoseT>) { Object.assign(this.p, o); this.apply(); return this; }
  update(dt: number, run = 0) { this.t += dt; this.p.stride = Math.sin(this.t * 16) * 26 * run; this.apply(); }
  apply() {
    const p = this.p, bob = Math.abs(Math.sin(this.t * 16)) * 6 * (Math.abs(p.stride) > 1 ? 1 : 0);
    this.legs[0].setAngle(p.kn + p.stride); this.legs[1].setAngle(-p.kn - p.stride);
    this.torso.setAngle(p.lean).setScale(1 - p.sq * 0.6, 1 + p.sq).setY(-38 * this.m - bob);
    this.sh.setAngle(p.sh); this.el.setAngle(p.el);
  }
}

const TS = 1.7; // tail drawn big so it reads (and is tappable) on a phone
/** Puppy faces right (tail on his left/back). flip(true) = faces left. */
export class TailPup {
  root: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; tail: Phaser.GameObjects.Image; inner: Phaser.GameObjects.Container;
  private t = 0; frame = 0; wagAmp = 22; wagSpd = 9; tailStretch = 1;
  constructor(private scene: Phaser.Scene, x: number, y: number, private m = 1) {
    this.root = scene.add.container(x, y);
    const shadow = scene.add.image(0, 4, 'su_shadow').setScale(artScale('su_shadow', 1.6 * m), artScale('su_shadow', 0.8 * m));
    this.inner = scene.add.container(0, 0);
    this.tail = art(scene, ...this.tailBase(), 'pt_tail', m * TS);
    this.body = art(scene, 0, 0, 'pt_run0', m);
    this.inner.add([this.tail, this.body]); this.root.add([shadow, this.inner]);
  }
  /** tail attach point (local, facing right): his back at hip height */
  tailBase(): [number, number] { return [-50 * PUP_SCALE * this.m, -40 * PUP_SCALE * this.m]; }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  flip(left: boolean) { this.inner.setScale(left ? -1 : 1, 1); return this; }
  setFrame(k: string) { this.body.setTexture('pt_' + k); return this; }
  /** world position of the tail tip (the grab spot) */
  tipPos() { const u = PUP_SCALE * this.m * TS, a = Phaser.Math.DegToRad(this.tail.angle), dx = -58 * u * this.tailStretch, dy = -30 * u; const [bx, by] = this.tailBase();
    const lx = bx + dx * Math.cos(a) - dy * Math.sin(a), ly = by + dx * Math.sin(a) + dy * Math.cos(a);
    const pt = this.inner.getWorldTransformMatrix().transformPoint(lx, ly); return { x: pt.x, y: pt.y }; }
  update(dt: number, run = 0, wag = 1) {
    this.t += dt;
    if (run > 0) { this.frame = (this.frame + dt * 14 * run) % 6; this.body.setTexture('pt_run' + Math.floor(this.frame)); }
    this.tail.setAngle(Math.sin(this.t * this.wagSpd) * this.wagAmp * wag).setScale(artScale('pt_tail', this.m * TS) * this.tailStretch, artScale('pt_tail', this.m * TS));
  }
}
