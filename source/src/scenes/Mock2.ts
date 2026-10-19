// Static concept mockups for the remaining 7 levels (?mock=1..7). Not part of normal game flow.
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera } from '../systems/resolution';
import { art } from '../art/registry';
import { makeMuteButton } from '../systems/ui';
import { txt, bubble } from '../systems/fx';

export class Mock2Scene extends Phaser.Scene {
  constructor() { super('Mock2'); }
  create(d: { n: number }) {
    setupCamera(this);
    [, this.midnight, this.noir, this.zoe, this.nana, this.iris, this.linye, this.bunny][d.n]?.call(this);
    makeMuteButton(this);
    (window as any).__mockReady = true;
  }
  private sky(a: number, b: number) { const g = this.add.graphics(); g.fillGradientStyle(a, a, b, b, 1).fillRect(0, 0, W, H); return g; }
  private hud(title: string, left: string, right: string, f: number, col = 0xff5c8a) {
    txt(this, 320, 60, title, 30, '#ffdf6b', '#22252b', 8);
    txt(this, 140, 125, left, 28, '#fff', '#22252b', 6); txt(this, 560, 125, right, 28, '#fff', '#22252b', 6);
    const g = this.add.graphics(); g.fillStyle(0x22252b, 1).fillRoundedRect(156, 160, 408, 30, 12); g.fillStyle(col, 1).fillRoundedRect(160, 164, 400 * f, 22, 9);
  }
  private pow(x: number, y: number, word: string, s = 1) {
    const g = this.add.graphics({ x, y }); const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 18; i++) { const r = (i % 2 ? 55 : 120) * s; const a = i / 18 * Math.PI * 2; pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
    g.fillStyle(0xffffff, 1).lineStyle(5, COLORS.INK, 1).fillPoints(pts, true).strokePoints(pts, true);
    txt(this, x, y, word, 58 * s, '#ffdf6b', '#e0243a', 10).setAngle(-10);
    [[-1, -1], [1, -0.6], [0.8, 1], [-0.9, 0.8]].forEach(([dx, dy]) => txt(this, x + dx * 150 * s, y + dy * 110 * s, '★', 40, '#ffdf6b', '#22252b', 4));
  }
  private dmg(x: number, y: number, s: string) { txt(this, x, y, s, 44, '#7dff9a', '#22252b', 8).setAngle(8); }
  private hero(name: string, x: number, y: number, s = 1, body = 0x6b4cc9, tint?: number) {
    const g = this.add.graphics(); g.fillStyle(body, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(x - 55 * s, y + 40 * s, 110 * s, 110 * s, 40 * s).strokeRoundedRect(x - 55 * s, y + 40 * s, 110 * s, 110 * s, 40 * s);
    const h = art(this, x, y, `head_${name}_happy`, s);
    if (tint !== undefined) { h.setTint(tint); g.setAlpha(0); }
    return h;
  }
  private say(x: number, y: number, s: string, size = 26) { bubble(this, x, y, s, size); }
  private banner(y: number, s: string, col: number) {
    const g = this.add.graphics(); g.fillStyle(col, 1).lineStyle(5, COLORS.INK, 1).fillRoundedRect(60, y - 36, W - 120, 72, 30).strokeRoundedRect(60, y - 36, W - 120, 72, 30);
    txt(this, W / 2, y, s, 32, '#fff', '#22252b', 6);
  }
  midnight() {
    this.sky(0x0b1030, 0x3b3f7a);
    const g = this.add.graphics(); g.fillStyle(0xfff3b0, 1).fillCircle(560, 300, 90); g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 30; i++) g.fillCircle((i * 137) % W, 220 + (i * 71) % 400, 2 + (i % 3));
    g.fillStyle(0x1b1d33, 1); [[0, 900, 220], [200, 820, 180], [360, 960, 200], [540, 860, 200]].forEach(([x, y, w]) => { g.fillRect(x, y, w, H - y); g.fillTriangle(x - 10, y, x + w + 10, y, x + w / 2, y - 90); });
    g.fillStyle(0xffd76b, 1); [[60, 980], [130, 1040], [260, 900], [420, 1050], [600, 950]].forEach(([x, y]) => g.fillRect(x, y, 34, 44));
    const t = this.add.graphics(); t.lineStyle(10, 0xb9c3ff, 0.5); t.beginPath(); t.arc(200, 420, 260, -0.2, 1.2); t.strokePath();
    this.hero('Midnight', 400, 640, 1.0, 0x6b4cc9).setAngle(25);
    const wing = this.add.graphics(); wing.fillStyle(0x3b3f5c, 1).lineStyle(6, COLORS.INK, 1);
    wing.fillTriangle(330, 690, 120, 600, 260, 760).strokeTriangle(330, 690, 120, 600, 260, 760); wing.fillTriangle(470, 690, 680, 600, 540, 760).strokeTriangle(470, 690, 680, 600, 540, 760);
    art(this, 420, 900, 'pup_panic', 0.9).setAngle(-15);
    this.pow(560, 790, 'SNATCH!', 0.9); this.dmg(200, 820, '+700 DIVE!');
    this.hud('MIDNIGHT — MOONLIGHT DIVE', 'CATCHES 2/4', '0:31', 0.55, 0x9b8cff);
    this.say(250, 400, 'Midnight: Caw-ght you, Puppy!');
    this.banner(1210, 'HOLD to glide • RELEASE to dive!', 0x6b4cc9);
  }
  noir() {
    this.sky(0x2a1b3a, 0x6b4c7a);
    const g = this.add.graphics(); g.fillStyle(0x8a5a3a, 1).fillRect(0, 760, W, H); g.fillStyle(0x6b442c, 1); for (let y = 780; y < H; y += 60) g.fillRect(0, y, W, 4);
    g.fillStyle(0x3a2a4a, 1).fillRoundedRect(40, 520, 200, 260, 20); g.fillStyle(0xffd76b, 0.25).fillTriangle(620, 300, 380, 1100, 860, 1100);
    g.fillStyle(0x5a3f2a, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(430, 620, 240, 160, 16).strokeRoundedRect(430, 620, 240, 160, 16);
    art(this, 560, 1000, 'pup_panic', 1.0);
    txt(this, 560, 720, '?!', 70, '#ffdf6b', '#22252b', 8);
    this.hero('Noir', 260, 930, 1.0, 0x222222).setAngle(-20);
    const paw = this.add.graphics(); paw.fillStyle(0x3a3438, 1).lineStyle(6, COLORS.INK, 1).fillEllipse(440, 930, 120, 70).strokeEllipse(440, 930, 120, 70);
    this.pow(540, 870, 'POUNCE!', 0.85); this.dmg(400, 1150, '+900 SILENT!');
    this.hud('NOIR — SNEAKY POUNCE', 'GRABS 3/5', 'NOISE', 0.25, 0x7dff9a);
    this.say(300, 400, 'Noir: Shh... boop. Gotcha, Puppy.');
    this.banner(1215, 'Freeze when he looks! Tap to POUNCE!', 0x222222);
  }
  zoe() {
    this.sky(0x9be7ff, 0xfff3b0);
    const g = this.add.graphics(); g.fillStyle(0x6cc04a, 1).fillRect(0, 700, W, H);
    const hives = [[160, 560], [360, 520], [560, 560], [160, 860], [360, 820], [560, 860]];
    hives.forEach(([x, y]) => { g.fillStyle(0xffc021, 1).lineStyle(6, COLORS.INK, 1).fillEllipse(x, y, 160, 140).strokeEllipse(x, y, 160, 140);
      g.lineStyle(4, 0xc98a00, 1); g.lineBetween(x - 70, y - 20, x + 70, y - 20); g.lineBetween(x - 75, y + 20, x + 75, y + 20); g.fillStyle(0x3a2013, 1).fillEllipse(x, y + 30, 60, 40); });
    art(this, 560, 840, 'pup_dizzy', 0.6).setAngle(10);
    art(this, 160, 580, 'pup_panic', 0.5);
    this.hero('Zoe', 380, 1080, 1.0, 0xff8a1f);
    const pan = this.add.graphics(); pan.fillStyle(0x777777, 1).lineStyle(6, COLORS.INK, 1).fillCircle(530, 760, 60).strokeCircle(530, 760, 60); pan.fillStyle(0x553311, 1).fillRect(440, 820, 70, 20);
    this.pow(570, 700, 'BONK!', 0.9); this.dmg(380, 640, 'COMBO x5!');
    this.hud('ZOE — HONEY HIVE BONK', 'BONKS 17', '0:22', 0.62, 0xffc021);
    this.say(300, 330, 'Zoe: Bear hugs are optional. Bonks are not!');
    this.banner(1225, 'Tap the hive Puppy pops out of!', 0xff8a1f);
  }
  nana() {
    this.sky(0x8fd3ff, 0xd9f4ff);
    const g = this.add.graphics(); g.fillStyle(0x4cb050, 1).fillRect(0, 900, W, H);
    g.fillStyle(0x7a4520, 1).lineStyle(6, COLORS.INK, 1).fillRect(-20, 260, 520, 50).strokeRect(-20, 260, 520, 50);
    g.fillStyle(0x2f9e5b, 1).fillCircle(60, 220, 120).fillCircle(240, 200, 110);
    this.hero('Nana', 330, 160, 0.9, 0x3a86ff);
    const tail = this.add.graphics(); tail.fillStyle(0xe08a3c, 1).lineStyle(6, COLORS.INK, 1).fillEllipse(230, 200, 90, 160).strokeEllipse(230, 200, 90, 160);
    [[420, 420], [470, 560], [510, 700]].forEach(([x, y], i) => { g.fillStyle(0xc27230, 1).lineStyle(4, COLORS.INK, 1).fillEllipse(x, y, 36, 44).strokeEllipse(x, y, 36, 44);
      g.fillStyle(0x7a4520, 1).fillEllipse(x, y - 18, 40, 16); if (i < 2) { g.lineStyle(4, 0xffffff, 0.6).lineBetween(x - 20, y - 50, x - 40, y - 90); } });
    art(this, 540, 1010, 'pup_panic', 0.9).setAngle(-10);
    txt(this, 380, 1020, '💨', 60);
    this.pow(560, 860, 'TONK!', 0.85); this.dmg(240, 760, '+300 HEAD!');
    this.hud('NANA — ACORN BARRAGE', 'ACORNS 23', 'HITS 9/12', 0.75, 0xc27230);
    this.say(470, 380, 'Nana: Nuts to you, Puppy!', 24);
    this.banner(1215, 'Drag to aim • release to fling!', 0x3a86ff);
  }
  iris() {
    this.sky(0x2b2f4a, 0x5a5f8a);
    const g = this.add.graphics(); g.fillStyle(0x444a5c, 1).fillRect(0, 980, W, H); g.fillStyle(0x6b6f88, 1).fillRect(0, 360, W, 40);
    g.fillStyle(0x7a8a8a, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(260, 220, 200, 150, 14).strokeRoundedRect(260, 220, 200, 150, 14);
    this.hero('Iris', 360, 180, 0.8, 0x8a3ffc);
    txt(this, 120, 300, 'NEXT:', 26, '#fff', '#22252b', 5); txt(this, 120, 345, '🥫🍌👟', 34);
    const junk = this.add.graphics(); junk.fillStyle(0xe0e0e0, 1).lineStyle(5, COLORS.INK, 1).fillRoundedRect(330, 760, 70, 90, 10).strokeRoundedRect(330, 760, 70, 90, 10);
    txt(this, 365, 805, '🥫', 44); txt(this, 365, 650, '⬇', 60, '#ffdf6b', '#22252b', 6);
    art(this, 370, 1050, 'pup_dizzy', 0.9);
    const shadow = this.add.graphics(); shadow.fillStyle(0x000000, 0.3).fillEllipse(370, 1060, 160, 30);
    this.pow(500, 860, 'CLONK!', 0.85); this.dmg(200, 900, 'PERFECT DROP!');
    this.hud('IRIS — TRASH-CAN DROP', 'BONKS 6/8', 'MISS 1', 0.75, 0x8a3ffc);
    this.say(360, 480, 'Iris: Special delivery, Puppy!', 24);
    this.banner(1215, 'Tap to drop when the shadow lines up!', 0x8a3ffc);
  }
  linye() {
    this.sky(0x05030a, 0x1a1030);
    const g = this.add.graphics(); g.fillStyle(0xffffff, 0.06).fillCircle(W / 2, 620, 340);
    for (let i = 0; i < 40; i++) g.fillStyle(0xb98cff, 0.4).fillCircle((i * 97) % W, (i * 211) % H, 2);
    const h = this.hero('Linye', W / 2, 560, 1.7, 0x000000, 0x120c18);
    txt(this, W / 2, 560, '?', 160, '#ffdf6b', '#22252b', 12);
    art(this, 520, 1030, 'pup_panic', 0.9);
    txt(this, 520, 860, '!?', 60, '#ffdf6b', '#22252b', 8);
    this.pow(250, 960, 'TAG!', 0.8);
    this.hud('LINYE — SHADOW TAG', 'TAGS 0/12', '0:45', 0.1, 0xb98cff);
    this.say(W / 2, 300, 'Linye: Tag, Puppy! You are IT!');
    this.banner(1215, 'Beat 7 levels to find out...', 0x3b1f5e); void h;
  }
  bunny() {
    this.sky(0x5b2a6e, 0xff9fc0);
    const g = this.add.graphics(); g.fillStyle(0xc77a4a, 1).fillRect(0, 820, W, H); g.fillStyle(0xe0243a, 1).fillRect(0, 0, 110, 820).fillRect(610, 0, 110, 820);
    g.fillStyle(0xffffff, 0.12).fillTriangle(360, 0, 160, 900, 560, 900);
    art(this, W / 2, 330, 'pr_logo_glow', 1.3);
    art(this, 200, 1180, 'bun_full_wink', 1.0);
    art(this, 230, 900, 'lasso', 1.6).setAngle(10);
    const rope = this.add.graphics(); rope.lineStyle(10, 0x8a5a2b, 1); rope.beginPath(); rope.moveTo(250, 1020); rope.lineTo(500, 980); rope.strokePath();
    rope.lineStyle(10, 0xc9925a, 1).strokeEllipse(520, 940, 150, 60);
    art(this, 520, 1060, 'pup_panic', 1.0).setAngle(12);
    this.pow(560, 760, 'YEE-HAW!', 0.9); this.dmg(380, 640, 'ROPED! +1000');
    this.hud('BUNNY — PLAYROOM RODEO', 'ROPED 4/5', '0:18', 0.8, 0xff5c8a);
    this.say(330, 520, 'Bunny: Yee-haw! Gotcha, Puppy!');
    this.banner(1240, 'Swipe circles to spin • flick to throw!', 0xe0243a);
  }
}
