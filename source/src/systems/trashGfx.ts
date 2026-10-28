// Trash-Can Drop "Comic Rooftop Heist" layer (Marc's pick, option C of the Pups 3 mockup). Purely visual: the scene keeps every timer,
// position, hit test and tuning; this class only draws (animated ambience, drawn junk instead of emoji, trash cans with rattling lids
// and peeking eyes, the halftone umbrella, Iris's raccoon tail + loot sack + burglar stripes + acting, comic BONK bursts + action lines,
// the BINNED win gag) and reacts to the scene's events. Never calls Math.random / Phaser.Math.Between (own RNG), so the game's random
// sequence is untouched.
import Phaser from 'phaser';
import { art, artScale } from '../art/registry';
import { txt } from './fx';
import type { TrashPup } from './trashPups';
import type { HeroRig } from './rigs';

const INK = 0x22252b, IRIS_FUR = 0xa9a3ad, IRIS_DARK = 0x3a3442, DUST = 0xc8c8e0;
const ITEM: Record<string, string> = { '🥫': 'ti_can', '🍌': 'ti_banana', '👟': 'ti_shoe', '🐟': 'ti_fish', '📦': 'ti_box' };
const ITEM_WH: Record<string, number> = { ti_can: 110, ti_banana: 110, ti_shoe: 120, ti_fish: 130, ti_box: 140, ti_peel: 120 };
type Txt = Phaser.GameObjects.Text;
interface Fol { o: Txt; img: Phaser.GameObjects.Image; key: string; lines: boolean }
export const IRIS_M = 0.86, UMB_KEY = 'tu_heist';

export class TrashGfx {
  skin: TrashPup | null = null; danger = false; private iris?: HeroRig; private tailG?: Phaser.GameObjects.Graphics; private outfitG?: Phaser.GameObjects.Graphics;
  private amb: Phaser.GameObjects.Graphics; private fx: Phaser.GameObjects.Graphics; private fol: Fol[] = []; private pend: { o: Txt; item: string; lines: boolean }[] = [];
  private bins: { body: Phaser.GameObjects.Image; lid: Phaser.GameObjects.Image; x: number; lidY: number; eyes: Phaser.GameObjects.Graphics; peek: number }[] = [];
  private t = 0; private tailWag = 1; private tailPuff = 0; private tailUp = 0; private hitLines = 0; private hitX = 0; private ended = '';
  private seed = 0xc0e1c; private rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  private between(a: number, b: number) { return Math.floor(a + this.rnd() * (b - a + 1)); }
  constructor(private scene: Phaser.Scene, private GROUND: number) {
    this.amb = scene.add.graphics().setDepth(2); this.fx = scene.add.graphics().setDepth(65);
    // trash cans at both kerbs (lids are separate so they can rattle / hop / get peeked out of)
    for (const x of [52, 668]) { const s = 0.82, y = GROUND - 22, body = art(scene, x, y, 'tc_heist', s).setDepth(4), lid = art(scene, x, y - 136 * s, 'tl_heist', s).setDepth(5);
      this.bins.push({ body, lid, x, lidY: lid.y, eyes: scene.add.graphics().setDepth(4.5).setVisible(false), peek: 2 + this.rnd() * 3 }); }
  }
  get ready() { return this.scene.textures.exists('ti_can'); }
  /* ---------- Puppy ---------- */
  attachPup(sk: TrashPup, umb: Phaser.GameObjects.Image) { this.skin = sk; umb.setTexture(UMB_KEY).setOrigin(0.5, 0.95).setScale(artScale(UMB_KEY, 0.85)).setY(sk.umbY + 48); }
  onDodge(dir: number) { this.skin?.hop(dir); }
  /* ---------- Iris ---------- */
  attachIris(iris: HeroRig) {
    this.iris = iris; const bodyC = (iris as any).bodyC as Phaser.GameObjects.Container;
    this.tailG = this.scene.add.graphics(); iris.root.addAt(this.tailG, 0);
    // cat-burglar stripes on her top (drawn over the torso, under her head)
    const g = this.outfitG = this.scene.add.graphics(); bodyC.addAt(g, 1);
    g.fillStyle(INK, 0.9); for (const y of [-88, -72, -56, -42]) g.fillRect(-40 - (y > -60 ? 6 : 0), y, 80 + (y > -60 ? 12 : 0), 7);
  }
  /** bushy ringed raccoon tail + the loot sack over her shoulder, behind her body, in rig units */
  private drawTail(now: number, walking: boolean) {
    const g = this.tailG!.clear(), n = 8, sway = (walking ? 16 : 8) * this.tailWag, puff = 1 + this.tailPuff * 0.45;
    const sx = 34, sy = -96, a0 = Math.sin(now / 160) * 0.08;
    g.lineStyle(6, INK, 1).fillStyle(0xd8c090, 1).fillEllipse(sx + 22 + a0 * 40, sy + 6, 70, 62).strokeEllipse(sx + 22 + a0 * 40, sy + 6, 70, 62);
    g.fillStyle(0xb8a070, 1).fillEllipse(sx + 30 + a0 * 40, sy + 18, 40, 22); g.lineStyle(5, INK, 1).lineBetween(sx - 4, sy - 14, sx + 10, sy - 22);
    g.fillStyle(0x6ab0e0, 1).fillTriangle(sx + 4, sy - 26, sx + 22, sy - 22, sx + 8, sy - 44).lineStyle(4, INK, 1).strokeTriangle(sx + 4, sy - 26, sx + 22, sy - 22, sx + 8, sy - 44);
    const pts: { x: number; y: number; r: number }[] = []; let x = 40, y = -46, a = -0.25 - this.tailUp * 0.9;
    for (let i = 0; i < n; i++) { a += -0.16 - this.tailUp * 0.08 + Math.sin(now / 150 * (1 + this.tailWag * 0.6) - i * 0.55) * sway * 0.006 * (1 + i * 0.3); const r = (10 + 7 * Math.sin(Math.PI * (i + 1) / (n + 1))) * puff; pts.push({ x, y, r }); x += Math.cos(a) * 12; y += Math.sin(a) * 12; }
    pts.forEach(p => g.fillStyle(INK, 1).fillCircle(p.x, p.y, p.r + 4));
    pts.forEach((p, i) => g.fillStyle(i === n - 1 || i % 2 === 1 ? IRIS_DARK : IRIS_FUR, 1).fillCircle(p.x, p.y, p.r));
    g.fillStyle(0xffffff, 0.25).fillCircle(pts[3].x - 2, pts[3].y - 4, pts[3].r * 0.4);
  }
  /** walk-pose override: exaggerated heist creep; she peeks down (head tilt) when she has Puppy lined up */
  irisWalk(T: Record<string, number>, now: number, lined: boolean) {
    const st = Math.sin(now / 80);
    Object.assign(T, { lh: st * 36, lk: Math.max(0, -st) * 52, rh: -st * 36, rk: Math.max(0, st) * 52, ls: -95, le: -55, lean: 15, sq: -0.08, dy: 6 });
    T.tilt = lined ? 14 : Math.sin(now / 420) * 6; return T;
  }
  private irisPop(s: string, col = '#ffffff') { if (!this.iris) return; const o = txt(this.scene, this.iris.x + 50, this.iris.y - 210, s, 34, col, '#22252b', 6).setDepth(25).setScale(0.3);
    this.scene.tweens.add({ targets: o, scale: 1, y: o.y - 50, duration: 360, ease: 'Back.Out' }); this.scene.tweens.add({ targets: o, alpha: 0, delay: 600, duration: 260, onComplete: () => o.destroy() }); }
  /** tail flicks up as she lets go */
  onDrop() { this.tailUp = 1; this.scene.time.delayedCall(260, () => (this.tailUp = 0)); }
  /* ---------- items: the emoji Text objects stay (hidden) and drive position/angle/alpha; a drawn image follows each ---------- */
  wrap(o: Txt, item: string, lines = false) { const key = ITEM[item]; if (!key) return;
    if (!this.ready) { const p = this.pend.find(q => q.o === o); if (p) p.item = item; else this.pend.push({ o, item, lines }); return; } // art still generating: the emoji shows until then
    o.setVisible(false); const ex = this.fol.find(q => q.o === o); if (ex) { ex.key = key; ex.img.setTexture(key); return; }
    const img = art(this.scene, o.x, o.y, key, 1).setDepth(o.depth); const f = { o, img, key, lines }; this.fol.push(f); this.syncFol(f); }
  peel(o: Txt) { const f = this.fol.find(q => q.o === o); if (f) { f.key = 'ti_peel'; f.img.setTexture('ti_peel'); f.lines = false; } }
  private syncFol(f: Fol) { const fs = parseFloat(String(f.o.style.fontSize)) || 64; const target = fs * (f.key === 'ti_peel' ? 1.6 : 1.3);
    f.img.setPosition(f.o.x, f.o.y).setAngle(f.o.angle).setAlpha(f.o.alpha).setDepth(f.o.depth).setScale(artScale(f.key, target / ITEM_WH[f.key])).setVisible(true); }
  /* ---------- events ---------- */
  onMiss(x: number) { this.bins.forEach(b => { const d = Math.abs(b.x - x), k = Math.max(0.3, 1 - d / 600); this.rattle(b, k); });
    if (this.iris) { this.iris.setMood('dizzy'); this.iris.act([{ dur: 0.1, to: { sq: -0.12, dy: 8, lean: -6, ls: 30, rs: 30, le: 10, re: 10, tilt: -14 } }, { dur: 0.45, to: { sq: -0.1, dy: 8, lean: -6, ls: 26, rs: 34, tilt: 12 } }]);
      this.scene.time.delayedCall(900, () => this.ended || this.iris!.setMood('smug')); }
    this.tailPuff = 1; this.irisPop('💢'); }
  onBlock(popped: boolean) { this.tailPuff = 1;
    if (this.iris) { this.iris.act([{ dur: 0.07, to: { rs: 165, re: -70, dy: 4 } }, { dur: 0.08, to: { rs: 140, re: -30 } }, { dur: 0.07, to: { rs: 165, re: -70 } }, { dur: 0.08, to: { rs: 140, re: -30 } }]); this.irisPop(popped ? '!!' : '#@!', popped ? '#7dff9a' : '#ffdf6b'); } }
  /** the popped umbrella flips inside-out, then the scene flings it */
  onUmbPop(u: Phaser.GameObjects.Image) { if (!this.scene.textures.exists(UMB_KEY)) return; u.setTexture(UMB_KEY).setOrigin(0.5, 0.95).setScale(artScale(UMB_KEY, 0.85)); this.scene.tweens.add({ targets: u, scaleY: -artScale(UMB_KEY, 0.85), duration: 140, ease: 'Back.Out' }); }
  /** comic BONK: burst + action lines behind him, the nearest bin rattles, Iris fist-pumps */
  onHit(x: number, slip: boolean) {
    this.hitLines = 0.28; this.hitX = x; this.tailWag = 3; this.scene.time.delayedCall(900, () => (this.tailWag = 1));
    const nb = this.bins.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a)); this.rattle(nb, 0.6);
    if (this.iris) { this.iris.act([{ dur: 0.07, to: { dy: 8, sq: -0.12 } }, { dur: 0.14, to: { dy: -30, sq: 0.1, ls: -160, le: -20, rs: 160, re: -40, tilt: -8 }, ease: Phaser.Math.Easing.Back.Out }, { dur: 0.16, to: { dy: 0, sq: -0.06 } }]); this.irisPop(slip ? 'HA!' : '♪', '#ffdf6b'); }
    if (this.scene.textures.exists('tx_burst')) { const b = art(this.scene, x, this.GROUND - 130, 'tx_burst', 1.25).setDepth(9).setScale(0.2).setAngle(this.between(-12, 12));
      this.scene.tweens.add({ targets: b, scale: artScale('tx_burst', 1.25), duration: 140, ease: 'Back.Out' }); this.scene.tweens.add({ targets: b, alpha: 0, delay: 520, duration: 220, onComplete: () => b.destroy() }); }
  }
  onFinish(win: boolean, px: number, LEDGE: number) {
    this.ended = win ? 'win' : 'lose'; const sc = this.scene, k = this.skin;
    if (this.iris) { const I = this.iris; I.setMood(win ? 'happy' : 'dizzy');
      if (win) { const keys = []; for (let i = 0; i < 6; i++) keys.push({ dur: 0.16, to: { dy: -22, ls: -150, rs: 160, le: -30, re: -30, lean: i % 2 ? 10 : -10, sq: 0.08, lk: 30, rk: 0 } }, { dur: 0.16, to: { dy: 0, ls: -120, rs: 130, lean: 0, sq: -0.06, lk: 0, rk: 30 } }); I.act(keys, true); this.tailWag = 3;
        sc.time.addEvent({ delay: 380, repeat: 4, callback: () => this.irisPop('♪', '#ffdf6b') }); }
      else { I.act([{ dur: 0.2, to: { sq: -0.14, dy: 12, lean: -8, ls: 20, rs: 20, le: 0, re: 0, tilt: -16, lk: 40, rk: 40, lh: -30, rh: -30 } }], true); this.tailWag = 0.2; this.tailUp = -0.6; } }
    if (!win || !k || !sc.textures.exists('tc_heist')) return;
    // PUPPY GOT BINNED: a can drops off the roof over him; he peeks out, dazed, and its lid lands on his head like a hat (the skin draws that lid)
    const bin = art(sc, px, LEDGE + 80, 'tc_heist', 1.25).setDepth(11);
    sc.tweens.add({ targets: bin, y: this.GROUND + 6, duration: 340, ease: 'Quad.In', onComplete: () => {
      sc.cameras.main.shake(140, 0.008); k.win(); this.dustAt(px);
      sc.tweens.add({ targets: k.root, y: -100, duration: 260, delay: 60, ease: 'Back.Out' });
      bin.setScale(bin.scaleX * 1.12, bin.scaleY * 0.86); sc.tweens.add({ targets: bin, scaleX: bin.scaleX / 1.12, scaleY: bin.scaleY / 0.86, duration: 300, ease: 'Elastic.Out' }); } });
  }
  private dustAt(x: number) { for (let i = 0; i < 8; i++) { const p = this.scene.add.circle(x + this.between(-60, 60), this.GROUND - 8, this.between(12, 20), DUST, 0.75).setDepth(13);
    this.scene.tweens.add({ targets: p, x: p.x + (i % 2 ? 1 : -1) * this.between(50, 110), y: p.y - this.between(10, 50), scale: 2.2, alpha: 0, duration: 520, onComplete: () => p.destroy() }); } }
  private rattle(b: TrashGfx['bins'][0], k: number) { const sc = this.scene; sc.tweens.killTweensOf(b.lid); b.lid.setY(b.lidY).setAngle(0);
    sc.tweens.add({ targets: b.lid, y: b.lidY - 40 * k, angle: (this.rnd() < 0.5 ? -1 : 1) * 24 * k, duration: 120, yoyo: true, ease: 'Quad.Out', onComplete: () => sc.tweens.add({ targets: b.lid, angle: { from: 6, to: 0 }, duration: 200, ease: 'Bounce.Out' }) });
    sc.tweens.add({ targets: b.body, angle: { from: -5 * k, to: 0 }, duration: 260, ease: 'Elastic.Out' }); }
  /* ---------- per frame ---------- */
  update(dt: number, now: number, s: { px: number; running: boolean; over: boolean; cool: number }, falling: { x: number; hit: number }[], held: Txt, lined: boolean) {
    this.t += dt; this.tailPuff = Math.max(0, this.tailPuff - dt * 1.4);
    if (this.pend.length && this.ready) { const p = this.pend; this.pend = []; for (const q of p) if (q.o.active) this.wrap(q.o, q.item, q.lines); }
    // items follow their (hidden) emoji text objects
    for (let i = this.fol.length - 1; i >= 0; i--) { const f = this.fol[i]; if (!f.o.active) { f.img.destroy(); this.fol.splice(i, 1); continue; } this.syncFol(f); }
    if (this.fol.some(f => f.o === held)) held.setVisible(false);
    if (this.iris) this.drawTail(now, s.running && !s.over);
    this.danger = s.running && !s.over && (falling.some(f => Math.abs(f.x - s.px) < f.hit * 1.6) || (lined && s.cool <= 0 && !falling.length));
    // bins: something in there peeks out now and then
    for (const b of this.bins) { b.peek -= dt; const e = b.eyes.clear();
      if (b.peek < 0 && b.peek > -1.6 && !this.scene.tweens.isTweening(b.lid)) { const q = Math.min(1, Math.min(-b.peek, 1.6 + b.peek) * 5), look = Math.sin(this.t * 3) * 6;
        b.lid.setY(b.lidY - 16 * q).setAngle(-6 * q);
        e.setVisible(true).fillStyle(0xfff6a0, q).fillEllipse(b.x - 12 + look, b.lidY + 4, 12, 9 * q).fillEllipse(b.x + 12 + look, b.lidY + 4, 12, 9 * q).fillStyle(INK, q).fillCircle(b.x - 11 + look * 1.3, b.lidY + 4, 3).fillCircle(b.x + 13 + look * 1.3, b.lidY + 4, 3); }
      else if (b.peek <= -1.6) { b.peek = 4 + this.rnd() * 5; if (!this.scene.tweens.isTweening(b.lid)) b.lid.setY(b.lidY).setAngle(0); e.setVisible(false); } }
    this.ambience(now);
    // impact action lines + speed lines on falling junk
    const g = this.fx.clear(); if (this.hitLines > 0) { this.hitLines -= dt; const a = this.hitLines / 0.28;
      for (let i = 0; i < 14; i++) { const ang = i / 14 * Math.PI * 2 + 0.2, r0 = 150 + (1 - a) * 60; g.lineStyle(8, INK, 0.7 * a).lineBetween(this.hitX + Math.cos(ang) * r0, this.GROUND - 110 + Math.sin(ang) * r0 * 0.7, this.hitX + Math.cos(ang) * (r0 + 70), this.GROUND - 110 + Math.sin(ang) * (r0 + 70) * 0.7); } }
    for (const f of this.fol) if (f.lines && f.o.alpha > 0.9) { const h = f.img.displayHeight; for (let i = -1; i <= 1; i++) g.lineStyle(5, INK, 0.8).lineBetween(f.img.x + i * h * 0.3, f.img.y - h * 0.7, f.img.x + i * h * 0.3, f.img.y - h * (1.4 + Math.abs(i) * -0.3)); }
  }
  /** two sweeping searchlights + flickering skyline windows */
  private ambience(now: number) {
    const g = this.amb.clear();
    for (let i = 0; i < 2; i++) { const a = -Math.PI / 2 + Math.sin(now / 1800 + i * 2.2) * 0.5, x0 = 200 + i * 380, y0 = 300; g.fillStyle(0xfff3c0, 0.12);
      g.fillTriangle(x0, y0, x0 + Math.cos(a - 0.1) * 420, y0 + Math.sin(a - 0.1) * 420, x0 + Math.cos(a + 0.1) * 420, y0 + Math.sin(a + 0.1) * 420); }
    for (let i = 0; i < 5; i++) { const on = Math.sin(now / 300 + i * 7.1) > 0.6; if (on) g.fillStyle(0xffdf6b, 0.9).fillRect(40 + i * 140 + (i * 37) % 50, 250 + (i * 13) % 30, 8, 10); }
  }
}
