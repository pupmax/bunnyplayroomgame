// Tail Catch bonus rigs. TailBunny: finale Bunny (white bun_rig body, su_bun limbs, lasso coil on the hip) with a jointed reaching arm.
// TailPup: tail-less Puppy frames (pt_*) + the tail (pt_tail) as its own part, so it can wag, glow and stretch in a tug.
import Phaser from 'phaser';
import { art, artScale, PUP_SCALE } from '../art/registry';
import { svgDoc } from '../art/svg';

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

// ---- Puppy's tail art: ONE swappable function (Marc is choosing between tail styles; drop the chosen one in here) ----
/** viewBox, root (bx, by: hidden behind his hip) and tip (tx, ty: the grab spot). Rest pose = raised up-and-back; TAIL_FLAT lays it out flat. */
export const PUP_TAIL_VB = { w: 100, h: 92, bx: 86, by: 74, tx: 24, ty: 26 };
/** Style "soft C": medium-width C curve (root ~14 px, end ~10 px on screen), no taper to a point, rounded fluffy cream tip. */
export function puppyTailSVG(pxPerUnit: number): string {
  const OUT = '#3b1f10', FUR = '#c7772f', CREAM = '#ffe7c2';
  const P = [[86, 74], [52, 90], [12, 70], [24, 26]]; // cubic centreline, root -> tip
  const at = (t: number) => { const u = 1 - t; return [0, 1].map(i => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]); };
  const N = 24, L: number[][] = [], R: number[][] = [];
  for (let i = 0; i <= N; i++) { const t = i / N, [x, y] = at(t), [x2, y2] = at(Math.min(1, t + 0.01)), [x1, y1] = at(Math.max(0, t - 0.01));
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, hw = (12 - 3.5 * t) / 2; // ~12 units at the root -> ~8.5 at the end
    L.push([x - dy / d * hw, y + dx / d * hw]); R.push([x + dy / d * hw, y - dx / d * hw]); }
  const pts = [...L, ...R.reverse()].map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
  const [tx, ty] = P[3], r = 8; // fluffy tip: a round tuft of 6 soft bumps, a bit wider than the tail end
  let tuft = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 - 0.3, a2 = (i + 1) / 6 * Math.PI * 2 - 0.3;
    tuft += `${i ? '' : `M${(tx + Math.cos(a) * r).toFixed(1)} ${(ty + Math.sin(a) * r).toFixed(1)} `}A${(r * 0.55).toFixed(1)} ${(r * 0.55).toFixed(1)} 0 0 1 ${(tx + Math.cos(a2) * r).toFixed(1)} ${(ty + Math.sin(a2) * r).toFixed(1)} `; }
  const body = `<path d="M${pts} Z" fill="${FUR}" stroke="${OUT}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M80 72 C60 80 36 74 28 54" fill="none" stroke="#e8a060" stroke-width="2.6" stroke-linecap="round" opacity="0.75"/>` +
    `<path d="${tuft}Z" fill="${CREAM}" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>` +
    `<path d="M${tx - 3} ${ty - 2} q3 -2 6 0" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
  return svgDoc(PUP_TAIL_VB.w, PUP_TAIL_VB.h, PUP_TAIL_VB.w * pxPerUnit, PUP_TAIL_VB.h * pxPerUnit, body, '');
}

const TS = 1.3; // tail drawn big so it reads (and is tappable) on a phone
/** tail angle that lays the (normally raised) tail out flat behind him: tug / catch / being held */
export const TAIL_FLAT = -36;
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
  tailBase(): [number, number] { return [-34 * PUP_SCALE * this.m, -44 * PUP_SCALE * this.m]; }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  flip(left: boolean) { this.inner.setScale(left ? -1 : 1, 1); return this; }
  /** squash/stretch the body + tail without losing the facing flip (sx > 1 = stretched along the run) */
  squash(sx: number, sy: number) { this.inner.setScale((this.inner.scaleX < 0 ? -1 : 1) * sx, sy); return this; }
  setFrame(k: string) { this.body.setTexture('pt_' + k); return this; }
  /** world position of the tail tip (the grab spot) */
  tipPos() { const u = PUP_SCALE * this.m * TS, a = Phaser.Math.DegToRad(this.tail.angle), dx = (PUP_TAIL_VB.tx - PUP_TAIL_VB.bx) * u * this.tailStretch, dy = (PUP_TAIL_VB.ty - PUP_TAIL_VB.by) * u; const [bx, by] = this.tailBase();
    const lx = bx + dx * Math.cos(a) - dy * Math.sin(a), ly = by + dx * Math.sin(a) + dy * Math.cos(a);
    const pt = this.inner.getWorldTransformMatrix().transformPoint(lx, ly); return { x: pt.x, y: pt.y }; }
  update(dt: number, run = 0, wag = 1) {
    this.t += dt;
    if (run > 0) { this.frame = (this.frame + dt * 14 * run) % 6; this.body.setTexture('pt_run' + Math.floor(this.frame)); }
    this.tail.setAngle(Math.sin(this.t * this.wagSpd) * this.wagAmp * wag).setScale(artScale('pt_tail', this.m * TS) * this.tailStretch, artScale('pt_tail', this.m * TS));
  }
}
