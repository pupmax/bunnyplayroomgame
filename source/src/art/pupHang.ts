// LASSO FINALE: Puppy's three "hang" gags during the tie-up after a catch.
//  A = one lasso loop round ONE hind ankle, single line up to a ceiling hook, swinging like a pendulum (sheepish wink).
//  B = the same ankle snare, TWISTING on the rope (dizzy face; a real 3/4 turn, never a paper-thin card flip).
//  C = no tie: he hangs by his knees from the lamp's swing bar (happy grin), shins + paws draped over the FRONT of the bar.
// 28 Oct v3 (Marc: "where he looks flat especially"): the hang is LAYERED, not one flat sprite:
//   body (neck, torso, legs, arms; upright art units, the scene flips the rig) + a HEAD that is drawn the right way up on screen
//   (head blob, face, ears as three layers: the ears hang beside his cheeks like on every other Puppy, the face can slide round
//   the head when he twists) + for C a separate shins layer that sits in front of the lamp bar. Same puppy.ts painters, same fur,
//   outline and raster budget as the pt_* frames; natural proportions, every limb attached. No heart eyes.
import Phaser from 'phaser';
import { svgDoc } from './svg';
import { PUP_PARTS as P, PUP_VB, PupFace } from './puppy';
import { PUP_SCALE, TEX_RES } from './registry';
import { RES } from '../systems/resolution';
import { TailGfx } from '../systems/tailRigs';
import { txt } from '../systems/fx';
import { GAME_W } from '../config';

export type HangKind = 'A' | 'B' | 'C';
/** padded body viewBox: puppy.ts art unit (x, y) sits at (x + dx, y + dy) */
export const HANG_VB = { w: 300, h: 420, dx: 50, dy: 130 };
/** head pieces viewBox: plain puppy.ts head coords (head centre 100,94) + (dx, dy) */
const HEAD_VB = { w: 220, h: 190, dx: 10, dy: 0 }, HC = { x: 100, y: 94 }, HRX = 74, HRY = 58;
const FEET = { x: PUP_VB.w / 2, y: PUP_VB.feetY };      // same anchor as the pt_* frames
const NECK_GAP = 30;                                     // head hangs this far off the torso (art units)
export const HANG_ANKLE = { x: 113, y: 250 };            // snared ankle (front hind leg, straight), just below the paw
export const HANG_KNEE = { x: 100, y: 250 };             // C: the bar line (the knees sit just past it, on top of the bar)
export const HANG_HEAD = { x: 100, y: 94 - NECK_GAP };   // head centre
export const HANG_NECK = { x: 100, y: 124 };             // collar line: between the head and the torso
const HANG_K = 0.78 * TEX_RES * 1.35 * Math.max(0.6, Math.min(1, RES / 2)); // raster px per art unit (same budget as pt_*)

type Face = { eyes: PupFace; brows: PupFace; mouth: PupFace; sweat?: boolean };
const FACES: Record<HangKind, Face> = {
  A: { eyes: 'taunt', brows: 'normal', mouth: 'happy', sweat: true },  // sheepish wink
  B: { eyes: 'dizzy', brows: 'dizzy', mouth: 'dizzy', sweat: true },   // dizzy + flustered
  C: { eyes: 'happy', brows: 'happy', mouth: 'happy' },                // closed-eye grin
};
const OUT = P.OUT, SW = P.SW;
const seg = (x1: number, y1: number, x2: number, y2: number, w: number, fill: string) => {
  const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI - 90;
  return `<g transform="translate(${x1} ${y1}) rotate(${a.toFixed(1)})"><rect x="${-w / 2}" y="${-w / 2}" width="${w}" height="${(len + w).toFixed(1)}" rx="${w / 2}" fill="${fill}" stroke="${OUT}" stroke-width="${SW}"/></g>`;
};
/** a paw at (x, y) pointing along angle a (deg, 0 = art-down), with the two toe lines of puppy.ts legs */
const paw = (x: number, y: number, a: number, fill: string) => `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse cx="0" cy="4" rx="15" ry="11" fill="${fill}" stroke="${OUT}" stroke-width="${SW}"/>` +
  `<path d="M-4 9 v4 M4 9 v4" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/></g>`;
const BK = '#a85d24', FR = '#c27230';

/** body layer (upright art; the scene flips it): neck, legs, torso, arms. No head. */
function bodySVG(kind: 'snare' | 'knees'): string {
  let s = '';
  // arms dangle down past his head (art-up = the floor once flipped), angled OUT so they clear his ears; paws at the ends
  // (28 Oct v3: both hangs; the crossed-arm pout read as an X-shaped jumble once upside down)
  s += seg(66, 150, 20, 96, 22, 'url(#furDark)') + paw(18, 92, 140, '#b8692b') + seg(134, 150, 180, 96, 22, 'url(#fur)') + paw(182, 92, -140, '#c7772f');
  s += `<rect x="80" y="${HANG_NECK.y - 16}" width="40" height="44" rx="14" fill="url(#furBody)" stroke="${OUT}" stroke-width="${SW}"/>`; // neck (collar spot)
  if (kind === 'snare') // free (back) leg: thigh out to the side, shin folded at the knee; snared (front) leg straight, paw past the ankle
    s += seg(84, 204, 52, 246, 26, BK) + seg(52, 246, 30, 214, 24, BK) + paw(28, 210, 145, BK)
      + seg(113, 200, 113, 230, 26, FR) + seg(113, 230, 113, 250, 24, FR) + paw(113, 258, 0, FR);
  else // thighs up to the bar; the knees poke out past it (the shins are a separate layer in front of the bar)
    s += seg(86, 200, 88, 264, 26, BK) + seg(113, 200, 112, 264, 26, FR);
  s += P.body(0);
  return s;
}
/** C only: the shins fold back over the FRONT of the bar from the knees, paws hanging below it */
function shinsSVG(): string {
  return seg(88, 266, 72, 232, 24, BK) + paw(71, 226, 160, BK) + seg(112, 266, 128, 232, 24, FR) + paw(129, 226, -160, FR)
    + `<ellipse cx="88" cy="266" rx="13" ry="12" fill="${BK}" stroke="${OUT}" stroke-width="${SW}"/><ellipse cx="112" cy="266" rx="13" ry="12" fill="${FR}" stroke="${OUT}" stroke-width="${SW}"/>`; // round knee caps on top of the bar
}
/** face layer (head coords): same painters + order as puppySVG */
function faceSVG(f: Face): string {
  let s = `<ellipse cx="100" cy="118" rx="30" ry="20" fill="url(#glow)"/>`;
  s += `<ellipse cx="58" cy="122" rx="14" ry="9" fill="url(#blush)"/><ellipse cx="142" cy="122" rx="14" ry="9" fill="url(#blush)"/>`;
  s += P.brows(f.brows) + P.eyes(f.eyes);
  s += `<path d="M91 112 Q100 106 109 112 Q108 120 100 121 Q92 120 91 112 Z" fill="#24130b"/><ellipse cx="97" cy="112" rx="2.6" ry="1.5" fill="#fff" opacity="0.7"/>`;
  s += P.mouth(f.mouth);
  if (f.sweat) s += `<path d="M160 58 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${OUT}" stroke-width="2.6"/>`;
  return s;
}
const bodyDoc = (inner: string, k: number) => svgDoc(HANG_VB.w, HANG_VB.h, HANG_VB.w * k, HANG_VB.h * k, `<g transform="translate(${HANG_VB.dx} ${HANG_VB.dy})">${inner}</g>`, P.DEFS);
const headDoc = (inner: string, k: number) => svgDoc(HEAD_VB.w, HEAD_VB.h, HEAD_VB.w * k, HEAD_VB.h * k, `<g transform="translate(${HEAD_VB.dx} ${HEAD_VB.dy})">${inner}</g>`, P.DEFS);
const TEX: Record<string, (k: number) => string> = {
  ph_body_snare: k => bodyDoc(bodySVG('snare'), k), ph_body_knees: k => bodyDoc(bodySVG('knees'), k), ph_shins: k => bodyDoc(shinsSVG(), k),
  ph_headbase: k => headDoc(P.head(0), k), ph_ears: k => headDoc(P.ear('L', 2, 0) + P.ear('R', 2, 0), k),
  ph_face_A: k => headDoc(faceSVG(FACES.A), k), ph_face_B: k => headDoc(faceSVG(FACES.B), k), ph_face_C: k => headDoc(faceSVG(FACES.C), k),
};
/** for tests / sheets: the raw SVG of one layer */
export function hangSVG(key: string, k = HANG_K): string { return TEX[key](k); }

/** rasterise the hang layers once (on demand, when Lasso / Champion opens) */
export async function ensureHangArt(scene: Phaser.Scene): Promise<void> {
  for (const key of Object.keys(TEX)) {
    if (scene.textures.exists(key)) continue;
    await new Promise<void>(res => { const img = new Image(); const done = () => { img.onload = img.onerror = null; res(); };
      img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d')!.drawImage(img, 0, 0);
        if (!scene.textures.exists(key)) scene.textures.addCanvas(key, c); } catch (e) { console.warn('hang art failed', key, e); } done(); };
      img.onerror = () => { console.warn('hang art failed', key); done(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(TEX[key](HANG_K)); });
  }
}

/** The hang rig: root (pivot, world) > rig (upright Puppy, feet at its origin) > [tail, body, tail cap, head (turned 180 so it reads
 *  upright on screen) > [head blob, face, ears]]. For C a second container (`front`, own depth) mirrors root and holds the shins. */
export class HangPup {
  root: Phaser.GameObjects.Container; rig: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; tail: TailGfx; kind: HangKind = 'A';
  head: Phaser.GameObjects.Container; headImg: Phaser.GameObjects.Image; face: Phaser.GameObjects.Image; ears: Phaser.GameObjects.Image;
  front: Phaser.GameObjects.Container; frontRig: Phaser.GameObjects.Container; shins: Phaser.GameObjects.Image;
  /** B: twist angle (deg, 0 = facing you). Body narrows to cos-ish but never below 0.8; the face slides round the head. */
  twist = 0;
  private u: number; private t = 0;
  constructor(private scene: Phaser.Scene, readonly m = 1) {
    this.u = PUP_SCALE * m;
    this.root = scene.add.container(0, 0).setVisible(false); this.rig = scene.add.container(0, 0);
    this.tail = new TailGfx(scene, -36 * this.u, -40 * this.u, this.u);
    const bo = [(FEET.x + HANG_VB.dx) / HANG_VB.w, (FEET.y + HANG_VB.dy) / HANG_VB.h] as const, ho = [(HC.x + HEAD_VB.dx) / HEAD_VB.w, (HC.y + HEAD_VB.dy) / HEAD_VB.h] as const;
    const sc = this.u / HANG_K;
    this.body = scene.add.image(0, 0, '__DEFAULT').setOrigin(bo[0], bo[1]).setScale(sc);
    this.headImg = scene.add.image(0, 0, '__DEFAULT').setOrigin(ho[0], ho[1]).setScale(sc);
    this.face = scene.add.image(0, 0, '__DEFAULT').setOrigin(ho[0], ho[1]).setScale(sc);
    this.ears = scene.add.image(0, 0, '__DEFAULT').setOrigin(ho[0], ho[1]).setScale(sc);
    const hl = this.loc(HANG_HEAD.x, HANG_HEAD.y);
    this.head = scene.add.container(hl.x, hl.y, [this.headImg, this.face, this.ears]).setAngle(180);
    this.rig.add([this.tail, this.body, this.tail.cap, this.head]); this.root.add(this.rig);
    this.front = scene.add.container(0, 0).setVisible(false); this.frontRig = scene.add.container(0, 0);
    this.shins = scene.add.image(0, 0, '__DEFAULT').setOrigin(bo[0], bo[1]).setScale(sc); this.frontRig.add(this.shins); this.front.add(this.frontRig);
  }
  /** art unit -> rig local (feet origin, upright) */
  loc(ax: number, ay: number) { return { x: (ax - FEET.x) * this.u, y: (ay - FEET.y) * this.u }; }
  /** show hang pose `kind`, upside down, its pivot (snared ankle or knees) at world (x, y) */
  start(kind: HangKind, x: number, y: number) {
    this.kind = kind; this.t = 0; this.twist = 0; const C = kind === 'C';
    this.body.setTexture(C ? 'ph_body_knees' : 'ph_body_snare'); this.headImg.setTexture('ph_headbase'); this.ears.setTexture('ph_ears'); this.face.setTexture('ph_face_' + kind);
    this.shins.setTexture('ph_shins');
    const q = C ? HANG_KNEE : HANG_ANKLE, l = this.loc(q.x, q.y);
    this.rig.setScale(1, 1).setPosition(-l.x, -l.y); this.frontRig.setPosition(-l.x, -l.y);
    this.root.setPosition(x, y).setAngle(180).setScale(1).setAlpha(1).setVisible(true); this.front.setVisible(C).setAlpha(1);
    this.tail.st.to = null; this.tail.st.stretch = 1; this.tail.setAngle(35); this.tail.setPosition(-36 * this.u, -40 * this.u); this.tail.redraw();
    this.applyTwist(); this.sync();
    return this;
  }
  /** keep the front (shins) layer glued to the rig */
  sync() { this.front.setPosition(this.root.x, this.root.y).setAngle(this.root.angle).setScale(this.root.scaleX, this.root.scaleY); this.frontRig.setScale(this.rig.scaleX, this.rig.scaleY); }
  private applyTwist() {
    const r = Phaser.Math.DegToRad(this.twist), c = Math.cos(r), sn = Math.sin(r), u = this.u;
    this.rig.scaleX = 0.8 + 0.2 * Math.abs(c);                       // round body: a 3/4 turn reads slimmer, never a paper-thin card
    this.face.setX(sn * 30 * u).setScale(this.u / HANG_K * (0.62 + 0.38 * Math.abs(c)), this.u / HANG_K).setAlpha(Phaser.Math.Clamp((Math.abs(c) - 0.12) / 0.3, 0, 1));
    this.ears.setX(sn * 9 * u); this.headImg.setX(sn * 3 * u);
    this.tail.setX(-36 * u * (0.55 + 0.45 * c) + sn * 10 * u);        // the tail swings round his back with the turn
  }
  world(ax: number, ay: number) { const l = this.loc(ax, ay), w = this.rig.getWorldTransformMatrix().transformPoint(l.x, l.y); return { x: w.x, y: w.y }; }
  /** head centre (world) */
  headPos() { const m = this.head.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; }
  /** head radius (world px, horizontal / vertical) */
  headR() { return { rx: HRX * this.u * Math.abs(this.root.scaleX), ry: HRY * this.u * Math.abs(this.root.scaleY) }; }
  /** world angle (deg) of his body axis (180 = hanging straight down) */
  ang() { return this.root.angle; }
  update(dt: number, wag = 1, spd = 6) { this.t += dt; this.tail.st.wag = Math.sin(this.t * spd) * wag; this.tail.redraw(); this.applyTwist(); this.sync(); }
  hide() { this.root.setVisible(false); this.front.setVisible(false); return this; }
  setDepth(d: number, front = d) { this.root.setDepth(d); this.front.setDepth(front); return this; }
}

/** the lasso snare round his ankle: a tight loop around the leg just below the paw (back half behind the leg, front half over it) and a
 *  knot on its outer side where the rope (from `top`) ties on. Call every frame into a cleared graphics that sits in front of the rig. */
export function drawSnare(g: Phaser.GameObjects.Graphics, hp: HangPup, top: { x: number; y: number } | null, rope = 0x8a5a2a) {
  const u = PUP_SCALE * hp.m, a = hp.world(HANG_ANKLE.x, HANG_ANKLE.y), th = Phaser.Math.DegToRad(hp.ang() - 180), sx = Math.abs(hp.rig.scaleX);
  const ax = Math.cos(th), ay = Math.sin(th), A = 16 * u * sx, B = 5.5 * u;                   // loop half-width (round the leg) / half-depth
  const pt = (t: number) => ({ x: a.x + ax * Math.cos(t) * A - ay * Math.sin(t) * B, y: a.y + ay * Math.cos(t) * A + ax * Math.sin(t) * B });
  const arc = (t0: number, t1: number) => { const P: Phaser.Math.Vector2[] = []; for (let i = 0; i <= 12; i++) { const q = pt(t0 + (t1 - t0) * i / 12); P.push(new Phaser.Math.Vector2(q.x, q.y)); } return P; };
  const knot = pt(0);
  if (top) g.lineStyle(10, 0xffffff, 0.95).lineBetween(top.x, top.y, knot.x, knot.y).lineStyle(5, rope, 1).lineBetween(top.x, top.y, knot.x, knot.y);
  const front = arc(0, Math.PI); g.lineStyle(10, 0xffffff, 0.95).strokePoints(front).lineStyle(5, rope, 1).strokePoints(front);
  g.fillStyle(rope, 1).lineStyle(3, 0x22252b, 1).fillCircle(knot.x, knot.y, 6).strokeCircle(knot.x, knot.y, 6);
  return knot;
}

/** little hearts from Puppy's HEAD only: they pop off the sides of his head (beside the ears) and drift out and up, never across his face or body */
export function headHearts(scene: Phaser.Scene, hp: HangPup, n = 2, depth = 41) {
  const h = hp.headPos(), r = hp.headR();
  for (let i = 0; i < n; i++) { const sd = i % 2 ? 1 : -1;
    const x0 = h.x + sd * (r.rx + 20), y0 = h.y - r.ry * 0.35;
    const hr = txt(scene, x0, y0, '♥', Phaser.Math.Between(28, 38), '#ff5c8a', '#3b1f10', 5).setDepth(depth).setAlpha(0);
    scene.tweens.add({ targets: hr, alpha: 1, duration: 120, delay: i * 170 });
    scene.tweens.add({ targets: hr, x: Phaser.Math.Clamp(x0 + sd * Phaser.Math.Between(45, 70), 30, GAME_W - 30), y: y0 - Phaser.Math.Between(10, 35), angle: sd * 20, delay: i * 170, duration: 950, ease: 'Sine.Out',
      onComplete: () => scene.tweens.add({ targets: hr, alpha: 0, duration: 200, onComplete: () => hr.destroy() }) });
  }
}

// ---------- Champion screen: the same ankle-hang rig, big, swaying gently from a rope off the top of the stage. ----------
/** One call from Champion.ts. Puppy hangs by ONE ankle from a rope at stage x `x` (ankle at `ankleY`), dizzy face, lazy sway, a couple of
 *  dizzy stars. Returns an invisible anchor Image over his head. Data on it: 'neck' () => Neck (leash collar), 'head' () => {x, y, rx, ry},
 *  'hearts' (n) => hearts off the sides of his head. Tween the anchor x/y/angle to nudge him. */
export function champHang(scene: Phaser.Scene, x: number, ankleY = 380, m = 1.3, depth = 25): Phaser.GameObjects.Image {
  const u = PUP_SCALE * m, headDrop = (HANG_ANKLE.y - HANG_HEAD.y) * u;
  const anchor = scene.add.image(x, ankleY + headDrop, '__WHITE').setDisplaySize(130 * m, 130 * m).setVisible(false).setDepth(depth);
  let hp: HangPup | null = null, t = 0, dead = false; const stars: Phaser.GameObjects.Text[] = [];
  const g = scene.add.graphics().setDepth(depth + 0.2);
  const upd = (_t: number, dms: number) => {
    if (dead || !hp) return; const dt = Math.min(dms, 50) / 1000; t += dt;
    const ox = anchor.x - x, oy = anchor.y - (ankleY + headDrop), L = ankleY + 10;
    const th = Phaser.Math.DegToRad(4 * Math.sin(t * 1.7) + anchor.angle * 0.5);
    hp.root.setPosition(x + ox + Math.sin(th) * L, -10 + oy + Math.cos(th) * L).setAngle(180 - Phaser.Math.RadToDeg(th)); hp.update(dt, 0.6, 3);
    g.clear(); drawSnare(g, hp, { x: x + ox, y: -10 });
    const h = hp.headPos(), r = hp.headR();
    stars.forEach((s, i) => { const q = t * 3 + i * Math.PI; s.setPosition(h.x + Math.cos(q) * (r.rx + 14), h.y + r.ry + 18 + Math.sin(q) * 10).setScale(0.8 + 0.2 * Math.sin(q)).setDepth(Math.sin(q) > 0 ? depth + 0.5 : depth - 0.5); });
  };
  const stop = () => { dead = true; scene.events.off('update', upd); };
  scene.events.on('update', upd); scene.events.once('shutdown', stop);
  anchor.setData('neck', () => { if (!hp) return { x: anchor.x, y: anchor.y - 60 * m }; const n = hp.world(HANG_NECK.x, HANG_NECK.y);
    return { x: n.x, y: n.y, w: 46 * u, a: Phaser.Math.RadToDeg(hp.body.getWorldTransformMatrix().rotationNormalized) }; });
  anchor.setData('head', () => { if (!hp) return { x: anchor.x, y: anchor.y, rx: 60 * m, ry: 50 * m }; return { ...hp.headPos(), ...hp.headR() }; });
  anchor.setData('hearts', (n = 2) => { if (hp) headHearts(scene, hp, n, depth + 1); });
  ensureHangArt(scene).then(() => { if (dead || !anchor.active) return;
    hp = new HangPup(scene, m).start('B', x, ankleY); hp.setDepth(depth);
    for (let i = 0; i < 2; i++) stars.push(txt(scene, 0, 0, '★', 30, '#ffdf6b', '#22252b', 4).setDepth(depth + 0.5)); }).catch(() => { /* no hang art: nothing drawn */ });
  return anchor;
}
