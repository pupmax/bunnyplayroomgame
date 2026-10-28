// Glassia PENALTY PUP (door 2, scene key 'Football'). You are Glassia taking penalties; Puppy is the goalkeeper.
// READ & SHOOT (Marc fb 28 Oct, mockup A): Puppy LEANS to guess a side. When the shot-clock ring round the ball is GREEN you may kick;
// Puppy dives about 0.15 s AFTER the kick, toward his guess: the OTHER corner = GOAL, his side = SAVE. Kick on yellow (he is still
// balanced, reading you) = he saves it. Ring runs out = he re-centres and scolds (3 times = shot lost). Middle chip = NOGGIN BONK,
// once per round (he is wise to it after that; never past the MEGA mittens).
// Shots 1-3 honest lean. 4-6 he swaps lean mid-wiggle (green only on his LAST lean) and can sneak one more swap while green.
// 7-8 MEGA mittens + BLUFF: the lean may lie, his TAIL wags to the side he will really dive. A goal there = WRONG WAY, PUP! gag.
// 8 shots; every goal drains 20% of PUPPY PRIDE (a noggin bonk 30%). Empty the bar (5 goals) to win.
// Aim: SWIPE in any direction (about 60 px is enough; only the direction counts, dotted preview while dragging) or TAP a corner.
// Arms (mockup D): two-bone IK at a fixed length from shoulders on his body, drawn between his body and head layers (pk_* art).
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, ensureArt } from '../art/registry';
import { makeMuteButton, pointerInMute } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, sparks, comic, flashVignette } from '../systems/kit';
import { impact } from '../systems/level';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { CHEEKY, mix } from '../lines'; // cheeky pass
import { HeroRig } from '../systems/rigs';
void H;

// ---------------- tuning (iPhone real-touch, ~100 ms input latency; see tests/glassia_sim2.mjs) ----------------
export const PK = {
  SHOTS: 8, NEED: 5, DRAIN: 0.2, DRAIN_NOGGIN: 0.3,
  /** white ring: he gets set (a kick now is too early) */
  READY: [600, 900],
  /** yellow ring: he wiggles in the middle, reading you (shots 1-3, 7-8) */
  READ: [450, 700],
  /** shots 4-6: the first lean while still yellow, then he swaps (SWAP ms crossing) and the ring goes green on the LAST lean */
  READ_LEAN: [500, 750], SWAP: 220,
  /** green ring length = the shot clock, per shot */
  GREEN: [1600, 1500, 1400, 1250, 1200, 1150, 1150, 1100],
  /** chance of one sneaky swap while green, and when it can come (ms into the green) */
  SNEAKY_P: [0, 0, 0, 0.35, 0.4, 0.45, 0.45, 0.5], SNEAKY_AT: [410, 780],
  /** shots 7-8: chance his lean is a bluff (the tail wags to the real side) */
  BLUFF_P: [0, 0, 0, 0, 0, 0, 0.6, 0.6],
  REACT: 150, CROUCH: 60, DIVE: 300, FLIGHT: 420, CHIP: 470, KICK_CONTACT: 120, QUICK: 600, SWIPE_MIN: 60, MID: 85,
  MEGA: 1.45,
  RESETS: 3, // he re-centres this many times if Glassia never shoots, then the shot is lost
};
const KX = 360, KY = 768, KM = 1.55; // keeper feet + art scale (2.07x the old 0.75 Puppy)
const GOAL = { cx: 360, x0: 70, x1: 650, top: 440, ground: 770 };
type Zone = { x: number; y: number; side: -1 | 0 | 1; high: boolean };
const ZONES: Zone[] = [{ x: 175, y: 525, side: -1, high: true }, { x: 175, y: 700, side: -1, high: false }, { x: 360, y: 548, side: 0, high: true },
  { x: 545, y: 525, side: 1, high: true }, { x: 545, y: 700, side: 1, high: false }];
const INK = 0x22252b, FUR = 0xc27230, FURD = 0xa85d24, FUR_INK = 0x3b1f10, GLOVE = 0x7dff9a, GLOVE_D = 0x3fcf6a;
type Vis = { k: string; side: number; at: number; tail?: number };
export const KEEPER_KEYS = ['pk_b0', 'pk_b8', 'pk_h_idle', 'pk_h_lean', 'pk_h_dizzy', 'pk_h_panic'];
const TEX: Record<string, [string, string]> = { pup_box_idle: ['pk_b0', 'pk_h_idle'], pup_box_lean: ['pk_b8', 'pk_h_lean'], pup_box_dizzy: ['pk_b0', 'pk_h_dizzy'], pup_box_panic: ['pk_b0', 'pk_h_panic'] };
type Gl = { lx: number; ly: number; rx: number; ry: number };

/** Keeper Puppy: body layer, goalie arms, head layer (+ his own wagging tail behind), all in one container so they rotate together.
 *  Arms: shoulders on the body, upper arm + forearm with an elbow (2-bone IK), fixed length: a target out of reach is clamped (the
 *  scene moves his BODY instead); gloves never sit over his face (pushed below the head) and the arm layer never swaps. */
class Keeper {
  c: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; headI: Phaser.GameObjects.Image; arms: Phaser.GameObjects.Graphics; tail: Phaser.GameObjects.Graphics;
  wrap: Phaser.GameObjects.Graphics; sh: Phaser.GameObjects.Ellipse;
  h: number; gl: Gl = { lx: 0, ly: 0, rx: 0, ry: 0 }; glove = 1; armsOn = true; flail = 0; tex = 'pup_box_idle'; flipped = false;
  /** tail: 0 = lazy wag across both sides; -1/1 = fast honest wag on that side (shots 7-8: the side he will really dive) */
  tailSide = 0; dbg = false;
  constructor(private s: Phaser.Scene) {
    this.c = s.add.container(KX, KY).setDepth(30);
    this.body = art(s, 0, 0, 'pk_b0', KM); this.headI = art(s, 0, 0, 'pk_h_idle', KM); this.h = this.body.displayHeight;
    this.arms = s.add.graphics(); this.tail = s.add.graphics(); this.wrap = s.add.graphics().setVisible(false);
    this.c.add([this.tail, this.body, this.arms, this.headI, this.wrap]);
    this.sh = s.add.ellipse(KX, KY + 4, this.h * 0.7, this.h * 0.18, 0x0b3a14, 0.3).setDepth(14);
    this.ready(true);
  }
  // ----- poses (local coords, feet at 0,0; h = his height) -----
  static P(name: string, h: number, side = 0): Gl {
    switch (name) {
      case 'ready': return { lx: -0.36 * h, ly: -0.40 * h, rx: 0.36 * h, ry: -0.40 * h };
      case 'lean': return { lx: -0.36 * h + side * 0.05 * h, ly: -0.40 * h + (side < 0 ? -0.05 * h : 0.03 * h), rx: 0.36 * h + side * 0.05 * h, ry: -0.40 * h + (side > 0 ? -0.05 * h : 0.03 * h) };
      case 'crouch': return { lx: -0.30 * h, ly: -0.30 * h, rx: 0.30 * h, ry: -0.30 * h };
      case 'dive': return { lx: -0.40 * h, ly: -0.37 * h, rx: 0.40 * h, ry: -0.37 * h }; // flat out: one mitt to the sky, one along the turf
      case 'hug': return { lx: -0.10 * h, ly: -0.22 * h, rx: 0.10 * h, ry: -0.22 * h };
      case 'up': return { lx: -0.40 * h, ly: -0.46 * h, rx: 0.40 * h, ry: -0.46 * h };
      case 'sit': return { lx: -0.36 * h, ly: -0.16 * h, rx: 0.36 * h, ry: -0.16 * h };
    }
    return Keeper.P('ready', h);
  }
  pose(name: string, dur = 160, side = 0, ease = 'Quad.Out') { this.reachTo(Keeper.P(name, this.h, side), dur, ease); }
  ready(now = false, dur = 160) { this.pose('ready', now ? 0 : dur); }
  reachTo(to: Partial<Gl>, dur = 160, ease = 'Quad.Out') { this.s.tweens.killTweensOf(this.gl); if (!dur) Object.assign(this.gl, to); else this.s.tweens.add({ targets: this.gl, ...to, duration: dur, ease }); }
  /** local point of a world target if the container were at (px,py) with angle a (deg) */
  localAt(tx: number, ty: number, px: number, py: number, a: number) { const r = -Phaser.Math.DegToRad(a), dx = tx - px, dy = ty - py; return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) }; }
  /** world point of a local point if the container were at (px,py) with angle a (deg) */
  worldAt(lx: number, ly: number, px: number, py: number, a: number) { const r = Phaser.Math.DegToRad(a); return { x: px + lx * Math.cos(r) - ly * Math.sin(r), y: py + lx * Math.sin(r) + ly * Math.cos(r) }; }
  world(lx: number, ly: number) { const m = this.c.getWorldTransformMatrix(); return m.transformPoint(lx, ly, { x: 0, y: 0 }) as { x: number; y: number }; }
  gloveMid() { const a = this.solve(-1), b = this.solve(1); return this.world((a.wx + b.wx) / 2, (a.wy + b.wy) / 2); }
  head() { return this.world(0, -0.78 * this.h); }
  setTex(k: string) { const t = TEX[k] ?? TEX.pup_box_idle; this.tex = k; this.body.setTexture(t[0]); this.headI.setTexture(t[1]); return this; }
  flip(f: boolean) { this.flipped = f; this.body.setFlipX(f); this.headI.setFlipX(f); return this; }
  /** the lean frame tilts his whole art 8 deg about (0,-0.156h); shoulders + face follow it */
  private lr(x: number, y: number) { if (this.tex !== 'pup_box_lean') return { x, y }; const a = Phaser.Math.DegToRad(this.flipped ? -8 : 8), py = -0.156 * this.h, dy = y - py;
    return { x: x * Math.cos(a) - dy * Math.sin(a), y: py + x * Math.sin(a) + dy * Math.cos(a) }; }
  static L1 = 0.125; static L2 = 0.115;
  /** 2-bone IK for one arm: returns shoulder, elbow, wrist (local), with the target clamped to reach and kept off his face */
  solve(sd: number, t = 0) {
    const h = this.h, L1 = Keeper.L1 * h, L2 = Keeper.L2 * h, sh = this.lr(sd * 0.175 * h, -0.30 * h), sx = sh.x, sy = sh.y;
    let gx = sd < 0 ? this.gl.lx : this.gl.rx, gy = sd < 0 ? this.gl.ly : this.gl.ry;
    if (this.flail) { gx += Math.sin(t / 55 + sd) * 0.05 * h * this.flail; gy += Math.cos(t / 47 + sd * 2) * 0.04 * h * this.flail; }
    // keep the mitt below his face: never inside the head + ears ellipse
    const hc = this.lr(0, -0.59 * h), rx = 0.44 * h, ry = 0.25 * h, ex = (gx - hc.x) / rx;
    if (Math.abs(ex) < 1) { const bot = hc.y + ry * Math.sqrt(1 - ex * ex); if (gy < bot && gy > hc.y - ry) gy = bot; }
    let dx = gx - sx, dy = gy - sy, d = Math.hypot(dx, dy) || 1; const maxR = (L1 + L2) * 0.995, minR = 0.35 * (L1 + L2);
    if (d > maxR) { dx *= maxR / d; dy *= maxR / d; d = maxR; } if (d < minR) { dx *= minR / d; dy *= minR / d; d = minR; }
    const wx = sx + dx, wy = sy + dy, a0 = Math.atan2(dy, dx), A = Math.acos(Phaser.Math.Clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const bend = sd > 0 ? 1 : -1; // elbows point out and down, away from the body
    return { sx, sy, ex: sx + Math.cos(a0 + bend * A) * L1, ey: sy + Math.sin(a0 + bend * A) * L1, wx, wy, bend };
  }
  draw(t: number) {
    const g = this.arms.clear(); this.sh.setPosition(this.c.x, KY + 4).setScale(1 - Math.min(0.5, (KY - this.c.y) / 400));
    this.drawTail(t);
    if (!this.armsOn) return;
    const h = this.h, W1 = 0.085 * h, W2 = 0.072 * h, o = 7;
    const seg = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, col: number) => { // tapered capsule
      const an = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(an), ny = Math.cos(an);
      g.fillStyle(col, 1).fillPoints([{ x: x0 + nx * w0 / 2, y: y0 + ny * w0 / 2 }, { x: x1 + nx * w1 / 2, y: y1 + ny * w1 / 2 }, { x: x1 - nx * w1 / 2, y: y1 - ny * w1 / 2 }, { x: x0 - nx * w0 / 2, y: y0 - ny * w0 / 2 }], true);
      g.fillCircle(x0, y0, w0 / 2).fillCircle(x1, y1, w1 / 2); };
    const ell = (cx: number, cy: number, rx: number, ry: number, ang: number, fill: number, line = 5) => { const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 24; i++) { const q = i / 24 * Math.PI * 2; pts.push({ x: cx + Math.cos(q) * rx * Math.cos(ang) - Math.sin(q) * ry * Math.sin(ang), y: cy + Math.cos(q) * rx * Math.sin(ang) + Math.sin(q) * ry * Math.cos(ang) }); }
      g.fillStyle(fill, 1).fillPoints(pts, true); g.lineStyle(line, INK, 1).strokePoints(pts, true); };
    const J: number[][] = [];
    for (const sd of [-1, 1]) {
      const { sx, sy, ex, ey, wx, wy, bend } = this.solve(sd, t);
      seg(sx, sy, ex, ey, W1 + o, W2 + o, FUR_INK); seg(ex, ey, wx, wy, W2 + o, W2 * 0.9 + o, FUR_INK);
      seg(sx, sy, ex, ey, W1, W2, sd < 0 ? FURD : FUR); seg(ex, ey, wx, wy, W2, W2 * 0.9, sd < 0 ? FURD : FUR);
      // mitt: thumb, palm, finger grooves, shine, white wrist cuff, all turned along the forearm
      const fa = Math.atan2(wy - ey, wx - ex), ux = Math.cos(fa), uy = Math.sin(fa), px = -uy * bend, py = ux * bend, R = 0.085 * h * this.glove;
      const cx = wx + ux * R * 0.85, cy = wy + uy * R * 0.85;
      ell(cx - px * R * 0.62 - ux * R * 0.15, cy - py * R * 0.62 - uy * R * 0.15, R * 0.42, R * 0.3, fa + bend * 0.9, GLOVE);
      ell(cx, cy, R, R * 0.82, fa, GLOVE);
      g.lineStyle(3.5, GLOVE_D, 1); for (const k2 of [-0.42, 0, 0.42]) g.lineBetween(cx + ux * R * 0.25 + px * R * k2, cy + uy * R * 0.25 + py * R * k2, cx + ux * R * 0.85 + px * R * k2 * 0.9, cy + uy * R * 0.85 + py * R * k2 * 0.9);
      g.fillStyle(0xffffff, 0.55).fillCircle(cx - ux * R * 0.25 + px * R * 0.3, cy - uy * R * 0.25 + py * R * 0.3, R * 0.2);
      ell(wx, wy, R * 0.34, R * 0.74, fa, 0xffffff, 4.5);
      if (this.dbg) J.push([sx, sy], [ex, ey], [wx, wy]);
    }
    for (const [jx, jy] of J) g.fillStyle(0xff3b6b, 1).lineStyle(4, 0xffffff, 1).fillCircle(jx, jy, 9).strokeCircle(jx, jy, 9);
  }
  /** his fluffy tail peeking out from behind his body: a lazy wag across both sides, or (bluff shots) a fast wag on the TRUE side */
  private drawTail(t: number) {
    const fast = this.tailSide !== 0, g = this.tail.clear(), h = this.h, bx = 0, by = -0.17 * h, L = (fast ? 0.52 : 0.36) * h;
    let phi: number;
    // fast wag sticks well out past his hip on the TRUE side so it reads on a phone
    if (fast) phi = (this.tailSide > 0 ? 0.22 : Math.PI - 0.22) + Math.sin(t / 42) * 0.34 * (this.tailSide > 0 ? 1 : -1);
    else phi = -Math.PI / 2 + Math.sin(t / 420) * 1.15;
    const ux = Math.cos(phi), uy = Math.sin(phi), px = -uy, py = ux, curl = (ux >= 0 ? -1 : 1) * 0.07 * h;
    const pts: { x: number; y: number }[] = [], back: { x: number; y: number }[] = [];
    for (let i = 0; i <= 12; i++) { const s = i / 12, w = 0.035 * h + 0.06 * h * Math.sin(Math.PI * Math.min(1, s * 1.15)), c = Math.sin(Math.PI * s) * curl;
      const x = bx + ux * L * s + px * c, y = by + uy * L * s + py * c; pts.push({ x: x + px * w, y: y + py * w }); back.unshift({ x: x - px * w, y: y - py * w }); }
    const poly = pts.concat(back);
    g.lineStyle(9, FUR_INK, 1).strokePoints(poly, true); g.fillStyle(0xc27230, 1).fillPoints(poly, true);
    const tx = bx + ux * L * 0.93, ty = by + uy * L * 0.93; g.fillStyle(0xffe2b8, 1).fillCircle(tx, ty, 0.045 * h);
    if (fast) { g.lineStyle(5, 0xffffff, 0.95); for (const k of [-1, 0, 1]) { const a = phi + k * 0.35, r0 = L * 1.12, r1 = L * 1.32;
      g.lineBetween(bx + Math.cos(a) * r0, by + Math.sin(a) * r0, bx + Math.cos(a) * r1, by + Math.sin(a) * r1); } }
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
  private dizzy?: Phaser.GameObjects.Container; private tellTw?: Phaser.Tweens.Tween; private wigTw?: Phaser.Time.TimerEvent; private firstEarly = true; private bagReact: string[] = []; private hiddenBall = false;
  private outroCard?: () => void; private ringG!: Phaser.GameObjects.Graphics; private ruleT!: Phaser.GameObjects.Text; private ruleBg!: Phaser.GameObjects.Graphics; private shownGo = false;
  constructor() { super('Football'); }
  private fresh() {
    return { shot: 0, goals: 0, noggins: 0, pride: 1, results: [] as (string | undefined)[], phase: 'intro', ready: false, over: false, score: 0,
      react: null as number | null, side: 0, fired: false, resets: 0, vis: { k: 'intro', side: 0, at: 0 } as Vis, last: '', hits: 0, kick: 0, mega: false,
      /** shot clock ring: wait (white) | read (yellow) | go (green) | off */
      ring: 'off' as 'wait' | 'read' | 'go' | 'off', lean: 0, trueSide: 0, bluff: false, greenAt: 0, greenEnd: 0, greenLen: 1, nogginUsed: false, swaps: 0 };
  }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250);
    this.st = this.fresh(); this.seq = 0; this.held = 'none'; this.ghost = 1; this.marks = []; this.crowd = []; this.firstEarly = true; this.bagReact = []; this.shownGo = false;
    this.tweens.timeScale = 1; this.time.timeScale = 1; this.gnow = 0; this.clapping = false; this.down = undefined; this.dizzy = undefined; this.outroCard = undefined; this.hiddenBall = false;
    (this as any).kp = undefined;
    art(this, 0, 0, 'bg_pitch');
    // the pitch art's ad board still says BALL BONK: paint our own board over it
    const ad = this.add.graphics().setDepth(1); ad.fillGradientStyle(0xf25d8f, 0xf25d8f, 0xc23a58, 0xc23a58, 1).fillRect(0, 290, W, 41);
    txt(this, W / 2, 311, 'PENALTY PUP  •  BUNNY PLAYROOM  •  PENALTY PUP', 24, '#fff0f4', '#a02848', 3).setDepth(2);
    ['Ruby', 'Zoe', 'Nana', 'Iris', 'Noir'].forEach((n, i) => this.crowd.push(art(this, 80 + i * 140, 262, `head_${n}_happy`, 0.38)));
    this.drawGoal();
    this.zoneG = this.add.graphics().setDepth(13); this.drawZones(0.22);
    this.bulge = this.add.graphics().setDepth(13);
    this.tellG = this.add.graphics().setDepth(60);
    this.strings = this.add.graphics().setDepth(36);
    this.add.ellipse(KX, 1236, 64, 20, 0xffffff, 0.85).setDepth(13); // penalty spot
    this.gla = new HeroRig(this, 'Glassia', this.GX, this.GY, 1.15, { number: '7', tail: true }).setDepth(40);
    const rf = this.gla.point('rf'); this.GX += KX - (rf.x + 38); this.gla.setPosition(this.GX, this.GY); this.BALL0 = { x: KX, y: rf.y - 24 };
    this.ballSh = this.add.ellipse(this.BALL0.x, this.BALL0.y + 28, 58, 16, 0x0b3a14, 0.35).setDepth(44);
    this.ringG = this.add.graphics().setDepth(44.5);
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
    // the one-line rule, always on screen (between the ad board and the crossbar)
    this.ruleBg = this.add.graphics().setDepth(599); this.ruleT = txt(this, W / 2, 364, '', 25, '#ffdf6b', '#22252b', 6).setDepth(600); this.setRule('Puppy leans to guess. Shoot the OTHER corner!');
    makeMuteButton(this); makePauseButton(this, () => !this.st.over); setPageBg(0x4fb3ff, 0x2f8f3a);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    this.updateHud(); this.drawBar();
    // the keeper's layered art (body / arms / head) is drawn on demand the first time the level opens
    let dead = false; this.events.once('shutdown', () => { dead = true; });
    const go = () => {
      if (dead) return;
      this.kp = new Keeper(this);
      (window as any).__pr = { scene: 'Football', st: this.st, force: (win: boolean) => this.finish(win), pup: () => ({ x: this.kp.c.x, y: this.kp.c.y }),
        zones: () => ZONES.map(z => ({ ...z })), ball: () => ({ x: this.ball.x, y: this.ball.y }), now: () => this.gnow, tune: PK, ring: () => this.st.ring };
      tutorialCard(this, 'glassia_pen2', 'PENALTY PUP!', ['You are GLASSIA! Puppy is in goal.', 'He LEANS to guess where you will kick.', 'Ring GREEN? SWIPE (or tap) the OTHER corner!', 'Kick on yellow = he saves it. Too slow = he scolds!', `${PK.SHOTS} shots: score ${PK.NEED} goals to win!`], () => this.begin());
    };
    if (KEEPER_KEYS.every(k => this.textures.exists(k))) go(); else ensureArt(this, KEEPER_KEYS).then(go);
  }
  private setRule(s: string) {
    this.ruleT.setText(s); const w = this.ruleT.width + 40, g = this.ruleBg.clear();
    g.fillStyle(0x22252b, 0.62).fillRoundedRect(W / 2 - w / 2, 364 - 23, w, 46, 23);
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
    this.gnow += dt * this.time.timeScale; if (!this.kp) return; this.kp.draw(t); this.drawRing(t);
    if (this.held === 'kp') { const m = this.kp.gloveMid(); this.ball.setPosition(m.x, m.y - 6); this.ballSh.setAlpha(0); }
    else if (this.held === 'gla') { const p = this.gla.point('rp'); this.ball.setPosition(p.x, p.y - 30); this.ballSh.setAlpha(0); }
    if (this.strings.visible && this.kp.wrap.visible) { const top = this.kp.world(0, -0.47 * this.kp.h - 0.55 * this.kp.h); const g = this.strings.clear(); g.lineStyle(4, 0xffffff, 0.9);
      for (const x of [GOAL.cx - 120, GOAL.cx - 40, GOAL.cx + 40, GOAL.cx + 120]) g.lineBetween(x, GOAL.top + 10, top.x + (x - GOAL.cx) * 0.12, top.y + 6); }
    if (this.dizzy?.active) { const hp = this.kp.head(); this.dizzy.setPosition(hp.x, hp.y - 30); this.dizzy.list.forEach((o, i) => { const a = t / 200 + i * 2.09; (o as Phaser.GameObjects.Text).setPosition(Math.cos(a) * 60, Math.sin(a) * 16); }); }
    if (this.clapping) { const g = this.clapG.clear(), k = Math.abs(Math.sin(t / 110)), bx = this.bun.x, by = this.bun.y - 46 + Math.sin(t / 220) * 3;
      g.fillStyle(0xffffff, 1).lineStyle(4, INK, 1); for (const sd of [-1, 1]) g.fillCircle(bx + sd * (5 + 18 * k), by, 9).strokeCircle(bx + sd * (5 + 18 * k), by, 9);
      if (k < 0.12) { g.lineStyle(4, 0xffdf6b, 1); for (const a of [-0.6, 0, 0.6]) g.lineBetween(bx + Math.sin(a) * 26, by - 22 - Math.cos(a) * 4, bx + Math.sin(a) * 40, by - 34 - Math.cos(a) * 10); } }
  }
  /** the shot-clock ring round the ball: white = wait, yellow = he is reading you, green (draining) = KICK NOW */
  private drawRing(t: number) {
    const s = this.st, g = this.ringG.clear(); if (s.ring === 'off' || s.fired || s.over) return;
    const x = this.BALL0.x, y = this.BALL0.y, r = 60;
    g.lineStyle(18, INK, s.ring === 'wait' ? 0.35 : 0.8).beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.strokePath();
    if (s.ring === 'wait') { g.lineStyle(8, 0xffffff, 0.55).beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.strokePath(); return; }
    if (s.ring === 'read') { g.lineStyle(10, 0xffd23f, 0.65 + 0.35 * Math.abs(Math.sin(t / 90))).beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.strokePath(); return; }
    const f = Phaser.Math.Clamp((s.greenEnd - this.gnow) / s.greenLen, 0, 1);
    g.lineStyle(11, f > 0.3 ? 0x4dff7a : 0xa6ff4d, 1).beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.strokePath();
  }
  // ---------------- flow ----------------
  private after(ms: number, fn: () => void) { const tok = this.seq; return this.time.delayedCall(ms, () => { if (tok === this.seq && !this.st.over) fn(); }); }
  private vis(k: string, side = 0, tail?: number) { this.st.vis = { k, side, at: this.time.now, tail }; }
  private begin() {
    popBanner(this, 'READ HIS LEAN!', 820, 0x3a86ff, 900);
    this.time.delayedCall(500, () => say(this, 300, 860, pick(LINES.penStart), 24, 1600));
    this.time.delayedCall(900, () => this.startShot());
  }
  private rnd(a: number[]) { return Phaser.Math.Between(a[0], a[1]); }
  private coin(): -1 | 1 { return Math.random() < 0.5 ? -1 : 1; }
  private startShot(reset = false) {
    const s = this.st, k = this.kp; if (s.over) return; ++this.seq;
    s.phase = 'ready'; s.fired = false; s.ring = 'wait'; s.lean = 0; s.trueSide = 0; s.side = 0; s.bluff = false; s.greenAt = 0; s.swaps = 0; k.tailSide = 0; if (!reset) s.resets = 0;
    const back = reset ? 0 : this.returnHome(); this.clearTell();
    if (!reset) { this.held = 'none'; this.ball.setPosition(this.BALL0.x, this.BALL0.y).setAngle(0).setAlpha(1).setDepth(45).setScale(0.5); this.tweens.add({ targets: this.ball, scale: 1, duration: 260, ease: 'Back.Out' });
      this.ballSh.setPosition(this.BALL0.x, this.BALL0.y + 28).setScale(1).setAlpha(0.35); this.gla.setMood('smug').setPosition(this.GX, this.GY); }
    this.updateHud(); this.drawZones(0.22); this.vis('ready');
    const n = s.shot; let extra = 0;
    if (n === 6 && !s.mega && !reset) { s.mega = true; extra = 1700; popBanner(this, pick(LINES.penLast), 900, 0xe0243a, 1100); this.tweens.add({ targets: k, glove: PK.MEGA, duration: 500, ease: 'Back.Out', delay: 300 });
      this.time.delayedCall(700, () => say(this, 470, 416, pick(LINES.penGloves), 24, 1400));
      this.time.delayedCall(1500, () => { if (s.over) return; popBanner(this, pick(LINES.penBluff), 900, 0x8a3ffc, 1300); this.setRule(pick(LINES.penBluffRule)); }); }
    else if (!reset && n < 6 && PK.NEED - s.goals === PK.SHOTS - n && s.goals < PK.NEED) popBanner(this, pick(LINES.penMust), 900, 0xe0243a, 900);
    else if (!reset && (n === 0 || Math.random() < 0.35)) this.time.delayedCall(250, () => !s.fired && !s.over && say(this, 300, 860, pick(LINES.penGlassia), 22, 1300));
    s.ready = true;
    // ---- plan this shot: white (get set) -> yellow (reading you; 4-6: lean + swap) -> GREEN on his final lean (the shot clock) ----
    let t = back + this.rnd(PK.READY) + extra;
    let side = this.coin();
    if (n >= 3 && n <= 5) { // he swaps lean mid-wiggle; the ring only goes green on his LAST lean
      const first = side, two = Math.random() < 0.35; this.after(t, () => this.leanTo(first, false)); t += this.rnd(PK.READ_LEAN);
      this.after(t, () => this.swapTo(-first as -1 | 1)); t += PK.SWAP; side = -first as -1 | 1;
      if (two) { t += this.rnd([300, 450]); const s2 = -side as -1 | 1; this.after(t, () => this.swapTo(s2)); side = s2; t += PK.SWAP; }
      t += 40; // green lands just after his last lean
    } else { this.after(t, () => this.readMid()); t += this.rnd(PK.READ) + (reset ? -150 : 0); }
    const bluff = Math.random() < PK.BLUFF_P[n], real = side, shown = (bluff ? -real : real) as -1 | 1;
    const len = PK.GREEN[n];
    this.after(t, () => this.green(real, shown, bluff, len));
    let end = t + len;
    if (Math.random() < PK.SNEAKY_P[n]) { const at = t + this.rnd(PK.SNEAKY_AT); if (at + PK.SWAP < end - 250) { this.after(at, () => this.sneaky()); end += PK.SWAP; } }
    this.after(end, () => { if (!s.fired) this.timeUp(); });
    if (n === 0 && !reset) this.time.delayedCall(t + 250, () => s.shot === 0 && !s.fired && s.ring === 'go' && !s.over && Math.random() < 0.6 && say(this, 470, 416, pick(LINES.penTell), 22, 900));
  }
  /** between shots: if he is lying about or off-centre, he gets up and hops back to the middle (never snaps or slides). Returns ms taken. */
  private returnHome() {
    const k = this.kp, c = k.c; this.tweens.killTweensOf(c); k.flail = 0; k.armsOn = true; k.tailSide = 0; this.dizzy?.destroy();
    const off = Math.abs(c.x - KX) > 4 || Math.abs(c.angle) > 2 || Math.abs(c.y - KY) > 4 || Math.abs(c.scaleX - 1) > 0.02;
    if (!off) { k.setTex('pup_box_idle').flip(false); k.ready(false, 200); return 0; }
    // sit up first (rotate back to upright about his feet), then two little hops to the spot
    k.setTex('pup_box_dizzy'); this.tweens.add({ targets: c, angle: 0, y: KY, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.Out' });
    k.ready(false, 260);
    this.after(280, () => { k.setTex('pup_box_idle').flip(c.x > KX); Fx.step();
      this.tweens.add({ targets: c, x: KX, duration: 440, ease: 'Sine.InOut', onComplete: () => k.flip(false) });
      this.tweens.chain({ targets: c, tweens: [{ y: KY - 36, duration: 110, ease: 'Quad.Out' }, { y: KY, duration: 110, ease: 'Quad.In' }, { y: KY - 36, duration: 110, ease: 'Quad.Out' }, { y: KY, duration: 110, ease: 'Quad.In' }] }); });
    return 760;
  }
  private stopWiggle() { this.wigTw?.remove(); this.wigTw = undefined; }
  /** yellow: he bounces in the middle, eyes darting, reading her (a kick now = he is balanced and saves it) */
  private readMid() {
    const s = this.st, k = this.kp; s.phase = 'read'; s.ring = 'read'; s.lean = 0; this.vis('read'); this.clearTell(); this.stopWiggle();
    this.tweens.killTweensOf(k.c); k.setTex('pup_box_idle').flip(false);
    this.tweens.add({ targets: k.c, x: KX, angle: 0, duration: 120 });
    this.tweens.add({ targets: k.c, y: KY - 16, duration: 130, yoyo: true, repeat: 3, ease: 'Quad.Out' }); k.pose('crouch', 140);
    let n = 0; this.wigTw = this.time.addEvent({ delay: 140, repeat: 8, callback: () => { if (s.phase !== 'read') return this.stopWiggle(); n++; k.c.setAngle(n % 2 ? 4 : -4); } });
    const q = txt(this, KX + 0.3 * k.h, KY - 0.95 * k.h, '?', 48, '#ffdf6b', '#22252b', 7).setDepth(61); this.tweens.add({ targets: q, y: q.y - 30, alpha: 0, duration: 650, delay: 200, onComplete: () => q.destroy() });
    if (Math.random() < 0.25 && s.shot > 0) say(this, 470, 416, pick(LINES.penRead), 22, 900);
  }
  /** his lean = his guess: lean + ear twitch + eye-dart lines and chevrons toward `side` (green = full strength) */
  private leanTo(side: -1 | 1, green: boolean) {
    const s = this.st, k = this.kp; s.phase = green ? 'tell' : 'read'; if (!green) s.ring = 'read'; s.lean = side; this.vis(green ? 'green' : 'lean', side, green && k.tailSide ? k.tailSide : undefined);
    this.tweens.killTweensOf(k.c); this.tellTw?.stop(); this.stopWiggle();
    k.flip(side < 0); // the lean frame tilts toward screen-right; flipped for a left-hand lean
    this.tweens.add({ targets: k.c, x: KX + side * 22, y: KY, angle: side * 9, duration: 150, ease: 'Quad.Out' });
    k.pose('lean', 150, side);
    let n = 0; this.wigTw = this.time.addEvent({ delay: 120, loop: true, callback: () => { if (s.phase !== 'tell' && s.phase !== 'read') return this.stopWiggle(); n++; k.setTex(n % 2 ? 'pup_box_lean' : 'pup_box_idle'); k.c.setAngle(side * 9 + (n % 2 ? 3 : -3)); } });
    k.setTex('pup_box_lean'); Fx.step();
    const g = this.tellG.clear(), hy = KY - 0.66 * k.h, hx = KX + side * 0.36 * k.h;
    g.lineStyle(7, INK, 1); for (const o of [-22, 0, 22]) g.lineBetween(hx + side * 10, hy + o, hx + side * (44 - Math.abs(o) * 0.5), hy + o * 1.4);
    g.lineStyle(4, 0xffffff, 1); for (const o of [-22, 0, 22]) g.lineBetween(hx + side * 10, hy + o, hx + side * (44 - Math.abs(o) * 0.5), hy + o * 1.4);
    const cx = side < 0 ? 200 : 520; g.fillStyle(0xffdf6b, 1).lineStyle(6, INK, 1);
    for (const [ox, sc] of [[0, 1.2], [side * 54, 0.9]] as const) { const x = cx + ox, y = 488, d = side * 40 * sc; g.fillTriangle(x + d, y, x - d * 0.2, y - 28 * sc, x - d * 0.2, y + 28 * sc).strokeTriangle(x + d, y, x - d * 0.2, y - 28 * sc, x - d * 0.2, y + 28 * sc); }
    g.setAlpha(green ? 1 : 0.55); if (green) this.tellTw = this.tweens.add({ targets: g, alpha: 0.35, duration: 160, yoyo: true, repeat: -1 });
  }
  /** swap mid-wiggle (yellow while he crosses), then lean the other way */
  private swapTo(side: -1 | 1, done?: () => void) {
    const s = this.st, k = this.kp; s.phase = 'read'; s.ring = 'read'; s.lean = 0; s.swaps++; this.vis('swap', side); this.clearTell(); this.stopWiggle();
    this.tweens.killTweensOf(k.c); k.setTex('pup_box_idle').flip(false); this.tweens.add({ targets: k.c, x: KX, angle: 0, duration: PK.SWAP * 0.6, ease: 'Quad.InOut' });
    this.tweens.add({ targets: k.c, y: KY - 22, duration: PK.SWAP * 0.5, yoyo: true, ease: 'Quad.Out' }); k.ready(false, PK.SWAP * 0.6); Fx.boing();
    if (Math.random() < 0.3 && !s.fired) say(this, 470, 416, pick(mix(LINES.penFeint, LINES.penSwap)), 22, 800);
    this.after(PK.SWAP, () => { if (done) done(); else if (s.ring !== 'go') this.leanTo(side, false); }); // (green may land in the same frame: never undo it)
  }
  /** GREEN: his final lean (the shot clock starts). Shots 7-8: his tail wags to the side he will REALLY dive (the lean may be a bluff). */
  private green(real: -1 | 1, shown: -1 | 1, bluff: boolean, len: number) {
    const s = this.st, k = this.kp; s.trueSide = real; s.side = real; s.bluff = bluff; s.ring = 'go'; s.greenAt = this.gnow; s.greenLen = len; s.greenEnd = this.gnow + len;
    k.tailSide = s.shot >= 6 ? real : 0; this.leanTo(shown, true);
    if (!this.shownGo) { this.shownGo = true; floatText(this, KX + 120, this.BALL0.y - 70, 'GO!', '#4dff7a', 46); }
  }
  /** sneaky swap while green (shots 4-8): a quick yellow flicker as he crosses, then the green comes back on his NEW lean */
  private sneaky() {
    const s = this.st, k = this.kp; if (s.fired || s.ring !== 'go') return;
    const real = -s.trueSide as -1 | 1, shown = (s.bluff ? -real : real) as -1 | 1; s.trueSide = real; s.side = real;
    const rem = s.greenEnd - this.gnow; s.greenEnd = this.gnow + PK.SWAP + rem; s.ring = 'read';
    if (s.shot >= 6) k.tailSide = 0;
    this.swapTo(shown, () => { s.ring = 'go'; if (s.shot >= 6) k.tailSide = real; this.leanTo(shown, true); });
  }
  /** she waited too long: the clock runs out, he re-centres and tells her off; the shot starts over (3 times = shot lost) */
  private timeUp() {
    const s = this.st, k = this.kp; s.phase = 'recover'; s.ring = 'off'; s.ready = false; this.vis('up'); k.flail = 0; k.tailSide = 0; ++this.seq; this.clearTell(); this.stopWiggle();
    k.setTex('pup_box_idle').flip(false); this.tweens.killTweensOf(k.c);
    this.tweens.add({ targets: k.c, angle: 0, x: KX, duration: 300, ease: 'Sine.InOut' });
    this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 40, duration: 130, ease: 'Quad.Out' }, { y: KY, duration: 130, ease: 'Quad.In' }] });
    k.pose('up', 200); this.time.delayedCall(450, () => !s.over && k.ready(false, 200)); s.resets++;
    if (s.resets >= PK.RESETS) { say(this, 470, 416, 'Puppy: Shot clock! That one is MINE!', 22, 1300); this.time.delayedCall(500, () => this.result('timeout')); return; }
    say(this, 470, 416, pick(LINES.penSlow), 22, 1200); this.time.delayedCall(800, () => !s.over && this.startShot(true));
  }
  private clearTell() { this.tellTw?.stop(); this.tellG.clear().setAlpha(1); }
  private thud(x: number, y: number) { Fx.step(); this.cameras.main.shake(90, 0.005); for (let i = 0; i < 5; i++) { const d = this.add.circle(x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-10, 6), Phaser.Math.Between(10, 18), 0xe9f5d0, 0.8).setDepth(31);
    this.tweens.add({ targets: d, y: d.y - 30, scale: 1.8, alpha: 0, duration: 380, onComplete: () => d.destroy() }); } }
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
    const s = this.st, firedAt = this.gnow, ring = s.ring; s.fired = true; s.ready = false; (window as any).__pr.aim = z.side; (s as any).firedAt = firedAt;
    this.drawZones(0.22, z); this.gla.setMood('smug'); this.ringG.clear();
    // judged at RELEASE: only a green-ring kick beats his guess; yellow/white = he is balanced and reads it
    const d = (ring === 'go' ? s.trueSide : 0) as -1 | 0 | 1; s.react = d ? Math.round(firedAt - s.greenAt) : null; s.ring = 'off';
    const gx = this.GX, gy = this.GY;
    this.tweens.chain({ targets: this.gla.root, tweens: [{ x: gx - 22, y: gy + 8, duration: 70, ease: 'Quad.Out' }, { x: gx + 34, y: gy - 30, duration: 50, ease: 'Quad.In' }, { x: gx, y: gy, duration: 260, ease: 'Back.Out' }] });
    this.gla.act([
      { dur: 0.07, to: { rh: -70, rk: 60, lh: 8, lk: -14, ls: 70, le: 40, rs: -60, re: -30, lean: -10, sq: -0.07, dy: 6, tilt: -6 }, ease: Phaser.Math.Easing.Quadratic.Out },
      { dur: 0.05, to: { rh: 115, rk: -6, lh: -6, lk: 0, ls: -55, le: -30, rs: 80, re: 20, lean: 12, sq: 0.06, dy: -4, tilt: 8 }, ease: Phaser.Math.Easing.Cubic.In },
      { dur: 0.16, to: { rh: 125, rk: 10, ls: -40, rs: 60, lean: 8 }, ease: Phaser.Math.Easing.Quadratic.Out }], false, 0.3);
    this.vis('kick', z.side);
    this.time.delayedCall(PK.KICK_CONTACT, () => {
      if (s.over) return; ++this.seq; this.clearTell(); this.stopWiggle(); this.contact();
      if (!d) this.earlySave(z);
      else if (z.side === 0) { if (!s.nogginUsed && !s.mega) this.noggin(d); else this.catchMid(z, pick(mix(LINES.penBlock.filter(l => !/lying/i.test(l)), LINES.penMidSave)), 'block'); }
      else if (z.side === d) this.diveSave(z, d, PK.REACT, pick(LINES.penSave.filter(l => !/early/i.test(l))), 'save');
      else this.goal(z, d, firedAt - s.greenAt);
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
  /** kicked on white/yellow: he is balanced, reads it and saves */
  private earlySave(z: Zone) {
    const line = this.firstEarly ? LINES.penSave[3] ?? LINES.penSave[0] : pick(LINES.penSave);
    if (this.firstEarly) floatText(this, W / 2, 960, 'Wait for GREEN!', '#4dff7a', 40); this.firstEarly = false;
    if (z.side === 0) this.catchMid(z, line, 'early'); else this.diveSave(z, z.side as -1 | 1, 40, line, 'early');
  }
  /** straight at him: he hops and hugs it to his tummy (mitts at the chest, below his face) */
  private catchMid(z: Zone, line: string, kind: string) {
    const s = this.st, k = this.kp; s.phase = 'save'; this.tweens.killTweensOf(k.c); k.flail = 0; k.tailSide = 0; k.c.setScale(1);
    k.setTex('pup_box_idle').flip(false); const py = Math.min(KY, z.y + 0.24 * k.h);
    this.tweens.add({ targets: k.c, x: KX, angle: 0, duration: 120 });
    this.tweens.chain({ targets: k.c, tweens: [{ y: py, duration: PK.FLIGHT, ease: 'Quad.Out' }, { y: KY, duration: 280, ease: 'Bounce.Out' }] });
    k.pose('hug', PK.FLIGHT - 60);
    this.fly(z.x, py - 0.24 * k.h, PK.FLIGHT, 70, () => { this.held = 'kp'; Fx.block(); this.saved(line, kind); });
  }
  /**
   * the dive: after `delay` ms he crouches, then launches his WHOLE body (fixed-length arms) so one mitt lands on (tx,ty).
   * High corners: a steep sideways leap; low corners: near-flat. Ends lying on his side. Returns the mitt's world point.
   */
  private dive(d: -1 | 1, high: boolean, tx: number, ty: number, delay: number) {
    // high corners: near-flat dive, the SKY mitt (far arm) takes it; low corners: the GROUND mitt (near arm) along the turf
    const k = this.kp, h = k.h, ang = d * (high ? 70 : 66), arm = high ? -d : d;
    this.tweens.killTweensOf(k.c); k.flail = 0; k.tailSide = 0; this.stopWiggle();
    // where would the d-side mitt sit (IK-clamped) for a reach toward up-and-out?
    const keep = { ...k.gl }, tex = k.tex, fl = k.flipped; k.setTex('pup_box_panic').flip(d < 0);
    Object.assign(k.gl, arm < 0 ? { lx: -0.40 * h, ly: -0.42 * h } : { rx: 0.40 * h, ry: -0.42 * h }); const w = k.solve(arm);
    Object.assign(k.gl, keep); k.setTex(tex).flip(fl);
    const off = k.worldAt(w.wx, w.wy, 0, 0, ang);
    const px = Phaser.Math.Clamp(tx - off.x, GOAL.x0 + 0.2 * h, GOAL.x1 - 0.2 * h), py = Phaser.Math.Clamp(ty - off.y, KY - 260, KY - 10);
    const hit = k.worldAt(w.wx, w.wy, px, py, ang), dur = Math.max(140, PK.FLIGHT - delay - PK.CROUCH);
    this.after(delay, () => {
      k.setTex('pup_box_lean').flip(d < 0); this.tweens.add({ targets: k.c, scaleX: 1.08, scaleY: 0.9, y: KY + 4, angle: d * 6, duration: PK.CROUCH, ease: 'Quad.Out' }); k.pose('crouch', PK.CROUCH);
      this.after(PK.CROUCH, () => {
        k.setTex('pup_box_panic').flip(d < 0); Fx.whoosh(); this.vis('dive', d);
        this.tweens.add({ targets: k.c, x: px, y: py, angle: ang, scaleX: 1, scaleY: 1, duration: dur, ease: 'Quad.Out' });
        const reach = arm < 0 ? { lx: -0.40 * h, ly: -0.42 * h } : { rx: 0.40 * h, ry: -0.42 * h }, other = arm < 0 ? { rx: 0.40 * h, ry: -0.37 * h } : { lx: -0.40 * h, ly: -0.37 * h };
        k.reachTo({ ...reach, ...other }, dur);
      });
    });
    return { hit, px, py, ang, at: delay + PK.CROUCH + dur };
  }
  /** he lands from a dive: drops onto his side with a thud */
  private land(d: -1 | 1, after = 0) {
    const k = this.kp; this.after(after, () => { this.tweens.killTweensOf(k.c);
      this.tweens.add({ targets: k.c, y: KY - 6, angle: d * 86, duration: 300, ease: 'Bounce.Out', onComplete: () => this.thud(k.c.x - d * 0.3 * k.h, KY) }); k.pose('dive', 260); });
  }
  /** he guessed right: dives that way and the mitt meets the ball */
  private diveSave(z: Zone, d: -1 | 1, delay: number, line: string, kind: string) {
    const s = this.st; s.phase = 'save'; const dv = this.dive(d, z.high, z.x, z.y, delay);
    this.fly(dv.hit.x, dv.hit.y, PK.FLIGHT, 50, () => {
      Fx.block(); Fx.boing(); sparks(this, dv.hit.x, dv.hit.y, 12);
      this.tweens.add({ targets: this.ball, x: dv.hit.x + d * 190, y: dv.hit.y - 170, angle: this.ball.angle + 540, scale: 0.4, alpha: 0, duration: 520, ease: 'Quad.Out' });
      this.land(d, Math.max(0, dv.at - PK.FLIGHT) + 30); this.saved(line, kind);
    });
  }
  private saved(line: string, kind: string) {
    this.stamp(KX, 600, 'SAVED!', 0xe0243a); Fx.save(); say(this, 470, 416, line, 24, 1500);
    this.gla.setMood('dizzy').act([{ dur: 0.22, to: { rs: 150, re: 120, ls: 10, le: 20, lean: -4, tilt: 10, sq: -0.03, dy: 4 } }, { dur: 0.6, to: { rs: 150, re: 125, tilt: 12 } }], false, 0.3);
    const pool = kind === 'save' ? mix(LINES.penOops.filter(l => !/dive/i.test(l)), LINES.penOops2) : LINES.penOops.filter(l => !/dive/i.test(l));
    this.time.delayedCall(700, () => !this.st.over && Math.random() < 0.6 && say(this, 300, 860, pick(pool), 22, 1100));
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
  /** he guessed wrong: full dive the wrong way, ball in the open corner, then slapstick (shots 7-8: WRONG WAY, PUP! double-take first) */
  private goal(z: Zone, d: -1 | 1, react: number) {
    const s = this.st, k = this.kp, n = s.shot; s.phase = 'goal';
    const fake = ZONES.find(q => q.side === d && q.high === z.high) ?? ZONES[d < 0 ? 0 : 3]; const dv = this.dive(d, fake.high, fake.x, fake.y, PK.REACT);
    this.land(d, dv.at + 20);
    this.fly(z.x, z.y, PK.FLIGHT, 50, () => {
      const quick = react < PK.QUICK; this.goalFx(z.x, z.y, 500 + (quick ? 200 : 0), quick ? 'QUICK!' : ''); this.drain(PK.DRAIN); s.goals++;
      this.ball.setDepth(20); this.tweens.add({ targets: this.ball, y: GOAL.ground - 34, x: z.x + (KX - z.x) * 0.1, duration: 420, ease: 'Bounce.Out' });
      if (!this.bagReact.length) this.bagReact = Phaser.Utils.Array.Shuffle(['post', 'net', 'slide']);
      const r = this.bagReact.pop()!; (window as any).__pr.react = r; k.flail = 0;
      const go = () => r === 'post' ? this.rPost(d) : r === 'net' ? this.rNet(d, z) : this.rSlide(d, z);
      if (n >= 6) { this.wrongWay(d, z); this.time.delayedCall(1150, () => !s.over && go()); } else this.time.delayedCall(250, go);
      this.result('goal');
    }, 20);
  }
  /** shots 7-8 slapstick: he sits up, looks the way he dived, looks at the ball, looks back... ?! */
  private wrongWay(d: -1 | 1, z: Zone) {
    const k = this.kp; (window as any).__pr.wrongWay = (((window as any).__pr.wrongWay ?? 0) as number) + 1; this.vis('wrongway', d);
    this.stamp(KX, 700, 'WRONG WAY, PUP!', 0x8a3ffc);
    this.time.delayedCall(260, () => {
      if (this.st.over) return; this.tweens.killTweensOf(k.c); k.setTex('pup_box_idle').flip(d < 0);
      this.tweens.add({ targets: k.c, angle: 0, y: KY, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' }); k.pose('sit', 220);
      const q = comic(this, k.c.x, KY - 1.05 * k.h, '?!', 76).setDepth(78).setScale(0.3); this.tweens.add({ targets: q, scale: 1, duration: 160, ease: 'Back.Out' });
      this.tweens.add({ targets: q, alpha: 0, delay: 850, duration: 200, onComplete: () => q.destroy() });
      // double-take: look at the empty side, at the ball, back, then PANIC
      [180, 330, 480].forEach((t, i) => this.time.delayedCall(t, () => { if (this.st.over) return; k.flip(i % 2 ? d < 0 : d > 0); Fx.step(); }));
      this.time.delayedCall(620, () => { if (this.st.over) return; k.setTex('pup_box_panic'); k.pose('up', 120); this.tweens.add({ targets: k.c, y: KY - 26, duration: 110, yoyo: true, ease: 'Quad.Out' }); });
      this.time.delayedCall(300, () => say(this, 470, 416, pick(LINES.penWrongWay), 22, 1100));
    });
  }
  private dizzyStars(ms = 1500) { this.dizzy?.destroy(); this.dizzy = this.add.container(0, 0).setDepth(77); for (let i = 0; i < 3; i++) this.dizzy.add(txt(this, 0, 0, '★', 34, '#ffdf6b', '#22252b', 5));
    const d = this.dizzy; this.time.delayedCall(ms, () => d.destroy()); }
  /** post bonk: scrambles up, leaps after the ball and conks the post head-first, slides down it dizzy */
  private rPost(side: -1 | 1) {
    const k = this.kp, b = -side as -1 | 1, xp = b < 0 ? GOAL.x0 : GOAL.x1, a = b * 70, feetY = KY - 80, fx = xp - b * 0.78 * k.h * Math.sin(Phaser.Math.DegToRad(70));
    k.setTex('pup_box_panic').flip(b > 0); this.tweens.killTweensOf(k.c);
    this.tweens.add({ targets: k.c, angle: 0, y: KY, duration: 160, ease: 'Quad.Out', onComplete: () => {
      k.pose('up', 160);
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
        k.pose('sit', 300);
        this.time.delayedCall(500, () => say(this, 470, 416, pick(LINES.penPup), 22, 1100));
      } });
    } });
  }
  /** net face-plant: jumps after the ball, face-first into the net, peels off and drops */
  private rNet(side: -1 | 1, z: Zone) {
    const k = this.kp, b = -side as -1 | 1, nx = z.x - b * 20; k.setTex('pup_box_panic').flip(b > 0); this.tweens.killTweensOf(k.c);
    this.tweens.add({ targets: k.c, angle: 0, duration: 140, onComplete: () => {
      this.tweens.add({ targets: k.c, x: nx, duration: 380, ease: 'Sine.InOut' });
      this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 150, scaleX: 0.92, scaleY: 0.92, duration: 220, ease: 'Quad.Out' }, { y: KY - 70, duration: 160, ease: 'Quad.In', onComplete: () => {
        Fx.boing(); this.bulgeAt(nx, KY - 0.62 * k.h - 70); k.setTex('pup_box_dizzy'); k.c.setScale(1.0, 0.86);
        const w = comic(this, nx, KY - 330, 'FWUMP!', 72).setDepth(78); this.tweens.add({ targets: w, alpha: 0, delay: 800, duration: 260, onComplete: () => w.destroy() });
        k.pose('up', 120); this.dizzyStars(1400);
        // stuck to the net for a beat, then drops onto his bottom
        this.tweens.add({ targets: k.c, y: KY, scaleX: 1, scaleY: 1, delay: 450, duration: 380, ease: 'Bounce.Out', onComplete: () => this.thud(k.c.x, KY) });
        this.time.delayedCall(450, () => say(this, 470, 416, pick(LINES.penPup), 22, 1100));
      } }] });
    } });
  }
  /** tummy slide: belly-flops after the ball and skids across the goal mouth (dust + skid mark), arriving far too late */
  private rSlide(side: -1 | 1, z: Zone) {
    const k = this.kp, b = -side as -1 | 1, sx = b > 0 ? GOAL.x0 + 30 : GOAL.x1 - 30, ex = b > 0 ? GOAL.x1 - 26 - k.h : GOAL.x0 + 26 + k.h; k.setTex('pup_box_panic').flip(b > 0); this.tweens.killTweensOf(k.c);
    // hop up and belly-flop toward the ball (feet stay on his side, so the whole slide stays inside the goal)
    this.tweens.add({ targets: k.c, x: sx, duration: 320, ease: 'Sine.InOut' });
    this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 60, angle: 0, duration: 160, ease: 'Quad.Out' }, { y: KY - 8, angle: b * 88, duration: 160, ease: 'Quad.In' }] });
    k.pose('dive', 200);
    const skid = this.add.graphics().setDepth(13), x0 = sx;
    this.time.delayedCall(330, () => {
      const w = comic(this, (x0 + ex) / 2, KY - 200, 'SKRRRT!', 66).setDepth(78); this.tweens.add({ targets: w, alpha: 0, delay: 800, duration: 260, onComplete: () => w.destroy() });
      this.tweens.add({ targets: k.c, x: ex, duration: 700, ease: 'Quad.Out', onUpdate: () => {
        skid.clear().lineStyle(14, 0x2a6b2a, 0.5).lineBetween(x0, KY - 4, k.c.x, KY - 4);
        if (Math.random() < 0.4) { const d = this.add.circle(k.c.x - b * 20, KY - 4, 12, 0xe9f5d0, 0.8).setDepth(31); this.tweens.add({ targets: d, y: d.y - 24, scale: 1.8, alpha: 0, duration: 360, onComplete: () => d.destroy() }); } },
        onComplete: () => { k.setTex('pup_box_dizzy'); this.dizzyStars(1200); this.tweens.add({ targets: skid, alpha: 0, delay: 600, duration: 400, onComplete: () => skid.destroy() });
          this.tweens.add({ targets: k.c, angle: b * 80, duration: 200, yoyo: true, ease: 'Quad.Out' }); say(this, 470, 416, pick(LINES.penPup), 22, 1100); } });
    });
  }
  /** middle chip while he is down on one side: he scrambles back to the middle and the ball lands on his head */
  private noggin(side: -1 | 1) {
    const s = this.st, k = this.kp; s.phase = 'goal'; this.tweens.killTweensOf(k.c); k.flail = 0;
    const hx = KX, hy = KY - 0.78 * k.h;
    s.nogginUsed = true; k.tailSide = 0; this.stopWiggle();
    // he lurches toward his guess, realises it is a chip, and scrambles back under it
    k.setTex('pup_box_panic').flip(side < 0); const lurch = PK.REACT + 120, back = PK.CHIP - lurch - 20;
    this.tweens.add({ targets: k.c, x: KX + side * 70, angle: side * 24, duration: 120, delay: PK.REACT, ease: 'Quad.Out', onComplete: () => {
      k.flip(side > 0); this.tweens.add({ targets: k.c, x: KX, angle: 0, duration: back, ease: 'Sine.InOut' });
      this.tweens.chain({ targets: k.c, tweens: [{ y: KY - 50, duration: back * 0.5, ease: 'Quad.Out' }, { y: KY, duration: back * 0.5, ease: 'Quad.In' }] }); } });
    k.pose('up', 250); k.flail = 0.8;
    this.fly(hx, hy, PK.CHIP, 260, () => {
      k.flail = 0; k.setTex('pup_box_dizzy'); this.dizzyStars(1600);
      this.tweens.timeScale = 0.05; this.time.delayedCall(90, () => { this.tweens.timeScale = 1; });
      impact(this, hx, hy, '', 0, '', true);
      const nb = comic(this, W / 2, 440, 'NOGGIN BONK!', 92).setDepth(79).setAngle(-5).setScale(0.3); this.tweens.add({ targets: nb, scale: 1, duration: 200, ease: 'Back.Out' });
      this.tweens.add({ targets: nb, alpha: 0, y: 410, delay: 1100, duration: 300, onComplete: () => nb.destroy() }); flashVignette(this, 0xffffff, 0.5); Fx.punch(); Fx.boing();
      k.c.setScale(1.25, 0.75); this.tweens.add({ targets: k.c, scaleX: 1, scaleY: 1, duration: 420, ease: 'Elastic.Out', easeParams: [1.3, 0.35] });
      this.tweens.add({ targets: k.c, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => k.c.setAngle(0) });
      k.pose('sit', 200);
      // ricochet up into the roof of the net
      const nx = KX + (Math.random() < 0.5 ? -1 : 1) * 130; this.ball.setDepth(20);
      this.tweens.add({ targets: this.ball, x: nx, y: GOAL.top + 70, angle: this.ball.angle + 360, duration: 380, ease: 'Quad.Out', onComplete: () => {
        this.goalFx(nx, GOAL.top + 70, 900, 'NOGGIN!'); this.drain(PK.DRAIN_NOGGIN); s.goals++; s.noggins++;
        this.tweens.add({ targets: this.ball, y: GOAL.ground - 34, duration: 480, ease: 'Bounce.Out' });
        say(this, 470, 416, pick(LINES.penNoggin.slice(1)), 22, 1200); this.result('noggin');
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
    const k = this.kp; this.tweens.killTweensOf(k.c); this.tweens.killTweensOf(this.kp.gl); k.flail = 0; k.tailSide = 0; k.setTex('pup_box_dizzy').flip(false); this.dizzy?.destroy();
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
    const k = this.kp; this.tweens.killTweensOf(k.c); this.tweens.killTweensOf(this.ball); k.flail = 0; k.armsOn = true; k.tailSide = 0; k.setTex('pup_box_idle').flip(false); this.dizzy?.destroy();
    this.tweens.add({ targets: k.c, x: KX, angle: 0, scaleX: 1, scaleY: 1, y: KY, duration: 300, ease: 'Sine.Out', onComplete: () => {
      k.pose('hug', 200); // ball hugged to his chest (mitts stay below his face)
      this.ball.setAlpha(1).setScale(0.65).setDepth(36); this.held = 'kp'; Fx.boing();
      this.tweens.add({ targets: k.c, y: KY - 30, yoyo: true, repeat: -1, duration: 200, ease: 'Quad.Out' });
      say(this, 470, 416, pick(LINES.penLosePup), 24, 1400);
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
    quote?.setText(pick(mix(LINES.penLose.filter(l => !/dive/i.test(l)), LINES.penLose2))); sub?.setText(pick(mix(LINES.penLosePup, CHEEKY.penLosePup)));
    (window as any).__pr.lossCard = { opaque: dim?.fillAlpha, quote: quote?.text, sub: sub?.text, pup: pup?.texture.key };
  }
}
