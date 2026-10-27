// BOX BANDIT (Noir / Pounce) art helpers: cardboard boxes, the postage stamp, the RETURN TO SENDER parcel.
// Pounce-only file (used by src/scenes/Pounce.ts). All vector Graphics, no new registry art.
import Phaser from 'phaser';
import { txt } from '../systems/fx';

export const BOX_W = 150, BOX_H = 165;
const INK = 0x2a1408, CARD = 0x8a5a2a, LITE = 0xa8743a, DARK = 0x6a3e1e, FLAP = 0x9a6a32;
const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export interface BoxGfx {
  c: Phaser.GameObjects.Container;       // front panel + flaps (origin = middle of the box's base)
  back: Phaser.GameObjects.Graphics;     // dark open top (drawn behind whoever is inside)
  shadow: Phaser.GameObjects.Image;
  flapL: Phaser.GameObjects.Graphics; flapR: Phaser.GameObjects.Graphics;
  eyes: Phaser.GameObjects.Container;    // Noir's glowing eyes in the hand-hole (only while she's ducked in this box)
  x: number;
}

/** front of the box, local coords, origin at the base centre (y up = negative) */
function drawFront(g: Phaser.GameObjects.Graphics) {
  const w = BOX_W, h = BOX_H, l = -w / 2;
  g.fillStyle(CARD, 1).lineStyle(6, INK, 1).fillRect(l, -h, w, h).strokeRect(l, -h, w, h);
  g.fillStyle(LITE, 1).fillRect(w / 2 - 34, -h + 3, 31, h - 6).fillStyle(DARK, 1).fillRect(l + 3, -h + 3, 14, h - 6);
  g.lineStyle(4, 0x5a3414, 1).lineBetween(l + 3, -h + 34, w / 2 - 3, -h + 34);            // rim crease
  g.fillStyle(INK, 1).fillRoundedRect(-32, -h / 2 - 12, 64, 22, 11);                        // hand-hole (centred: reads the same upside down)
  g.fillStyle(0xffffff, 0.12).fillRect(l + 20, -h + 40, 8, h - 50);
  // little "this side up" arrows (point down once Puppy is wearing it)
  g.fillStyle(0x3a2412, 0.8);
  for (const ax of [l + 34, l + 54]) g.fillTriangle(ax, -h + 52, ax - 8, -h + 64, ax + 8, -h + 64).fillRect(ax - 3, -h + 63, 6, 12);
}

export function makeBox(scene: Phaser.Scene, x: number, base: number, depth = 14): BoxGfx {
  const h = BOX_H, w = BOX_W;
  const shadow = scene.add.image(x, base + 4, 'pn_shadow').setDepth(7).setScale(1.05, 1.1);
  const back = scene.add.graphics({ x, y: base }).setDepth(8);
  back.fillStyle(0x24140a, 1).lineStyle(5, INK, 1).fillPoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 12, -h - 20), V(-w / 2 + 12, -h - 20)], true)
    .strokePoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 12, -h - 20), V(-w / 2 + 12, -h - 20)], true);
  back.fillStyle(0x5a3414, 1).fillRect(-w / 2 + 14, -h - 17, w - 28, 6);
  const c = scene.add.container(x, base).setDepth(depth);
  const g = scene.add.graphics(); drawFront(g);
  const flapL = scene.add.graphics({ x: -w / 2, y: -h }), flapR = scene.add.graphics({ x: w / 2, y: -h });
  flapL.fillStyle(FLAP, 1).lineStyle(5, INK, 1).fillTriangle(0, 0, -36, -30, 52, -16).strokeTriangle(0, 0, -36, -30, 52, -16);
  flapR.fillStyle(FLAP, 1).lineStyle(5, INK, 1).fillTriangle(0, 0, 38, -26, -52, -16).strokeTriangle(0, 0, 38, -26, -52, -16);
  const eyes = scene.add.container(0, -h / 2 - 1);
  for (const ex of [-13, 13]) eyes.add(scene.add.ellipse(ex, 0, 16, 11, 0xb8ff6a).setStrokeStyle(2, 0x1a0a04));
  eyes.add([scene.add.ellipse(-13, 0, 4, 9, 0x1a0a04), scene.add.ellipse(13, 0, 4, 9, 0x1a0a04)]);
  eyes.setVisible(false);
  c.add([g, eyes, flapL, flapR]);
  return { c, back, shadow, flapL, flapR, eyes, x };
}

/** move every part of a box to a new slot x */
export function placeBox(b: BoxGfx, x: number, base: number) { b.x = x; b.c.setPosition(x, base).setAngle(0); b.back.setPosition(x, base); b.shadow.setPosition(x, base + 4); }

/** scalloped postage stamp (paw-print motif) baked once as a texture */
export function ensureStampTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('bb_stamp')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false), W = 50, H = 60, r = 4.2;
  g.fillStyle(0x22252b, 0.35).fillRect(5, 6, W - 4, H - 4);
  g.fillStyle(0xfffaf0, 1).fillRect(4, 4, W - 8, H - 8);
  for (let x = 4; x <= W - 4; x += 8.4) { g.fillCircle(x, 4, r); g.fillCircle(x, H - 4, r); }
  for (let y = 4; y <= H - 4; y += 8.6) { g.fillCircle(4, y, r); g.fillCircle(W - 4, y, r); }
  g.fillStyle(0x4aa0e8, 1).lineStyle(2, 0x1d4f80, 1).fillRect(10, 10, W - 20, H - 24).strokeRect(10, 10, W - 20, H - 24);
  g.fillStyle(0xffffff, 1).fillEllipse(25, 31, 14, 11).fillCircle(17, 22, 3.6).fillCircle(22.5, 18.5, 3.6).fillCircle(28.5, 18.5, 3.6).fillCircle(33.5, 22, 3.6);
  g.fillStyle(0xd23a3a, 1).fillRect(12, H - 12, 12, 4).fillRect(27, H - 12, 12, 4);
  g.generateTexture('bb_stamp', W, H); g.destroy();
}

/** the sealed parcel for the win outro: a closed box (it is Puppy's box, upside down) with a porthole hand-hole where
 *  Puppy's eyes and stamped nose peek out. Origin = base centre. Returns the container and the peeking face (animate it). */
export function makeParcel(scene: Phaser.Scene, x: number, base: number, depth = 24) {
  const w = BOX_W, h = BOX_H, c = scene.add.container(x, base).setDepth(depth), g = scene.add.graphics();
  g.fillStyle(0xb88448, 1).lineStyle(5, INK, 1).fillPoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 14, -h - 22), V(-w / 2 + 14, -h - 22)], true)
    .strokePoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 14, -h - 22), V(-w / 2 + 14, -h - 22)], true);  // closed lid (its old bottom)
  g.lineStyle(3, 0x6a3e1e, 1).lineBetween(-w / 2 + 8, -h - 11, w / 2 - 8, -h - 11);
  drawFront(g);
  g.fillStyle(INK, 1).fillEllipse(0, -h / 2 + 8, 100, 52);                    // a bigger porthole Puppy pushed his face into
  const face = scene.add.container(0, -h / 2 + 10);
  for (const ex of [-17, 17]) face.add([scene.add.circle(ex, -6, 9, 0xffffff).setStrokeStyle(2, 0x22252b), scene.add.circle(ex + 2, -5, 5, 0x22252b)]);
  face.add(scene.add.image(0, 12, 'bb_stamp').setScale(0.5).setAngle(-8));
  c.add([g, face]);
  return { c, face };
}

/** big red RETURN TO SENDER rubber-stamp mark (container, centred) */
export function makeReturnMark(scene: Phaser.Scene, x: number, y: number) {
  const c = scene.add.container(x, y), g = scene.add.graphics();
  g.lineStyle(7, 0xd8262e, 1).strokeRoundedRect(-118, -46, 236, 92, 14).lineStyle(3, 0xd8262e, 1).strokeRoundedRect(-108, -37, 216, 74, 10);
  const t1 = txt(scene, 0, -14, 'RETURN TO', 30, '#d8262e', '#fff3e0', 3), t2 = txt(scene, 0, 18, 'SENDER', 36, '#d8262e', '#fff3e0', 3);
  c.add([g, t1, t2]); return c;
}
