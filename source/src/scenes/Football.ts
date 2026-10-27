// Glassia PENALTY PUP (door 2, scene key 'Football'). You are Glassia taking penalties; Puppy is the goalkeeper.
// Puppy wiggles (tell: lean + ear twitch + eye-dart lines toward a side), then COMMITS to a dive. Shoot AFTER the dive
// starts, to the other corner = GOAL + slapstick. Shoot before he commits = he saves it. Middle chip on a diving Puppy =
// NOGGIN BONK bonus. Shots 1-3 honest tells; 4-6 feints (ghost afterimage + FAKE! stamp); 7-8 double wiggle + MEGA gloves.
// 8 shots; every goal drains 20% of PUPPY PRIDE (a noggin bonk 30%). Empty the bar (5 goals) to win.
// Aim: SWIPE in any direction (about 60 px is enough; only the direction counts, dotted preview while dragging) or TAP a corner.
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art } from '../art/registry';
import { makeMuteButton, pointerInMute } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, sparks, comic, flashVignette } from '../systems/kit';
import { impact } from '../systems/level';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { CHEEKY, mix } from '../lines'; // cheeky pass
import { HeroRig } from '../systems/rigs';

// ---------------- tuning (iPhone real-touch, ~100 ms input latency; see tests/glassia_realtouch.mjs) ----------------
export const PK = {
  SHOTS: 8, NEED: 5, DRAIN: 0.2, DRAIN_NOGGIN: 0.3,
  /** after the commit (crouch) starts, a shot released within this many ms still counts (all >= 450 ms by spec) */
  WINDOW: [1200, 1200, 1200, 1100, 1100, 1100, 1000, 1000],
  /** chance of a fake-out per shot (shot 4-6 always has at least one) */
  FEINT_P: [0, 0, 0, 0.85, 0.85, 0.85, 0.75, 0.75],
  READY: [700, 1100], TELL: [850, 1250], CROUCH: 110, DIVE: 380,
  FLIGHT: 350, CHIP: 470, KICK_CONTACT: 120, SWIPE_MIN: 60, MID: 85,
  RESETS: 3, // he gets back up this many times if Glassia never shoots, then the shot is lost
};
const KX = 360, KY = 768, KM = 1.55; // keeper feet + art scale (2.07x the old 0.75 Puppy)
const GOAL = { cx: 360, x0: 70, x1: 650, top: 440, ground: 770 };
type Zone = { x: number; y: number; side: -1 | 0 | 1; high: boolean };
const ZONES: Zone[] = [{ x: 175, y: 525, side: -1, high: true }, { x: 175, y: 700, side: -1, high: false }, { x: 360, y: 548, side: 0, high: true },
  { x: 545, y: 525, side: 1, high: true }, { x: 545, y: 700, side: 1, high: false }];
const INK = 0x22252b, FUR = 0xc97830, FUR_INK = 0x3b1f10, GLOVE = 0x7dff9a;
type Vis = { k: string; side: number; at: number };

/** Keeper Puppy: the arm-less boxing Puppy art + two noodle arms with goalkeeper gloves, all in one container so they rotate together. */
class Keeper {
  c: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image; arms: Phaser.GameObjects.Graphics; wrap: Phaser.GameObjects.Graphics; sh: Phaser.GameObjects.Ellipse;
  h: number; gl = { lx: 0, ly: 0, rx: 0, ry: 0 }; glove = 1; armsOn = true; flail = 0;
  constructor(private s: Phaser.Scene) {
    this.c = s.add.container(KX, KY).setDepth(30);
    this.img = art(s, 0, 0, 'pup_box_idle', KM); this.h = this.img.displayHeight;
    this.arms = s.add.graphics(); this.wrap = s.add.graphics().setVisible(false);
    this.c.add([this.img, this.arms, this.wrap]);
    this.sh = s.add.ellipse(KX, KY + 4, this.h * 0.7, this.h * 0.18, 0x0b3a14, 0.3).setDepth(14);
    this.ready(true);
  }
  /** ready stance: gloves up and out at shoulder height */
  ready(now = false, dur = 160) { const h = this.h, to = { lx: -0.5 * h, ly: -0.62 * h, rx: 0.5 * h, ry: -0.62 * h }; this.reachTo(to, now ? 0 : dur); }
  reachTo(to: Partial<Keeper['gl']>, dur = 160, ease = 'Quad.Out') { this.s.tweens.killTweensOf(this.gl); if (!dur) Object.assign(this.gl, to); else this.s.tweens.add({ targets: this.gl, ...to, duration: dur, ease }); }
  /** local point of a world target if the container were at (px,py) with angle a (deg) */
  localAt(tx: number, ty: number, px: number, py: number, a: number) { const r = -Phaser.Math.DegToRad(a), dx = tx - px, dy = ty - py; return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) }; }
  world(lx: number, ly: number) { const m = this.c.getWorldTransformMatrix(); return m.transformPoint(lx, ly, { x: 0, y: 0 }) as { x: number; y: number }; }
  gloveMid() { return this.world((this.gl.lx + this.gl.rx) / 2, (this.gl.ly + this.gl.ry) / 2); }
  head() { return this.world(0, -0.78 * this.h); }
  setTex(k: string) { this.img.setTexture(k); return this; }
  draw(t: number) {
    const g = this.arms.clear(); this.sh.setPosition(this.c.x, KY + 4).setScale(1 - Math.min(0.5, (KY - this.c.y) / 400));
    if (!this.armsOn) return;
    // arms raised over his head go BEHIND the body (so the noodles never cross his face)
    const up = this.gl.ly < -0.7 * this.h && this.gl.ry < -0.7 * this.h, i = this.c.getIndex(this.arms);
    if (up && i !== 0) this.c.sendToBack(this.arms); else if (!up && i === 0) this.c.moveAbove(this.arms as Phaser.GameObjects.GameObject, this.img as Phaser.GameObjects.GameObject);
    const h = this.h, u = h / 270, w = 20 * u, fl = this.flail;
    for (const sd of [-1, 1]) {
      const sx = sd * 0.17 * h, sy = -0.42 * h; let gx = sd < 0 ? this.gl.lx : this.gl.rx, gy = sd < 0 ? this.gl.ly : this.gl.ry;
      if (fl) { gx += Math.sin(t / 55 + sd) * 26 * u * fl; gy += Math.cos(t / 47 + sd * 2) * 22 * u * fl; }
      const mx = (sx + gx) / 2 + sd * 18 * u, my = (sy + gy) / 2 + 14 * u;
      const cv = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(gx, gy)), pts = cv.getPoints(10);
      g.lineStyle(w + 10, FUR_INK, 1).strokePoints(pts); g.lineStyle(w, FUR, 1).strokePoints(pts);
      const r = 30 * u * this.glove, a = Math.atan2(gy - sy, gx - sx);
      g.fillStyle(0xffffff, 1).lineStyle(5, INK, 1).fillCircle(gx - Math.cos(a) * r * 0.75, gy - Math.sin(a) * r * 0.75, r * 0.55).strokeCircle(gx - Math.cos(a) * r * 0.75, gy - Math.sin(a) * r * 0.75, r * 0.55);
      g.fillStyle(GLOVE, 1).lineStyle(6, INK, 1).fillCircle(gx, gy, r).strokeCircle(gx, gy, r);
      g.lineStyle(4, INK, 0.6); for (const k of [-1, 0, 1]) g.lineBetween(gx + Math.cos(a) * r * 0.15 + Math.sin(a) * k * r * 0.36, gy + Math.sin(a) * r * 0.15 - Math.cos(a) * k * r * 0.36, gx + Math.cos(a) * r * 0.85 + Math.sin(a) * k * r * 0.36, gy + Math.sin(a) * r * 0.85 - Math.cos(a) * k * r * 0.36);
      g.fillStyle(0xffffff, 0.5).fillCircle(gx - r * 0.3, gy - r * 0.35, r * 0.25);
    }
  }
  /** burrito: net mesh wrapped round his body (local coords, so it swings with him) */
  drawWrap() {
    const g = this.wrap.clear().setVisible(true), h = this.h, cx = 0, cy = -0.47 * h, rx = 0.42 * h, ry = 0.55 * h, inE = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    g.fillStyle(0xffffff, 0.12).fillEllipse(cx, cy, rx * 2, ry * 2);
    g.lineStyle(4, INK, 0.5); const sp = 26;
    for (let i = -14; i <= 14; i++) for (let j = -14; j <= 14; j++) { const x = cx + (i + j) * sp / 2, y = cy + (j - i) * sp / 2; if (!inE(x, y)) continue;
      for (const [dx, dy] of [[sp / 2, sp / 2], [sp / 2, -sp / 2]]) if (inE(x + dx, y + dy)) g.lineBetween(x, y, x + dx, y + dy); }
    g.lineStyle(4, 0xffffff, 0.95);
    for (let i = -14; i <= 14; i++) for (let j = -14; j <= 14; j++) { const x = cx + (i + j) * sp / 2, y = cy + (j - i) * sp / 2; if (!inE(x, y)) continue;
      for (const [dx, dy] of [[sp / 2, sp / 2], [sp / 2, -sp / 2]]) if (inE(x + dx, y + dy)) g.lineBetween(x, y - 1, x + dx, y + dy - 1); }
    g.lineStyle(7, 0xffffff, 1).strokeEllipse(cx, cy, rx * 2, ry * 2).lineStyle(3, INK, 0.6).strokeEllipse(cx, cy, rx * 2 + 6, ry * 2 + 6);
    // knot ties at the top and bottom, like a wrapped burrito
    g.fillStyle(0xffffff, 1).lineStyle(4, INK, 1).fillCircle(cx, cy - ry, 10).strokeCircle(cx, cy - ry, 10).fillCircle(cx, cy + ry, 10).strokeCircle(cx, cy + ry, 10);
  }
}

export class FootballScene extends Phaser.Scene {
  st = this.fresh();
  private kp!: Keeper; private gla!: HeroRig; private ball!: Phaser.GameObjects.Container; private ballSh!: Phaser.GameObjects.Ellipse;
  private BALL0 = { x: KX, y: 1210 }; private GX = 293; private GY = 1238;
  private aimG!: Phaser.GameObjects.Graphics; private zoneG!: Phaser.GameObjects.Graphics; private tellG!: Phaser.GameObjects.Graphics; private bulge!: Phaser.GameObjects.Graphics;
  private frame!: Phaser.GameObjects.Graphics; private netBack!: Phaser.GameObjects.Graphics; private strings!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics; private ghost = 1; private subT!: Phaser.GameObjects.Text; private marks: Phaser.GameObjects.Text[] = [];
  private bun!: Phaser.GameObjects.Image; private clapG!: Phaser.GameObjects.Graphics; private clapping = false; private crowd: Phaser.GameObjects.Image[] = [];
  private seq = 0; private down?: { x: number; y: number; t: number }; private held: 'none' | 'kp' | 'gla' = 'none';
  private dizzy?: Phaser.GameObjects.Container; private tellTw?: Phaser.Tweens.Tween; private firstEarly = true; private bagReact: string[] = []; private hiddenBall = false;
  private feintsUsed = 0; private outroCard?: () => void;
  constructor() { super('Football'); }
  private fresh() {
    return { shot: 0, goals: 0, noggins: 0, pride: 1, results: [] as (string | undefined)[], phase: 'intro', ready: false, over: false, score: 0,
      commitAt: 0, lastCommit: 0, react: null as number | null, side: 0, fired: false, resets: 0, vis: { k: 'intro', side: 0, at: 0 } as Vis, last: '', hits: 0, kick: 0, mega: false };
  }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250);
    this.st = this.fresh(); this.seq = 0; this.held = 'none'; this.ghost = 1; this.marks = []; this.crowd = []; this.firstEarly = true; this.bagReact = [];
    this.tweens.timeScale = 1; this.time.timeScale = 1; this.gnow = 0; this.clapping = false; this.down = undefined; this.dizzy = undefined; this.feintsUsed = 0; this.outroCard = undefined; this.hiddenBall = false;
    art(this, 0, 0, 'bg_pitch');
    // the pitch art's ad board still says BALL BONK: paint our own board over it
    const ad = this.add.graphics().setDepth(1); ad.fillGradientStyle(0xf25d8f, 0xf25d8f, 0xc23a58, 0xc23a58, 1).fillRect(0, 290, W, 41);
    txt(this, W / 2, 311, 'PENALTY PUP  •  BUNNY PLAYROOM  •  PENALTY PUP', 24, '#fff0f4', '#a02848', 3).setDepth(2);
    ['Ruby', 'Zoe', 'Nana', 'Iris', 'Noir'].forEach((n, i) => this.crowd.push(art(this, 80 + i * 140, 262, `head_${n}_happy`, 0.38)));
    this.drawGoal();
    this.zoneG = this.add.graphics().setDepth(13); this.drawZones(0.22);
    this.bulge = this.add.graphics().setDepth(13);
    this.kp = new Keeper(this);
    this.tellG = this.add.graphics().setDepth(60);
    this.strings = this.add.graphics().setDepth(36);
    this.add.ellipse(KX, 1236, 64, 20, 0xffffff, 0.85).setDepth(13); // penalty spot
    this.gla = new HeroRig(this, 'Glassia', this.GX, this.GY, 1.15, { number: '7', tail: true }).setDepth(40);
    const rf = this.gla.point('rf'); this.GX += KX - (rf.x + 38); this.gla.setPosition(this.GX, this.GY); this.BALL0 = { x: KX, y: rf.y - 24 };
    this.ballSh = this.add.ellipse(this.BALL0.x, this.BALL0.y + 28, 58, 16, 0x0b3a14, 0.35).setDepth(44);
    this.ball = this.add.container(this.BALL0.x, this.BALL0.y).setDepth(45);
    const bg = this.add.graphics(); bg.fillStyle(0xffffff, 1).lineStyle(5, COLORS.INK, 1).fillCircle(0, 0, 32).strokeCircle(0, 0, 32);
    bg.fillStyle(COLORS.INK, 1).fillCircle(0, 0, 10); [0, 1, 2, 3, 4].forEach(i => { const a = i * 1.256; bg.fillCircle(Math.cos(a) * 24, Math.sin(a) * 24, 6); });
    bg.fillStyle(0xffffff, 0.6).fillCircle(-12, -14, 6); this.ball.add(bg);
    this.aimG = this.add.graphics().setDepth(50);
    this.bun = art(this, 646, 1262, 'bun_full_laugh', 0.5).setDepth(38); this.clapG = this.add.graphics().setDepth(39);
    // HUD
    txt(this, W / 2 - 40, 46, 'PENALTY PUP', 40, '#ffdf6b', '#22252b', 8).setDepth(600);
    this.subT = txt(this, W / 2 - 40, 92, '', 26, '#fff', '#22252b', 6).setDepth(600);
    this.bar = this.add.graphics().setDepth(600);
    art(this, 86, 186, 'pup_box_dizzy', 0.36).setDepth(601);
    txt(this, 140, 134, 'PUPPY PRIDE', 22, '#fff', '#22252b', 5).setDepth(601).setOrigin(0, 0.5);
    this.marks = Array.from({ length: PK.SHOTS }, (_, i) => txt(this, 400 + i * 34, 134, '●', 22, '#ffffff', '#22252b', 4).setDepth(601));
    makeMuteButton(this); makePauseButton(this, () => !this.st.over); setPageBg(0x4fb3ff, 0x2f8f3a);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    (window as any).__pr = { scene: 'Football', st: this.st, force: (win: boolean) => this.finish(win), pup: () => ({ x: this.kp.c.x, y: this.kp.c.y }),
      zones: () => ZONES.map(z => ({ ...z })), ball: () => ({ x: this.ball.x, y: this.ball.y }), now: () => this.gnow, tune: PK };
    this.updateHud(); this.drawBar();
    tutorialCard(this, 'glassia_pen1', 'PENALTY PUP!', ['You are GLASSIA! Puppy is in goal.', 'Watch his WIGGLE... wait for the DIVE!', 'Then SWIPE (or tap) the OTHER corner.', 'Too early? He saves it!', `${PK.SHOTS} shots: score ${PK.NEED} goals to win!`], () => this.begin());
  }
  // ---------------- drawing ----------------
  private drawGoal() {
    const { cx, x0, x1, top, ground } = GOAL, bx0 = x0 + 50, bx1 = x1 - 50, btop = top + 40, bg = ground - 30;
    const g = this.netBack = this.add.graphics().setDepth(12);
    g.fillStyle(0xffffff, 0.12).fillRect(bx0, btop, bx1 - bx0, bg - btop);
    g.lineStyle(3, 0xffffff, 0.55); for (let i = 0; i <= 14; i++) { const t = i / 14; g.lineBetween(bx0 + (bx1 - bx0) * t, btop, bx0 + (bx1 - bx0) * t, bg); g.lineBetween(x0 + (x1 - x0) * t, top, bx0 + (bx1 - bx0) * t, btop); }
    for (let j = 0; j <= 8; j++) { const t = j / 8; g.lineBetween(bx0, btop + (bg - btop) * t, bx1, btop + (bg - btop) * t); g.lineBetween(x0, top + (ground - top) * t, bx0, btop + (bg - btop) * t); g.lineBetween(x1, top + (ground - top) * t, bx1, btop + (bg - btop) * t); }
    this.add.ellipse(cx, ground + 6, x1 - x0 + 60, 30, 0x0b3a14, 0.25).setDepth(11);
    const f = this.frame = this.add.graphics({ x: 0, y: 0 }).setDepth(35);
    f.fillStyle(0xffffff, 1).lineStyle(6, INK, 1).fillRect(x0 - 14, top - 14, 28, ground - top + 14).strokeRect(x0 - 14, top - 14, 28, ground - top + 14).fillRect(x1 - 14, top - 14, 28, ground - top + 14).strokeRect(x1 - 14, top - 14, 28, ground - top + 14);
    f.fillRect(x0 - 14, top - 14, x1 - x0 + 28, 28).strokeRect(x0 - 14, top - 14, x1 - x0 + 28, 28); f.fillStyle(0xdfe6f2, 1).fillRect(x0 - 4, top - 4, 8, ground - top).fillRect(x1 - 4, top - 4, 8, ground - top);
  }
  private drawZones(a: number, hi?: Zone) {
    const g = this.zoneG.clear();
    for (const z of ZONES) { const on = z === hi; g.lineStyle(on ? 8 : 4, on ? 0xffdf6b : 0xffffff, on ? 1 : a).strokeCircle(z.x, z.y, on ? 50 : 42); if (on) g.lineStyle(5, 0xffffff, 1).strokeCircle(z.x, z.y, 30); }
  }
  private drawBar() {
    const g = this.bar.clear(), x0 = 140, y = 186, w = 420, h = 34, f = Math.max(0, this.st.pride), gh = Math.max(f, this.ghost);
    g.fillStyle(INK, 1).fillRoundedRect(x0 - 7, y - h / 2 - 7, w + 14, h + 14, 18); g.fillStyle(0x4a2a3a, 1).fillRoundedRect(x0, y - h / 2, w, h, 12);
    if (gh > f + 0.001) g.fillStyle(0xffffff, 1).fillRoundedRect(x0 + w * f - (f > 0.02 ? 8 : 0), y - h / 2, w * (gh - f) + (f > 0.02 ? 8 : 0), h, 10);
    const col = f > 0.5 ? 0x5ee36a : f > 0.25 ? 0xffd23f : 0xff4b5c; if (f > 0.01) g.fillStyle(col, 1).fillRoundedRect(x0, y - h / 2, Math.max(24, w * f), h, 12);
    if (f > 0.04) g.fillStyle(0xffffff, 0.35).fillRoundedRect(x0 + 8, y - h / 2 + 5, Math.max(10, w * f - 16), 8, 4);
  }
  private drain(k: number) {
    const s = this.st; this.ghost = Math.max(this.ghost, s.pride); s.pride = Math.max(0, s.pride - k); this.drawBar();
    const o = { v: this.ghost }; this.tweens.add({ targets: o, v: s.pride, delay: 500, duration: 420, ease: 'Quad.In', onUpdate: () => { this.ghost = o.v; this.drawBar(); } });
    floatText(this, 140 + 420 * s.pride + 40, 230, `-${Math.round(k * 100)}%`, '#ff6b6b', 34);
  }
  private updateHud() {
    const s = this.st; this.subT.setText(`SHOT ${Math.min(s.shot + 1, PK.SHOTS)}/${PK.SHOTS}    GOALS ${s.goals}/${PK.NEED}`);
    this.marks.forEach((m, i) => { const r = s.results[i]; m.setText(r === undefined ? (i === s.shot && !s.over ? '◉' : '●') : r === 'goal' || r === 'noggin' ? '★' : '✖')
      .setColor(r === undefined ? (i >= 6 ? '#ffb0b8' : '#ffffff') : r === 'goal' || r === 'noggin' ? '#ffdf6b' : '#ff3b6b'); });
  }
  /** shot-timing clock: scene time that respects time.timeScale (hit-stop / test freezes cannot turn a fair shot into an early one) */
  private gnow = 0;
  update(t: number, dt: number) {
    this.gnow += dt * this.time.timeScale; this.kp.draw(t);
    if (this.held === 'kp') { const m = this.kp.gloveMid(); this.ball.setPosition(m.x, m.y - 6); this.ballSh.setAlpha(0); }
    else if (this.held === 'gla') { const p = this.gla.point('rp'); this.ball.setPosition(p.x, p.y - 30); this.ballSh.setAlpha(0); }
    if (this.strings.visible && this.kp.wrap.visible) { const top = this.kp.world(0, -0.47 * this.kp.h - 0.55 * this.kp.h); const g = this.strings.clear(); g.lineStyle(4, 0xffffff, 0.9);
      for (const x of [GOAL.cx - 120, GOAL.cx - 40, GOAL.cx + 40, GOAL.cx + 120]) g.lineBetween(x, GOAL.top + 10, top.x + (x - GOAL.cx) * 0.12, top.y + 6); }
    if (this.dizzy?.active) { const hp = this.kp.head(); this.dizzy.setPosition(hp.x, hp.y - 30); this.dizzy.list.forEach((o, i) => { const a = t / 200 + i * 2.09; (o as Phaser.GameObjects.Text).setPosition(Math.cos(a) * 60, Math.sin(a) * 16); }); }
    if (this.clapping) { const g = this.clapG.clear(), k = Math.abs(Math.sin(t / 110)), bx = this.bun.x, by = this.bun.y - 46 + Math.sin(t / 220) * 3;
      g.fillStyle(0xffffff, 1).lineStyle(4, INK, 1); for (const sd of [-1, 1]) g.fillCircle(bx + sd * (5 + 18 * k), by, 9).strokeCircle(bx + sd * (5 + 18 * k), by, 9);
      if (k < 0.12) { g.lineStyle(4, 0xffdf6b, 1); for (const a of [-0.6, 0, 0.6]) g.lineBetween(bx + Math.sin(a) * 26, by - 22 - Math.cos(a) * 4, bx + Math.sin(a) * 40, by - 34 - Math.cos(a) * 10); } }
  }
  // ---------------- flow ----------------
  private after(ms: number, fn: () => void) { const tok = this.seq; return this.time.delayedCall(ms, () => { if (tok === this.seq && !this.st.over) fn(); }); }
  private vis(k: string, side = 0) { this.st.vis = { k, side, at: this.time.now }; }
  private begin() {
    popBanner(this, 'WAIT FOR THE DIVE!', 820, 0x3a86ff, 900);
    this.time.delayedCall(500, () => say(this, 300, 860, pick(LINES.penStart), 24, 1600));
    this.time.delayedCall(900, () => this.startShot());
  }
  private rnd(a: [number, number]) { return Phaser.Math.Between(a[0], a[1]); }
  private startShot(reset = false) {
    const s = this.st; if (s.over) return; const tok = ++this.seq; void tok;
    s.phase = 'ready'; s.commitAt = 0; s.side = 0; s.fired = false; if (!reset) { s.resets = 0; s.lastCommit = 0; }
    const back = reset ? 0 : this.returnHome(); this.tellG.clear();
    if (!reset) { this.held = 'none'; this.ball.setPosition(this.BALL0.x, this.BALL0.y).setAngle(0).setAlpha(1).setDepth(45).setScale(0.5); this.tweens.add({ targets: this.ball, scale: 1, duration: 260, ease: 'Back.Out' });
      this.ballSh.setPosition(this.BALL0.x, this.BALL0.y + 28).setScale(1).setAlpha(0.35); this.gla.setMood('smug').setPosition(this.GX, this.GY); }
    this.updateHud(); this.drawZones(0.22); this.vis('ready');
    const n = s.shot;
    if (n === 6 && !s.mega && !reset) { s.mega = true; popBanner(this, pick(LINES.penLast), 900, 0xe0243a, 1100); this.tweens.add({ targets: this.kp, glove: 1.65, duration: 500, ease: 'Back.Out', delay: 300 });
      this.time.delayedCall(700, () => say(this, 470, 380, pick(LINES.penGloves), 24, 1500)); }
    else if (!reset && n < 6 && PK.NEED - s.goals === PK.SHOTS - n && s.goals < PK.NEED) popBanner(this, pick(LINES.penMust), 900, 0xe0243a, 900);
    else if (!reset && (n === 0 || Math.random() < 0.35)) this.time.delayedCall(250, () => !s.fired && !s.over && say(this, 300, 860, pick(LINES.penGlassia), 22, 1300));
    s.ready = true;
    // plan this shot's routine
    let t = back + this.rnd(PK.READY as [number, number]) + (n === 6 && !reset ? 900 : 0);
    const A: -1 | 1 = Math.random() < 0.5 ? -1 : 1; const steps: [number, () => void][] = [];
    let feint = Math.random() < PK.FEINT_P[n]; if (n === 5 && this.feintsUsed === 0) feint = true; // shots 4-6 always show at least one fake-out
    if (feint) this.feintsUsed++;
    if (n >= 6) { // double wiggle
      const d1 = 520, d2 = 520; steps.push([t, () => this.tell(A, d1)]); t += d1; steps.push([t, () => this.tell(-A as -1 | 1, d2)]); t += d2;
      if (Math.random() < 0.5) { steps.push([t, () => this.tell(A, 420)]); t += 420; }
    } else { const d = this.rnd(PK.TELL as [number, number]) - (reset ? 250 : 0); steps.push([t, () => this.tell(A, d)]); t += d; }
    let side: -1 | 1 = n >= 6 ? (Math.random() < 0.5 ? -1 : 1) : A;
    if (feint) { const fs: -1 | 1 = n >= 6 ? side : A; steps.push([t, () => this.fake(fs)]); t += 520 + this.rnd([300, 520]); side = Math.random() < 0.7 ? (-fs as -1 | 1) : fs;
      const s2 = side; steps.push([t, () => this.tell(s2, 380)]); t += 380; }
    const cs = side; steps.push([t, () => this.commit(cs)]);
    for (const [at, fn] of steps) this.after(at, fn);
    if (n === 0 && !reset) this.time.delayedCall(t - 200, () => s.shot === 0 && !s.fired && s.phase !== 'commit' && !s.over && Math.random() < 0.6 && say(this, 470, 380, pick(LINES.penTell), 22, 900));
  }
  /** between shots: if he is lying about or off-centre, he gets up and hops back to the middle (never snaps or slides). Returns ms taken. */
  private returnHome() {
    const k = this.kp, c = k.c; this.tweens.killTweensOf(c); k.flail = 0; k.armsOn = true; this.dizzy?.destroy();
    const off = Math.abs(c.x - KX) > 4 || Math.abs(c.angle) > 2 || Math.abs(c.y - KY) > 4 || Math.abs(c.scaleX - 1) > 0.02;
    if (!off) { k.setTex('pup_box_idle').img.setFlipX(false); k.ready(false, 200); return 0; }
    // sit up first (rotate back to upright about his feet), then two little hops to the spot
    k.setTex('pup_box_dizzy'); this.tweens.add({ targets: c, angle: 0, y: KY, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.Out' });
    k.ready(false, 260);
    this.after(280, () => { k.setTex('pup_box_idle').img.setFlipX(c.x > KX); Fx.step();
      this.tweens.add({ targets: c, x: KX, duration: 440, ease: 'Sine.InOut', onComplete: () => k.img.setFlipX(false) });
      this.tweens.chain({ targets: c, tweens: [{ y: KY - 36, duration: 110, ease: 'Quad.Out' }, { y: KY, duration: 110, ease: 'Quad.In' }, { y: KY - 36, duration: 110, ease: 'Quad.Out' }, { y: KY, duration: 110, ease: 'Quad.In' }] }); });
    return 760;
  }
  /** the tell: lean + ear twitch + eye-dart lines and chevrons toward `side` */
  private tell(side: -1 | 1, dur: number) {
    const s = this.st, k = this.kp; s.phase = 'tell'; this.vis('tell', side);
    this.tweens.killTweensOf(k.c); this.tellTw?.stop();
    k.img.setFlipX(side > 0); // the lean frame leans to screen-left; flipped for a right-hand tell
    this.tweens.add({ targets: k.c, x: KX + side * 22, angle: side * 9, duration: 150, ease: 'Quad.Out' });
    k.reachTo({ lx: -0.5 * k.h + side * 30, rx: 0.5 * k.h + side * 30, ly: -0.6 * k.h + (side < 0 ? -18 : 10), ry: -0.6 * k.h + (side > 0 ? -18 : 10) }, 150);
    let n = 0; const tw = this.time.addEvent({ delay: 120, repeat: Math.max(1, Math.floor(dur / 120) - 2), callback: () => { if (s.phase !== 'tell') return tw.remove(); n++; k.setTex(n % 2 ? 'pup_box_lean' : 'pup_box_idle'); k.c.setAngle(side * 9 + (n % 2 ? 3 : -3)); } });
    Fx.step();
    const g = this.tellG.clear(), hy = KY - 0.66 * k.h, hx = KX + side * 0.36 * k.h;
    g.lineStyle(7, INK, 1); for (const o of [-22, 0, 22]) g.lineBetween(hx + side * 10, hy + o, hx + side * (44 - Math.abs(o) * 0.5), hy + o * 1.4);
    g.lineStyle(4, 0xffffff, 1); for (const o of [-22, 0, 22]) g.lineBetween(hx + side * 10, hy + o, hx + side * (44 - Math.abs(o) * 0.5), hy + o * 1.4);
    const cx = side < 0 ? 200 : 520; g.fillStyle(0xffdf6b, 1).lineStyle(6, INK, 1);
    for (const [ox, sc] of [[0, 1.2], [side * 54, 0.9]] as const) { const x = cx + ox, y = 488, d = side * 40 * sc; g.fillTriangle(x + d, y, x - d * 0.2, y - 28 * sc, x - d * 0.2, y + 28 * sc).strokeTriangle(x + d, y, x - d * 0.2, y - 28 * sc, x - d * 0.2, y + 28 * sc); }
    g.setAlpha(1); this.tellTw = this.tweens.add({ targets: g, alpha: 0.35, duration: 160, yoyo: true, repeat: -1 });
  }
  private clearTell() { this.tellTw?.stop(); this.tellG.clear().setAlpha(1); }
  /** fake-out: crouch + lurch toward `side`, a ghost afterimage keeps diving, the real Puppy hops back. FAKE! stamp. */
  private fake(side: -1 | 1) {
    const s = this.st, k = this.kp; s.phase = 'fake'; this.clearTell(); this.vis('dive', side);
    this.tweens.killTweensOf(k.c); k.setTex('pup_box_lean').img.setFlipX(side > 0); k.c.setScale(1.08, 0.88);
    this.tweens.add({ targets: k.c, scaleX: 1, scaleY: 1, duration: 110 });
    this.tweens.add({ targets: k.c, x: KX + side * 70, angle: side * 30, duration: 160, delay: PK.CROUCH - 40, ease: 'Quad.Out', onComplete: () => {
      if (s.fired && s.phase !== 'fake') return;
      // the afterimage carries on diving...
      const gh = art(this, k.c.x, k.c.y, 'pup_box_panic', KM).setDepth(29).setAlpha(0.62).setTint(0xbfd9ff).setAngle(k.c.angle).setFlipX(side > 0);
      this.tweens.add({ targets: gh, x: KX + side * 40, y: KY - 60, angle: side * 75, alpha: 0, duration: 520, ease: 'Quad.Out', onComplete: () => gh.destroy() });
      // ...while the real Puppy hops back to the middle
      k.setTex('pup_box_idle'); this.tweens.add({ targets: k.c, x: KX, angle: 0, duration: 230, ease: 'Quad.Out' });
      this.tweens.add({ targets: k.c, y: KY - 46, duration: 115, yoyo: true, ease: 'Quad.Out' }); k.ready(false, 200);
      this.vis('fake', side); Fx.boing(); this.stamp(side < 0 ? 210 : 510, 600, 'FAKE!', 0xe0243a);
      if (!s.fired) say(this, 470, 380, pick(LINES.penFeint), 22, 1000);
      this.time.delayedCall(260, () => { if (s.phase === 'fake') { s.phase = 'ready'; this.vis('ready'); } });
    } });
  }
  /** the real commit: crouch (the readable cue), then a full dive to `side`; he lies there for the shot window, then gets up */
  private commit(side: -1 | 1) {
    const s = this.st, k = this.kp; s.phase = 'commit'; s.commitAt = s.lastCommit = this.gnow; s.side = side; this.clearTell(); this.vis('dive', side);
    this.tweens.killTweensOf(k.c); k.setTex('pup_box_lean').img.setFlipX(side > 0); k.c.setScale(1.1, 0.86).setAngle(side * 6);
    k.reachTo({ lx: -0.3 * k.h, ly: -0.5 * k.h, rx: 0.3 * k.h, ry: -0.5 * k.h }, PK.CROUCH);
    const high = Math.random() < 0.5; (s as any).high = high;
    this.after(PK.CROUCH, () => {
      if (s.fired && s.phase !== 'commit') return;
      k.setTex('pup_box_panic'); Fx.whoosh(); k.c.setScale(1);
      const fx = KX + side * 18, ang = side * (high ? 62 : 80);
      this.tweens.add({ targets: k.c, x: fx, angle: ang, duration: PK.DIVE, ease: 'Quad.Out' });
      this.tweens.chain({ targets: k.c, tweens: [{ y: KY - (high ? 120 : 50), duration: PK.DIVE * 0.5, ease: 'Quad.Out' }, { y: KY - 10, duration: PK.DIVE * 0.5, ease: 'Quad.In' }] });
      k.reachTo({ lx: -0.16 * k.h, ly: -1.05 * k.h, rx: 0.16 * k.h, ry: -1.0 * k.h }, PK.DIVE * 0.6);
      this.after(PK.DIVE, () => { if (s.fired && s.phase !== 'commit') return; this.vis('down', side); this.thud(k.c.x - side * 0.3 * k.h, KY);
        this.tweens.add({ targets: k.c, angle: side * 86, duration: 160, ease: 'Bounce.Out' }); k.flail = 0.6; });
    });
    this.after(PK.WINDOW[s.shot], () => { if (!s.fired) this.getUp(); });
  }
  private thud(x: number, y: number) { Fx.step(); this.cameras.main.shake(90, 0.005); for (let i = 0; i < 5; i++) { const d = this.add.circle(x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-10, 6), Phaser.Math.Between(10, 18), 0xe9f5d0, 0.8).setDepth(31);
    this.tweens.add({ targets: d, y: d.y - 30, scale: 1.8, alpha: 0, duration: 380, onComplete: () => d.destroy() }); } }
  /** she waited too long: he hops back up to the middle (real hops, no sliding), tells her off, and the shot starts over */
  private getUp() {
    const s = this.st, k = this.kp; s.phase = 'recover'; s.commitAt = 0; s.ready = false; this.vis('up'); k.flail = 0; ++this.seq;
    k.setTex('pup_box_idle'); this.tweens.killTweensOf(k.c);
    this.tweens.add({ targets: k.c, angle: 0, x: KX, duration: 420, ease: 'Sine.InOut' });
    this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 50, duration: 140, ease: 'Quad.Out' }, { y: KY, duration: 140, ease: 'Quad.In' }, { y: KY - 30, duration: 110, ease: 'Quad.Out' }, { y: KY, duration: 110, ease: 'Quad.In' }] });
    k.ready(false, 300); s.resets++;
    if (s.resets >= PK.RESETS) { say(this, 470, 380, 'Puppy: Shot clock! That one is MINE!', 22, 1300); this.time.delayedCall(500, () => this.result('timeout')); return; }
    say(this, 470, 380, pick(LINES.penSlow), 22, 1200); this.time.delayedCall(800, () => !s.over && this.startShot(true));
  }
  // ---------------- input ----------------
  private onDown(p: Phaser.Input.Pointer) { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.down = { x: w.x, y: w.y, t: this.time.now }; }
  private aimFrom(dx: number, dy: number): Zone {
    const b = this.BALL0, gy = 612;
    if (dy > -12) return dx < 0 ? ZONES[1] : ZONES[4]; // flat sideways swipe: low corner
    const x = b.x + dx * (b.y - gy) / -dy; if (Math.abs(x - KX) <= PK.MID) return ZONES[2];
    const side = x < KX ? -1 : 1, cx = side < 0 ? ZONES[0].x : ZONES[3].x, yAt = b.y + dy * (cx - b.x) / dx; const high = yAt < 612;
    return ZONES.find(z => z.side === side && z.high === high)!;
  }
  private tapZone(x: number, y: number): Zone | null {
    if (y < GOAL.top - 50 || y > GOAL.ground + 40 || x < GOAL.x0 - 50 || x > GOAL.x1 + 50) return null;
    if (Math.abs(x - KX) < 75) return ZONES[2]; const side = x < KX ? -1 : 1; return ZONES.find(z => z.side === side && z.high === (y < 615))!;
  }
  private onMove(p: Phaser.Input.Pointer) {
    if (!this.down || !p.isDown || !this.st.ready) return; const w = worldPoint(this, p), dx = w.x - this.down.x, dy = w.y - this.down.y;
    if (Math.hypot(dx, dy) < 22) return; const z = this.aimFrom(dx, dy); this.preview(z);
  }
  private preview(z: Zone | null) {
    const g = this.aimG.clear(); this.drawZones(0.22, z ?? undefined); if (!z) return;
    const b = this.BALL0, mx = (b.x + z.x) / 2, my = (b.y + z.y) / 2 - (z.side === 0 ? 240 : 60);
    const c = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(b.x, b.y - 30), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(z.x, z.y)), L = c.getLength();
    for (let d = 0; d < L; d += 28) { const q = c.getPointAt(d / L); g.fillStyle(INK, 0.8).fillCircle(q.x, q.y, 9).fillStyle(0xffdf6b, 0.95).fillCircle(q.x, q.y, 6); }
  }
  private onUp(p: Phaser.Input.Pointer) {
    const d = this.down; this.down = undefined; this.aimG.clear(); if (!d) return; const s = this.st; this.drawZones(0.22);
    if (!s.ready || s.fired || s.over) return;
    const w = worldPoint(this, p), dx = w.x - d.x, dy = w.y - d.y, dist = Math.hypot(dx, dy);
    let z: Zone | null = null;
    if (dist >= PK.SWIPE_MIN) z = this.aimFrom(dx, dy); else if (dist < 30) z = this.tapZone(w.x, w.y);
    if (!z) { floatText(this, W / 2, 960, 'SWIPE to a corner (or tap one)!', '#fff', 34); (window as any).__pr.hint = 1; return; }
    this.fire(z);
  }
  // ---------------- the shot ----------------
  private fire(z: Zone) {
    const s = this.st, firedAt = this.gnow; s.fired = true; s.ready = false; (window as any).__pr.aim = z.side; (s as any).firedAt = firedAt;
    this.drawZones(0.22, z); this.gla.setMood('smug');
    const gx = this.GX, gy = this.GY;
    this.tweens.chain({ targets: this.gla.root, tweens: [{ x: gx - 22, y: gy + 8, duration: 70, ease: 'Quad.Out' }, { x: gx + 34, y: gy - 30, duration: 50, ease: 'Quad.In' }, { x: gx, y: gy, duration: 260, ease: 'Back.Out' }] });
    this.gla.act([
      { dur: 0.07, to: { rh: -70, rk: 60, lh: 8, lk: -14, ls: 70, le: 40, rs: -60, re: -30, lean: -10, sq: -0.07, dy: 6, tilt: -6 }, ease: Phaser.Math.Easing.Quadratic.Out },
      { dur: 0.05, to: { rh: 115, rk: -6, lh: -6, lk: 0, ls: -55, le: -30, rs: 80, re: 20, lean: 12, sq: 0.06, dy: -4, tilt: 8 }, ease: Phaser.Math.Easing.Cubic.In },
      { dur: 0.16, to: { rh: 125, rk: 10, ls: -40, rs: 60, lean: 8 }, ease: Phaser.Math.Easing.Quadratic.Out }], false, 0.3);
    this.time.delayedCall(PK.KICK_CONTACT, () => {
      if (s.over) return; const tc = this.gnow;
      const committed = s.commitAt > 0 && tc >= s.commitAt && firedAt <= s.commitAt + PK.WINDOW[s.shot];
      const side = s.side as -1 | 1; ++this.seq; this.clearTell(); this.contact();
      // too late = he already dived and got back up (same save as an early shot, logged separately for tuning)
      const late = !committed && s.lastCommit > 0 && firedAt > s.lastCommit;
      s.react = committed ? Math.round(firedAt - s.commitAt) : late ? Math.round(firedAt - s.lastCommit) : null;
      if (!committed) this.earlySave(z, late ? 'late' : 'early');
      else if (z.side === 0) this.noggin(side);
      else if (z.side === side) this.blockSave(z, side);
      else this.goal(z, side, firedAt - s.commitAt);
    });
  }
  private contact() {
    Fx.kick(); this.ball.setScale(1.3, 0.72); this.cameras.main.shake(80, 0.006);
    const p = this.add.circle(this.BALL0.x, this.BALL0.y + 26, 18, 0xffffff, 0.7).setDepth(43); this.tweens.add({ targets: p, scale: 3, alpha: 0, duration: 260, onComplete: () => p.destroy() });
  }
  /** ball flight: perspective shrink, arc, shadow on the ground, spin, speed puffs */
  private fly(tx: number, ty: number, dur: number, arcH: number, onArrive: () => void, depthIn = 45) {
    const b0 = { x: this.ball.x, y: this.ball.y }, o = { t: 0 }; this.ball.setDepth(depthIn); Fx.whoosh();
    this.tweens.add({ targets: o, t: 1, duration: dur, ease: 'Linear', onUpdate: () => {
      const t = o.t, x = b0.x + (tx - b0.x) * t, yb = b0.y + (ty - b0.y) * t, arc = Math.sin(t * Math.PI) * arcH, sc = 1 - 0.38 * t;
      this.ball.setPosition(x, yb - arc).setScale(sc).setAngle(t * 720);
      this.ballSh.setPosition(x, b0.y + 28 + (GOAL.ground + 4 - b0.y - 28) * t).setScale(sc * (1 - Math.min(0.6, arc / 400))).setAlpha(0.3);
      if (Math.random() < 0.5) { const tr = this.add.circle(x, yb - arc, 22 * sc, 0xffffff, 0.45).setDepth(44); this.tweens.add({ targets: tr, alpha: 0, scale: 0.4, duration: 220, onComplete: () => tr.destroy() }); }
    }, onComplete: () => { this.ballSh.setAlpha(0); onArrive(); } });
  }
  private stamp(x: number, y: number, s: string, col: number) {
    const c = this.add.container(Phaser.Math.Clamp(x, 140, W - 140), y).setDepth(76).setAngle(-12).setScale(2.4).setAlpha(0), sg = this.add.graphics();
    const t = txt(this, 0, 2, s, 54, '#' + col.toString(16).padStart(6, '0'), '#ffffff', 4), w = t.width + 60;
    sg.fillStyle(0xffffff, 0.88).lineStyle(8, col, 1).fillRoundedRect(-w / 2, -46, w, 92, 14).strokeRoundedRect(-w / 2, -46, w, 92, 14); c.add([sg, t]);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 140, ease: 'Quad.In', onComplete: () => this.cameras.main.shake(80, 0.008) });
    this.tweens.add({ targets: c, alpha: 0, delay: 950, duration: 280, onComplete: () => c.destroy() });
  }
  /** Glassia shot before he committed: he reads it and saves */
  private earlySave(z: Zone, kind = 'early') {
    const s = this.st, k = this.kp; s.phase = 'save'; this.tweens.killTweensOf(k.c); k.flail = 0; k.c.setScale(1);
    const line = this.firstEarly ? LINES.penSave[0] : pick(LINES.penSave); this.firstEarly = false;
    if (z.side === 0) { // straight at him: jump and catch it, then hold it
      k.setTex('pup_box_lean').img.setFlipX(false);
      this.tweens.add({ targets: k.c, x: KX, angle: 0, duration: 120 });
      this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 70, duration: PK.FLIGHT, ease: 'Quad.Out' }, { y: KY, duration: 260, ease: 'Bounce.Out' }] });
      const lt = k.localAt(z.x, z.y, KX, KY - 70, 0); k.reachTo({ lx: lt.x - 26, ly: lt.y, rx: lt.x + 26, ry: lt.y }, PK.FLIGHT - 40);
      this.fly(z.x, z.y, PK.FLIGHT, 70, () => { this.held = 'kp'; Fx.block(); this.saved(line, kind); k.setTex('pup_box_idle'); });
      return;
    }
    const sd = z.side as -1 | 1, px = KX + sd * 25, py = KY - (z.high ? 95 : 25), ang = sd * (z.high ? 50 : 72);
    k.setTex('pup_box_panic').img.setFlipX(sd > 0); Fx.whoosh();
    this.tweens.add({ targets: k.c, x: px, y: py, angle: ang, duration: PK.FLIGHT, ease: 'Quad.Out' });
    const lt = k.localAt(z.x, z.y, px, py, ang); k.reachTo({ lx: lt.x - 22, ly: lt.y + 8, rx: lt.x + 22, ry: lt.y - 8 }, PK.FLIGHT - 30);
    this.fly(z.x, z.y, PK.FLIGHT, 50, () => {
      Fx.block(); Fx.boing(); sparks(this, z.x, z.y, 12);
      this.tweens.add({ targets: this.ball, x: z.x + sd * 190, y: z.y - 150, angle: this.ball.angle + 540, scale: 0.4, alpha: 0, duration: 520, ease: 'Quad.Out' });
      this.tweens.add({ targets: k.c, y: KY - 6, angle: sd * 86, duration: 300, ease: 'Bounce.Out', onComplete: () => this.thud(k.c.x - sd * 0.3 * k.h, KY) });
      this.saved(line, kind);
    });
  }
  /** Glassia shot where he was already lying */
  private blockSave(z: Zone, side: -1 | 1) {
    const k = this.kp; this.st.phase = 'save'; this.tweens.killTweensOf(k.c); k.flail = 0;
    const body = k.world(0, -0.5 * k.h), tx = (body.x + z.x) / 2, ty = Math.min(z.y, body.y);
    const lt = k.localAt(tx, ty, k.c.x, k.c.y, k.c.angle); k.reachTo({ lx: lt.x - 20, ly: lt.y, rx: lt.x + 20, ry: lt.y }, PK.FLIGHT - 60);
    this.fly(tx, ty, PK.FLIGHT, 40, () => { Fx.block(); Fx.boing(); sparks(this, tx, ty, 12);
      this.tweens.add({ targets: this.ball, x: tx - side * 160, y: ty - 220, angle: this.ball.angle - 540, scale: 0.4, alpha: 0, duration: 560, ease: 'Quad.Out' });
      this.saved(pick(LINES.penBlock), 'block'); });
  }
  private saved(line: string, kind: string) {
    this.stamp(KX, 600, 'SAVED!', 0xe0243a); Fx.save(); say(this, 470, 380, line, 24, 1500);
    this.gla.setMood('dizzy').act([{ dur: 0.22, to: { rs: 150, re: 120, ls: 10, le: 20, lean: -4, tilt: 10, sq: -0.03, dy: 4 } }, { dur: 0.6, to: { rs: 150, re: 125, tilt: 12 } }], false, 0.3);
    this.time.delayedCall(700, () => !this.st.over && Math.random() < 0.6 && say(this, 300, 860, pick(LINES.penOops), 22, 1100));
    this.result(kind);
  }
  private bulgeAt(x: number, y: number) {
    const g = this.bulge.clear(); g.lineStyle(5, 0xffffff, 0.95); for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x, y, 18 + i * 18, 0, Math.PI * 2); g.strokePath(); }
    g.setAlpha(1).setScale(1); this.tweens.killTweensOf(g); this.tweens.add({ targets: g, alpha: 0, duration: 700, delay: 150 });
    this.tweens.add({ targets: this.netBack, x: { from: (x - KX) * 0.015, to: 0 }, y: { from: -6, to: 0 }, duration: 500, ease: 'Elastic.Out' });
  }
  private goalFx(x: number, y: number, pts: number, tag = '') {
    const s = this.st; Fx.goal(); this.bulgeAt(x, y); s.score += pts; floatText(this, x, y - 70, `+${pts}${tag ? ' ' + tag : ''}`, '#7dff9a', 40);
    const w = comic(this, W / 2, 846, 'GOAL!', 112).setDepth(80).setScale(0.2).setAngle(-6);
    this.tweens.add({ targets: w, scale: 1, duration: 180, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, y: 810, delay: 900, duration: 300, onComplete: () => w.destroy() });
    this.crowd.forEach((c, i) => this.tweens.add({ targets: c, y: 230, yoyo: true, duration: 150, delay: i * 40, repeat: 1 }));
    this.tweens.add({ targets: this.bun, y: this.bun.y - 30, yoyo: true, duration: 160, repeat: 1, ease: 'Quad.Out' });
    this.gla.setMood('happy').act([{ dur: 0.18, to: { ls: -160, le: -20, rs: 160, re: 20, lh: -10, rh: 10, dy: -14, sq: 0.06 }, ease: Phaser.Math.Easing.Back.Out },
      { dur: 0.12, to: { ls: -140, rs: 140, dy: -2 } }, { dur: 0.12, to: { ls: -165, rs: 165, dy: -12 } }, { dur: 0.3, to: { ls: -150, rs: 150, dy: -4 } }], false, 0.3);
    this.time.delayedCall(250, () => popBanner(this, pick(LINES.penGoal), 330, 0x3a86ff, 900));
    this.time.delayedCall(1000, () => !s.over && s.pride > 0.001 && Math.random() < 0.5 && say(this, 300, 860, pick(LINES.penCheer), 22, 1000));
  }
  /** wrong way, Puppy! ball in the open corner, then a slapstick reaction */
  private goal(z: Zone, side: -1 | 1, react: number) {
    const s = this.st, k = this.kp; s.phase = 'goal';
    this.fly(z.x, z.y, PK.FLIGHT, 50, () => {
      const quick = react < 600; this.goalFx(z.x, z.y, 500 + (quick ? 200 : 0), quick ? 'QUICK!' : ''); this.drain(PK.DRAIN); s.goals++;
      this.ball.setDepth(20); this.tweens.add({ targets: this.ball, y: GOAL.ground - 34, x: z.x + (KX - z.x) * 0.1, duration: 420, ease: 'Bounce.Out' });
      if (!this.bagReact.length) this.bagReact = Phaser.Utils.Array.Shuffle(['post', 'net', 'slide']);
      const r = this.bagReact.pop()!; (window as any).__pr.react = r; k.flail = 0;
      this.time.delayedCall(250, () => r === 'post' ? this.rPost(side) : r === 'net' ? this.rNet(side, z) : this.rSlide(side, z));
      this.result('goal');
    }, 20);
  }
  private dizzyStars(ms = 1500) { this.dizzy?.destroy(); this.dizzy = this.add.container(0, 0).setDepth(77); for (let i = 0; i < 3; i++) this.dizzy.add(txt(this, 0, 0, '★', 34, '#ffdf6b', '#22252b', 5));
    const d = this.dizzy; this.time.delayedCall(ms, () => d.destroy()); }
  /** post bonk: scrambles up, leaps after the ball and conks the post head-first, slides down it dizzy */
  private rPost(side: -1 | 1) {
    const k = this.kp, b = -side as -1 | 1, xp = b < 0 ? GOAL.x0 : GOAL.x1, a = b * 70, feetY = KY - 80, fx = xp - b * 0.78 * k.h * Math.sin(Phaser.Math.DegToRad(70));
    k.setTex('pup_box_panic').img.setFlipX(b > 0); this.tweens.killTweensOf(k.c);
    this.tweens.add({ targets: k.c, angle: 0, y: KY, duration: 160, ease: 'Quad.Out', onComplete: () => {
      k.reachTo({ lx: -0.15 * k.h, ly: -1.0 * k.h, rx: 0.15 * k.h, ry: -1.0 * k.h }, 160);
      this.tweens.add({ targets: k.c, x: fx, angle: a, duration: 300, ease: 'Quad.In' });
      this.tweens.add({ targets: k.c, y: feetY, duration: 300, ease: 'Quad.Out', onComplete: () => {
        const hp = k.head(); Fx.punch(); Fx.boing(); this.cameras.main.shake(220, 0.014);
        this.tweens.add({ targets: this.frame, x: { from: b * 7, to: 0 }, duration: 500, ease: 'Elastic.Out' });
        const w = comic(this, hp.x - b * 20, hp.y - 80, 'BONK!', 80).setDepth(78).setAngle(b * 10); this.tweens.add({ targets: w, alpha: 0, delay: 800, duration: 260, onComplete: () => w.destroy() });
        sparks(this, xp, hp.y, 14); k.setTex('pup_box_dizzy'); this.dizzyStars();
        // knocked back off the post and flops down flat
        // bounces off the post and drops onto his bottom beside it, dizzy (stays inside the goal)
        this.tweens.add({ targets: k.c, x: xp - b * 0.36 * k.h, angle: 0, duration: 520, ease: 'Quad.Out' });
        this.tweens.add({ targets: k.c, y: KY, duration: 520, ease: 'Bounce.Out', onComplete: () => { this.thud(k.c.x, KY); k.c.setScale(1.12, 0.88); this.tweens.add({ targets: k.c, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.Out' }); } });
        k.reachTo({ lx: -0.45 * k.h, ly: -0.3 * k.h, rx: 0.45 * k.h, ry: -0.3 * k.h }, 300);
        this.time.delayedCall(500, () => say(this, 470, 380, pick(LINES.penPup), 22, 1100));
      } });
    } });
  }
  /** net face-plant: jumps after the ball, face-first into the net, peels off and drops */
  private rNet(side: -1 | 1, z: Zone) {
    const k = this.kp, b = -side as -1 | 1, nx = z.x - b * 20; k.setTex('pup_box_panic').img.setFlipX(b > 0); this.tweens.killTweensOf(k.c);
    this.tweens.add({ targets: k.c, angle: 0, duration: 140, onComplete: () => {
      this.tweens.add({ targets: k.c, x: nx, duration: 380, ease: 'Sine.InOut' });
      this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 150, scaleX: 0.92, scaleY: 0.92, duration: 220, ease: 'Quad.Out' }, { y: KY - 70, duration: 160, ease: 'Quad.In', onComplete: () => {
        Fx.boing(); this.bulgeAt(nx, KY - 0.62 * k.h - 70); k.setTex('pup_box_dizzy'); k.c.setScale(1.0, 0.86);
        const w = comic(this, nx, KY - 330, 'FWUMP!', 72).setDepth(78); this.tweens.add({ targets: w, alpha: 0, delay: 800, duration: 260, onComplete: () => w.destroy() });
        k.reachTo({ lx: -0.55 * k.h, ly: -0.8 * k.h, rx: 0.55 * k.h, ry: -0.8 * k.h }, 120); this.dizzyStars(1400);
        // stuck to the net for a beat, then drops onto his bottom
        this.tweens.add({ targets: k.c, y: KY, scaleX: 1, scaleY: 1, delay: 450, duration: 380, ease: 'Bounce.Out', onComplete: () => this.thud(k.c.x, KY) });
        this.time.delayedCall(450, () => say(this, 470, 380, pick(LINES.penPup), 22, 1100));
      } }] });
    } });
  }
  /** tummy slide: belly-flops after the ball and skids across the goal mouth (dust + skid mark), arriving far too late */
  private rSlide(side: -1 | 1, z: Zone) {
    const k = this.kp, b = -side as -1 | 1, sx = b > 0 ? GOAL.x0 + 30 : GOAL.x1 - 30, ex = b > 0 ? GOAL.x1 - 26 - k.h : GOAL.x0 + 26 + k.h; k.setTex('pup_box_panic').img.setFlipX(b > 0); this.tweens.killTweensOf(k.c);
    // hop up and belly-flop toward the ball (feet stay on his side, so the whole slide stays inside the goal)
    this.tweens.add({ targets: k.c, x: sx, duration: 320, ease: 'Sine.InOut' });
    this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 60, angle: 0, duration: 160, ease: 'Quad.Out' }, { y: KY - 8, angle: b * 88, duration: 160, ease: 'Quad.In' }] });
    k.reachTo({ lx: -0.12 * k.h, ly: -1.05 * k.h, rx: 0.12 * k.h, ry: -1.05 * k.h }, 200);
    const skid = this.add.graphics().setDepth(13), x0 = sx;
    this.time.delayedCall(330, () => {
      const w = comic(this, (x0 + ex) / 2, KY - 200, 'SKRRRT!', 66).setDepth(78); this.tweens.add({ targets: w, alpha: 0, delay: 800, duration: 260, onComplete: () => w.destroy() });
      this.tweens.add({ targets: k.c, x: ex, duration: 700, ease: 'Quad.Out', onUpdate: () => {
        skid.clear().lineStyle(14, 0x2a6b2a, 0.5).lineBetween(x0, KY - 4, k.c.x, KY - 4);
        if (Math.random() < 0.4) { const d = this.add.circle(k.c.x - b * 20, KY - 4, 12, 0xe9f5d0, 0.8).setDepth(31); this.tweens.add({ targets: d, y: d.y - 24, scale: 1.8, alpha: 0, duration: 360, onComplete: () => d.destroy() }); } },
        onComplete: () => { k.setTex('pup_box_dizzy'); this.dizzyStars(1200); this.tweens.add({ targets: skid, alpha: 0, delay: 600, duration: 400, onComplete: () => skid.destroy() });
          this.tweens.add({ targets: k.c, angle: b * 80, duration: 200, yoyo: true, ease: 'Quad.Out' }); say(this, 470, 380, pick(LINES.penPup), 22, 1100); } });
    });
  }
  /** middle chip while he is down on one side: he scrambles back to the middle and the ball lands on his head */
  private noggin(side: -1 | 1) {
    const s = this.st, k = this.kp; s.phase = 'goal'; this.tweens.killTweensOf(k.c); k.flail = 0;
    const hx = KX, hy = KY - 0.78 * k.h;
    k.setTex('pup_box_panic').img.setFlipX(side < 0);
    this.tweens.add({ targets: k.c, x: KX, angle: 0, duration: PK.CHIP - 80, ease: 'Sine.InOut' });
    this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 70, duration: (PK.CHIP - 80) * 0.5, ease: 'Quad.Out' }, { y: KY, duration: (PK.CHIP - 80) * 0.5, ease: 'Quad.In' }] });
    k.reachTo({ lx: -0.6 * k.h, ly: -0.9 * k.h, rx: 0.6 * k.h, ry: -0.9 * k.h }, 250); k.flail = 0.8;
    this.fly(hx, hy, PK.CHIP, 260, () => {
      k.flail = 0; k.setTex('pup_box_dizzy'); this.dizzyStars(1600);
      this.tweens.timeScale = 0.05; this.time.delayedCall(90, () => { this.tweens.timeScale = 1; });
      impact(this, hx, hy, '', 0, '', true);
      const nb = comic(this, W / 2, 380, 'NOGGIN BONK!', 92).setDepth(79).setAngle(-5).setScale(0.3); this.tweens.add({ targets: nb, scale: 1, duration: 200, ease: 'Back.Out' });
      this.tweens.add({ targets: nb, alpha: 0, y: 350, delay: 1100, duration: 300, onComplete: () => nb.destroy() }); flashVignette(this, 0xffffff, 0.5); Fx.punch(); Fx.boing();
      k.c.setScale(1.25, 0.75); this.tweens.add({ targets: k.c, scaleX: 1, scaleY: 1, duration: 420, ease: 'Elastic.Out', easeParams: [1.3, 0.35] });
      this.tweens.add({ targets: k.c, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => k.c.setAngle(0) });
      k.reachTo({ lx: -0.5 * k.h, ly: -0.3 * k.h, rx: 0.5 * k.h, ry: -0.3 * k.h }, 200);
      // ricochet up into the roof of the net
      const nx = KX + (Math.random() < 0.5 ? -1 : 1) * 130; this.ball.setDepth(20);
      this.tweens.add({ targets: this.ball, x: nx, y: GOAL.top + 70, angle: this.ball.angle + 360, duration: 380, ease: 'Quad.Out', onComplete: () => {
        this.goalFx(nx, GOAL.top + 70, 900, 'NOGGIN!'); this.drain(PK.DRAIN_NOGGIN); s.goals++; s.noggins++;
        this.tweens.add({ targets: this.ball, y: GOAL.ground - 34, duration: 480, ease: 'Bounce.Out' });
        say(this, 470, 380, pick(LINES.penNoggin.slice(1)), 22, 1200); this.result('noggin');
      } });
    });
  }
  private result(kind: string) {
    const s = this.st; s.last = kind; (window as any).__pr.last = kind; s.results[s.shot] = kind; s.shot++; s.kick = s.shot; s.hits = s.goals; this.updateHud();
    if (s.pride <= 0.001) { this.time.delayedCall(kind === 'noggin' ? 1500 : 1300, () => this.finish(true)); return; }
    const left = PK.SHOTS - s.shot;
    if (left <= 0 || s.pride > left * PK.DRAIN_NOGGIN + 1e-6) { this.time.delayedCall(1500, () => this.finish(false)); return; }
    this.time.delayedCall(1900, () => !s.over && this.startShot());
  }
  // ---------------- endings ----------------
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.ready = false; s.phase = 'over'; ++this.seq; this.clearTell(); this.aimG.clear();
    (window as any).__pr.ended = win ? 'win' : 'lose'; this.updateHud();
    const score = s.score + (win ? (PK.SHOTS - s.shot) * 300 : 0), detail = `${s.goals} goal${s.goals === 1 ? '' : 's'}${s.noggins ? ` • ${s.noggins} noggin bonk${s.noggins > 1 ? 's' : ''}` : ''}`;
    let shown = false; const card = () => { if (shown) return; shown = true; endCard(this, 'Glassia', 1, win, score, detail); if (!win) this.lossCard(); };
    if (win) this.winOutro(card); else this.lossOutro(card);
  }
  /** WIN: the net drops on Puppy and wraps him like a burrito hanging off the crossbar; Glassia holds the ball up; Bunny claps */
  private winOutro(card: () => void) {
    const k = this.kp; this.tweens.killTweensOf(k.c); this.tweens.killTweensOf(this.kp.gl); k.flail = 0; k.setTex('pup_box_dizzy').img.setFlipX(false); this.dizzy?.destroy();
    const t0 = this.time.now, skip = () => { if (this.time.now - t0 >= 600) card(); }; this.input.on('pointerdown', skip); this.events.once('shutdown', () => this.input.off('pointerdown', skip));
    (window as any).__pr.outro = true;
    // hop back to the middle (real hops)
    this.tweens.add({ targets: k.c, x: KX, angle: 0, scaleX: 1, scaleY: 1, duration: 520, ease: 'Sine.InOut' });
    this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 50, duration: 130, ease: 'Quad.Out' }, { y: KY, duration: 130, ease: 'Quad.In' }, { y: KY - 40, duration: 130, ease: 'Quad.Out' }, { y: KY, duration: 130, ease: 'Quad.In' }] });
    k.ready(false, 300);
    popBanner(this, 'PUPPY NETTED!', 330, 0x2fbf71, 2600);
    // the net comes loose and drops over him
    const sheet = this.add.graphics({ x: KX, y: GOAL.top + 20 }).setDepth(33); sheet.lineStyle(4, 0xffffff, 0.95);
    for (let i = -8; i <= 8; i++) { sheet.lineBetween(i * 26, 0, i * 26, 200); } for (let j = 0; j <= 8; j++) sheet.lineBetween(-208, j * 25, 208, j * 25);
    sheet.setScale(1, 0.2).setAlpha(0);
    this.time.delayedCall(650, () => { sheet.setAlpha(1); Fx.whoosh(); this.tweens.add({ targets: sheet, y: KY - 0.95 * k.h, scaleY: 1.1, scaleX: 0.75, duration: 300, ease: 'Quad.In', onComplete: () => {
      Fx.boing(); sheet.destroy(); k.armsOn = false; k.arms.clear(); k.drawWrap(); this.strings.setVisible(true); k.c.setScale(1.12, 0.9);
      this.tweens.add({ targets: k.c, scaleX: 1, scaleY: 1, duration: 360, ease: 'Elastic.Out', easeParams: [1.2, 0.4] });
      this.netBack.setAlpha(0.35);
      // the net strings pull him up to dangle from the crossbar, swinging gently
      this.tweens.add({ targets: k.c, y: KY - 80, duration: 420, ease: 'Back.Out', delay: 120, onComplete: () => {
        this.tweens.add({ targets: k.c, angle: { from: -7, to: 7 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); } });
      this.dizzyStars(5000);
    } }); });
    this.time.delayedCall(1250, () => say(this, 540, 700, LINES.penFish[0], 24, 2600));
    // the ball pops out of the net and bounces to Glassia, who catches it and holds it up in her hoof
    this.time.delayedCall(900, () => {
      this.held = 'none'; this.tweens.killTweensOf(this.ball); this.ball.setAlpha(1).setDepth(46).setScale(0.7);
      const hp0 = { x: this.ball.x, y: this.ball.y }, mid = { x: (hp0.x + this.GX) / 2 + 40, y: GOAL.ground + 160 };
      this.gla.act([{ dur: 0.35, to: { rs: 120, re: 30, ls: -30, le: -20, lean: 4, tilt: 4 } }], true);
      this.tweens.chain({ targets: this.ball, tweens: [
        { x: (hp0.x + mid.x) / 2, y: Math.min(hp0.y, mid.y) - 140, scale: 0.85, duration: 260, ease: 'Quad.Out' }, { x: mid.x, y: mid.y, duration: 260, ease: 'Quad.In', onComplete: () => Fx.boing() },
        { x: (mid.x + this.GX) / 2 + 60, y: mid.y - 170, scale: 1, duration: 240, ease: 'Quad.Out' }, { x: this.gla.point('rp').x, y: this.gla.point('rp').y - 30, duration: 240, ease: 'Quad.In', onComplete: () => {
          this.held = 'gla'; Fx.kick();
          this.gla.setMood('happy').act([{ dur: 0.25, to: { rs: 168, re: 4, ls: -60, le: -40, rh: 8, lh: -22, lk: 24, dy: -14, tilt: 8, lean: -2 }, ease: Phaser.Math.Easing.Back.Out },
            { dur: 0.3, to: { dy: -4 } }, { dur: 0.3, to: { dy: -16 } }, { dur: 0.3, to: { dy: -4 } }, { dur: 0.3, to: { dy: -16 } }, { dur: 0.3, to: { dy: -6 } }], true);
          this.time.delayedCall(350, () => say(this, 300, 830, LINES.penWin[0], 24, 2200));
        } }] });
    });
    // Bunny claps
    this.time.delayedCall(1100, () => { this.clapping = true; this.bun.setTexture('bun_full_laugh'); this.tweens.add({ targets: this.bun, y: this.bun.y - 18, yoyo: true, repeat: -1, duration: 220, ease: 'Quad.Out' });
      const cl = txt(this, this.bun.x - 40, this.bun.y - 200, 'clap clap!', 24, '#fff', '#22252b', 5).setDepth(780); this.tweens.add({ targets: cl, y: cl.y - 30, alpha: 0, delay: 900, duration: 500, onComplete: () => cl.destroy() }); });
    this.crowd.forEach((c, i) => this.tweens.add({ targets: c, y: 230, yoyo: true, duration: 170, delay: i * 50, repeat: 5 }));
    this.time.delayedCall(4300, card);
  }
  /** LOSE: Puppy holds the ball up in both gloves and hops about; Glassia slumps */
  private lossOutro(card: () => void) {
    const k = this.kp; this.tweens.killTweensOf(k.c); this.tweens.killTweensOf(this.ball); k.flail = 0; k.armsOn = true; k.setTex('pup_box_idle').img.setFlipX(false); this.dizzy?.destroy();
    this.tweens.add({ targets: k.c, x: KX, angle: 0, scaleX: 1, scaleY: 1, y: KY, duration: 300, ease: 'Sine.Out', onComplete: () => {
      k.reachTo({ lx: -0.15 * k.h, ly: -0.95 * k.h, rx: 0.15 * k.h, ry: -0.95 * k.h }, 200);
      this.ball.setAlpha(1).setScale(0.65).setDepth(36); this.held = 'kp'; Fx.boing();
      this.tweens.add({ targets: k.c, y: KY - 30, yoyo: true, repeat: -1, duration: 200, ease: 'Quad.Out' });
      say(this, 470, 380, pick(LINES.penLosePup), 24, 1400);
    } });
    this.gla.setMood('dizzy').act([{ dur: 0.25, to: { ls: 10, le: 20, rs: -10, re: -20, lean: 6, sq: -0.04, dy: 6, tilt: 8 } }], true);
    this.time.delayedCall(1300, card);
  }
  /** loss card: fully opaque backdrop, no heart-eyed Puppy, a penalty-specific family-friendly line (buttons arm after 600 ms in endCard) */
  private lossCard() {
    const c = this.children.list.filter((o: any) => o.depth === 960 && o.list).pop() as Phaser.GameObjects.Container | undefined; if (!c) return;
    const dim = c.list.find((o: any) => o.type === 'Rectangle') as Phaser.GameObjects.Rectangle | undefined; dim?.setFillStyle(0x2a1f3d, 1);
    const pup = c.list.find((o: any) => o.texture?.key === 'pup_hearts') as Phaser.GameObjects.Image | undefined; pup?.setTexture('pup_idle');
    const texts = c.list.filter((o: any) => o.type === 'Text') as Phaser.GameObjects.Text[];
    texts.find(t => t.text === 'PUPPY GOT LUCKY!')?.setText('PUPPY SAVED IT!');
    const quote = texts.find(t => Math.round(t.y) === 830), sub = texts.find(t => Math.round(t.y) === 885);
    quote?.setText(pick(LINES.penLose)); sub?.setText(pick(mix(LINES.penLosePup, CHEEKY.penLosePup)));
    (window as any).__pr.lossCard = { opaque: dim?.fillAlpha, quote: quote?.text, sub: sub?.text, pup: pup?.texture.key };
  }
}
