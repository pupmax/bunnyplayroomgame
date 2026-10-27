// BOX BANDIT (Noir / Pounce) art helpers: cardboard boxes, the postage stamp, the RETURN TO SENDER parcel, the catch
// payoff props (packing tape, FRAGILE / THIS SIDE UP / SHIPPING stickers, gift wrap + bow, conveyor belt, box hat) and
// the 3-step picture tutorial card. Pounce-only file (used by src/scenes/Pounce.ts). All vector Graphics, no new registry art.
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { txt, comic } from '../systems/fx';
import { art } from '../art/registry';
import { Storage } from '../systems/storage';

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

// ============================================================== catch payoff props (all local to a box container: origin = base centre)
const TAPE = 0xe9cf8e, TAPE_D = 0xb8954a;
/** the two top flaps folded shut (drawn over the open top) */
export function sealLid(scene: Phaser.Scene, col = FLAP) {
  const w = BOX_W, h = BOX_H, g = scene.add.graphics();
  g.fillStyle(col, 1).lineStyle(5, INK, 1).fillPoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 12, -h - 20), V(-w / 2 + 12, -h - 20)], true)
    .strokePoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 12, -h - 20), V(-w / 2 + 12, -h - 20)], true);
  g.lineStyle(3, INK, 0.7).lineBetween(0, -h - 19, 0, -h - 1);
  return g;
}
/** a strip of packing tape, drawn from (0,0) along +x (horizontal) or +y (vertical); scale the long axis from 0 to "pull" it */
export function tapeStrip(scene: Phaser.Scene, len: number, vertical = false, thick = 22) {
  const g = scene.add.graphics(), W_ = vertical ? thick : len, H_ = vertical ? len : thick, ox = vertical ? -thick / 2 : 0, oy = vertical ? 0 : -thick / 2;
  g.fillStyle(TAPE, 0.96).fillRect(ox, oy, W_, H_).lineStyle(2, TAPE_D, 1).strokeRect(ox, oy, W_, H_);
  g.fillStyle(0xffffff, 0.35).fillRect(ox + 3, oy + 3, vertical ? 5 : W_ - 6, vertical ? H_ - 6 : 5);
  // zig-zag torn end
  g.fillStyle(TAPE, 0.96);
  if (vertical) for (let x = ox; x < ox + thick; x += 6) g.fillTriangle(x, oy + H_, x + 6, oy + H_, x + 3, oy + H_ + 6);
  else for (let y = oy; y < oy + thick; y += 6) g.fillTriangle(ox + W_, y, ox + W_, y + 6, ox + W_ + 6, y + 3);
  return g;
}
/** sticker labels: FRAGILE (red), THIS SIDE UP (arrows), SHIPPING (white address label + barcode) */
export function sticker(scene: Phaser.Scene, kind: 'fragile' | 'up' | 'ship') {
  const c = scene.add.container(0, 0), g = scene.add.graphics(); c.add(g);
  if (kind === 'fragile') {
    g.fillStyle(0x22252b, 0.3).fillRoundedRect(-58, -18, 120, 40, 8).fillStyle(0xe0333c, 1).lineStyle(3, 0x7a0a12, 1).fillRoundedRect(-60, -20, 120, 40, 8).strokeRoundedRect(-60, -20, 120, 40, 8);
    c.add(txt(scene, 0, 0, 'FRAGILE', 24, '#ffffff', '#7a0a12', 3));
  } else if (kind === 'up') {
    g.fillStyle(0x22252b, 0.3).fillRoundedRect(-46, -30, 96, 64, 8).fillStyle(0xfff8e6, 1).lineStyle(3, 0x22252b, 1).fillRoundedRect(-48, -32, 96, 64, 8).strokeRoundedRect(-48, -32, 96, 64, 8);
    g.fillStyle(0x22252b, 1); for (const ax of [-24, 0, 24]) g.fillTriangle(ax, -26, ax - 9, -13, ax + 9, -13).fillRect(ax - 3, -14, 6, 12);
    c.add(txt(scene, 0, 14, 'THIS SIDE UP', 13, '#22252b', '#fff8e6', 0));
  } else {
    g.fillStyle(0x22252b, 0.3).fillRoundedRect(-62, -40, 128, 84, 6).fillStyle(0xffffff, 1).lineStyle(3, 0x22252b, 1).fillRoundedRect(-64, -42, 128, 84, 6).strokeRoundedRect(-64, -42, 128, 84, 6);
    g.fillStyle(0x2f6fd0, 1).fillRect(-64, -42, 128, 26);
    g.fillStyle(0x22252b, 1); for (let i = 0; i < 22; i++) { const bw = i % 3 === 0 ? 3 : 1.6; g.fillRect(-52 + i * 4.6, 18, bw, 18); }
    c.add([txt(scene, 0, -29, 'SHIPPING', 19, '#ffffff', '#123a7a', 3), txt(scene, 0, 2, 'TO: FAR AWAY', 13, '#22252b', '#ffffff', 0)]);
  }
  return c;
}
/** gift-wrap front panel (pink, polka dots). Grows up from the base (scaleY). The lid is a separate sealLid(scene, 0xff8fbd). */
export function giftWrap(scene: Phaser.Scene) {
  const w = BOX_W + 8, h = BOX_H + 4, g = scene.add.graphics();
  g.fillStyle(0xff6fa8, 1).lineStyle(5, 0x7a1a44, 1).fillRect(-w / 2, -h, w, h).strokeRect(-w / 2, -h, w, h);
  g.fillStyle(0xffffff, 0.85); for (let y = -h + 16; y < -6; y += 30) for (let x = -w / 2 + 14 + ((y / 30) & 1) * 15; x < w / 2 - 6; x += 30) g.fillCircle(x, y, 5);
  return g;
}
export function giftRibbon(scene: Phaser.Scene) {
  const w = BOX_W + 8, h = BOX_H + 4, g = scene.add.graphics();
  g.fillStyle(0xffd23a, 1).lineStyle(3, 0x9a6a00, 1).fillRect(-12, -h - 21, 24, h + 21).strokeRect(-12, -h - 21, 24, h + 21);
  g.fillRect(-w / 2, -h * 0.55 - 11, w, 22).strokeRect(-w / 2, -h * 0.55 - 11, w, 22);
  return g;
}
/** big floppy bow (origin = knot, sits on the lid) */
export function giftBow(scene: Phaser.Scene) {
  const c = scene.add.container(0, 0), g = scene.add.graphics(); c.add(g);
  g.fillStyle(0xffd23a, 1).lineStyle(4, 0x9a6a00, 1);
  g.fillTriangle(-6, 0, -40, 34, -22, 38).strokeTriangle(-6, 0, -40, 34, -22, 38).fillTriangle(6, 0, 40, 34, 22, 38).strokeTriangle(6, 0, 40, 34, 22, 38); // tails
  for (const sx of [-1, 1]) { g.save(); g.translateCanvas(sx * 34, -18); g.rotateCanvas(sx * -0.35); g.fillEllipse(0, 0, 70, 46).strokeEllipse(0, 0, 70, 46); g.fillStyle(0xe6a800, 1).fillEllipse(sx * -10, 2, 26, 16).fillStyle(0xffd23a, 1); g.restore(); }
  g.fillStyle(0xffe27a, 1).fillCircle(0, -10, 16).strokeCircle(0, -10, 16);
  return c;
}
/** a little conveyor belt from x0 to x1 (world) along the floor; returns the graphics + a redraw(t) for rolling rollers */
export function conveyor(scene: Phaser.Scene, x0: number, x1: number, floorY: number, depth = 6) {
  const g = scene.add.graphics().setDepth(depth), l = Math.min(x0, x1), r = Math.max(x0, x1);
  const redraw = (t: number) => {
    g.clear().fillStyle(0x22252b, 0.35).fillRoundedRect(l - 10, floorY + 2, r - l + 20, 34, 17);
    g.fillStyle(0x4a4e5a, 1).lineStyle(5, 0x22252b, 1).fillRoundedRect(l - 14, floorY - 14, r - l + 28, 32, 16).strokeRoundedRect(l - 14, floorY - 14, r - l + 28, 32, 16);
    g.fillStyle(0xffd23a, 1); const step = 34, off = ((t * 220) % step + step) % step * Math.sign(x1 - x0 || 1);
    for (let x = l - step + off; x < r + step; x += step) if (x > l - 4 && x < r + 4) g.fillRect(x - 3, floorY - 11, 6, 7);
    g.fillStyle(0x8a8f9c, 1).lineStyle(3, 0x22252b, 1); for (let x = l + 6; x < r; x += 46) g.fillCircle(x, floorY + 6, 7).strokeCircle(x, floorY + 6, 7);
  };
  redraw(0); return { g, redraw };
}
/** a small cardboard box worn as a hat (upside down, opening on his head); origin = bottom centre */
export function boxHat(scene: Phaser.Scene, s = 0.42) {
  const c = scene.add.container(0, 0), g = scene.add.graphics(); drawFront(g); g.setScale(s, -s); g.y = -BOX_H * s; c.add(g); return c;
}
/** mini boxes for the avalanche pile: a front panel + closed lid, origin = base centre */
export function miniBox(scene: Phaser.Scene, s = 0.6, depth = 26) {
  const c = scene.add.container(0, 0).setDepth(depth), g = scene.add.graphics(); drawFront(g);
  g.fillStyle(FLAP, 1).lineStyle(5, INK, 1).fillPoints([V(-BOX_W / 2, -BOX_H), V(BOX_W / 2, -BOX_H), V(BOX_W / 2 - 12, -BOX_H - 18), V(-BOX_W / 2 + 12, -BOX_H - 18)], true)
    .strokePoints([V(-BOX_W / 2, -BOX_H), V(BOX_W / 2, -BOX_H), V(BOX_W / 2 - 12, -BOX_H - 18), V(-BOX_W / 2 + 12, -BOX_H - 18)], true);
  c.add(g).setScale(s); return c;
}
/** big animated pointing hand. down = finger points DOWN (fingertip at 0,0, hand above it) */
export function makeTapHand(scene: Phaser.Scene, x: number, y: number, ms: number, down = false) {
  const c = scene.add.container(x, y), g = scene.add.graphics(), k = 0x22252b;
  g.fillStyle(0xffffff, 1).lineStyle(5, k, 1);
  g.fillRoundedRect(-13, 0, 26, 74, 13).strokeRoundedRect(-13, 0, 26, 74, 13); g.fillRoundedRect(-34, 52, 74, 76, 26).strokeRoundedRect(-34, 52, 74, 76, 26);
  g.fillRoundedRect(-50, 66, 30, 44, 14).strokeRoundedRect(-50, 66, 30, 44, 14); g.lineStyle(4, k, 0.6).lineBetween(-8, 82, -8, 100).lineBetween(10, 80, 10, 100).lineBetween(26, 80, 26, 98);
  if (down) g.setAngle(180);
  const ring = scene.add.circle(0, 0, 18).setStrokeStyle(6, 0xfff27a); c.add([ring, g]);
  scene.tweens.add({ targets: g, y: down ? -16 : 16, scale: 0.94, duration: ms * 0.45, yoyo: true, repeat: -1, ease: 'Sine.InOut', onYoyo: () => { ring.setScale(0.6).setAlpha(1); scene.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: ms * 1.6 }); } });
  return c;
}
/** "zip-zip" packing-tape sound out of the shared Fx kit (no new audio code): a whoosh + a creak, twice */
export function zipZip(Fx: { whoosh: () => void; creak: () => void }, scene: Phaser.Scene) {
  Fx.whoosh(); Fx.creak(); scene.time.delayedCall(140, () => { Fx.whoosh(); });
}

// ============================================================== the 3-step picture tutorial (same contract as kit.tutorialCard)
/** mini box drawn into a container at (x, base) with scale s; returns back + front so things can sit between them */
function tutBox(scene: Phaser.Scene, x: number, base: number, s: number) {
  const back = scene.add.graphics({ x, y: base }).setScale(s), front = scene.add.graphics({ x, y: base }).setScale(s), w = BOX_W, h = BOX_H;
  back.fillStyle(0x24140a, 1).lineStyle(5, INK, 1).fillPoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 12, -h - 20), V(-w / 2 + 12, -h - 20)], true)
    .strokePoints([V(-w / 2, -h), V(w / 2, -h), V(w / 2 - 12, -h - 20), V(-w / 2 + 12, -h - 20)], true);
  drawFront(front); return { back, front };
}
function chip(scene: Phaser.Scene, x: number, y: number, label: string, col: number, w = 230) {
  const c = scene.add.container(x, y), g = scene.add.graphics();
  g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2, -34, w, 74, 20).fillStyle(col, 1).lineStyle(5, 0x22252b, 1).fillRoundedRect(-w / 2, -40, w, 74, 20).strokeRoundedRect(-w / 2, -40, w, 74, 20)
    .fillStyle(0xffffff, 0.25).fillRoundedRect(-w / 2 + 10, -34, w - 20, 20, 10);
  c.add([g, txt(scene, 0, -4, label, label.length > 9 ? 30 : 36, '#ffffff', '#22252b', 6)]); return c;
}
/** Step pictures. Each returns a container centred on (0,0), roughly 250 x 200. */
function tutPic(scene: Phaser.Scene, n: number) {
  const c = scene.add.container(0, 0), ground = 78;
  const flo = scene.add.graphics(); flo.fillStyle(0x6a3e1e, 1).fillRoundedRect(-125, ground - 4, 250, 22, 10); c.add(flo);
  if (n === 1) { // Noir's box (eyes glowing) / Puppy running the other way / "meow?" from the WRONG box
    const a = tutBox(scene, -80, ground, 0.5), b = tutBox(scene, 78, ground, 0.5);
    const eyes = scene.add.container(-80, ground - BOX_H * 0.25); for (const ex of [-7, 7]) eyes.add([scene.add.ellipse(ex, 0, 10, 7, 0xb8ff6a).setStrokeStyle(1.5, 0x1a0a04), scene.add.ellipse(ex, 0, 3, 6, 0x1a0a04)]);
    const pup = art(scene, 8, ground + 2, 'pt_run2', 0.42);
    const lines = scene.add.graphics().lineStyle(4, 0xffffff, 0.9).lineBetween(-46, ground - 60, -26, ground - 60).lineBetween(-50, ground - 44, -30, ground - 44);
    const bub = comic(scene, 82, -58, 'meow?', 30, '#ffffff', '#d9c2ff', '#2a1a4a').setAngle(-8);
    const arrow = scene.add.graphics().fillStyle(0x7dff9a, 1).lineStyle(3, 0x22252b, 1); arrow.fillTriangle(30, ground - 128, 30, ground - 100, 54, ground - 114).strokeTriangle(30, ground - 128, 30, ground - 100, 54, ground - 114).fillRect(-6, ground - 120, 37, 12);
    c.add([a.back, a.front, eyes, b.back, b.front, lines, pup, arrow, bub]);
  } else if (n === 2) { // Puppy head-first in a box (butt + tail up), Noir pouncing in from the left: BOO-X!
    const b = tutBox(scene, 62, ground, 0.55);
    const pup = art(scene, 62, ground - BOX_H * 0.55 - 34, 'pt_stand', 0.42).setAngle(180);
    const tail = scene.add.graphics().lineStyle(10, 0xd99a3a, 1); tail.beginPath(); tail.moveTo(52, ground - BOX_H * 0.55 - 70); tail.lineTo(40, ground - BOX_H * 0.55 - 100); tail.lineTo(52, ground - BOX_H * 0.55 - 122); tail.strokePath();
    const trail = scene.add.graphics().lineStyle(5, 0xffffff, 0.7); trail.beginPath(); trail.arc(-20, 30, 90, Math.PI * 1.05, Math.PI * 1.55); trail.strokePath();
    const noir = art(scene, -58, -36, 'head_Noir_smug', 1); noir.setDisplaySize(96, 96 * (noir.height / Math.max(1, noir.width)));
    const boo = comic(scene, 20, -86, 'BOO-X!', 32).setAngle(-6);
    c.add([b.back, pup, tail, b.front, trail, noir, boo]);
  } else { // the tug: Noir holds his tail, Puppy pulls, the meter fills as you TAP
    const pup = art(scene, 70, ground + 2, 'pt_run3', 0.42);
    const noir = art(scene, -78, ground - 70, 'head_Noir_smug', 1); noir.setDisplaySize(86, 86 * (noir.height / Math.max(1, noir.width)));
    const tail = scene.add.graphics().lineStyle(10, 0xd99a3a, 1); tail.beginPath(); tail.moveTo(36, ground - 44); tail.lineTo(-4, ground - 52); tail.lineTo(-38, ground - 48); tail.strokePath();
    const m = scene.add.graphics(); m.fillStyle(0x22252b, 0.85).fillRoundedRect(-110, -86, 220, 30, 15).fillStyle(0x7dff9a, 1).fillRoundedRect(-106, -82, 150, 22, 11).lineStyle(4, 0xffffff, 1).strokeRoundedRect(-110, -86, 220, 30, 15);
    const tt = comic(scene, 0, -30, 'TAP TAP TAP!', 26).setAngle(-4);
    c.add([tail, pup, noir, m, tt]);
  }
  return c;
}
export const TUT_ID = 'noir3';
export const TUT_STEPS: { chip: string; col: number; text: string }[] = [
  { chip: 'MEOW?', col: 0x6b4cc9, text: 'Puppy heads for YOUR box?\nMEOW = he runs to another!' },
  { chip: 'POUNCE!', col: 0x2fbf5a, text: 'His head is in the wrong box?\nPOUNCE = BOO-X!' },
  { chip: 'TAP TAP TAP!', col: 0xffb02e, text: 'Win the tug. Then watch\nwhat Noir does with him!' },
];
/** How-to-play card with 3 picture steps. Same behaviour as kit.tutorialCard: shown once per id, ignores taps for 600 ms
 *  (real time), the closing tap is swallowed (+250 ms shield), sets __tutorialOpen / __tutorialShownAt / __tutorialClosedAt.
 *  The steps light up one after another (window.__bbTut.set(n) pins one, for screenshots). */
export function pictureTutorial(scene: Phaser.Scene, goal: string, done: () => void) {
  if (Storage.getTutorialSeen(TUT_ID)) { done(); return; }
  const W = GAME_W, H = GAME_H, W_ = window as any; W_.__tutorialOpen = true;
  const c = scene.add.container(0, 0).setDepth(950);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
  const top = 150, bot = 1140, g = scene.add.graphics();
  g.fillStyle(0xfff3e0, 1).lineStyle(6, 0x22252b, 1).fillRoundedRect(40, top, W - 80, bot - top, 34).strokeRoundedRect(40, top, W - 80, bot - top, 34);
  const title = txt(scene, W / 2, top + 52, 'BOX BANDIT!', 50, '#ff5c8a', '#22252b', 7);
  const goalT = txt(scene, W / 2, top + 132, goal, 32, '#6b4cc9', '#fff3e0', 0).setWordWrapWidth(580);
  c.add([dim, g, title, goalT]);
  const rows: { panel: Phaser.GameObjects.Graphics; pic: Phaser.GameObjects.Container; chip: Phaser.GameObjects.Container; num: Phaser.GameObjects.Container; y: number }[] = [];
  TUT_STEPS.forEach((st, i) => {
    const y = top + 330 + i * 240, panel = scene.add.graphics();
    const num = scene.add.container(86, y - 82, [scene.add.circle(0, 0, 26, 0x22252b), txt(scene, 0, 0, String(i + 1), 34, '#fff27a', '#22252b', 0)]);
    const pic = tutPic(scene, i + 1); pic.setPosition(205, y + 4);
    const ch = chip(scene, 500, y - 46, st.chip, st.col);
    const tx = txt(scene, 500, y + 56, st.text, 24, '#22252b', '#fff3e0', 0).setLineSpacing(4);
    c.add([panel, pic, num, ch, tx]); rows.push({ panel, pic, chip: ch, num, y });
  });
  const hand = makeTapHand(scene, 0, 0, 520); hand.setScale(0.62); c.add(hand);
  let cur = -1;
  const light = (n: number) => { cur = n; rows.forEach((r, i) => { const on = i === n;
    r.panel.clear().fillStyle(on ? 0xffe2a8 : 0xf6e6cc, 1).lineStyle(on ? 6 : 3, on ? 0xff5c8a : 0xd8c2a0, 1).fillRoundedRect(62, r.y - 112, W - 124, 224, 26).strokeRoundedRect(62, r.y - 112, W - 124, 224, 26);
    r.chip.setScale(on ? 1.06 : 0.94); r.pic.setScale(on ? 1.04 : 0.96).setAlpha(on ? 1 : 0.75); });
    const r = rows[n]; hand.setPosition(634, r.y - 50); };
  light(0); W_.__bbTut = { set: (n: number) => light(n), get: () => cur };
  const cyc = scene.time.addEvent({ delay: 1500, loop: true, callback: () => { if (!W_.__bbTutPin) light((cur + 1) % 3); } });
  const hint = txt(scene, W / 2, bot - 46, 'Tap anywhere to start', 36, '#ff5c8a', '#22252b', 6).setAlpha(0.35); c.add(hint);
  let shownAt = 0, lit = false, closed = false; W_.__tutorialShownAt = 0; W_.__tutorialClosedAt = 0;
  const onUpd = () => {
    if (!shownAt) { shownAt = performance.now(); W_.__tutorialShownAt = shownAt; return; }
    if (!lit && c.active && performance.now() - shownAt >= 600) { lit = true; hint.setAlpha(1); scene.tweens.add({ targets: hint, alpha: 0.55, scale: 0.96, yoyo: true, repeat: -1, duration: 600 }); }
    if (lit || !c.active) scene.events.off(Phaser.Scenes.Events.POST_UPDATE, onUpd);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, onUpd);
  c.once('destroy', () => { scene.events.off(Phaser.Scenes.Events.POST_UPDATE, onUpd); cyc.remove(); });
  dim.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    if (closed || !shownAt || performance.now() - shownAt < 600) return;
    closed = true; W_.__tutorialClosedAt = performance.now(); Storage.setTutorialSeen(TUT_ID); W_.__tutorialOpen = false;
    const all: Phaser.GameObjects.GameObject[] = []; const walk = (o: any) => { all.push(o); if (o.list) o.list.forEach(walk); }; walk(c); scene.tweens.killTweensOf(all);
    c.destroy();
    const eat = (_p: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => e?.stopPropagation?.();
    const shield = scene.add.zone(0, 0, W, H).setOrigin(0).setDepth(2000).setInteractive().on('pointerdown', eat).on('pointerup', eat);
    scene.time.delayedCall(250, () => shield.destroy());
    scene.time.delayedCall(0, done);
  });
}
