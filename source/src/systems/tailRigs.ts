// Tail Catch bonus rigs. TailBunny: finale Bunny (white bun_rig body, su_bun limbs, lasso coil on the hip) with a jointed reaching arm.
// TailPup: tail-less Puppy frames (pt_*) + a procedural tail (TailGfx, redrawn each frame by drawTail) so it wags by BENDING, glows and stretches in a tug.
import Phaser from 'phaser';
import { art, artScale, PUP_SCALE } from '../art/registry';
import { svgDoc } from '../art/svg';

export type BunPoseT = { sh: number; el: number; lean: number; kn: number; stride: number; sq: number };
/** Arm angles: 0 = hanging down, +ve swings toward -x, -90 = pointing right, 180 = straight up. */
export class TailBunny {
  root: Phaser.GameObjects.Container; torso: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image;
  private legs: Phaser.GameObjects.Image[]; private sh: Phaser.GameObjects.Container; private el: Phaser.GameObjects.Container; private hand: Phaser.GameObjects.Container;
  private sh2: Phaser.GameObjects.Container; private el2: Phaser.GameObjects.Container; private hand2: Phaser.GameObjects.Container;
  p: BunPoseT & { sh2: number; el2: number } = { sh: 20, el: -10, sh2: -14, el2: 12, lean: 0, kn: 6, stride: 0, sq: 0 }; private t = 0;
  constructor(scene: Phaser.Scene, x: number, y: number, private m = 1, expr = 'wink') {
    this.root = scene.add.container(x, y);
    const shadow = scene.add.image(4, 2, 'su_shadow').setScale(artScale('su_shadow', 2.0 * m), artScale('su_shadow', 0.9 * m));
    const hipY = -38 * m;
    this.legs = [-21, 21].map(lx => art(scene, lx * m, hipY, 'su_bunLeg', m));
    this.torso = scene.add.container(0, hipY);
    this.body = art(scene, 0, 0, 'bun_rig2_' + expr, m).setOrigin(0.5, 296 / 340); // rig2: no baked left sleeve, both arms are jointed
    // back arm (her left), behind the body: swings opposite the front arm
    this.sh2 = scene.add.container(-48 * m, -52 * m);
    const upper2 = art(scene, 0, 0, 'su_bunUpper', m * 0.95);
    this.el2 = scene.add.container(0, 40 * m * 0.95);
    const fore2 = art(scene, 0, 0, 'su_bunFore', m * 0.95);
    this.hand2 = scene.add.container(0, 44 * m * 0.95);
    this.el2.add([fore2, this.hand2]); this.sh2.add([upper2, this.el2]);
    const coil = art(scene, -40 * m, -30 * m, 'lasso', 0.42 * m).setAngle(-20); // finale lasso, coiled on her hip
    this.sh = scene.add.container(48 * m, -52 * m);
    const upper = art(scene, 0, 0, 'su_bunUpper', m * 0.95);
    this.el = scene.add.container(0, 40 * m * 0.95);
    const fore = art(scene, 0, 0, 'su_bunFore', m * 0.95);
    this.hand = scene.add.container(0, 44 * m * 0.95);
    this.el.add([fore, this.hand]); this.sh.add([upper, this.el]); this.torso.add([coil, this.body, this.sh2, this.sh]); // back arm drawn over the jacket (like the baked sleeves), under the front arm
    this.root.add([shadow, ...this.legs, this.torso]);
    this.apply();
  }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  setFace(e: string) { this.body.setTexture('bun_rig2_' + e); return this; }
  /** centre of the front paw (forearm art: paw ellipse at y 48 of 66, origin 0.09) */
  pawPos() { const pt = this.el.getWorldTransformMatrix().transformPoint(0, 42 * 0.95 * this.m); return { x: pt.x, y: pt.y }; }
  /** back arm: shoulder and paw centre (used when she walks off dragging him behind her) */
  shoulder2Pos() { const mt = this.sh2.getWorldTransformMatrix(); return { x: mt.tx, y: mt.ty }; }
  paw2Pos() { const pt = this.el2.getWorldTransformMatrix().transformPoint(0, 42 * 0.95 * this.m); return { x: pt.x, y: pt.y }; }
  handPos() { const mt = this.hand.getWorldTransformMatrix(); return { x: mt.tx, y: mt.ty }; }
  shoulderPos() { const mt = this.sh.getWorldTransformMatrix(); return { x: mt.tx, y: mt.ty }; }
  armLen() { return (40 + 44) * 0.95 * this.m; }
  /** straight arm pointing at (x, y); returns how far the hand falls short (+) or overshoots (-) */
  /** face left (mirror the rig) or right */
  flip(left: boolean) { this.root.scaleX = left ? -1 : 1; return this; }
  get left() { return this.root.scaleX < 0; }
  reachTo(x: number, y: number) { const s = this.shoulderPos(), f = this.left ? -1 : 1; this.p.sh = Phaser.Math.RadToDeg(Math.atan2(-(x - s.x) * f, y - s.y)) - this.p.lean; this.p.el = 0; this.apply();
    return Math.hypot(x - s.x, y - s.y) - this.armLen(); }
  /** back arm straight at (x, y) too (two-handed tug) */
  reachTo2(x: number, y: number) { const mt = this.sh2.getWorldTransformMatrix(), f = this.left ? -1 : 1; this.p.sh2 = Phaser.Math.RadToDeg(Math.atan2(-(x - mt.tx) * f, y - mt.ty)) - this.p.lean; this.p.el2 = 0; this.apply(); }
  pose(o: Partial<BunPoseT & { sh2: number; el2: number }>) { Object.assign(this.p, o); this.apply(); return this; }
  update(dt: number, run = 0) { this.t += dt; this.p.stride = Math.sin(this.t * 16) * 26 * run; this.apply(); }
  apply() {
    const p = this.p, bob = Math.abs(Math.sin(this.t * 16)) * 6 * (Math.abs(p.stride) > 1 ? 1 : 0);
    this.legs[0].setAngle(p.kn + p.stride); this.legs[1].setAngle(-p.kn - p.stride);
    this.torso.setAngle(p.lean).setScale(1 - p.sq * 0.6, 1 + p.sq).setY(-38 * this.m - bob);
    this.sh.setAngle(p.sh); this.el.setAngle(p.el); this.sh2.setAngle(p.sh2); this.el2.setAngle(p.el2);
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

/** The procedural drawTail below replaces the pt_tail image in TailPup (puppyTailSVG / PUP_TAIL_VB stay for the registry and mockups). */
/** tail angle that lays the (normally raised) tail out flat behind him: tug / catch / being held */
export const TAIL_FLAT = -36;

// ---------- procedural tail: ONE swappable draw function ----------
/** Everything a tail-draw function needs. Local space: root at (0,0), Puppy faces RIGHT, so the tail grows toward -x / up. */
export type TailDrawState = { u: number; wag: number; stretch: number; tint: number | null; to?: { x: number; y: number } | null };
/** to: when set (being HELD) the tail runs taut from the root to that point (Bunny's paw) and the returned grab spot is exactly `to`; the tuft pokes out past it. */
/** Draws the whole tail into g (already cleared) and returns the tip (the grab spot) in the same local space. cap (optional, already cleared) is drawn OVER the body: use it to hide the seam at the hip. */
export type TailDrawFn = (g: Phaser.GameObjects.Graphics, s: TailDrawState, cap?: Phaser.GameObjects.Graphics) => { x: number; y: number };

/** A) Classic puppy tail: soft C-curve (dips back from the hip, then sweeps up; tip ends where the old tail tip was, so grab difficulty is unchanged), gentle taper (root ~26 px wide -> ~15 px), round tip; wag bends it from the root out. */
export const drawTail: TailDrawFn = (g, s, cap) => {
  const u = s.u, OUT = 0x3b1f10, FUR = 0xc7772f, DARK = 0xa85e22, HI = 0xf0a860;
  const tn = (c: number) => s.tint === null ? c : (((((c >> 16) & 255) * ((s.tint >> 16) & 255) / 255) << 16) | ((((c >> 8) & 255) * ((s.tint >> 8) & 255) / 255) << 8) | (((c & 255) * (s.tint & 255) / 255) | 0));
  const N = 22, L = 115 * u * s.stretch, curl = 1.8 / (s.stretch * s.stretch * s.stretch), bend = 0.9;
  const P: { x: number; y: number; h: number; r: number }[] = []; let x = 0, y = 0, h = Math.PI - 0.5;
  if (s.to) { // held: a taut, barely sagging line from his rump to her paw, then a short tuft past the paw
    const ex = s.to.x, ey = s.to.y, len = Math.max(1, Math.hypot(ex, ey)), nx = -ey / len, ny = ex / len, sg = (ny >= 0 ? 1 : -1) * Math.min(14 * u, len * 0.05);
    const cx = ex / 2 + nx * sg, cy = ey / 2 + ny * sg, ext = 12 * u, M = N - 2;
    for (let i = 0; i <= M; i++) { const t = i / M, a = 1 - t, dx = 2 * a * cx + 2 * t * (ex - cx), dy = 2 * a * cy + 2 * t * (ey - cy);
      P.push({ x: 2 * a * t * cx + t * t * ex, y: 2 * a * t * cy + t * t * ey, h: Math.atan2(dy, dx), r: (13 - 5.5 * Math.pow(t * M / N, 0.9)) * u }); }
    const he = P[M].h; for (let k = 1; k <= 2; k++) P.push({ x: ex + Math.cos(he) * ext * k / 2, y: ey + Math.sin(he) * ext * k / 2, h: he, r: (13 - 5.5 * Math.pow((M + k) / N, 0.9)) * u });
  } else
  for (let i = 0; i <= N; i++) { const t = i / N; P.push({ x, y, h, r: (13 - 5.5 * Math.pow(t, 0.9)) * u });
    h += (curl * (0.6 + 0.8 * t) + s.wag * bend * 2.2 * Math.pow(t, 1.2)) / N; x += Math.cos(h) * L / N; y += Math.sin(h) * L / N; }
  const o = 4.2 * u;
  g.fillStyle(tn(OUT), 1); for (const p of P) g.fillCircle(p.x, p.y, p.r + o);
  g.fillStyle(tn(FUR), 1); for (const p of P) g.fillCircle(p.x, p.y, p.r);
  const edge = (k: number, a: number, b: number) => P.slice(a, P.length - b).map(p => new Phaser.Math.Vector2(p.x - Math.sin(p.h) * p.r * k, p.y + Math.cos(p.h) * p.r * k));
  g.lineStyle(5 * u, tn(DARK), 0.5).strokePoints(edge(-0.5, 2, 2)); // underside shade (smooth stroke, no beads)
  g.lineStyle(3 * u, tn(HI), 0.85).strokePoints(edge(0.45, 3, 4)); // top highlight
  // seam cover (drawn OVER the body): fur fills the strip where the tail leaves his hip, so the body outline doesn't cut across the root
  if (cap) { const k = Math.max(2, Math.round(N * 20 / 115)); cap.fillStyle(tn(FUR), 1); for (let i = 1; i <= k; i++) cap.fillCircle(P[i].x, P[i].y, P[i].r * 0.98);
    }
  const e = P[P.length - 1]; g.fillStyle(0xffffff, 0.35).fillCircle(e.x - 1.5 * u, e.y - 1.5 * u, e.r * 0.35);
  return s.to ? { x: s.to.x, y: s.to.y } : { x: e.x, y: e.y };
};

/** A Graphics that behaves like the old tail Image for the scene (setTint / clearTint / setAngle) and redraws via drawTail. */
export class TailGfx extends Phaser.GameObjects.Graphics {
  st: TailDrawState; tip = { x: 0, y: 0 }; cap: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene, x: number, y: number, u: number) { super(scene, { x, y }); this.cap = scene.add.graphics({ x, y }); this.st = { u, wag: 0, stretch: 1, tint: null }; scene.add.existing(this); this.redraw(); }
  redraw() { this.clear(); this.cap.clear(); this.cap.setAngle(this.angle); this.tip = drawTail(this, this.st, this.cap); return this; }
  setAngle(degrees?: number) { super.setAngle(degrees); this.cap?.setAngle(degrees); return this; }
  destroy(fromScene?: boolean) { this.cap?.destroy(fromScene); super.destroy(fromScene); }
  setTint(c: number) { if (this.st.tint !== c) { this.st.tint = c; this.redraw(); } return this; }
  clearTint() { if (this.st.tint !== null) { this.st.tint = null; this.redraw(); } return this; }
}

/** Puppy faces right (tail on his left/back). flip(true) = faces left. */
export class TailPup {
  root: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; tail: TailGfx; inner: Phaser.GameObjects.Container;
  private t = 0; frame = 0; wagAmp = 22; wagSpd = 9; tailStretch = 1;
  constructor(private scene: Phaser.Scene, x: number, y: number, private m = 1) {
    this.root = scene.add.container(x, y);
    const shadow = scene.add.image(0, 4, 'su_shadow').setScale(artScale('su_shadow', 1.6 * m), artScale('su_shadow', 0.8 * m));
    this.inner = scene.add.container(0, 0);
    this.tail = new TailGfx(scene, ...this.tailBase(), PUP_SCALE * m);
    this.body = art(scene, 0, 0, 'pt_run0', m);
    this.inner.add([this.tail, this.body, this.tail.cap]); this.root.add([shadow, this.inner]);
  }
  /** tail attach point (local, facing right): tucked into his back at hip height so the root hides under the body outline */
  tailBase(): [number, number] { return [-36 * PUP_SCALE * this.m, -40 * PUP_SCALE * this.m]; }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  flip(left: boolean) { this.inner.setScale(left ? -1 : 1, 1); return this; }
  /** squash/stretch the body + tail without losing the facing flip (sx > 1 = stretched along the run) */
  squash(sx: number, sy: number) { this.inner.setScale((this.inner.scaleX < 0 ? -1 : 1) * sx, sy); return this; }
  setFrame(k: string) { this.body.setTexture('pt_' + k); return this; }
  /** pin the tail's end to a WORLD point (Bunny's paw); call after both rigs are posed this frame */
  holdTo(wx: number, wy: number) { const p = this.tail.getWorldTransformMatrix().applyInverse(wx, wy); this.tail.st.to = { x: p.x, y: p.y }; this.tail.redraw(); return this; }
  letGo() { this.tail.st.to = null; return this; }
  /** world position of the tail tip (the grab spot) */
  tipPos() { const pt = this.tail.getWorldTransformMatrix().transformPoint(this.tail.tip.x, this.tail.tip.y); return { x: pt.x, y: pt.y }; }
  update(dt: number, run = 0, wag = 1) {
    this.t += dt;
    if (run > 0) { this.frame = (this.frame + dt * 14 * run) % 6; this.body.setTexture('pt_run' + Math.floor(this.frame)); }
    // wag BENDS the tail (the draw fn curls it more toward the tip); the scene may still rotate the whole tail via setAngle (tug)
    this.tail.setAngle(0); this.tail.st.wag = Math.sin(this.t * this.wagSpd) * (this.wagAmp / 22) * wag; this.tail.st.stretch = this.tailStretch; this.tail.redraw();
  }
}
