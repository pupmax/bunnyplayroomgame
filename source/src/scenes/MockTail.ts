// Static look-mockups for the TAIL CATCH bonus level (?tailmock=1..6). Not part of the game flow; uses the real rigs + art.
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera } from '../systems/resolution';
import { art, artScale, ensureArt } from '../art/registry';
import { makeMuteButton } from '../systems/ui';
import { txt, bubble, comic } from '../systems/fx';
import { drawHall, tutorialCard } from '../systems/kit';
import { CAST } from '../art/chibi';
import { Hud } from '../systems/level';
import { bakeG } from '../systems/bake';
import { TailBunny, TailPup } from '../systems/tailRigs';

const FLOOR = 1010;
const PT = ['pt_stand', 'pt_panic', 'pt_dizzy', 'pt_hearts', 'pt_tail', ...[0, 1, 2, 3, 4, 5].map(i => 'pt_run' + i)];

export class MockTailScene extends Phaser.Scene {
  constructor() { super('MockTail'); }
  private loopT = 0; private frozen = true; private lp: any = null;
  create(d: { n: number; t?: number }) {
    setupCamera(this); this.loopT = 0; this.frozen = true; this.lp = null;
    ensureArt(this, PT).then(() => {
      if (d.n === 7) this.loopInit(d.t ?? -1);
      else [, this.hall, this.chase, this.tug, this.catch, this.lead, this.tutorial][d.n]?.call(this);
      makeMuteButton(this);
      this.time.delayedCall(800, () => { (window as any).__mockReady = true; });
    });
  }
  // ---------- shared bits ----------
  private room(tails = 2, t = 41) { art(this, 0, 0, 'bg_room'); const h = new Hud(this, 'TAIL CATCH  🐾', 0xff5c8a); h.set(`Tails ${tails}/6`, t, tails / 6); return h; }
  private dust(x: number, y: number, n = 5, s = 1) { for (let i = 0; i < n; i++) this.add.image(x - i * 26 * s, y - (i % 2) * 14 - 6, 'su_dust').setScale(artScale('su_dust', (1.4 - i * 0.18) * s)).setAlpha(0.85 - i * 0.12).setDepth(9); }
  private speed(x: number, y: number, dir = -1) { const g = this.add.graphics().setDepth(8); g.lineStyle(6, 0xffffff, 0.75); for (const [dy, l] of [[-150, 70], [-110, 110], [-70, 80], [-30, 60]]) g.lineBetween(x, y + dy, x + dir * l, y + dy); }
  /** the grab-window glow + shrinking timing ring around the tail tip */
  private grabRing(x: number, y: number, k = 0.55) {
    this.add.image(x, y, 'su_dust').setScale(artScale('su_dust', 2.4)).setTint(0x7dff9a).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(29);
    const g = this.add.graphics().setDepth(30);
    g.lineStyle(10, 0x22252b, 1).strokeCircle(x, y, 40).lineStyle(6, 0x7dff9a, 1).strokeCircle(x, y, 40);
    g.lineStyle(4, 0xffffff, 0.9).strokeCircle(x, y, 40 + 60 * k);
    txt(this, x - 10, y - 82, 'GRAB!', 34, '#7dff9a', '#22252b', 7).setDepth(31).setAngle(-6);
  }
  private stamp(x: number, y: number, word: string, s = 1, ang = -8) {
    const g = this.add.graphics({ x, y }).setDepth(70); const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 20; i++) { const r = (i % 2 ? 70 : 150) * s; const a = i / 20 * Math.PI * 2; pts.push(new Phaser.Math.Vector2(Math.cos(a) * r * 1.35, Math.sin(a) * r)); }
    g.fillStyle(0xff5c8a, 1).lineStyle(7, COLORS.INK, 1).fillPoints(pts, true).strokePoints(pts, true);
    g.fillStyle(0xffffff, 1).fillEllipse(0, 0, 300 * s, 140 * s); g.setAngle(ang);
    comic(this, x, y, word, 84 * s).setAngle(ang).setDepth(71);
    [[-1.4, -1], [1.3, -0.8], [1.2, 1], [-1.3, 0.9]].forEach(([dx, dy]) => txt(this, x + dx * 150 * s, y + dy * 110 * s, '★', 44, '#ffdf6b', '#22252b', 5).setDepth(72));
  }
  private sweat(x: number, y: number) { [[-1, 0], [1, -0.4], [0.2, -1]].forEach(([dx, dy]) => txt(this, x + dx * 70, y + dy * 60, '💦', 34).setDepth(40)); }
  private flail(x: number, y: number) { const g = this.add.graphics().setDepth(40); g.lineStyle(5, 0x22252b, 0.85);
    for (const [a, r] of [[200, 120], [230, 130], [320, 120], [340, 135], [270, 140]]) { const rad = a * Math.PI / 180; g.beginPath(); g.arc(x, y, r, rad - 0.25, rad + 0.25); g.strokePath(); } }

  // ---------- 1) bonus door in the Hall ----------
  private hall() {
    drawHall(this, CAST, () => 'beaten', () => 1200);
    txt(this, W / 2, 70, 'THE PLAYROOM HALL', 44, '#ffdf6b', '#22252b', 8);
    const [x, y] = [622, 395], w = 140, h = 180;
    const c = this.add.container(x, y).setDepth(20);
    const glow = this.add.image(0, 0, 'su_dust').setScale(w / 30, h / 30).setTint(0xff7ac8).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD); c.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.35, yoyo: true, repeat: -1, duration: 800 });
    const g = this.add.graphics(); const r = { tl: w / 2, tr: w / 2, bl: 12, br: 12 };
    g.fillStyle(0x000000, 0.45).fillRoundedRect(-w / 2 + 6, -h / 2 + 12, w, h, r);
    g.fillStyle(0x8a5a10, 1).lineStyle(5, 0x2a0a0a, 1).fillRoundedRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 12, { tl: w / 2 + 8, tr: w / 2 + 8, bl: 14, br: 14 }).strokeRoundedRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 12, { tl: w / 2 + 8, tr: w / 2 + 8, bl: 14, br: 14 });
    g.fillStyle(0xffd76b, 1).fillRoundedRect(-w / 2 - 4, -h / 2 - 5, w + 8, h + 4, { tl: w / 2 + 4, tr: w / 2 + 4, bl: 12, br: 12 });
    g.fillStyle(0x6b2fc9, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0x9a5cff, 1).fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h * 0.55, { tl: w / 2 - 8, tr: w / 2 - 8, bl: 8, br: 8 });
    g.fillStyle(0xffffff, 0.14).fillRoundedRect(-w / 2 + 14, -h / 2 + 14, w * 0.3, h * 0.5, 10);
    for (const [sx, sy] of [[-44, 40], [40, 56], [-30, 70], [46, 18]]) g.fillStyle(0xffdf6b, 1).fillCircle(sx, sy, 3);
    g.fillStyle(0xfff3e0, 1).lineStyle(6, 0xb07a10, 1).fillCircle(0, -h * 0.12, w * 0.38).strokeCircle(0, -h * 0.12, w * 0.38);
    c.add(bakeG(this, g, 'door_bonus', -w / 2 - 12, -h / 2 - 12, w + 24, h + 28));
    c.add(art(this, -14, -h * 0.12 + 38, 'bun_bust_wink', 0.42));
    const tl = art(this, 50, -h * 0.12 + 34, 'pt_tail', 0.62).setAngle(-14).setFlipX(true).setOrigin(1 - 74 / 80, 42 / 64); c.add(tl);
    this.tweens.add({ targets: tl, angle: 16, yoyo: true, repeat: -1, duration: 200 });
    const sign = this.add.container(0, -h / 2 - 30); const sg = this.add.graphics();
    sg.fillStyle(0xff5c8a, 1).lineStyle(5, 0x22252b, 1).fillRoundedRect(-66, -20, 132, 42, 14).strokeRoundedRect(-66, -20, 132, 42, 14);
    sign.add([sg, txt(this, 0, 1, '★ BONUS ★', 26, '#fff', '#22252b', 6)]); sign.setAngle(5); c.add(sign);
    c.add(txt(this, 0, h / 2 - 30, 'TAIL\nCATCH', 22, '#fff', '#22252b', 6).setLineSpacing(-6));
    const tg = this.add.graphics().fillStyle(0x1a1020, 0.9).lineStyle(3, 0xff7ac8, 0.95).fillRoundedRect(-72, h / 2 + 4, 144, 38, 12).strokeRoundedRect(-72, h / 2 + 4, 144, 38, 12); c.add(tg);
    const tt = txt(this, 0, h / 2 + 22, 'PLAY!', 26, '#7dff9a', '#22252b', 6); c.add(tt);
    const pup = art(this, x - 112, y + 92, 'pup_idle', 0.42).setDepth(21).setFlipX(true);
    this.tweens.add({ targets: pup, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 300 });
    bubble(this, 330, 560, 'Bonus round! Catch Puppy by the tail! 🐾', 22).setDepth(30);
  }
  // ---------- 2) chase: Bunny behind Puppy, tail wagging, grab window glowing ----------
  private chase() {
    this.room(2, 41);
    const zone = this.add.graphics().setDepth(5); zone.fillStyle(0x7dff9a, 0.22).fillEllipse(330, FLOOR + 6, 250, 56).lineStyle(4, 0x7dff9a, 0.7).strokeEllipse(330, FLOOR + 6, 250, 56);
    txt(this, 300, FLOOR + 56, 'behind him = grab zone', 22, '#7dff9a', '#22252b', 5).setDepth(6);
    const pup = new TailPup(this, 500, FLOOR, 1.2).setDepth(20); pup.setFrame('run2'); pup.tail.setAngle(-14);
    const bun = new TailBunny(this, 170, FLOOR, 1.0, 'wink').setDepth(21); bun.pose({ lean: 9, stride: 22, kn: 4 }); bun.reachTo(pup.tipPos().x - 60, pup.tipPos().y + 30); bun.pose({ el: -25 });
    this.speed(455, FLOOR - 10, -1); this.dust(420, FLOOR - 4, 4, 0.8);
    const tip = pup.tipPos(); this.grabRing(tip.x, tip.y, 0.45);
    txt(this, 560, FLOOR - 270, '♪ wag wag ♪', 26, '#fff', '#22252b', 5).setDepth(30).setAngle(6);
    const tr = this.add.graphics().setDepth(50); tr.lineStyle(8, 0xffffff, 0.55); for (let i = 0; i < 6; i++) tr.lineBetween(110 + i * 34, 1215 - i * 8, 126 + i * 34, 1211 - i * 8);
    txt(this, 330, 1188, '👆', 64).setDepth(51); txt(this, 470, 1205, 'drag to run', 26, '#fff', '#22252b', 5).setDepth(51);
  }
  // ---------- 3) tail grabbed: tug-of-war, Puppy cartoon-running in place ----------
  private tug() {
    this.room(3, 33);
    const pup = new TailPup(this, 500, FLOOR, 1.2).setDepth(20); pup.setFrame('panic'); pup.tailStretch = 1.45; pup.update(0, 0, 0); pup.tail.setAngle(4);
    for (const [k, dx, a] of [['run0', -16, 0.28], ['run3', 14, 0.28]] as const) art(this, 500 + dx, FLOOR, 'pt_' + k, 1.2).setAlpha(a).setDepth(19);
    const wheel = this.add.graphics().setDepth(18); wheel.lineStyle(6, 0x22252b, 0.6); for (let i = 0; i < 4; i++) { wheel.beginPath(); wheel.arc(500, FLOOR - 20, 34 + i * 10, Math.PI * (0.15 + i * 0.05), Math.PI * (0.85 - i * 0.05)); wheel.strokePath(); }
    for (let i = 0; i < 6; i++) this.add.image(560 + i * 24, FLOOR - 4 - (i % 2) * 12, 'su_dust').setScale(artScale('su_dust', 1.3 - i * 0.12)).setAlpha(0.85 - i * 0.1).setDepth(21);
    this.sweat(520, FLOOR - 230);
    const bun = new TailBunny(this, 175, FLOOR, 1.0, 'laugh').setDepth(21); bun.pose({ lean: -14, kn: 16 });
    const tip = pup.tipPos(); for (let i = 0; i < 3; i++) { const gap = bun.reachTo(tip.x, tip.y); bun.root.x += gap; }
    this.add.image(tip.x, tip.y, 'su_dust').setScale(artScale('su_dust', 2.4)).setTint(0xffdf6b).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(29);
    comic(this, 360, FLOOR - 330, 'TUG!', 76).setAngle(-8).setDepth(60);
    // tug meter
    const y = 520; const m = this.add.graphics().setDepth(60);
    m.fillStyle(0x22252b, 1).fillRoundedRect(90, y - 30, 540, 60, 30);
    m.fillStyle(0xff5c8a, 1).fillRoundedRect(98, y - 22, 524 * 0.64, 44, { tl: 22, bl: 22, tr: 0, br: 0 });
    m.fillStyle(0xc27230, 1).fillRoundedRect(98 + 524 * 0.64, y - 22, 524 * 0.36, 44, { tl: 0, bl: 0, tr: 22, br: 22 });
    m.fillStyle(0xffffff, 1).lineStyle(5, 0x22252b, 1).fillCircle(98 + 524 * 0.64, y, 30).strokeCircle(98 + 524 * 0.64, y, 30);
    txt(this, 98 + 524 * 0.64, y + 2, '🐾', 30).setDepth(61);
    txt(this, 160, y + 58, 'BUNNY', 26, '#ff5c8a', '#22252b', 6).setDepth(61); txt(this, 570, y + 58, 'PUPPY', 26, '#ffb06b', '#22252b', 6).setDepth(61);
    txt(this, 360, y - 70, 'TAP TAP TAP to reel him in!', 30, '#fff', '#22252b', 6).setDepth(61);
    for (const [hx, hy, a] of [[250, 1170, -12], [360, 1190, 4], [470, 1170, 14]] as const) { txt(this, hx, hy, '👆', 56).setDepth(62).setAngle(a);
      const g = this.add.graphics().setDepth(61); g.lineStyle(5, 0xffffff, 0.7).strokeCircle(hx, hy - 34, 30); }
    bubble(this, 560, FLOOR - 330, 'Nooo! My tail!', 22).setDepth(55);
  }
  // ---------- 4) catch moment: GOTCHA! stamp + 'This is mine!' ----------
  private catch() {
    this.room(4, 29);
    const pup = new TailPup(this, 470, FLOOR, 1.2).setDepth(20); pup.setFrame('panic'); pup.root.setAngle(-6); pup.inner.y = -26; pup.tailStretch = 1.2; pup.update(0, 0, 0); pup.tail.setAngle(-30);
    this.flail(470, FLOOR - 120); this.sweat(480, FLOOR - 240);
    for (const [dx, dy, a] of [[-60, -10, -40], [60, -6, 40]]) { const l = art(this, 470 + dx, FLOOR + dy, 'pt_run1', 1.2).setAlpha(0.22).setAngle(a).setDepth(19); void l; }
    const bun = new TailBunny(this, 220, FLOOR, 1.02, 'laugh').setDepth(21); bun.pose({ lean: -6, kn: 10 });
    const tip = pup.tipPos(); for (let i = 0; i < 3; i++) { const gap = bun.reachTo(tip.x, tip.y); bun.root.x += gap; }
    this.stamp(W / 2, 470, 'GOTCHA!', 1.05);
    bubble(this, 230, 690, 'This is mine!', 28).setDepth(80);
    txt(this, 560, 640, '+600', 40, '#7dff9a', '#22252b', 8).setDepth(80).setAngle(8);
    txt(this, W / 2, 1235, 'tap to skip ▸', 26, '#fff', '#22252b', 5).setDepth(90).setAlpha(0.8);
  }
  // ---------- 5) variant: Bunny leads Puppy by the tail ----------
  private lead() {
    this.room(5, 22);
    const bun = new TailBunny(this, 470, FLOOR, 1.02, 'wink').setDepth(21); bun.pose({ lean: 7, stride: 18, kn: 4 });
    const pup = new TailPup(this, 200, FLOOR, 1.15).setDepth(20); pup.flip(true); pup.setFrame('dizzy'); pup.root.setAngle(-5); pup.tailStretch = 1.15; pup.update(0, 0, 0); pup.tail.setAngle(-20);
    const tip = pup.tipPos(); for (let i = 0; i < 3; i++) { const gap = bun.reachTo(tip.x, tip.y); bun.root.x -= gap; }
    for (let i = 0; i < 4; i++) txt(this, 100 + i * 40, FLOOR + 30 - (i % 2) * 10, '🐾', 22).setAlpha(0.6 - i * 0.1).setDepth(6);
    this.dust(130, FLOOR - 4, 3, 0.7);
    txt(this, 120, 760, '💢', 44).setDepth(40); this.flail(200, FLOOR - 110); this.sweat(210, FLOOR - 230);
    comic(this, W / 2, 440, 'GOTCHA!', 70).setAngle(-6).setDepth(60);
    bubble(this, 470, 640, 'Come, Puppy, follow me!', 28).setDepth(80);
    bubble(this, 175, 690, 'Hey! My tail!', 24).setDepth(79);
    txt(this, W / 2, 1235, 'tap to skip ▸', 26, '#fff', '#22252b', 5).setDepth(90).setAlpha(0.8);
  }
  // ---------- 7) scripted chase loop: dash -> skid + pause (tail glows) -> dash -> pause -> GRAB -> tug + GOTCHA ----------
  private loopInit(freezeAt: number) {
    const hud = this.room(2, 41);
    const pup = new TailPup(this, 130, 1000, 1.2).setDepth(20), bun = new TailBunny(this, 20, 1050, 1.0, 'wink').setDepth(21);
    const glow = this.add.image(0, 0, 'su_dust').setScale(artScale('su_dust', 2.4)).setTint(0x7dff9a).setBlendMode(Phaser.BlendModes.ADD).setDepth(29).setVisible(false);
    const ring = this.add.graphics().setDepth(30), lines = this.add.graphics().setDepth(8);
    const grab = txt(this, 0, 0, 'GRAB!', 34, '#7dff9a', '#22252b', 7).setDepth(31).setAngle(-6).setVisible(false);
    const skid = txt(this, 0, 0, 'skrrt!', 26, '#fff', '#22252b', 5).setDepth(31).setVisible(false);
    const fade = this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0).setDepth(999).setAlpha(freezeAt < 0 ? 1 : 0);
    this.lp = { pup, bun, glow, ring, lines, grab, skid, fade, dust: [] as { i: Phaser.GameObjects.Image; l: number }[], dustT: 0, caught: false, said: false, stamp: null as any, hud, freezeAt };
    if (freezeAt >= 0) { for (let t = 0; t < freezeAt; t += 1 / 60) this.loopTick(1 / 60); this.frozen = true; }
    else { this.frozen = false; (window as any).__tailLoop = true; }
  }
  update(_t: number, delta: number) { if (!this.frozen && this.lp) this.loopTick(Math.min(delta, 50) / 1000); }
  private loopTick(dt: number) {
    const L = this.lp, T = (this.loopT += dt), E = Phaser.Math.Easing.Sine.InOut;
    // Puppy: dash A 0-0.45, pause 0.45-1.2, dash B 1.2-1.65, pause 1.65-...; Bunny grabs at 3.0
    const D: [number, number, number, number, number, number][] = [[0, 0.45, 130, 1000, 330, 1075], [1.2, 1.65, 330, 1075, 520, 975]];
    let px = 520, py = 975, dashing = false, pauseStart = 1.65;
    for (const [a, b, x0, y0, x1, y1] of D) { if (T < a) { px = x0; py = y0; break; } if (T <= b) { const k = E((T - a) / (b - a)); px = x0 + (x1 - x0) * k; py = y0 + (y1 - y0) * k; dashing = true; break; } px = x1; py = y1; pauseStart = b; }
    if (T >= 0.45 && T < 1.2) pauseStart = 0.45;
    const pup: TailPup = L.pup, bun: TailBunny = L.bun;
    // Bunny: keyframed chase (near miss on pause 1, closes in on pause 2)
    const BK: [number, number, number][] = [[0, 20, 1050], [1.25, 185, 1068], [2.95, 392, 990]];
    let bx = BK[BK.length - 1][1], by = BK[BK.length - 1][2];
    for (let i = 1; i < BK.length; i++) if (T <= BK[i][0]) { const k = (T - BK[i - 1][0]) / (BK[i][0] - BK[i - 1][0]); bx = BK[i - 1][1] + (BK[i][1] - BK[i - 1][1]) * k; by = BK[i - 1][2] + (BK[i][2] - BK[i - 1][2]) * k; break; }
    const moving = T < 2.95 && !L.caught;
    if (!L.caught) { bun.root.setPosition(bx, by); bun.root.setDepth(by > py ? 21 : 19); }
    if (!L.caught && T >= 3.0) { // the grab lands
      L.caught = true; pup.setFrame('panic'); pup.tailStretch = 1.35; bun.setFace('laugh'); bun.pose({ lean: -14, kn: 16, stride: 0 });
      L.glow.setVisible(false); L.ring.clear(); L.grab.setVisible(false);
      this.cameras.main.shake(140, 0.006);
      const g = this.add.graphics({ x: W / 2, y: 560 }).setDepth(70); const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 20; i++) { const r = i % 2 ? 70 : 150; const a = i / 20 * Math.PI * 2; pts.push(new Phaser.Math.Vector2(Math.cos(a) * r * 1.35, Math.sin(a) * r)); }
      g.fillStyle(0xff5c8a, 1).lineStyle(7, COLORS.INK, 1).fillPoints(pts, true).strokePoints(pts, true).fillStyle(0xffffff, 1).fillEllipse(0, 0, 300, 140); g.setAngle(-8);
      const w = comic(this, W / 2, 560, 'GOTCHA!', 84).setAngle(-8).setDepth(71); L.stamp = [g, w]; g.setScale(0); w.setScale(0);
      L.hud.set('Tails 3/6', 38, 3 / 6);
    }
    if (L.caught) {
      const k = Math.min(1, (T - 3.0) / 0.2), sc = Phaser.Math.Easing.Back.Out(k); L.stamp.forEach((o: any) => o.setScale(sc));
      if (T > 3.35 && !L.said) { L.said = true; bubble(this, 210, 700, 'This is mine!', 28).setDepth(80); }
      pup.root.x = 520 + Math.sin(T * 60) * 3; pup.update(dt, 2.4, 0); pup.tail.setAngle(4); // cartoon-running in place
      const tip = pup.tipPos(); for (let i = 0; i < 2; i++) bun.root.x += bun.reachTo(tip.x, tip.y);
      L.dustT -= dt; if (L.dustT <= 0) { L.dustT = 0.05; L.dust.push({ i: this.add.image(pup.root.x + 40, pup.root.y - 4, 'su_dust').setDepth(22), l: 0 }); }
    } else {
      pup.root.setPosition(px, py);
      const inPause = !dashing && T >= 0.45, pk = T - pauseStart;
      if (dashing) { pup.update(dt, 1.8, 0.4); pup.tail.setTint(0x9a8a80); } else { pup.setFrame(pk < 0.18 ? 'run4' : 'stand'); pup.update(dt, 0, 1.4); pup.tail.clearTint(); pup.wagSpd = 7; pup.wagAmp = 26; }
      pup.inner.setAngle(!dashing && pk < 0.18 ? -10 * (1 - pk / 0.18) : dashing ? 6 : 0);
      bun.update(dt, moving ? 1 : 0); bun.pose({ lean: moving ? 9 : 2 });
      if (T > 2.3) { const tip = pup.tipPos(); bun.reachTo(tip.x - 60 * Math.max(0, (2.95 - T) / 0.65), tip.y + 10); bun.pose({ el: -14 * Math.max(0, (2.95 - T) / 0.65) }); }
      L.lines.clear();
      if (dashing) { L.lines.lineStyle(6, 0xffffff, 0.8); for (const [dy, l] of [[-150, 70], [-110, 120], [-70, 90], [-30, 60]]) L.lines.lineBetween(px - 70, py + dy, px - 70 - l, py + dy);
        L.dustT -= dt; if (L.dustT <= 0) { L.dustT = 0.04; L.dust.push({ i: this.add.image(px - 30, py - 4, 'su_dust').setDepth(9), l: 0 }); } }
      if (inPause && pk < 0.05) for (let i = 0; i < 5; i++) L.dust.push({ i: this.add.image(px + 10 + i * 14, py - 6 - (i % 2) * 10, 'su_dust').setDepth(22), l: -i * 0.02 });
      L.skid.setVisible(inPause && pk < 0.5).setPosition(px + 70, py - 40);
      const tip = pup.tipPos();
      L.glow.setVisible(inPause).setPosition(tip.x, tip.y).setAlpha(0.45 + 0.25 * Math.sin(T * 14));
      L.ring.clear(); L.grab.setVisible(inPause);
      if (inPause) { const span = pauseStart < 1 ? 0.75 : 1.35, rr = 40 + 70 * Math.max(0, 1 - pk / span);
        L.ring.lineStyle(10, 0x22252b, 1).strokeCircle(tip.x, tip.y, 40).lineStyle(6, 0x7dff9a, 1).strokeCircle(tip.x, tip.y, 40).lineStyle(4, 0xffffff, 0.9).strokeCircle(tip.x, tip.y, rr);
        L.grab.setPosition(tip.x - 10, tip.y - 82); }
    }
    for (const d of L.dust) { d.l += dt; const k = Math.max(0, d.l) / 0.45; d.i.setScale(artScale('su_dust', 0.8 + k * 1.1)).setAlpha(Math.max(0, 0.85 * (1 - k))); }
    L.dust = L.dust.filter((d: any) => { if (d.l > 0.45) { d.i.destroy(); return false; } return true; });
    if (!L.caught) L.hud.set('Tails 2/6', 41 - T, 2 / 6);
    if (L.freezeAt < 0) L.fade.setAlpha(T < 0.25 ? 1 - T / 0.25 : T > 4.75 ? Math.min(1, (T - 4.75) / 0.25) : 0);
    (window as any).__tailT = T;
  }
  // ---------- 6) tutorial card ----------
  private tutorial() {
    this.chase();
    try { localStorage.removeItem('playroom.tut.tailmock'); } catch { /* */ }
    tutorialCard(this, 'tailmock', 'CATCH PUPPY\nBY THE TAIL!', ['You are BUNNY 🤠🐰', 'DRAG to chase Puppy around', 'From BEHIND, TAP when his tail GLOWS 🟢', `TAP TAP to win the tug. 6 tails wins!`], () => undefined);
  }
}
