// LASSO FINALE: Puppy's three "hang" gags during the 2.5 s tie-up after a catch (Pups 3).
//  A = one lasso loop on ONE hind ankle, single line up to a ceiling hook, swinging like a pendulum (sheepish wink).
//  B = the same ankle snare, slowly spinning (swirly eyes, dizzy stars come from the scene).
//  C = no tie: he hangs by his knees from the lamp's swing bar (happy grin).
// The body is the APPROVED Puppy, painted by the very same puppy.ts functions as the running pt_* frames (head/tuft/body/leg/ear,
// same viewBox units, same raster scale, same TailGfx tail at the same hip point). Nothing is scaled, stretched or redrawn:
// the hang art is the upright rig with gravity applied to the loose parts (ears, arms, free leg), and the scene turns the whole
// rig upside down. Only the face is counter-rotated (about the head centre) so it reads upright on the phone. No heart eyes.
import Phaser from 'phaser';
import { svgDoc } from './svg';
import { PUP_PARTS as P, PUP_VB, PupFace } from './puppy';
import { PUP_SCALE, TEX_RES, artScale } from './registry';
import { RES } from '../systems/resolution';
import { TailGfx } from '../systems/tailRigs';
import { txt } from '../systems/fx';
import { GAME_W } from '../config';

export type HangKind = 'A' | 'B' | 'C';
/** padded viewBox: puppy.ts art unit (x, y) sits at (x + dx, y + dy) (room for the flopped ears) */
export const HANG_VB = { w: 280, h: 340, dx: 40, dy: 80 };
const FEET = { x: PUP_VB.w / 2, y: PUP_VB.feetY };      // same anchor as the pt_* frames (origin 0.5, feetY/h)
export const HANG_ANKLE = { x: 115, y: 226 };            // snared hind paw (the front hind leg, x 113), just above the toes
export const HANG_KNEE = { x: 98.5, y: 222 };            // C: where the bar crosses both hind legs
export const HANG_HEAD = { x: 100, y: 94 };              // head centre (HX, HY in puppy.ts)
const HANG_K = 0.78 * TEX_RES * 1.35 * Math.max(0.6, Math.min(1, RES / 2)); // raster px per art unit (same budget as pt_*)

interface HangPose { face: { eyes: PupFace; brows: PupFace; mouth: PupFace; sweat?: boolean }; arm: number; legBack: number; legFront: number; earL: number; earR: number }
const POSES: Record<HangKind, HangPose> = {
  // A: snared front hind leg straight (it points UP to the rope once flipped), free hind leg flops out sideways, paws dangle by his cheeks
  A: { face: { eyes: 'taunt', brows: 'normal', mouth: 'happy', sweat: true }, arm: 145, legBack: 42, legFront: 0, earL: 34, earR: 28 },
  // B: same snare, spinning: paws and ears flung out a little by the twirl, swirly eyes + wobbly mouth (puppy.ts 'dizzy')
  B: { face: { eyes: 'dizzy', brows: 'dizzy', mouth: 'dizzy' }, arm: 128, legBack: 55, legFront: 0, earL: 52, earR: 46 },
  // C: both hind legs up to the bar (knees hooked over it), paws dangle, closed-eye grin (puppy.ts Acorn 'happy')
  C: { face: { eyes: 'happy', brows: 'happy', mouth: 'happy' }, arm: 148, legBack: -5, legFront: 5, earL: 30, earR: 30 },
};

/** an arm: the exact back-arm capsule of puppySVG (23 x 34, pivot 62,156), mirrored for the front one */
const arm = (x: number, rot: number, fill: string) => `<g transform="rotate(${rot} ${x} 156)"><rect x="${x - 12}" y="150" width="23" height="34" rx="11.5" fill="${fill}" stroke="${P.OUT}" stroke-width="${P.SW}"/></g>`;

export function hangSVG(kind: HangKind, k: number): string {
  const p = POSES[kind], f = p.face;
  let s = `<g transform="translate(${HANG_VB.dx} ${HANG_VB.dy})">`;
  s += P.leg(84, p.legBack, 0, '#a85d24');
  s += P.body(0);
  s += P.leg(113, p.legFront, 0, '#c27230');
  s += P.topTuft(0) + P.head(0);
  s += arm(62, p.arm, 'url(#furDark)') + arm(138, -p.arm, 'url(#fur)');   // paws dangle beside his cheeks (over the head edge, clear of the face)
  // face: same painters and order as puppySVG, turned 180 about the head centre so it reads upright once the rig is flipped
  s += `<g transform="rotate(180 ${HANG_HEAD.x} ${HANG_HEAD.y})">`;
  s += `<ellipse cx="100" cy="118" rx="30" ry="20" fill="url(#glow)"/>`;
  s += `<ellipse cx="58" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="${f.sweat ? 1 : 0.8}"/><ellipse cx="142" cy="122" rx="13" ry="8" fill="url(#blush)" opacity="${f.sweat ? 1 : 0.8}"/>`;
  s += P.brows(f.brows) + P.eyes(f.eyes);
  s += `<path d="M91 112 Q100 106 109 112 Q108 120 100 121 Q92 120 91 112 Z" fill="#24130b"/><ellipse cx="97" cy="112" rx="2.6" ry="1.5" fill="#fff" opacity="0.7"/>`;
  s += P.mouth(f.mouth);
  if (f.sweat) s += `<path d="M160 58 q-7 12 0 16 q7 -4 0 -16 Z" fill="#7fd4ff" stroke="${P.OUT}" stroke-width="2.6"/>`; // one sheepish sweat drop
  s += `</g>`;
  s += P.ear('L', p.earL, 0) + P.ear('R', p.earR, 0);                     // ears flop toward local-up = DOWN once flipped
  s += `</g>`;
  return svgDoc(HANG_VB.w, HANG_VB.h, HANG_VB.w * k, HANG_VB.h * k, s, P.DEFS);
}

/** rasterise ph_A / ph_B / ph_C once (on demand, when Lasso opens) */
export async function ensureHangArt(scene: Phaser.Scene): Promise<void> {
  for (const kind of ['A', 'B', 'C'] as HangKind[]) {
    const key = 'ph_' + kind; if (scene.textures.exists(key)) continue;
    await new Promise<void>(res => { const img = new Image(); const done = () => { img.onload = img.onerror = null; res(); };
      img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d')!.drawImage(img, 0, 0);
        if (!scene.textures.exists(key)) scene.textures.addCanvas(key, c); } catch (e) { console.warn('hang art failed', key, e); } done(); };
      img.onerror = () => { console.warn('hang art failed', key); done(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(hangSVG(kind, HANG_K)); });
  }
}

/** The hang rig: root (pivot, world) > rig (upright Puppy, feet at its origin, exactly like TailPup.inner) > [TailGfx tail, body image, tail cap]. */
export class HangPup {
  root: Phaser.GameObjects.Container; rig: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image; tail: TailGfx; kind: HangKind = 'A';
  private u: number; private t = 0;
  constructor(private scene: Phaser.Scene, private m = 1) {
    this.u = PUP_SCALE * m;
    this.root = scene.add.container(0, 0).setVisible(false); this.rig = scene.add.container(0, 0);
    this.tail = new TailGfx(scene, -36 * this.u, -40 * this.u, this.u); // TailPup.tailBase()
    this.img = scene.add.image(0, 0, '__DEFAULT');
    this.rig.add([this.tail, this.img, this.tail.cap]); this.root.add(this.rig);
  }
  /** art unit -> rig local (feet origin, upright) */
  loc(ax: number, ay: number) { return { x: (ax - FEET.x) * this.u, y: (ay - FEET.y) * this.u }; }
  /** show hang pose `kind`, upside down, its pivot (snared ankle or knees) at world (x, y) */
  start(kind: HangKind, x: number, y: number) {
    this.kind = kind; this.t = 0;
    this.img.setTexture('ph_' + kind).setOrigin((FEET.x + HANG_VB.dx) / HANG_VB.w, (FEET.y + HANG_VB.dy) / HANG_VB.h).setScale(this.u / HANG_K);
    const q = this.pivotArt(); const l = this.loc(q.x, q.y);
    this.rig.setScale(1, 1).setPosition(-l.x, -l.y); this.root.setPosition(x, y).setAngle(180).setVisible(true);
    this.tail.st.to = null; this.tail.st.stretch = 1; this.tailDown(true); this.tail.redraw();
    return this;
  }
  pivotArt() { return this.kind === 'C' ? HANG_KNEE : HANG_ANKLE; }
  /** move the rotation pivot to art point (ax, ay) without moving anything on screen */
  pivotTo(ax: number, ay: number) {
    const l = this.loc(ax, ay), w = this.rig.getWorldTransformMatrix().transformPoint(l.x, l.y);
    this.rig.setPosition(-l.x * this.rig.scaleX, -l.y * this.rig.scaleY); this.root.setPosition(w.x, w.y); return this;
  }
  /** swap in the regular standing frame (same origin + scale as TailPup's body): used as he lands upright */
  /** upside down, the tail is swung round on its base so it droops toward the floor (down and out) instead of pointing at the ceiling */
  tailDown(on: boolean) { this.tail.setAngle(on ? 35 : 0); return this; }
  upright() { this.tailDown(false); this.img.setTexture('pt_stand').setOrigin(0.5, PUP_VB.feetY / PUP_VB.h).setScale(artScale('pt_stand', this.m)); return this; }
  world(ax: number, ay: number) { const l = this.loc(ax, ay), w = this.rig.getWorldTransformMatrix().transformPoint(l.x, l.y); return { x: w.x, y: w.y }; }
  head() { return this.world(HANG_HEAD.x, HANG_HEAD.y); }
  /** tail: wag BENDS it (same draw fn as the running rig); upside down it already droops with gravity */
  update(dt: number, wag = 1, spd = 6) { this.t += dt; this.tail.st.wag = Math.sin(this.t * spd) * wag; this.tail.redraw(); }
  hide() { this.root.setVisible(false); return this; }
}

// ---------- Champion screen (Marc, 27 Oct): the same ankle-hang rig, big, swaying gently from a rope off the top of the stage. ----------
/** One call from Champion.ts. Puppy hangs by ONE ankle from a rope at stage x `x` (ankle at `ankleY`), upside down, dizzy face (pose B
 *  art, no spin), lazy sway, a couple of dizzy stars, hearts only from his HEAD (they burst sideways/down, away from his body).
 *  Returns an invisible anchor Image over his head: other code can read its bounds (head spot) or tween its x/y/angle (a nudge). */
export function champHang(scene: Phaser.Scene, x: number, ankleY = 380, m = 1.3, depth = 25): Phaser.GameObjects.Image {
  const u = PUP_SCALE * m, headDrop = (HANG_ANKLE.y - HANG_HEAD.y) * u;
  const anchor = scene.add.image(x, ankleY + headDrop, '__WHITE').setDisplaySize(130 * m, 130 * m).setVisible(false).setDepth(depth);
  let hp: HangPup | null = null, t = 0, ht = 0.3, dead = false; const stars: Phaser.GameObjects.Text[] = [];
  const g = scene.add.graphics().setDepth(depth - 0.1);
  const upd = (_t: number, dms: number) => {
    if (dead || !hp) return; const dt = Math.min(dms, 50) / 1000; t += dt;
    const ox = anchor.x - x, oy = anchor.y - (ankleY + headDrop), L = ankleY + 10;          // rope from just above the stage top
    const th = Phaser.Math.DegToRad(4 * Math.sin(t * 1.7) + anchor.angle * 0.5);              // gentle sway (+ any nudge on the anchor)
    const ax = x + ox + Math.sin(th) * L, ay = -10 + oy + Math.cos(th) * L;
    hp.root.setPosition(ax, ay).setAngle(180 - Phaser.Math.RadToDeg(th)); hp.update(dt, 0.6, 3);
    const a = hp.world(HANG_ANKLE.x, HANG_ANKLE.y), h = hp.head();
    g.clear().lineStyle(10, 0xffffff, 0.95).lineBetween(x + ox, -10, a.x, a.y).lineStyle(5, 0x8a5a2a, 1).lineBetween(x + ox, -10, a.x, a.y)
      .lineStyle(10, 0xffffff, 0.95).strokeEllipse(a.x, a.y + 3, 34, 14).lineStyle(5, 0x8a5a2a, 1).strokeEllipse(a.x, a.y + 3, 34, 14);
    stars.forEach((s, i) => { const q = t * 3 + i * Math.PI; s.setPosition(h.x + Math.cos(q) * 82 * u, h.y + 84 * u + Math.sin(q) * 12 * u).setScale(0.8 + 0.2 * Math.sin(q)); });
    if ((ht -= dt) <= 0) { ht = 0.8; for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1;                       // hearts from his HEAD only
      const hr = txt(scene, h.x + sd * 48 * u, h.y + 30 * u, '♥', 34, '#ff5c8a', '#3b1f10', 5).setDepth(depth + 1).setAlpha(0);
      scene.tweens.add({ targets: hr, alpha: 1, duration: 120, delay: i * 180 });
      scene.tweens.add({ targets: hr, x: Phaser.Math.Clamp(hr.x + sd * 60, 34, GAME_W - 34), y: hr.y + 40, angle: sd * 20, delay: i * 180, duration: 1000, ease: 'Sine.Out', onComplete: () => scene.tweens.add({ targets: hr, alpha: 0, duration: 200, onComplete: () => hr.destroy() }) }); } }
  };
  const stop = () => { dead = true; scene.events.off('update', upd); };
  scene.events.on('update', upd); scene.events.once('shutdown', stop);
  ensureHangArt(scene).then(() => { if (dead || !anchor.active) return;
    hp = new HangPup(scene, m).start('B', x, ankleY); hp.root.setDepth(depth);
    for (let i = 0; i < 2; i++) stars.push(txt(scene, 0, 0, '★', 30, '#ffdf6b', '#22252b', 4).setDepth(depth + 0.5)); }).catch(() => { /* no hang art: nothing drawn */ });
  return anchor;
}
