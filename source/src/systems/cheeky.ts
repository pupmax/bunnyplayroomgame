// Cheeky pass (27 Oct): small cute couple touches for the end cards and the scenes between games.
// Hearts only ever float up from PUPPY's head (never from Bunny). Bunny is the smug little schemer: winks, a 'hehe~' grin and a
// leash/rope tug on her captive; now and then (about 1 in 5) she sneaks him a smug kiss instead (bunTease picks).
import Phaser from 'phaser';
import { txt, comic } from './fx';

type Pt = { x: number; y: number };
/** Bunny's end of the leash: her paw centre (r = paw radius; arm = her shoulder when the art has no arm there, e.g. the card bust) */
export type Hold = Pt & { r?: number; arm?: Pt };
/** Puppy's end: his neck centre (between head and torso), w = neck width, a = rotation of his UPRIGHT art (deg; local +y = toward his torso) */
export type Neck = Pt & { w?: number; a?: number };
/** world point at a fraction (fx, fy) of an image's frame: follows its position, origin, scale, flip, angle and parent containers every frame */
export function ptOn(img: Phaser.GameObjects.Image, fx: number, fy: number): Pt {
  const w = img.frame.realWidth, h = img.frame.realHeight;
  const p = img.getWorldTransformMatrix().transformPoint(fx * w - img.displayOriginX, fy * h - img.displayOriginY);
  return { x: p.x, y: p.y };
}
/** total world rotation (deg) of an image incl. parents */
export function angOf(img: Phaser.GameObjects.Image): number { return Phaser.Math.RadToDeg(img.getWorldTransformMatrix().rotationNormalized); }
/** Puppy's neck on a standard 200x244 Puppy frame (pup_*, pt_*, pa_*): just under his chin, where head meets torso */
export function pupNeck(img: Phaser.GameObjects.Image): Neck {
  const p = ptOn(img, 0.5, 0.615); return { x: p.x, y: p.y, w: img.displayWidth * 0.36, a: angOf(img) };
}
/** a few little hearts float up from (x, y), Puppy's head */
export function pupHearts(scene: Phaser.Scene, x: number, y: number, n = 3, depth = 965, into?: Phaser.GameObjects.Container) {
  for (let i = 0; i < n; i++) {
    const h = txt(scene, x + Phaser.Math.Between(-34, 34), y, '♥', Phaser.Math.Between(26, 38), '#ff5c8a', '#3b1f10', 5).setDepth(depth).setAlpha(0);
    into?.add(h);
    scene.tweens.add({ targets: h, alpha: 1, duration: 120, delay: i * 150 });
    scene.tweens.add({ targets: h, y: y - 80 - Math.random() * 40, x: h.x + Phaser.Math.Between(-26, 26), angle: Phaser.Math.Between(-25, 25), delay: i * 150, duration: 1000, ease: 'Sine.Out',
      onComplete: () => scene.tweens.add({ targets: h, alpha: 0, duration: 200, onComplete: () => h.destroy() }) });
  }
}
/** two pink blush ovals that fade in on Puppy's cheeks; follows `at()` every frame. Returns the graphics. */
export function blush(scene: Phaser.Scene, at: () => Pt | null, gap = 46, depth = 965, into?: Phaser.GameObjects.Container) {
  const g = scene.add.graphics().setDepth(depth).setAlpha(0); into?.add(g);
  g.fillStyle(0xff6f9a, 0.75); g.fillEllipse(-gap / 2, 0, 26, 14); g.fillEllipse(gap / 2, 0, 26, 14);
  g.lineStyle(3, 0xff3f7a, 0.8); for (const sx of [-gap / 2, gap / 2]) for (let k = -1; k <= 1; k++) g.lineBetween(sx + k * 7 - 3, 4, sx + k * 7 + 3, -4); // the little /// lines
  const follow = () => { if (!g.active) return scene.events.off('update', follow); const p = at(); if (p) g.setPosition(p.x, p.y); };
  follow(); scene.events.on('update', follow); scene.events.once('shutdown', () => scene.events.off('update', follow));
  scene.tweens.add({ targets: g, alpha: 1, duration: 250 });
  return g;
}
/** a wink sparkle (✦ + "wink!") next to Bunny's eye */
export function winkSparkle(scene: Phaser.Scene, x: number, y: number, depth = 965, into?: Phaser.GameObjects.Container, word = 'wink!', size = 40) {
  const s = txt(scene, x, y, '✦', size, '#fff27a', '#22252b', 5).setDepth(depth).setScale(0); into?.add(s);
  scene.tweens.add({ targets: s, scale: 1, angle: 90, duration: 220, ease: 'Back.Out', yoyo: true, hold: 260, onComplete: () => s.destroy() });
  if (word) { const w = txt(scene, x + size * 0.75, y - 30, word, Math.round(size * 0.55), '#ff5c8a', '#fff', 5).setDepth(depth).setAlpha(0); into?.add(w);
    scene.tweens.add({ targets: w, alpha: 1, y: y - 50, duration: 200, yoyo: true, hold: 500, onComplete: () => w.destroy() }); }
}
/** Bunny blows a kiss: "mwah!" (or `word`) at her, a 💋 floats over to Puppy's (moving) head, then onHit (blush + hearts there) */
export function blowKiss(scene: Phaser.Scene, from: Pt, to: () => Pt, onHit: () => void, depth = 965, into?: Phaser.GameObjects.Container, word = 'mwah!') {
  const m = comic(scene, from.x, from.y - 20, word, 30).setDepth(depth).setAngle(-8).setScale(0.3); into?.add(m);
  scene.tweens.add({ targets: m, scale: 1, duration: 160, ease: 'Back.Out' });
  scene.tweens.add({ targets: m, alpha: 0, y: m.y - 40, delay: 700, duration: 250, onComplete: () => m.destroy() });
  const k = txt(scene, from.x, from.y, '💋', 40).setDepth(depth); into?.add(k);
  scene.tweens.addCounter({ from: 0, to: 1, duration: 750, ease: 'Sine.InOut', onUpdate: (tw) => { const p = tw.getValue()!, t = to();
    k.setPosition(Phaser.Math.Linear(from.x, t.x, p), Phaser.Math.Linear(from.y, t.y, p) - Math.sin(p * Math.PI) * 90).setAngle(Math.sin(p * 12) * 15).setScale(1 + Math.sin(p * Math.PI) * 0.3); },
    onComplete: () => { k.destroy(); if (scene.sys.isActive()) onHit(); } });
}
/** a little paper fan that waves in front of a couch girl's face */
export function fan(scene: Phaser.Scene, x: number, y: number, depth = 30, ms = 2400) {
  const g = scene.add.graphics({ x, y }).setDepth(depth);
  g.fillStyle(0xff9fc0, 1).lineStyle(3, 0x22252b, 1).slice(0, 0, 34, Phaser.Math.DegToRad(-150), Phaser.Math.DegToRad(-30), false).fillPath().strokePath();
  g.lineStyle(2, 0xffffff, 0.9); for (let a = -140; a <= -40; a += 25) { const r = Phaser.Math.DegToRad(a); g.lineBetween(0, 0, Math.cos(r) * 30, Math.sin(r) * 30); }
  g.fillStyle(0x8a4a1a, 1).fillRect(-3, 0, 6, 16);
  scene.tweens.add({ targets: g, angle: { from: -25, to: 25 }, yoyo: true, repeat: Math.ceil(ms / 260), duration: 130, onComplete: () => g.destroy() });
  return g;
}
/** a small floating word above a couch girl ("phew~", "ugh, you two") */
export function pipe(scene: Phaser.Scene, x: number, y: number, s: string, depth = 31, color = '#ffffff') {
  const t = txt(scene, x, y, s, 22, color, '#22252b', 5).setDepth(depth).setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, y: y - 26, duration: 250 });
  scene.tweens.add({ targets: t, alpha: 0, y: y - 50, delay: 1700, duration: 300, onComplete: () => t.destroy() });
  return t;
}
/** a drawn eye-roll: two little eyes whose pupils roll up and around, over a girl's head */
export function eyeRoll(scene: Phaser.Scene, x: number, y: number, depth = 31) {
  const c = scene.add.container(x, y).setDepth(depth); const g = scene.add.graphics(); c.add(g);
  const draw = (a: number) => { g.clear(); for (const sx of [-14, 14]) { g.fillStyle(0xffffff, 1).lineStyle(3, 0x22252b, 1).fillCircle(sx, 0, 11).strokeCircle(sx, 0, 11);
    g.fillStyle(0x22252b, 1).fillCircle(sx + Math.cos(a) * 5, Math.sin(a) * 5, 5); } };
  draw(-Math.PI / 2);
  scene.tweens.addCounter({ from: Math.PI * 0.1, to: -Math.PI * 1.6, duration: 900, delay: 150, onUpdate: (tw) => draw(tw.getValue()!) });
  c.setScale(0); scene.tweens.add({ targets: c, scale: 1, duration: 180, ease: 'Back.Out' });
  scene.tweens.add({ targets: c, alpha: 0, delay: 1700, duration: 300, onComplete: () => c.destroy() });
  return c;
}
/** head point of an art image: top-centre of its bounds, pushed down by `down` of its height */
export function headOf(img: Phaser.GameObjects.Image, down = 0.25, dx = 0): Pt { const b = img.getBounds(); return { x: b.centerX + dx, y: b.top + b.height * down }; }
/** Bunny's smug little grin: a floating "hehe~" (or `word`) next to her */
export function smirk(scene: Phaser.Scene, x: number, y: number, depth = 965, into?: Phaser.GameObjects.Container, word = 'hehe~', size = 30) {
  const m = comic(scene, x, y, word, size).setDepth(depth).setAngle(-8).setScale(0.3); into?.add(m);
  scene.tweens.add({ targets: m, scale: 1, duration: 160, ease: 'Back.Out' });
  scene.tweens.add({ targets: m, alpha: 0, y: y - 40, delay: 900, duration: 250, onComplete: () => m.destroy() });
  return m;
}
/** leash gag: Bunny's paw throws a soft rope (a sagging quadratic bezier) onto Puppy's neck (a little pink collar loop); the slack rope
 *  sways, then pulls tighter on "tug!" (still a gentle curve, never a stiff stick) and onHit fires; then it relaxes and fades.
 *  `from` (her paw) and `to` (his neck) are re-read every frame, so it follows moving characters. */
export function ropeTug(scene: Phaser.Scene, from: () => Hold, to: () => Neck, onHit: () => void, depth = 965, into?: Phaser.GameObjects.Container, paw = true, sagMul = 1) {
  const g = scene.add.graphics().setDepth(depth).setAlpha(0); into?.add(g); let hit = false;
  const L = Phaser.Math.Linear, S = (x: number) => Phaser.Math.Clamp(x, 0, 1);
  const local = (q: Pt): Pt => { if (!into) return q; const r = into.getWorldTransformMatrix().applyInverse(q.x, q.y); return { x: r.x, y: r.y }; };
  const capsule = (p1: Pt, p2: Pt, w: number, fill: number) => { g.lineStyle(w + 8, 0x22252b, 1).lineBetween(p1.x, p1.y, p2.x, p2.y).fillStyle(0x22252b, 1).fillCircle(p1.x, p1.y, w / 2 + 4).fillCircle(p2.x, p2.y, w / 2 + 4);
    g.lineStyle(w, fill, 1).lineBetween(p1.x, p1.y, p2.x, p2.y).fillStyle(fill, 1).fillCircle(p1.x, p1.y, w / 2).fillCircle(p2.x, p2.y, w / 2); };
  // 28 Oct (Marc): both ends are ATTACHED every frame: it starts inside Bunny's paw (paw drawn over it) and ends at a little clasp ring ON a
  // collar band round Puppy's neck. Both ends are re-read from the sprites each frame, so they follow every bob, sway, wobble and tug.
  const draw = (p: number) => { const A = from(), N = to(); g.clear();
    const a = local(A), n = local(N), r = A.r ?? 12;
    const th = Phaser.Math.DegToRad(N.a ?? 0), ux = Math.cos(th), uy = Math.sin(th), dx = -Math.sin(th), dy = Math.cos(th); // band axis + toward-torso
    const bw = N.w ?? 0, bt = Math.max(8, bw * 0.2), ring = Math.max(6, bt * 0.62);
    const e = { x: n.x + dx * (bt * 0.5 + ring * 0.55), y: n.y + dy * (bt * 0.5 + ring * 0.55) };                // ring hangs off the band's front
    const len = Math.hypot(e.x - a.x, e.y - a.y), slack = Math.min(110, 30 + len * 0.35) * sagMul, taut = Math.min(60, 16 + len * 0.17) * sagMul;
    let sag = slack + Math.sin(p * 26) * 8 * S((0.5 - p) / 0.2);                                         // loose, swaying
    if (p >= 0.5) sag = L(slack, taut, Phaser.Math.Easing.Back.Out(S((p - 0.5) / 0.1)));                // the tug pulls it tighter
    if (p >= 0.6) sag = taut + Math.sin(p * 90) * 3 * S((0.72 - p) / 0.12);                               // twang
    if (p >= 0.75) sag = L(taut, slack * 0.6, S((p - 0.75) / 0.25));                                     // relaxes
    let nx = -(e.y - a.y) / (len || 1), ny = (e.x - a.x) / (len || 1); if (ny < 0) { nx = -nx; ny = -ny; }  // bow sideways-down, so steep ropes still curve
    const cx = (a.x + e.x) / 2 + nx * sag * 0.8, cy = (a.y + e.y) / 2 + ny * sag * 0.6 + sag * 0.4;
    const pts: Phaser.Math.Vector2[] = []; for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u;
      pts.push(new Phaser.Math.Vector2(v * v * a.x + 2 * v * u * cx + u * u * e.x, v * v * a.y + 2 * v * u * cy + u * u * e.y)); }
    // collar band (behind the rope's clasp): a pink strap across his neck, outlined, with a little shine
    if (bw > 0) { const p1 = { x: n.x - ux * bw / 2, y: n.y - uy * bw / 2 }, p2 = { x: n.x + ux * bw / 2, y: n.y + uy * bw / 2 };
      capsule(p1, p2, bt, 0xff5c8a); g.lineStyle(Math.max(2, bt * 0.25), 0xffc2d6, 0.9).lineBetween(L(p1.x, p2.x, 0.2) - dx * bt * 0.18, L(p1.y, p2.y, 0.2) - dy * bt * 0.18, L(p1.x, p2.x, 0.55) - dx * bt * 0.18, L(p1.y, p2.y, 0.55) - dy * bt * 0.18); }
    g.lineStyle(9, 0x22252b, 1).strokePoints(pts); g.lineStyle(5, 0xc98a4b, 1).strokePoints(pts);          // outlined cartoon rope
    g.lineStyle(2, 0xf2c48d, 0.9); for (let i = 2; i < 23; i += 3) { const q = pts[i]; g.lineBetween(q.x - 2, q.y - 2, q.x + 2, q.y + 2); } // twist marks
    g.lineStyle(7, 0x22252b, 1).strokeCircle(e.x, e.y, ring).lineStyle(3.5, 0xffd36b, 1).strokeCircle(e.x, e.y, ring);          // clasp ring on the collar
    if (paw) { if (A.arm) { const s = local(A.arm); capsule(s, a, r * 1.25, 0x2c2f3a); }                                       // her sleeve, when the art has no arm there
      g.fillStyle(0xffffff, 1).lineStyle(4, 0x22252b, 1).fillCircle(a.x, a.y, r).strokeCircle(a.x, a.y, r); g.fillStyle(0xffb3c7, 1).fillCircle(a.x + r * 0.15, a.y + r * 0.2, r * 0.36); // her paw, closed over the rope
      g.lineStyle(2, 0x22252b, 0.8).lineBetween(a.x - r * 0.55, a.y - r * 0.15, a.x + r * 0.2, a.y - r * 0.15); }                // curled fingers
  };
  draw(0); scene.tweens.add({ targets: g, alpha: 1, duration: 140 });
  scene.tweens.addCounter({ from: 0, to: 1, duration: 1800, ease: 'Linear', onUpdate: (tw) => { const p = tw.getValue()!; if (!g.active) return; draw(p);
    if (!hit && p >= 0.56) { hit = true; const t = to(); const w = comic(scene, t.x + 40, t.y - 50, 'tug!', 34).setDepth(depth).setAngle(10).setScale(0.3); into?.add(w);
      scene.tweens.add({ targets: w, scale: 1, duration: 140, ease: 'Back.Out' }); scene.tweens.add({ targets: w, alpha: 0, y: w.y - 30, delay: 600, duration: 250, onComplete: () => w.destroy() });
      if (scene.sys.isActive()) onHit(); } },
    onComplete: () => scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() }) });
  return g;
}
/** Bunny teases her captive: usually a smug "hehe~" + leash tug, sometimes (kissChance) a sneaky smug kiss ("mine~"). Same onHit either way. */
export function bunTease(scene: Phaser.Scene, from: () => Hold, to: () => Neck, onHit: () => void, depth = 965, into?: Phaser.GameObjects.Container, kissChance = 0.2, sagMul = 1): 'kiss' | 'tug' {
  const f = from();
  if (Math.random() < kissChance) { blowKiss(scene, f, to, onHit, depth, into, 'mine~'); return 'kiss'; }
  smirk(scene, f.x, f.y - 40, depth, into); ropeTug(scene, from, to, onHit, depth, into, true, sagMul); return 'tug';
}
