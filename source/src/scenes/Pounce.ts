// Noir: BOX BANDIT. Two actions, then a tug:
//  1) MEOW?  when Puppy heads for Noir's box: she throws her voice into ANOTHER box and he dashes there instead.
//  2) POUNCE! when his head is in a WRONG box (butt + wagging tail in the air) = BOO-X! He shoots out and Noir grabs his tail.
//  3) TAP TAP TAP to win the tug. Then a random catch PAYOFF (shuffle bag, no repeat until all 6 played): SEAL the box
//     (tape + FRAGILE / THIS SIDE UP), the FLOP (box over him, blind waddle, postage stamp), GIFT-wrap (bow, jack-in-the-box
//     pop), SHIPPING (conveyor, boomerangs back), TURTLE (box stuck on his bum) and the box AVALANCHE (box hat).
// Busted (he finds her because you did not MEOW, or a POUNCE with no head in a box) = he counts while Noir relocates;
// the clock keeps running. Escalation: 3 -> 4 boxes, shorter peeks, double-checks, feints, and a 3rd MEOW in a row
// backfires. Last catch: RETURN TO SENDER parcel. Pounce-only art in ./pounceArt.ts; K tuned with tests/boxbandit-bots.mjs.
import Phaser from 'phaser';
import { GAME_W as W } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, ensureArt } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, makePauseButton, pointerInPause, setPageBg, comic, flashVignette, sparks } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { CHEEKY, mix } from '../lines'; // cheeky pass
import { Hud, impact } from '../systems/level';
import { HeroRig } from '../systems/rigs';
import { TailPup } from '../systems/tailRigs';
import { BOX_W, BOX_H, BoxGfx, makeBox, placeBox, ensureStampTexture, makeParcel, makeReturnMark, sealLid, tapeStrip, sticker, giftWrap, giftRibbon, giftBow,
  conveyor, boxHat, miniBox, makeTapHand, zipZip, pictureTutorial } from './pounceArt';

export const K = {
  NEED: 6, TIME: 44,
  WALK: 175, DASH: 330,                   // Puppy speed (px/s): hunting walk / lured dash
  SNIFF: [0.8, 1.2], SNIFF_NOIR: [1.0, 1.35], LURE_SNIFF: 0.3,
  PEEK: [1.2, 1.6], PEEK_DROP: 0.1, PEEK_MIN: 0.8, // head-in-box time, shrinks per catch
  TELL: 0.4,                              // tail freezes stiff + "?" before he pulls out
  DC_FROM: 1, DC_P: 0.3, DC_STEP: 0.06, DC_T: 0.6, // double-check: he pops out mid-peek and looks round
  LOOK_P: 0.4, LOOK_T: [0.45, 0.8],
  FEINT_FROM: 3, FEINT_P: 0.35,
  FIND_P: 0.33, FIND_STEP: 0.05, FIND_MAX: 0.5, // chance his next pick is Noir's box
  MEOW_CD: 2.2, MEOW_ROW: 2,              // the 3rd MEOW before a catch backfires
  HOP: 0.34, HOP_PER: 0.06,               // Noir's (automatic) box-to-box hop while he counts / between rounds
  LEAP: 0.3, LEAP_PX: 0.0005,             // pounce flight time
  TUG0: 0.32, TUG_TAP: 0.085, TUG_DRAIN: 0.3, TUG_MIN: 1.4, TUG_MAX: 4.5,
  COUNT: 2.2, FOUR_AT: 2, WAD: 270,
  GUIDE: 3,                               // the big pointing hand shows every time for the first 3 catches, later only if you hesitate
  GUIDE_LATE: 0.75,
};
export const PAYOFFS = ['seal', 'flop', 'gift', 'ship', 'turtle', 'avalanche'] as const;
type Payoff = typeof PAYOFFS[number];
const GOAL = 'Trick Puppy into the WRONG box, then POUNCE!';
const FLOOR = 1000, BB = FLOOR + 40, RIM = BB - BOX_H, NOIR_M = 0.85, PUP_M = 1.0;
const PEEK_Y = RIM + 142, DUCK_Y = PEEK_Y + 100, LANE = BB - 2, PUP_IN = RIM - 92;
const HEAD_OUT = RIM + 62;               // Puppy's root y when only his head pokes out of the top of a box
const XS3 = [180, 360, 540], XS4 = [120, 280, 440, 600];
const ART = ['pt_stand', 'pt_panic', 'pt_dizzy', 'pt_tail', 'su_shadow', 'head_Noir_smug', ...[0, 1, 2, 3, 4, 5].map(i => 'pt_run' + i)];
const CROUCH = { ls: -40, le: 60, rs: -30, re: 60, lh: -50, lk: 80, rh: -30, rk: 70, lean: 18, sq: -0.16, dy: 18, tilt: 6 };
const SIT = { ls: 15, le: 95, rs: -15, re: -100, lh: 8, lk: -4, rh: 26, rk: -10, lean: -3, tilt: -7, sq: 0.03, dy: 0 }; // seated, paws crossed, legs dangling
const STRETCH = { ls: -150, le: 10, rs: -140, re: 10, lh: 30, lk: 20, rh: -30, rk: 10, lean: 20, sq: 0.08, dy: 0, tilt: 8 };
const PAWS = { ls: -95, le: -20, rs: -80, re: -30, lh: -10, lk: 20, rh: 10, rk: 10, lean: 14, sq: 0, dy: 4, tilt: 4 };   // paws out on the box (taping / wrapping)
const KICK = { ls: -30, le: 40, rs: 20, re: 40, lh: -85, lk: 5, rh: 15, rk: 10, lean: -12, sq: 0, dy: 0, tilt: -6 };
const CHEER = { ls: -160, le: 20, rs: -160, re: 20, lean: 0, sq: 0.1, dy: -6 };
type Pup = 'off' | 'walk' | 'feint' | 'sniff' | 'dive' | 'peek' | 'tell' | 'up' | 'look' | 'count' | 'seq';
type Phase = 'wait' | 'hunt' | 'bust' | 'seq' | 'tug' | 'reset' | 'end';
type NState = 'in' | 'hop' | 'out' | 'seq';
const F = (r: number[]) => Phaser.Math.FloatBetween(r[0], r[1]);
const L_ = Phaser.Math.Linear;

export class PounceScene extends Phaser.Scene {
  st = this.fresh();
  private fresh() {
    return { time: K.TIME, boops: 0, score: 0, running: false, over: false, phase: 'wait' as Phase, pup: 'off' as Pup, px: 820, face: -1, tgt: 0, pbox: -1,
      noirBox: 0, nState: 'in' as NState, meowCd: 0, meowRow: 0, busts: 0, slips: 0, streak: 0, tug: 0, t: 0, dash: 0,
      boxes: 3, firstPick: 1, dc: 0, dcDone: 0, feintDone: 0, wise: 0, slow: 1, hint: '', lastHopAt: -9, payoff: '' as '' | Payoff, played: [] as string[] };
  }
  private boxes: BoxGfx[] = []; private rig!: HeroRig; private pup!: TailPup; private pupShadow!: Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => any };
  private hud!: Hud; private you!: Phaser.GameObjects.Text; private guide!: Phaser.GameObjects.Container; private guideX = -1; private guideT = 0;
  private pill!: Phaser.GameObjects.Text; private mb!: Phaser.GameObjects.Container; private pbtn!: Phaser.GameObjects.Container; private mbG!: Phaser.GameObjects.Graphics; private pbG!: Phaser.GameObjects.Graphics;
  private mbT!: Phaser.GameObjects.Text; private pbT!: Phaser.GameObjects.Text; private btnKey = ''; private fxg!: Phaser.GameObjects.Graphics; private motes: { x: number; y: number; v: number; p: number }[] = [];
  private q!: Phaser.GameObjects.Text; private hints = new Set<string>(); private hintC?: Phaser.GameObjects.Container; private tapTxt?: Phaser.GameObjects.Text; private meter!: Phaser.GameObjects.Graphics;
  private stamp?: Phaser.GameObjects.Image; private hat?: Phaser.GameObjects.Container; private tugAge = 0; private shoutT = 0; private wad = { on: 0, x: 0, dir: 1, bonks: 0, t: 0, final: 0 }; private flopBox = -1; private away = 1; private tugX = 0;
  private stateT = 0; private peekLeft = 0; private sniffTxtT = 0; private lookFlipT = 0; private countN = 0; private noirTween?: Phaser.Tweens.Tween;
  private bag: Payoff[] = []; private forced: Payoff | '' = ''; private extras: Phaser.GameObjects.GameObject[] = []; private inBox = 0; private anim?: (dt: number) => boolean;
  constructor() { super('Pounce'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x2a1a3e, 0x6a3e1e);
    this.st = this.fresh(); this.boxes = []; this.motes = []; this.hints = new Set(); this.hintC = undefined; this.tapTxt = undefined; this.stamp = undefined; this.hat = undefined; this.btnKey = '';
    this.wad = { on: 0, x: 0, dir: 1, bonks: 0, t: 0, final: 0 }; this.bag = []; this.forced = ''; this.extras = []; this.inBox = 0; this.anim = undefined; this.flopBox = -1; this.guideX = -1;
    this.makeTextures(); ensureStampTexture(this);
    art(this, 0, 0, 'bg_room');
    // moonlight shaft from the window + lamp pool + rug + dust motes (kept from Sneaky Pounce)
    const light = this.add.graphics().setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    light.fillStyle(0xaab8ff, 0.10).fillPoints([new Phaser.Math.Vector2(92, 342), new Phaser.Math.Vector2(268, 342), new Phaser.Math.Vector2(420, 1060), new Phaser.Math.Vector2(150, 1060)], true);
    light.fillStyle(0xaab8ff, 0.07).fillEllipse(285, 1040, 300, 60);
    this.tweens.add({ targets: light, alpha: 0.7, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.easeInOut' });
    const lamp = this.add.image(640, 980, 'pn_glow').setDepth(1).setScale(2.4, 0.5).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffcf8a);
    this.tweens.add({ targets: lamp, alpha: 0.25, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });
    const rug = this.add.graphics().setDepth(1.5); rug.fillStyle(0x7a2a4a, 0.9).fillEllipse(360, 1062, 560, 70).fillStyle(0xb04a6a, 1).fillEllipse(360, 1062, 500, 50).lineStyle(4, 0xffdf6b, 0.6).strokeEllipse(360, 1062, 420, 34);
    for (let i = 0; i < 26; i++) this.motes.push({ x: Phaser.Math.Between(100, 420), y: Phaser.Math.Between(360, 1040), v: Phaser.Math.FloatBetween(6, 18), p: Math.random() * 6 });
    this.fxg = this.add.graphics().setDepth(35);
    XS3.forEach(x => this.boxes.push(makeBox(this, x, BB)));
    this.hud = new Hud(this, 'BOX BANDIT', 0x7dff9a);
    this.pill = txt(this, W / 2, 335, '', 34, '#ffffff', '#22252b', 7).setDepth(600);
    this.meter = this.add.graphics().setDepth(600);
    this.q = txt(this, 0, 0, '?', 70, '#ffdf6b', '#22252b', 8).setDepth(40).setVisible(false);
    this.you = txt(this, 0, BB + 30, '▲ YOU', 24, '#e9dcff', '#3a1a6a', 6).setDepth(16).setVisible(false); // which box Noir is in (UI only: Puppy can't read)
    const mk = (x: number, label: string) => { const c = this.add.container(x, 1180).setDepth(700), g = this.add.graphics(), t = txt(this, 0, -5, label, 42, '#fff', '#22252b', 7); c.add([g, t]); return { c, g, t }; };
    { const a = mk(190, 'MEOW?'); this.mb = a.c; this.mbG = a.g; this.mbT = a.t; const b = mk(530, 'POUNCE!'); this.pbtn = b.c; this.pbG = b.g; this.pbT = b.t; }
    this.guide = makeTapHand(this, 0, 0, 520, true).setDepth(720).setScale(1.2).setVisible(false);
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.tapAt(w.x, w.y); });
    (window as any).__pr = { scene: 'Pounce', st: this.st, K, ready: false, force: (win: boolean) => this.finish(win), tap: (x: number, y: number) => this.tapAt(x, y),
      meow: () => this.meow(), pounce: () => this.pounce(), boxX: () => this.boxes.map(b => b.x), tip: () => this.pup ? this.pup.tipPos() : null,
      bag: () => [...this.bag], payoffs: PAYOFFS, forcePayoff: (k: Payoff) => { this.forced = k; },
      demoCatch: (k?: Payoff) => this.demoCatch(k) };
    ensureArt(this, ART).then(() => { if (!this.sys.isActive() && !this.sys.isPaused()) return; this.build(); });
  }
  private build() {
    const s = this.st;
    this.rig = new HeroRig(this, 'Noir', XS3[0], DUCK_Y, NOIR_M, { tail: true }).setDepth(9);
    this.rig.root.addAt(this.add.ellipse(0, -110, 190, 250, 0xc9a6ff, 0.16).setBlendMode(Phaser.BlendModes.ADD), 0); // soft rim so her dark limbs read on the wall
    const mg = this.make.graphics({ x: 0, y: 0 }, false); mg.fillStyle(0xffffff).fillRect(0, 0, W, BB); this.rig.root.setMask(mg.createGeometryMask()); // she sinks INTO boxes (clipped at the box base)
    this.pup = new TailPup(this, s.px, LANE, PUP_M); this.pup.setDepth(20); this.pup.flip(true); this.pupShadow = this.pup.root.list[0] as any; this.pup.root.setVisible(false);
    (window as any).__pr.ready = true;
    pictureTutorial(this, GOAL, () => this.begin()); // 3 picture steps (id noir3)
  }
  private makeTextures() {
    const t = this.textures;
    if (!t.exists('pn_glow')) { const g = this.make.graphics({ x: 0, y: 0 }, false); for (let i = 30; i > 0; i--) g.fillStyle(0xffffff, 0.04).fillCircle(100, 100, i * 3.3); g.generateTexture('pn_glow', 200, 200); g.destroy(); }
    if (!t.exists('pn_shadow')) { const g = this.make.graphics({ x: 0, y: 0 }, false); for (let i = 8; i > 0; i--) g.fillStyle(0x1a0a08, 0.07).fillEllipse(90, 20, 20 * i + 20, 4 * i + 6); g.generateTexture('pn_shadow', 180, 40); g.destroy(); }
  }
  /** the big one-line goal, every time the level starts */
  private goalBanner() {
    const c = this.add.container(360, 600).setDepth(810), g = this.add.graphics();
    g.fillStyle(0x22252b, 0.82).fillRoundedRect(-330, -96, 660, 192, 36).lineStyle(6, 0xfff27a, 1).strokeRoundedRect(-330, -96, 660, 192, 36);
    const t = comic(this, 0, 0, 'Trick Puppy into the\nWRONG box, then POUNCE!', 50).setAlign('center');
    c.add([g, t]).setScale(0.3); this.goalC = c;
    this.tweens.add({ targets: c, scale: 1, duration: 220, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: 560, delay: 2600, duration: 350, onComplete: () => { c.destroy(); if (this.goalC === c) this.goalC = undefined; } });
  }
  private goalC?: Phaser.GameObjects.Container;
  private begin() {
    const s = this.st; this.goalBanner(); Fx.alert();
    this.time.delayedCall(600, () => { s.running = true; this.startRound(true); });
    this.time.delayedCall(2900, () => { if (!s.over) this.talk(360, 560, pick(LINES.start.Noir), 22); });
  }
  // ------------------------------------------------------------------ helpers
  private bx(i: number) { return this.boxes[i].x; }
  private get headIn() { const p = this.st.pup; return p === 'peek' || p === 'tell'; }
  private eyesOpen() { const p = this.st.pup; return p === 'walk' || p === 'feint' || p === 'look' || (p === 'up' && this.stateT > 0.5); }
  private ft(x: number, y: number, t: string, col?: string, size = 40) { const half = t.length * size * 0.3 + 16; floatText(this, Phaser.Math.Clamp(x, half, W - half), y, t, col, size); }
  private talk(x: number, y: number, text: string, size?: number, hold?: number) {
    const b = say(this, x, y, text, size, hold) as Phaser.GameObjects.Container;
    const t = b.list.find(o => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    const half = t ? t.width / 2 + 34 : 200; b.x = Phaser.Math.Clamp(b.x, half, W - half); return b;
  }
  private pupTalk(text: string, hold = 1100) { const tip = !!this.hintC?.active; // a TIP is up (text at y 545-670): Puppy's bubble goes above it, not on it
    this.talk(this.pup.root.x, tip ? 445 : Math.min(this.pup.root.y - 300, 640), text, 22, hold); }
  private setFace(f: number) { this.st.face = f; this.pup.flip(f < 0); }
  private tw(ms: number, fn: (p: number) => void, done?: () => void, ease = 'Linear') {
    return this.tweens.addCounter({ from: 0, to: 1, duration: ms, ease, onUpdate: (t) => fn(t.getValue()!), onComplete: () => { if (!this.st.over) done?.(); } }); }
  private at(ms: number, fn: () => void) { this.time.delayedCall(ms, () => { if (!this.st.over) fn(); }); }
  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T { this.extras.push(o); return o; }
  private pop(o: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, to = 1, ms = 200) { (o as any).setScale(0.05); this.tweens.add({ targets: o, scale: to, duration: ms, ease: 'Back.Out' }); }
  private bang(x: number, y: number) { const t = txt(this, x, y, '!', 120, '#ff3b3b', '#22252b', 12).setDepth(45).setScale(1.8); this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 250, onComplete: () => t.destroy() }); }
  private bigComic(x: number, y: number, s: string, size = 60, ang = -8) { const t = comic(this, Phaser.Math.Clamp(x, 150, 570), y, s, size).setDepth(75).setAngle(ang).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, y: y - 40, delay: 650, duration: 250, onComplete: () => t.destroy() }); return t; }
  private dust(x: number, n = 6, y = LANE) { for (let k = 0; k < n; k++) { const d = this.add.circle(x + Phaser.Math.Between(-80, 80), y, 12, 0xd9b080, 0.7).setDepth(25);
    this.tweens.add({ targets: d, y: y - 40, x: d.x + Phaser.Math.Between(-40, 40), alpha: 0, scale: 2, duration: 450, onComplete: () => d.destroy() }); } }
  /** cute pout: a "hmph!" and two little steam puffs off his head (no heart eyes, nothing else) */
  private pout(x: number, y: number) {
    this.ft(x, y - 30, 'hmph!', '#ffffff', 34);
    for (const sx of [-1, 1]) { const p = this.add.circle(x + sx * 50, y + 10, 12, 0xffffff, 0.85).setDepth(46);
      this.tweens.add({ targets: p, x: p.x + sx * 46, y: p.y - 34, scale: 2.2, alpha: 0, duration: 520, onComplete: () => p.destroy() }); }
  }
  private headY() { return this.pup.root.y - 170 * PUP_M; } // roughly his head (above the root/feet)
  // ------------------------------------------------------------------ input
  tapAt(x: number, y: number) {
    const s = this.st; if (!s.running || s.over || !this.pup) return;
    if (s.phase === 'tug') { this.tugTap(); return; }
    if (s.phase !== 'hunt') return;
    if (y > 1090) { if (x < W / 2) this.meow(); else this.pounce(); return; }
    // tapping Puppy's wiggling butt / the box he's in = POUNCE too (big target)
    if (this.headIn && s.pbox >= 0 && Math.abs(x - this.bx(s.pbox)) < BOX_W / 2 + 20 && y > RIM - 230 && y < BB + 40) this.pounce();
  }
  // ------------------------------------------------------------------ Noir moves (automatic only: between rounds and while he counts)
  private hopTo(j: number) {
    const s = this.st; if (s.over || !this.rig || j < 0 || j >= this.boxes.length) return;
    const from = s.nState === 'in' ? s.noirBox : -1, x0 = this.rig.x, y0 = this.rig.y, x1 = this.bx(j), fromOut = s.nState !== 'in';
    const n = from >= 0 ? Math.abs(from - j) : Math.max(1, Math.round(Math.abs(x1 - x0) / 160));
    const dur = (K.HOP + K.HOP_PER * Math.max(0, n - 1)) * 1000, apex = RIM - 110 - Math.min(70, Math.abs(x1 - x0) * 0.12), cy = 2 * apex - (y0 + DUCK_Y) / 2;
    this.boxes.forEach(b => b.eyes.setVisible(false));
    s.nState = 'hop'; s.noirBox = j; s.lastHopAt = s.t;
    this.rig.setFlip(x1 < x0).setMood('smug');
    this.rig.act([{ dur: 0.07, to: CROUCH }, { dur: dur / 2000, to: STRETCH }, { dur: dur / 2000, to: CROUCH }], false, 0.2);
    Fx.whoosh(); this.noirTween?.stop();
    this.noirTween = this.tweens.addCounter({ from: 0, to: 1, duration: dur, ease: 'Sine.InOut', onUpdate: (tw) => {
      const p = tw.getValue()!, y = (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * cy + p * p * DUCK_Y; this.rig.setPosition(L_(x0, x1, p), y);
      this.rig.setDepth(y < RIM + 6 || (p < 0.5 && fromOut) ? 22 : 9); },
    onComplete: () => { s.nState = 'in'; this.rig.setDepth(9); this.boxes[j].c.setAngle(0); this.wobbleBox(j, 6); Fx.step(); } });
  }
  private wobbleBox(i: number, a = 5) { const b = this.boxes[i]; if (!b || this.flopBox === i || (this.st.phase === 'seq' && i === this.grabBox)) return; this.tweens.killTweensOf(b.c); b.c.setAngle(0).setScale(1);
    this.tweens.add({ targets: b.c, angle: { from: -a, to: a }, duration: 70, yoyo: true, repeat: 2, onComplete: () => b.c.setAngle(0) });
    this.tweens.add({ targets: [b.flapL, b.flapR], angle: { from: 0, to: -14 }, duration: 90, yoyo: true }); }
  // ------------------------------------------------------------------ MEOW
  meow() {
    const s = this.st; if (s.phase !== 'hunt' || s.nState !== 'in' || s.meowCd > 0) return;
    if (s.pup === 'count' || s.pup === 'dive' || s.pup === 'up' || s.pup === 'off' || s.pup === 'seq') { this.ft(190, 1060, 'not now!', '#ffffff', 28); return; }
    s.meowCd = K.MEOW_CD; s.meowRow++; this.hideHint('meow'); this.hints.add('meow');
    const nx = this.bx(s.noirBox); Fx.alert();
    if (s.meowRow > K.MEOW_ROW) { // he's wise to it: the meow came from HER box
      s.wise++; this.meowBubble(s.noirBox); this.pupTalk(pick(LINES.boxWise), 1200); this.ft(360, 470, 'TOO MANY MEOWS!', '#ff8a8a', 40); this.lure(s.noirBox, K.SNIFF_NOIR[0]); return; }
    const cand = this.boxes.map((_, i) => i).filter(i => i !== s.noirBox && i !== s.pbox);
    const m = cand.sort((a, b) => Math.abs(this.bx(a) - nx) - Math.abs(this.bx(b) - nx))[0] ?? this.boxes.findIndex((_, i) => i !== s.noirBox);
    this.meowBubble(m); this.time.delayedCall(250, () => { if (!s.over && s.phase === 'hunt') this.pupTalk(pick(LINES.boxLured), 1000); });
    this.lure(m, K.LURE_SNIFF);
  }
  private meowBubble(i: number) { const b = this.boxes[i]; this.wobbleBox(i, 7);
    const t = comic(this, b.x, RIM - 60, pick(LINES.boxMeow), 40, '#ffffff', '#d9c2ff', '#2a1a4a').setDepth(60).setScale(0.3).setAngle(Phaser.Math.Between(-10, 10));
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, delay: 600, duration: 400, onComplete: () => t.destroy() }); }
  /** send Puppy dashing to box i (pulls his head out first if he's mid-peek) */
  private lure(i: number, sniff: number) {
    const s = this.st; s.dash = 1; const go = () => { if (s.over || s.phase === 'seq') return; this.walkTo(i, true); this.sniffLen = sniff; };
    if (this.headIn) this.pullOut(go, 0.22); else if (s.pup === 'sniff' && s.tgt === i) { this.sniffLen = Math.min(this.sniffLen, this.stateT + sniff); } else go();
  }
  // ------------------------------------------------------------------ POUNCE
  pounce() {
    const s = this.st; if (s.phase !== 'hunt' || !this.rig) return; if (s.nState !== 'in') return;
    this.hideHint('pounce');
    const target = this.headIn && s.pbox >= 0 && s.pbox !== s.noirBox ? s.pbox : -1;
    const x0 = this.rig.x, y0 = this.rig.y, tx = target >= 0 ? this.bx(target) : Phaser.Math.Clamp(this.pup.root.x - s.face * 90, 80, 640), ty = target >= 0 ? RIM + 4 : LANE;
    const dur = (K.LEAP + Math.abs(tx - x0) * K.LEAP_PX) * 1000, cy = 2 * (Math.min(y0, ty) - 170) - (y0 + ty) / 2;
    s.nState = 'hop'; this.boxes.forEach(b => b.eyes.setVisible(false));
    this.rig.setFlip(tx < x0).setMood('smug').act([{ dur: 0.08, to: CROUCH }, { dur: dur / 1000, to: STRETCH }], true);
    Fx.whoosh(); this.noirTween?.stop();
    this.noirTween = this.tweens.addCounter({ from: 0, to: 1, duration: dur, ease: 'Quad.In', onUpdate: (tw) => { const p = tw.getValue()!;
      this.rig.setPosition(L_(x0, tx, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * cy + p * p * ty); this.rig.setDepth(p > 0.1 ? 22 : 9); },
    onComplete: () => { if (s.over) return;
      if (target >= 0 && s.pbox === target && this.headIn) this.boox(target);
      else if (target >= 0) { s.nState = 'in'; s.noirBox = target; this.rig.setPosition(tx, DUCK_Y).setDepth(9); this.rig.act([], false, 0.2); this.bust('dodge'); }
      else { s.nState = 'out'; this.rig.act([], false, 0.2); this.bust('early'); } } });
  }
  // ------------------------------------------------------------------ Puppy AI
  private sniffLen = 1; private nextCheck = 0;
  private walkTo(i: number, dash = false) {
    const s = this.st; s.tgt = i; s.dash = dash ? 1 : 0; s.pup = 'walk'; this.stateT = 0; this.q.setVisible(false); this.pup.setFrame('run0'); this.pup.root.setAngle(0); this.pup.inner.setAngle(0);
    this.sniffLen = F(i === s.noirBox ? K.SNIFF_NOIR : K.SNIFF);
  }
  private pickNext(from: number) {
    const s = this.st, n = this.boxes.length, others = [...Array(n).keys()].filter(i => i !== from), safe = others.filter(i => i !== s.noirBox);
    if (s.firstPick) { s.firstPick = 0; // first pick of a round is never Noir's box: start the furthest away
      const nx = this.bx(s.noirBox); return (safe.length ? safe : others).sort((a, b) => Math.abs(this.bx(b) - nx) - Math.abs(this.bx(a) - nx))[0]; }
    const findP = Math.min(K.FIND_MAX, K.FIND_P + K.FIND_STEP * s.boops);
    if (s.noirBox !== from && (Math.random() < findP || !safe.length)) return s.noirBox;
    return Phaser.Utils.Array.GetRandom(safe);
  }
  private dive(i: number) {
    const s = this.st, b = this.bx(i), x0 = this.pup.root.x, y0 = this.pup.root.y, f = s.face; s.pup = 'dive'; s.pbox = i; this.stateT = 0; this.q.setVisible(false);
    this.pup.setFrame('stand'); Fx.boing(); const found = i === s.noirBox; this.hideHint('meow');
    this.tweens.addCounter({ from: 0, to: 1, duration: 320, ease: 'Sine.InOut', onUpdate: (tw) => { const p = tw.getValue()!;
      this.pup.root.setPosition(L_(x0, b, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (PUP_IN - 120) + p * p * PUP_IN).setAngle(180 * f * Phaser.Math.Easing.Sine.In(p));
      this.pup.setDepth(p > 0.55 ? 10 : 20); this.pupShadow.setVisible(p < 0.3);
      if (found && p > 0.55 && s.pup === 'dive') { tw.stop(); this.foundYou(i); } },
    onComplete: () => { if (s.pup !== 'dive') return; s.pup = 'peek'; this.stateT = 0; this.wobbleBox(i, 4);
      this.peekLeft = Math.max(K.PEEK_MIN, F(K.PEEK) - K.PEEK_DROP * s.boops);
      s.dc = s.boops >= K.DC_FROM && !s.dcDone && Math.random() < K.DC_P + K.DC_STEP * (s.boops - K.DC_FROM) ? 1 : 0; this.nextCheck = this.peekLeft * F([0.35, 0.6]);
      if (!this.hints.has('pounce') && s.running) this.showHint('pounce'); } });
  }
  /** pull his head out (back to the floor beside the box) then call next */
  private pullOut(next: () => void, dur = 0.3) {
    const s = this.st, i = s.pbox, b = i >= 0 ? this.bx(i) : this.pup.root.x, side = b > 600 ? -1 : b < 120 ? 1 : -s.face, x1 = Phaser.Math.Clamp(b + side * 62, 70, 650), a0 = this.pup.root.angle;
    s.pup = 'up'; this.stateT = 0; this.q.setVisible(false); this.pup.setFrame('stand'); this.hideHint('pounce');
    this.tweens.addCounter({ from: 0, to: 1, duration: dur * 1000, ease: 'Sine.Out', onUpdate: (tw) => { const p = tw.getValue()!; this.stateT = p;
      this.pup.root.setPosition(L_(b, x1, p), (1 - p) * (1 - p) * PUP_IN + 2 * (1 - p) * p * (PUP_IN - 60) + p * p * LANE).setAngle(a0 * (1 - p));
      this.pup.setDepth(p > 0.45 ? 20 : 10); this.pupShadow.setVisible(p > 0.7); },
    onComplete: () => { if (s.pup !== 'up') return; this.pup.root.setAngle(0); s.pbox = -1; this.setFace(-side); this.wobbleBox(i, 3); next(); } });
  }
  private afterPeek(lookP = K.LOOK_P) {
    const s = this.st, from = s.pbox; this.pupTalkMaybe(LINES.boxEmpty, 0.55);
    this.pullOut(() => { if (Math.random() < lookP) { s.pup = 'look'; this.stateT = 0; this.lookT = F(K.LOOK_T); this.lookFlipT = 0.25; } else this.walkTo(this.pickNext(from)); });
  }
  private lookT = 0;
  private pupTalkMaybe(pool: string[], p: number) { if (Math.random() < p) this.pupTalk(pick(pool), 900); }
  private pupAI(dt: number) {
    const s = this.st, pr = this.pup.root; this.stateT += dt;
    switch (s.pup) {
      case 'walk': {
        const b = this.bx(s.tgt), side = pr.x > b ? 1 : -1, gx = Phaser.Math.Clamp(b + side * 62, 70, 650), d = gx - pr.x, sp = s.dash ? K.DASH : K.WALK;
        if (Math.abs(d) > 4) { this.setFace(Math.sign(d)); pr.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt); pr.y = LANE - Math.abs(Math.sin(this.pup.frame / 6 * Math.PI * 2)) * 5; }
        else { pr.y = LANE; this.setFace(-side); s.pup = 'sniff'; this.stateT = 0; this.sniffTxtT = 0; this.pup.setFrame('stand'); if (s.tgt === s.noirBox && !this.hints.has('meow') && s.meowCd <= 0) this.showHint('meow'); }
        // feint (later rounds): halfway to the wrong box he changes his mind and heads for HERS
        if (s.boops >= K.FEINT_FROM && !s.dash && !s.feintDone && s.tgt !== s.noirBox && this.stateT > 0.35 && Math.abs(d) < 260 && Math.abs(d) > 120) {
          s.feintDone = 1; if (Math.random() < K.FEINT_P) { s.pup = 'feint'; this.stateT = 0; this.pup.setFrame('stand'); this.pupTalk(pick(LINES.boxFeint), 900); this.qPop(); } }
        break; }
      case 'feint': if (this.stateT > 0.35) { this.walkTo(s.noirBox, true); this.sniffLen = F(K.SNIFF_NOIR) * 0.75; } break;
      case 'sniff': {
        this.sniffTxtT -= dt; if (this.sniffTxtT <= 0) { this.sniffTxtT = 0.55; this.ft(pr.x + s.face * 40, pr.y - 230, pick(LINES.boxSniff), '#ffffff', 24); this.wobbleBox(s.tgt, 2); }
        if (this.stateT > this.sniffLen) this.dive(s.tgt); break; }
      case 'peek': {
        if (s.dc && this.stateT > this.nextCheck) { // double-check: a quick stiff tail, then he pops out to look round
          s.dc = 0; s.dcDone = 1; this.peekLeft -= this.stateT; s.pup = 'tell'; this.stateT = 0; this.tellLen = 0.22; this.dcTell = 1; this.qPop(); break; }
        if (this.stateT > this.peekLeft) { s.pup = 'tell'; this.stateT = 0; this.tellLen = K.TELL; this.dcTell = 0; this.qPop(); } break; }
      case 'tell': if (this.stateT > this.tellLen) { if (this.dcTell) { const box = s.pbox; this.pullOut(() => { s.pup = 'look'; this.stateT = 0; this.lookT = K.DC_T; this.lookFlipT = 0.2; this.dcBox = box; this.ft(pr.x, pr.y - 260, 'hmm?!', '#ffffff', 34); }, 0.22); }
        else this.afterPeek(); } break;
      case 'look': {
        this.lookFlipT -= dt; if (this.lookFlipT <= 0) { this.lookFlipT = 0.3; this.setFace(-s.face); }
        if (this.stateT > this.lookT) { if (this.dcBox >= 0) { const b = this.dcBox; this.dcBox = -1; this.walkTo(b); this.sniffLen = b === s.noirBox ? 0.25 : 0.15; } else this.walkTo(this.pickNext(-1)); } break; }
      case 'count': {
        const n = Math.min(3, Math.floor(this.stateT / (K.COUNT / 3)) + 1); if (n !== this.countN) { this.countN = n; this.ft(pr.x, pr.y - 250, n < 3 ? `${n}...` : '3!', '#ffffff', 46); Fx.step(); }
        if (this.stateT > K.COUNT) { this.pupTalkMaybe(['Puppy: Ready or not!'], 0.5); s.firstPick = 1; this.walkTo(this.pickNext(-1)); } break; }
    }
  }
  private tellLen = 0.4; private dcTell = 0; private dcBox = -1;
  private qPop() { const pr = this.pup.root; this.q.setText('?').setVisible(true).setPosition(pr.x, Math.min(pr.y, PUP_IN) - 120).setScale(1.6); this.tweens.add({ targets: this.q, scale: 1, duration: 160, ease: 'Back.Out' }); Fx.alert(); }
  // ------------------------------------------------------------------ busts
  private foundYou(i: number) {
    const s = this.st; s.pbox = i; this.rig.setPosition(this.bx(i), PEEK_Y - 40); this.wobbleBox(i, 9); this.bang(this.bx(i), RIM - 160);
    this.pullOut(() => {}, 0.25); this.bust('found');
  }
  /** busted: he found her (no MEOW in time) / she pounced with no head in a box. He counts while Noir relocates (clock keeps running). */
  private bust(kind: 'found' | 'dodge' | 'early') {
    const s = this.st; if (s.phase !== 'hunt' || s.over) return; s.phase = 'bust'; s.busts++; s.streak = 0; this.hideHint('');
    Fx.save(); flashVignette(this, 0xff3b3b, 0.25); this.rig.setMood('dizzy');
    if (kind === 'early') { this.tweens.add({ targets: this.pup.root, y: LANE - 90, duration: 170, yoyo: true, ease: 'Quad.Out' }); }
    const line = kind === 'found' ? LINES.boxFound : LINES.boxDodge;
    this.time.delayedCall(kind === 'found' ? 260 : 120, () => { if (!s.over) this.pupTalk(pick(line), 1100); });
    this.ft(360, 470, kind === 'found' ? 'FOUND YOU! (MEOW next time)' : 'MISSED! Wait for his head', '#ff8a8a', kind === 'found' ? 40 : 42);
    this.time.delayedCall(kind === 'found' ? 1000 : 850, () => { if (s.over) return;
      const go = () => { s.phase = 'hunt'; s.pup = 'count'; this.stateT = 0; this.countN = 0; this.pup.setFrame('stand'); this.pup.root.setAngle(0).setY(LANE); this.setFace(this.pup.root.x < 360 ? -1 : 1);
        this.pupTalkMaybe(LINES.boxCount, 0.6); this.rig.setMood('smug');
        // Noir slips into another box while he counts
        this.time.delayedCall(450, () => { if (s.over || s.pup !== 'count') return;
          const opts = this.boxes.map((_, i) => i).filter(i => i !== s.noirBox || s.nState !== 'in'); this.hopTo(Phaser.Utils.Array.GetRandom(opts)); }); };
      if (s.pup === 'up' || s.pup === 'dive') this.time.delayedCall(300, go); else go(); });
  }
  // ------------------------------------------------------------------ BOO-X! -> TAP TAP TAP -> payoff
  private boox(i: number) {
    const s = this.st; s.phase = 'seq'; s.pup = 'seq'; s.nState = 'seq'; this.q.setVisible(false); this.hideHint('');
    const b = this.bx(i); s.score += 300; this.grabBox = i;
    Fx.punch(); Fx.boing(); impact(this, b, RIM - 80, s.boops === 0 ? 'BOO-X!' : pick(['BOO-X!', 'BOO-X!', 'SURPRISE!', 'PEEKABOO-X!']), 300, '', true); flashVignette(this, 0xffffff, 0.35);
    this.rig.setMood('happy').act([{ dur: 0.1, to: CHEER }], true);
    this.wobbleBox(i, 10);
    // Puppy shoots out of the box and lands on the floor, tail toward Noir
    this.away = b < 360 ? 1 : -1; const lx = Phaser.Math.Clamp(b + this.away * 175, 150, 570), a0 = this.pup.root.angle, x0 = this.pup.root.x;
    this.pup.setFrame('panic'); this.pup.wagAmp = 0; this.pup.tailStretch = 1.15;
    this.tw(520, (p) => {
      this.pup.root.setPosition(L_(x0, lx, p), (1 - p) * (1 - p) * PUP_IN + 2 * (1 - p) * p * (PUP_IN - 300) + p * p * LANE).setAngle(a0 + (360 * this.away - a0) * p);
      this.pup.setDepth(p > 0.25 ? 20 : 10); this.pupShadow.setVisible(p > 0.8); },
    () => { this.pup.root.setAngle(0); s.pbox = -1; this.setFace(this.away); this.ft(lx, LANE - 270, 'EEK!', '#ffffff', 44);
      // Noir hops down off the rim behind him and grabs his tail straight away
      const nx0 = this.rig.x, ny0 = this.rig.y, nx1 = Phaser.Math.Clamp(lx - this.away * 150, 70, 650);
      this.rig.setFlip(this.away < 0).act([{ dur: 0.12, to: CROUCH }, { dur: 0.2, to: { sq: 0, dy: 0 } }], false, 0.15);
      this.tw(300, (p) => this.rig.setPosition(L_(nx0, nx1, p), (1 - p) * (1 - p) * ny0 + 2 * (1 - p) * p * (RIM - 60) + p * p * LANE), () => this.startTug()); }, 'Sine.Out');
  }
  private grabBox = 0;
  private startTug() {
    const s = this.st; s.phase = 'tug'; s.tug = K.TUG0; this.tugAge = 0; this.shoutT = 0.4;
    const tp = this.pup.tipPos(), nx1 = Phaser.Math.Clamp(tp.x - this.away * 60, 60, 660), nx0 = this.rig.x; Fx.block();
    this.tw(140, (p) => this.rig.setPosition(L_(nx0, nx1, p), LANE));
    this.rig.act([{ dur: 0.12, to: { ls: -95, le: -10, rs: -100, re: -10, lh: -25, lk: 30, rh: 35, rk: -10, lean: -16, sq: 0, dy: 6, tilt: -8 } }], true);
    this.tugX = this.pup.root.x; this.bigComic(this.pup.root.x - this.away * 50, LANE - 140, 'GOT HIS TAIL!', 44, -6);
    this.talk(this.rig.x, 810, pick(LINES.boxTug), 22, 1000); this.tapPrompt(!this.hints.has('tug')); this.hints.add('tug');
  }
  private tugTap() {
    const s = this.st; const cap = K.TUG0 + (1 - K.TUG0) * Math.min(1, this.tugAge / K.TUG_MIN); s.tug = Math.min(cap, s.tug + K.TUG_TAP); Fx.combo(Math.round(s.tug * 10));
    this.rig.act([{ dur: 0.06, to: { lean: -26, dy: 10 } }, { dur: 0.1, to: { lean: -16, dy: 6 } }], true);
    if (this.hintC) this.hideHint('tug');
  }
  private tapPrompt(big: boolean) {
    this.tapTxt?.destroy(); const t = this.tapTxt = comic(this, 360, big ? 610 : 590, big ? 'TAP TAP TAP\nto pull!' : 'TAP TAP TAP!', big ? 54 : 46).setDepth(66).setAngle(-4).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out', onComplete: () => this.tweens.add({ targets: t, scale: 1.1, duration: 170, yoyo: true, repeat: -1, ease: 'Sine.InOut' }) });
    if (big) this.showHint('tug');
  }
  private endTug() { this.tapTxt?.destroy(); this.tapTxt = undefined; this.meter.clear(); this.pup.letGo(); this.pup.tailStretch = 1; this.pup.wagAmp = 22; this.hideHint(''); }
  private tugTick(dt: number) {
    const s = this.st; if (s.tug >= 0.995) { this.endTug(); this.caught(); return; }
    this.tugAge += dt; s.tug = Math.max(0, s.tug - K.TUG_DRAIN * dt);
    const pr = this.pup.root, pull = 1 - s.tug; pr.x = Phaser.Math.Clamp(this.tugX + this.away * (pull * 60 - 20), 60, 660); pr.y = LANE - Math.abs(Math.sin(this.tugAge * 18)) * 6;
    this.pup.setFrame('run' + (Math.floor(this.tugAge * 20) % 6)); this.pup.inner.setAngle(this.away * 10); this.pup.tailStretch = 1.2 + pull * 0.5;
    const paw = this.rig.point('rp'); this.pup.holdTo(paw.x, paw.y);
    this.rig.setPosition(Phaser.Math.Clamp(pr.x - this.away * 175, 50, 670), LANE);
    this.shoutT -= dt; if (this.shoutT <= 0) { this.shoutT = 0.9; this.ft(pr.x + this.away * 60, pr.y - 250, pick(LINES.boxPupTug), '#ffffff', 26); }
    const g = this.meter.clear(), y = 470; g.fillStyle(0x22252b, 0.85).fillRoundedRect(110, y, 500, 46, 23).fillStyle(s.tug > 0.75 ? 0x7dff9a : 0xffdf6b, 1).fillRoundedRect(116, y + 6, 488 * s.tug, 34, 17).lineStyle(5, 0xffffff, 1).strokeRoundedRect(110, y, 500, 46, 23);
    if ((s.tug <= 0.02 && this.tugAge > 0.6) || this.tugAge > K.TUG_MAX) { this.endTug(); this.slip(); }
  }
  private slip() {
    const s = this.st; s.phase = 'seq'; s.slips++; s.streak = 0; Fx.save();
    this.rig.setMood('dizzy').act([{ dur: 0.15, to: { lean: -30, sq: -0.15, dy: 20 } }], false, 0.4);
    this.pupTalk(pick(LINES.boxSlip), 1000); this.pup.setFrame('panic'); this.pup.inner.setAngle(0);
    const x0 = this.pup.root.x, x1 = this.away > 0 ? W + 160 : -160;
    for (let i = 0; i < 5; i++) { const p = this.add.circle(x0 - this.away * i * 30, LANE, 14, 0xd9b080, 0.6).setDepth(19); this.tweens.add({ targets: p, x: p.x - this.away * 40, alpha: 0, scale: 2, delay: i * 50, duration: 400, onComplete: () => p.destroy() }); }
    this.tw(650, (p) => { this.pup.root.x = L_(x0, x1, p); this.pup.setFrame('run' + (Math.floor(p * 30) % 6)); }, () => this.startRound(false), 'Quad.In');
  }
  // ------------------------------------------------------------------ the catch + its payoff (shuffle bag: no repeat until all 6 played)
  private nextPayoff(): Payoff {
    if (this.forced) { const f = this.forced; this.forced = ''; const k = this.bag.indexOf(f); if (k >= 0) this.bag.splice(k, 1); return f; }
    if (!this.bag.length) { const last = this.st.played[this.st.played.length - 1]; let b: Payoff[];
      do { b = Phaser.Utils.Array.Shuffle([...PAYOFFS]); } while (b.length > 1 && b[b.length - 1] === last); this.bag = b; }
    return this.bag.pop()!;
  }
  private caught() {
    const s = this.st; s.phase = 'seq'; s.boops++; s.streak++; s.meowRow = 0; const bonus = s.streak > 1 ? 200 * (s.streak - 1) : 0, pts = 500 + bonus + (s.busts === 0 ? 200 : 0); s.score += pts;
    Fx.special(); this.ft(360, 470, pick(LINES.boxBoop), '#7dff9a', 42); floatText(this, 250, 420, `+${pts}${bonus ? ` x${s.streak} STREAK` : ''}`, '#7dff9a', 38);
    this.pup.inner.setAngle(0); this.rig.setMood('happy');
    const k = this.nextPayoff(); s.payoff = k; s.played.push(k);
    const L = 360; this.clearStage(); // the other boxes scoot off so the payoff box has centre stage
    ({ seal: () => this.poSeal(L), flop: () => this.poFlop(), gift: () => this.poGift(L), ship: () => this.poShip(L), turtle: () => this.poTurtle(), avalanche: () => this.poAvalanche(L) } as Record<Payoff, () => void>)[k]();
  }
  /** debug / screenshot hook: skip straight to a catch payoff (Puppy placed on the floor next to a box) */
  private demoCatch(k?: Payoff) {
    const s = this.st; if (!this.pup || s.over) return false; this.hideHint(''); this.endTug(); this.anim = undefined; this.noirTween?.stop();
    const i = s.noirBox === 0 ? 1 : 0; this.grabBox = i; this.away = this.bx(i) < 360 ? 1 : -1;
    const lx = Phaser.Math.Clamp(this.bx(i) + this.away * 175, 150, 570);
    this.pup.root.setVisible(true).setPosition(lx, LANE).setAngle(0); this.pup.setDepth(20).setFrame('panic'); this.setFace(this.away); this.pupShadow.setVisible(true); s.pbox = -1;
    this.rig.setPosition(Phaser.Math.Clamp(lx - this.away * 175, 50, 670), LANE).setDepth(22).setFlip(this.away < 0); s.nState = 'seq'; s.pup = 'seq';
    if (k) this.forced = k; this.caught(); return true;
  }
  private boxTo(b: BoxGfx, x: number, y: number, a = 0) { b.c.setPosition(x, y).setAngle(a); b.back.setPosition(x, y).setAngle(a); b.shadow.setPosition(x, BB + 4); }
  private noirTo(x: number, ms = 260, then?: () => void) { const x0 = this.rig.x, y0 = this.rig.y; this.rig.setFlip(x < x0).setDepth(22);
    this.rig.act([{ dur: 0.07, to: CROUCH }, { dur: ms / 2000, to: STRETCH }, { dur: ms / 2000, to: CROUCH }], false, 0.15);
    this.tw(ms, (p) => this.rig.setPosition(L_(x0, x, p), L_(y0, LANE, p) - Math.sin(p * Math.PI) * 120), then); }
  /** the box he came out of hops over, and he tumbles into it (hidden inside) */
  private scoop(L: number, then: () => void) {
    const b = this.boxes[this.grabBox], pr = this.pup.root, x0 = b.c.x, px0 = pr.x, py0 = pr.y; this.tweens.killTweensOf(b.c); b.eyes.setVisible(false); b.c.setDepth(14).setScale(1); b.back.setDepth(8);
    this.pup.setFrame('panic'); this.setFace(this.away); Fx.whoosh(); this.ft(px0, LANE - 270, 'EEP!', '#ffffff', 40);
    this.tw(360, (p) => this.boxTo(b, L_(x0, L, p), BB - Math.sin(p * Math.PI) * 200, Math.sin(p * Math.PI * 2) * 8), undefined, 'Sine.InOut');
    this.tw(520, (p) => { pr.setPosition(L_(px0, L, p), L_(py0, BB + 60, p * p) - Math.sin(p * Math.PI) * 320).setAngle(this.away * 200 * p); this.pup.setDepth(p > 0.55 ? 10 : 20); this.pupShadow.setVisible(p < 0.2); },
      () => { pr.setVisible(false).setAngle(0); this.inBox = 1; this.boxTo(b, L, BB, 0); b.c.setScale(1.08, 0.9); this.tweens.add({ targets: b.c, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
        Fx.kick(); this.dust(L, 6); then(); });
  }
  /** his head pops out of the top of the (payoff) box */
  private popHead(frame: string, then?: () => void) {
    const b = this.boxes[this.grabBox], pr = this.pup.root; this.inBox = 1;
    pr.setVisible(true).setAngle(0).setPosition(b.c.x, BB + 40); this.pup.setDepth(10).setFrame(frame); this.pupShadow.setVisible(false); this.setFace(this.rig.x < b.c.x ? -1 : 1);
    Fx.boing(); this.tw(220, (p) => pr.setY(L_(BB + 40, HEAD_OUT, p)), then, 'Back.Out');
  }
  private openFlaps(b: BoxGfx) { b.flapL.setVisible(true).setAngle(0); b.flapR.setVisible(true).setAngle(0); this.tweens.add({ targets: b.flapL, angle: -38, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: b.flapR, angle: 38, duration: 160, ease: 'Back.Out' }); }
  private clearBoxExtras(b: BoxGfx) { const extra = b.c.list.slice(4); this.tweens.killTweensOf(extra); extra.forEach(o => o.destroy()); }
  /** payoff time: every box except the one Puppy is in scoots off to the nearest side (restoreBox brings them home) */
  private clearStage() { Fx.whoosh(); this.boxes.forEach((b, i) => { if (i === this.grabBox) return; b.eyes.setVisible(false); const x0 = b.c.x, x1 = b.x < 360 ? -150 : W + 150;
    this.tw(340, (p) => this.boxTo(b, L_(x0, x1, p), BB - Math.sin(p * Math.PI) * 60, (x1 < 0 ? -1 : 1) * 12 * p), undefined, 'Quad.In'); }); }
  private restoreBox(i: number) {
    const b = this.boxes[i]; if (!b) return; this.clearBoxExtras(b); this.tweens.killTweensOf([b.c, b.flapL, b.flapR]);
    b.flapL.setVisible(true).setAngle(0); b.flapR.setVisible(true).setAngle(0); b.back.setVisible(true); b.shadow.setVisible(true); b.c.setVisible(true).setScale(1);
    const x0 = b.c.x, y0 = b.c.y, a0 = b.c.angle, slot = b.x;
    if (Math.abs(x0 - slot) < 2 && Math.abs(y0 - BB) < 2 && Math.abs(a0) < 1) { placeBox(b, slot, BB); b.back.setAngle(0); return; }
    this.tw(480, (p) => this.boxTo(b, L_(x0, slot, p), L_(y0, BB, p) - Math.sin(p * Math.PI) * 220, a0 * (1 - p)), () => { placeBox(b, slot, BB); b.back.setAngle(0); b.c.setDepth(14); b.back.setDepth(8); this.wobbleBox(i, 6); Fx.step(); }, 'Sine.InOut');
  }
  /** end of a payoff: last catch -> RETURN TO SENDER, else he hops out (if inside) and runs off, next round */
  private payoffDone() {
    const s = this.st; if (s.over) return; this.anim = undefined;
    if (s.boops >= K.NEED) { this.parcelOutro(); return; }
    this.boxes.forEach((_, i) => this.restoreBox(i));
    const pr = this.pup.root, run = () => { const x1 = pr.x < 360 ? -170 : W + 170, xa = pr.x; this.setFace(Math.sign(x1 - xa)); this.pup.setDepth(20); this.pupShadow.setVisible(true);
      this.tw(700, (p) => { pr.x = L_(xa, x1, p); this.pup.setFrame('run' + (Math.floor(p * 26) % 6)); pr.y = LANE - Math.abs(Math.sin(p * 26 / 6 * Math.PI * 2)) * 5; }, () => this.startRound(true), 'Quad.In'); };
    if (this.inBox) { this.inBox = 0; const x0 = pr.x, y0 = pr.y, x1 = Phaser.Math.Clamp(x0 + (x0 < 360 ? 110 : -110), 70, 650); this.pup.setFrame('stand'); Fx.boing();
      this.tw(380, (p) => { pr.setPosition(L_(x0, x1, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (RIM - 160) + p * p * LANE); this.pup.setDepth(p > 0.3 ? 20 : 10); }, run); }
    else run();
  }
  // a) SEAL THE BOX: lid shut, zip-zip tape, FRAGILE + THIS SIDE UP, the box hops about, then his head pokes out the top
  private poSeal(L: number) {
    const b = this.boxes[this.grabBox], h = BOX_H; let lid: Phaser.GameObjects.Graphics, t1: Phaser.GameObjects.Graphics;
    this.at(150, () => this.talk(this.rig.x, 540, pick(LINES.boxSealNoir), 22, 1500));
    this.scoop(L, () => {
      this.noirTo(Phaser.Math.Clamp(L - this.away * 240, 60, 660), 240, () => { this.rig.setFlip(this.rig.x > L).act([{ dur: 0.1, to: PAWS }, { dur: 0.15, to: { ...PAWS, le: -50 } }, { dur: 0.15, to: PAWS }], true); });
      b.flapL.setVisible(false); b.flapR.setVisible(false); lid = sealLid(this); b.c.add(lid); lid.setScale(1, 0.2); this.tweens.add({ targets: lid, scaleY: 1, duration: 140, ease: 'Back.Out' }); Fx.block();
      this.at(260, () => { t1 = tapeStrip(this, BOX_W + 20); t1.setPosition(-BOX_W / 2 - 10, -h - 10).setScale(0, 1); b.c.add(t1);
        this.tweens.add({ targets: t1, scaleX: 1, duration: 260, ease: 'Quad.Out' }); zipZip(Fx, this); this.bigComic(L, RIM - 120, 'ZZZIP!', 56, -8); });
      this.at(560, () => { const t2 = tapeStrip(this, 70, true); t2.setPosition(0, -h - 12).setScale(1, 0); b.c.add(t2); this.tweens.add({ targets: t2, scaleY: 1, duration: 200, ease: 'Quad.Out' }); zipZip(Fx, this); this.bigComic(L + 40, RIM - 60, 'ZIP!', 48, 8); });
      this.at(820, () => { const f = sticker(this, 'fragile'); f.setPosition(-6, -38).setAngle(-9); b.c.add(f); this.pop(f, 1, 180); Fx.block(); });
      this.at(1000, () => { const u = sticker(this, 'up'); u.setPosition(42, -118).setAngle(10); b.c.add(u); this.pop(u, 0.85, 180); Fx.block(); });
      // the box hops and wobbles about (he's in there!)
      this.at(1250, () => { const x0 = b.c.x, dir = this.rig.x < b.c.x ? 1 : -1;
        this.tw(900, (p) => { const hop = Math.abs(Math.sin(p * Math.PI * 3)); this.boxTo(b, x0 + dir * 50 * p, BB - hop * 46, Math.sin(p * Math.PI * 6) * 9); },
          () => this.boxTo(b, b.c.x, BB, 0));
        [0, 300, 600].forEach((d, n) => this.at(d + 150, () => { Fx.step(); this.ft(b.c.x + (n - 1) * 40, RIM - 70, ['mmf!', 'hmmf!', 'mmmf!'][n], '#ffffff', 30); })); });
      // tape gives, flaps burst open, head pokes out: pouty
      this.at(2250, () => { lid.destroy(); t1.destroy(); this.openFlaps(b); this.ft(b.c.x, RIM - 40, 'rrrip!', '#ffffff', 30);
        this.popHead('stand', () => { this.pout(b.c.x, this.headY() + 20); this.pupTalk(pick(LINES.boxSealPup), 1300); }); });
      this.at(3200, () => this.payoffDone());
    });
  }
  // b) FLOP: the box flips over him, he waddles about blind and bonks the walls, pops out with a postage stamp on his nose
  private poFlop() {
    const s = this.st, i = this.grabBox, box = this.boxes[i], pr = this.pup.root, L = Phaser.Math.Clamp(pr.x - this.away * 70, 140, 580); this.flopBox = i;
    this.rig.setMood('happy').act([{ dur: 0.1, to: { ls: -40, le: -40, rs: -30, re: -40, lean: -30, dy: 10 } }, { dur: 0.3, to: { lean: 6 } }], false, 0.3);
    this.pup.setFrame('panic'); this.pup.inner.setAngle(0); const px0 = pr.x;
    this.tw(620, (p) => pr.setPosition(L_(px0, L, p), LANE - Math.sin(p * Math.PI) * 330).setAngle(-360 * this.away * p), undefined, 'Sine.InOut');
    this.tweens.killTweensOf(box.c); box.back.setVisible(false); box.flapL.setVisible(false); box.flapR.setVisible(false); box.eyes.setVisible(false); box.shadow.setVisible(false); box.c.setDepth(24);
    const bx0 = box.c.x, yEnd = BB - 52 - BOX_H; // raised: his legs + tail poke out underneath
    this.tw(620, (p) => box.c.setPosition(L_(bx0, L, p), (1 - p) * (1 - p) * BB + 2 * (1 - p) * p * (BB - 520) + p * p * yEnd).setAngle(180 * p),
    () => { pr.setAngle(0).setPosition(L, LANE); this.pup.setDepth(23); this.pup.setFrame('run0'); this.pupShadow.setVisible(true);
      Fx.kick(); this.cameras.main.shake(160, 0.012); this.bigComic(L, LANE - 260, 'FLOP!', 64); this.dust(L, 8);
      const final = s.boops >= K.NEED;
      this.wad = { on: 1, x: L, dir: L < 360 ? -1 : 1, bonks: 0, t: 0, final: final ? 1 : 0 };
      this.at(350, () => this.pupTalk(pick(LINES.boxBlind), 1200));
      if (!final) this.perch(); }, 'Sine.InOut');
  }
  private perch() {
    const opts = this.boxes.map((_, i) => i).filter(i => i !== this.flopBox), j = opts.sort((a, b) => Math.abs(this.bx(a) - 360) - Math.abs(this.bx(b) - 360))[0];
    const x0 = this.rig.x, y0 = this.rig.y, x1 = this.bx(j), y1 = RIM + 6; this.rig.setFlip(x1 < x0).act([{ dur: 0.08, to: CROUCH }, { dur: 0.2, to: STRETCH }, { dur: 0.15, to: CROUCH }], false, 0.2);
    this.tw(420, (p) => this.rig.setPosition(L_(x0, x1, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (RIM - 200) + p * p * y1).setDepth(22), () => this.groom());
  }
  private groom() { if (this.st.over) return; this.rig.setMood('smug').act([{ dur: 0.25, to: { rs: -150, re: -100, tilt: 10, lean: -4 } }, { dur: 0.2, to: { rs: -140, re: -120, tilt: 14 } }, { dur: 0.2, to: { rs: -150, re: -100, tilt: 10 } }], false, 0.3); }
  private wadTick(dt: number) {
    const w = this.wad, box = this.boxes[this.flopBox], pr = this.pup.root; if (!w.on || !box) return; w.t += dt;
    const target = w.final && w.bonks >= 1 ? 360 : w.dir < 0 ? 95 : 625;
    w.x += w.dir * K.WAD * (w.final && w.bonks >= 1 ? 0.6 : 1) * dt;
    this.setFace(w.dir); this.pup.update(dt, 1.4, 1); pr.x = w.x; pr.y = LANE;
    box.c.setPosition(w.x + Math.sin(w.t * 20) * 3, BB - 52 - BOX_H - Math.abs(Math.sin(w.t * 12)) * 6).setAngle(180 + Math.sin(w.t * 12) * 5);
    if (w.final && w.bonks >= 1 && (w.dir > 0 ? w.x >= target : w.x <= target)) { w.on = 0; this.parcelOutro(); return; }
    if (!(w.final && w.bonks >= 1) && (w.dir > 0 ? w.x >= target : w.x <= target)) { // BONK into the wall
      w.bonks++; w.dir = -w.dir; w.x = target; Fx.ouch(); this.cameras.main.shake(140, 0.01);
      const bxw = target + (w.dir > 0 ? -75 : 75); this.bigComic(bxw, BB - 230, 'BONK!', 54, Phaser.Math.Between(-10, 10));
      for (let k = 0; k < 3; k++) { const st = txt(this, bxw, BB - 200, '★', 34, '#ffdf6b', '#22252b', 4).setDepth(45); this.tweens.add({ targets: st, x: bxw + w.dir * (30 + k * 30), y: BB - 260 - k * 20, alpha: 0, duration: 650, onComplete: () => st.destroy() }); }
      if (w.final) { w.dir = 360 > w.x ? 1 : -1; this.at(200, () => this.pupTalk(pick(LINES.boxBlind), 1000)); }
      else if (w.bonks >= 2 || w.t > 2.4) { w.on = 0; this.popOut(); }
    }
  }
  private popOut() {
    const s = this.st, i = this.flopBox, box = this.boxes[i], pr = this.pup.root; Fx.boing(); this.ft(pr.x, LANE - 280, 'POP!', '#ffffff', 50);
    const x0 = box.c.x, y0 = box.c.y, slot = (s.boxes === 3 ? XS3 : XS4)[i];
    this.tw(650, (p) => box.c.setPosition(L_(x0, slot, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (BB - 560) + p * p * BB).setAngle(180 + 180 * p),
    () => { placeBox(box, slot, BB); box.c.setDepth(14).setAngle(0); box.back.setVisible(true); box.flapL.setVisible(true); box.flapR.setVisible(true); box.shadow.setVisible(true); this.flopBox = -1; this.wobbleBox(i, 6); Fx.kick(); }, 'Sine.InOut');
    // Puppy: dizzy, postage stamp stuck on his nose
    this.pup.setDepth(20).setFrame('dizzy'); this.setFace(pr.x < 360 ? 1 : -1); this.stampOn();
    this.at(300, () => this.pupTalk(pick(LINES.boxStamp), 1300));
    this.at(1250, () => { this.peelStamp(); this.at(350, () => this.payoffDone()); });
  }
  private stampOn() {
    this.stamp?.destroy(); const st = this.stamp = this.add.image(4, -124 * 0.78 * PUP_M + 26, 'bb_stamp').setScale(0.1).setAngle(-12); this.pup.inner.add(st);
    this.tweens.add({ targets: st, scale: 0.55, duration: 220, ease: 'Back.Out' }); sparks(this, this.pup.root.x, this.pup.root.y - 100, 8);
  }
  private peelStamp() { const st = this.stamp; if (!st) return; this.stamp = undefined; const m = st.getWorldTransformMatrix(), x = m.tx, y = m.ty; st.destroy();
    const f = this.add.image(x, y, 'bb_stamp').setScale(0.55).setAngle(-12).setDepth(60); this.ft(x, y - 50, 'peel!', '#ffffff', 28); Fx.whoosh();
    this.tweens.add({ targets: f, y: LANE + 10, x: x + Phaser.Math.Between(-60, 60), angle: 200, duration: 900, ease: 'Sine.In' }); this.tweens.add({ targets: f, alpha: 0, delay: 700, duration: 300, onComplete: () => f.destroy() }); }
  // c) GIFT-WRAP: paper, ribbon, a big bow... then he pops out of the top like a jack-in-the-box
  private poGift(L: number) {
    const b = this.boxes[this.grabBox], h = BOX_H;
    this.at(150, () => this.talk(this.rig.x, 540, pick(LINES.boxGiftNoir), 22, 1500));
    this.scoop(L, () => {
      this.noirTo(Phaser.Math.Clamp(L - this.away * 240, 60, 660), 240, () => { this.rig.setFlip(this.rig.x > L).act([{ dur: 0.1, to: PAWS }, { dur: 0.2, to: { ...PAWS, ls: -130 } }, { dur: 0.2, to: PAWS }], true); });
      b.flapL.setVisible(false); b.flapR.setVisible(false);
      const wrap = giftWrap(this); wrap.setScale(1, 0); b.c.add(wrap); this.tweens.add({ targets: wrap, scaleY: 1, duration: 260, ease: 'Quad.Out' }); Fx.whoosh(); this.bigComic(L, RIM - 110, 'WRAP!', 52, -6);
      const lid = sealLid(this, 0xff8fbd); lid.setAlpha(0); b.c.add(lid); this.at(260, () => { lid.setAlpha(1); this.pop(lid, 1, 160); Fx.block(); });
      let bow: Phaser.GameObjects.Container, rib: Phaser.GameObjects.Graphics;
      this.at(480, () => { rib = giftRibbon(this); b.c.add(rib); this.pop(rib, 1, 160); Fx.block(); });
      this.at(720, () => { bow = giftBow(this); bow.setPosition(0, -h - 24); b.c.add(bow); this.pop(bow, 1.15, 260); Fx.combo(6); this.bigComic(L, RIM - 150, 'TA-DA!', 60, 6); sparks(this, L, RIM - 40, 10); });
      // it trembles...
      this.at(1250, () => { const x0 = b.c.x; Fx.alert(); this.ft(x0, RIM - 90, '?!', '#ffffff', 40);
        this.tw(650, (p) => { b.c.setAngle(Math.sin(p * 60) * 4 * p); b.c.x = x0 + Math.sin(p * 80) * 3 * p; if (bow) bow.setScale(1.15 + Math.sin(p * 40) * 0.08); }, () => { b.c.setAngle(0).setX(x0); }); });
      // ...BOING! lid + bow fly off, he springs up on a coil
      this.at(1950, () => { const x = b.c.x; [lid, bow].forEach((o, n) => { b.c.remove(o); (o as any).setPosition(x, RIM - 20 - n * 4).setDepth(30); this.add.existing(o); this.keep(o);
          this.tweens.add({ targets: o, x: x + (n ? 1 : -1) * 160, y: RIM - 420, angle: (n ? 1 : -1) * 300, alpha: 0, duration: 700, ease: 'Quad.Out' }); });
        rib.destroy(); Fx.boing(); this.bigComic(x, RIM - 260, 'BOING!', 66, -8);
        const pr = this.pup.root, spring = this.keep(this.add.graphics().setDepth(9.5)); this.inBox = 1;
        pr.setVisible(true).setAngle(0).setPosition(x, BB + 30); this.pup.setDepth(10).setFrame('panic'); this.pupShadow.setVisible(false); this.setFace(this.rig.x < x ? -1 : 1);
        this.tw(1000, (p) => { const t = p * 1.0, top = RIM - 95 + Math.sin(t * 22) * 46 * Math.exp(-t * 3.2);
          pr.y = p < 0.12 ? L_(BB + 30, RIM - 140, p / 0.12) : top; pr.setAngle(Math.sin(t * 22) * 6 * Math.exp(-t * 3));
          spring.clear().lineStyle(8, 0x9aa3b5, 1); spring.beginPath(); const y0 = RIM + 30, y1 = pr.y - 6, n = 7; spring.moveTo(x, y0);
          for (let k = 1; k <= n; k++) spring.lineTo(x + (k % 2 ? 1 : -1) * 22, L_(y0, y1, k / n)); spring.lineTo(x, y1); spring.strokePath(); },
        () => { this.pup.setFrame('stand'); this.pout(x, this.headY() + 10); this.pupTalk(pick(LINES.boxGiftPup), 1300);
          this.tw(260, (p) => { pr.y = L_(RIM - 95, HEAD_OUT, p); spring.clear(); }, () => spring.destroy()); });
        this.openFlaps(b); });
      this.at(3300, () => this.payoffDone());
    });
  }
  // d) SHIPPING: label slapped on, onto a little conveyor, Noir kicks it off-screen... and it boomerangs back
  private poShip(L: number) {
    const b = this.boxes[this.grabBox], h = BOX_H, dir = L < 360 ? 1 : -1, edge = dir > 0 ? W + 40 : -40;
    this.at(150, () => this.talk(this.rig.x, 540, pick(LINES.boxShipNoir), 22, 1500));
    this.scoop(L, () => {
      b.flapL.setVisible(false); b.flapR.setVisible(false); const lid = sealLid(this); b.c.add(lid); this.pop(lid, 1, 140);
      const t1 = tapeStrip(this, BOX_W + 20); t1.setPosition(-BOX_W / 2 - 10, -h - 10); b.c.add(t1); zipZip(Fx, this);
      this.at(200, () => { const lab = sticker(this, 'ship'); lab.setPosition(0, -64).setAngle(-6); b.c.add(lab); this.pop(lab, 1, 200); Fx.block(); this.bigComic(L, RIM - 120, 'SHIPPING!', 50, -6); });
      const belt = conveyor(this, L - dir * 70, edge, BB, 6); this.keep(belt.g); belt.g.setAlpha(0); this.tweens.add({ targets: belt.g, alpha: 1, duration: 200, delay: 300 });
      let bt = 0; this.anim = (dt) => { bt += dt; belt.redraw(bt); return false; };
      this.at(350, () => this.tw(180, (p) => this.boxTo(b, b.c.x, BB - 18 * p, 0)));
      // Noir lines up behind it and gives it a little kick
      this.noirTo(Phaser.Math.Clamp(L - dir * 200, 50, 670), 260, () => { this.rig.setFlip(dir < 0); });
      this.at(780, () => { this.rig.act([{ dur: 0.08, to: { ...KICK, lh: -20 } }, { dur: 0.1, to: KICK }, { dur: 0.25, to: { sq: 0, dy: 0 } }], false, 0.2); Fx.kick(); this.bigComic(L, RIM - 150, 'SHIP IT!', 56, 6);
        const x0 = b.c.x; this.tw(700, (p) => this.boxTo(b, L_(x0, edge + dir * 140, p), BB - 18 + Math.abs(Math.sin(p * 20)) * -3, dir * Math.sin(p * 30) * 3), undefined, 'Quad.In');
        this.at(250, () => this.ft(x0 + dir * 200, RIM - 60, 'wheeee!', '#ffffff', 34)); });
      this.at(1650, () => this.tweens.add({ targets: belt.g, alpha: 0, duration: 300 }));
      // ...a beat... and it boomerangs back, spinning, and lands with a BONK
      this.at(1900, () => { const x1 = Phaser.Math.Clamp(L + dir * 40, 150, 570), sx = edge + dir * 140; Fx.whoosh(); this.bigComic(dir > 0 ? 560 : 160, 520, 'BOOMERANG!', 54, -6);
        this.tw(760, (p) => this.boxTo(b, L_(sx, x1, p), (1 - p) * (1 - p) * (BB - 300) + 2 * (1 - p) * p * (BB - 620) + p * p * BB, -dir * 720 * p),
          () => { this.boxTo(b, x1, BB, 0); Fx.kick(); Fx.ouch(); this.cameras.main.shake(180, 0.014); this.dust(x1, 8); this.bigComic(x1, RIM - 120, 'RETURNED!', 54, 8);
            lid.destroy(); t1.destroy(); this.openFlaps(b);
            this.popHead('dizzy', () => { const hy = this.headY();
              for (let k = 0; k < 3; k++) { const st = txt(this, b.c.x, hy - 10, '★', 34, '#ffdf6b', '#22252b', 4).setDepth(45); this.tweens.add({ targets: st, angle: 360, x: b.c.x + Math.cos(k * 2.1) * 70, y: hy - 30 + Math.sin(k * 2.1) * 20, alpha: 0, duration: 900, onComplete: () => st.destroy() }); }
              this.pupTalk(pick(LINES.boxShipPup), 1300); this.at(350, () => this.pout(b.c.x, hy + 20)); }); }, 'Sine.InOut'); });
      this.at(3450, () => this.payoffDone());
    });
  }
  // e) TURTLE: the box lands on his bum and sticks; he plods round like a little turtle, then it pops off
  private poTurtle() {
    const s = this.st, b = this.boxes[this.grabBox], pr = this.pup.root, sc = 0.72; this.tweens.killTweensOf(b.c);
    b.back.setVisible(false); b.shadow.setVisible(false); b.flapL.setVisible(false); b.flapR.setVisible(false); b.eyes.setVisible(false); b.c.setDepth(24);
    this.noirTo(pr.x < 360 ? 610 : 110, 280, () => this.rig.setFlip(this.rig.x > 360)); // out of the turtle's way
    this.at(320, () => this.talk(this.rig.x, 540, pick(LINES.boxTurtleNoir), 22, 1500));
    const pose = (t: number) => { const f = s.face; return { x: pr.x - f * 150, y: LANE - 58 - Math.abs(Math.sin(t * 9)) * 4, a: 90 * f + Math.sin(t * 9) * 4 }; };
    const x0 = b.c.x, y0 = b.c.y; this.pup.setFrame('panic'); Fx.whoosh();
    this.tw(460, (p) => { const q = pose(0); b.c.setPosition(L_(x0, q.x, p), L_(y0, q.y, p) - Math.sin(p * Math.PI) * 260).setAngle(q.a * p).setScale(L_(1, sc, p)); },
    () => { Fx.kick(); this.cameras.main.shake(140, 0.01); this.bigComic(pr.x, LANE - 260, 'STUCK!', 60, -8); this.dust(pr.x, 6);
      this.at(250, () => this.pupTalk(pick(LINES.boxTurtlePup), 1300));
      // plod plod: to the near wall, turn round, back to the middle
      let t = 0, leg = 0, plodT = 0; const wall = pr.x < 360 ? 95 : 625;
      this.anim = (dt) => { t += dt; plodT -= dt; const goal = leg === 0 ? wall : 360, d = goal - pr.x;
        if (Math.abs(d) < 4) { if (leg === 0) { leg = 1; Fx.step(); this.ft(pr.x, LANE - 250, 'beep beep!', '#ffffff', 28); } else return true; }
        this.setFace(Math.sign(d) || s.face); pr.x += Math.sign(d) * Math.min(Math.abs(d), 150 * dt); pr.y = LANE - Math.abs(Math.sin(t * 9)) * 3; this.pup.update(dt, 0.65, 0.4);
        if (plodT <= 0) { plodT = 0.45; Fx.step(); }
        const q = pose(t); b.c.setPosition(q.x, q.y).setAngle(q.a); return false; };
      this.waitAnim(2600, () => { this.anim = undefined; this.pup.setFrame('dizzy'); Fx.boing(); this.bigComic(pr.x, LANE - 280, 'POP!', 58, 6);
        this.tweens.add({ targets: pr, y: LANE - 60, duration: 160, yoyo: true, ease: 'Quad.Out' }); this.restoreBox(this.grabBox);
        this.at(250, () => this.pout(pr.x, this.headY() + 20)); this.at(900, () => this.payoffDone()); });
    }, 'Sine.InOut');
  }
  /** wait for this.anim to report done (or ms max), then call next */
  private waitAnim(ms: number, next: () => void) { const f = this.anim; let t = 0, fired = false;
    this.anim = (dt) => { t += dt * 1000; if (fired) return true; if ((f && f(dt)) || t >= ms) { fired = true; this.time.delayedCall(0, () => { if (!this.st.over) next(); }); return true; } return false; }; }
  // f) AVALANCHE: a whole stack of boxes tumbles down on him; he crawls out wearing one as a hat
  private poAvalanche(L: number) {
    const pr = this.pup.root, X = Phaser.Math.Clamp(L, 160, 560); this.pup.setFrame('panic');
    { const b = this.boxes[this.grabBox], x0 = b.c.x, x1 = b.x < 360 ? -150 : W + 150; b.eyes.setVisible(false); this.tweens.killTweensOf(b.c); // his box scoots off too
      this.tw(340, (p) => this.boxTo(b, L_(x0, x1, p), BB - Math.sin(p * Math.PI) * 60, (x1 < 0 ? -1 : 1) * 12 * p), undefined, 'Quad.In'); }
    if (Math.abs(this.rig.x - X) < 240) this.noirTo(Phaser.Math.Clamp(X + (this.rig.x < X ? -1 : 1) * 250, 90, 630), 260, () => this.rig.setFlip(this.rig.x > X));
    this.at(300, () => this.talk(this.rig.x, 540, pick(LINES.boxHatNoir), 22, 1500));
    const xs: [number, number][] = [[-86, 0], [0, 0], [86, 0], [-43, -94], [43, -94], [0, -188]], pile: Phaser.GameObjects.Container[] = [];
    this.tw(260, (p) => { pr.x = L_(pr.x, X, p); }, () => this.ft(X, LANE - 260, 'uh-oh...', '#ffffff', 34));
    xs.forEach(([dx, dy], k) => { const m = this.keep(miniBox(this, 0.58, 26)); m.setPosition(X + dx + Phaser.Math.Between(-60, 60), -150 - k * 90).setAngle(Phaser.Math.Between(-30, 30)); pile.push(m);
      this.tweens.add({ targets: m, x: X + dx, y: BB + dy, angle: Phaser.Math.Between(-7, 7), duration: 480, delay: 200 + k * 110, ease: 'Bounce.Out', onStart: () => { if (k === 1) Fx.whoosh(); },
        onComplete: () => { Fx.kick(); if (k === xs.length - 1) { this.cameras.main.shake(220, 0.016); this.dust(X, 10); } } }); });
    this.at(420, () => this.bigComic(X, 420, 'AVALANCHE!', 66, -6));
    this.at(1150, () => { this.pup.root.setVisible(false); [0, 500].forEach((d, n) => this.at(d, () => this.ft(X + (n ? 40 : -40), BB - 260, n ? 'mmf!' : 'oof!', '#ffffff', 32))); });
    // the pile tumbles away; there he is, with a box on his head
    this.at(1850, () => { Fx.whoosh(); pile.forEach((m, k) => { const sx = m.x < X ? -1 : m.x > X ? 1 : (k % 2 ? 1 : -1);
        this.tweens.add({ targets: m, x: m.x + sx * Phaser.Math.Between(260, 420), y: m.y - Phaser.Math.Between(80, 220), angle: sx * Phaser.Math.Between(120, 300), alpha: 0, duration: 560, ease: 'Quad.Out' }); });
      pr.setVisible(true).setPosition(X, LANE).setAngle(0); this.pup.setDepth(20).setFrame('dizzy'); this.pupShadow.setVisible(true);
      this.hat?.destroy(); const hat = this.hat = boxHat(this, 0.5); hat.setPosition(-6, -150 * PUP_M).setAngle(-8); this.pup.inner.add(hat); this.pop(hat, 1, 200); Fx.boing();
      this.at(350, () => { this.pup.setFrame('stand'); this.pout(pr.x, this.headY() - 10); this.pupTalk(pick(LINES.boxHatPup), 1400); });
      this.at(900, () => this.tweens.add({ targets: this.pup.inner, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 2, onComplete: () => this.pup.inner.setAngle(0) })); });
    this.at(3050, () => this.payoffDone());
  }
  /** last catch: his box slides to centre stage, he ends up inside, it becomes a parcel, Noir sits on top: RETURN TO SENDER */
  private parcelOutro() {
    const s = this.st, i = this.grabBox, box = this.boxes[i]; s.phase = 'end'; Fx.kick(); this.anim = undefined;
    // clear the stage: the other boxes scoot off, the buttons fade (it's the curtain call)
    this.boxes.forEach((b, j) => { if (j === i) return; const d = (b.x < 360 ? -1 : 1) * 520; b.eyes.setVisible(false);
      this.tweens.add({ targets: [b.c, b.back, b.shadow], x: `+=${d}`, duration: 520, delay: 60 * j, ease: 'Back.In' }); });
    this.tweens.add({ targets: [this.mb, this.pbtn], alpha: 0, duration: 300 }); this.you.setVisible(false); this.guide.setVisible(false);
    const toParcel = () => {
      box.c.setVisible(false); box.back.setVisible(false); box.shadow.setVisible(false); this.pup.root.setVisible(false); this.hat?.destroy(); this.hat = undefined;
      const { c, face } = makeParcel(this, 360, BB, 24); c.setScale(1.06, 0.94); this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' });
      this.tweens.add({ targets: face, x: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      // Noir hops up and SITS on top, legs dangling over the front, then grooms smugly
      const x0 = this.rig.x, y0 = this.rig.y, y1 = BB - BOX_H - 22 + 46 * NOIR_M; this.rig.setFlip(x0 > 360).act([{ dur: 0.08, to: CROUCH }, { dur: 0.22, to: STRETCH }, { dur: 0.16, to: SIT }], true);
      this.tweens.addCounter({ from: 0, to: 1, duration: 460, onUpdate: (tw) => { const p = tw.getValue()!; this.rig.setPosition(L_(x0, 360, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (y1 - 240) + p * p * y1).setDepth(26); },
        onComplete: () => { this.rig.setMood('smug'); Fx.block(); this.sitGroom();
          this.time.delayedCall(350, () => { const m = makeReturnMark(this, 372, BB - 30).setDepth(27).setScale(3).setAngle(-10).setAlpha(0);
            this.tweens.add({ targets: m, scale: 0.55, alpha: 1, duration: 200, ease: 'Quad.In', onComplete: () => { Fx.punch(); this.cameras.main.shake(200, 0.015); sparks(this, 372, BB - 30, 14); } }); });
          this.time.delayedCall(800, () => this.talk(360, 600, pick(LINES.boxWin), 24, 1800));
          this.time.delayedCall(1700, () => this.talk(360, 1150, pick(mix(LINES.boxWinPup, CHEEKY.boxWinPup)), 22, 1500));
          this.time.delayedCall(2900, () => this.finish(true)); } });
    };
    if (this.flopBox === i) { this.tweens.add({ targets: box.c, y: BB - BOX_H, duration: 180, ease: 'Quad.In', onComplete: toParcel }); return; }
    // any other payoff: tidy the box, slide it to the middle, he hops in
    this.clearBoxExtras(box); this.tweens.killTweensOf([box.c, box.flapL, box.flapR]); box.c.setScale(1).setDepth(14); box.back.setVisible(true).setDepth(8); box.shadow.setVisible(true); box.flapL.setVisible(true).setAngle(0); box.flapR.setVisible(true).setAngle(0);
    const pr = this.pup.root, bx0 = box.c.x, by0 = box.c.y, ba0 = box.c.angle, px0 = pr.x, py0 = pr.y, wasIn = this.inBox;
    this.tw(380, (p) => { this.boxTo(box, L_(bx0, 360, p), L_(by0, BB, p), ba0 * (1 - p)); if (wasIn) pr.x = L_(px0, 360, p); }, () => {
      if (wasIn) { this.tw(200, (p) => pr.setY(L_(py0, BB + 40, p)), toParcel); return; }
      this.pup.setFrame('stand'); Fx.boing();
      this.tw(420, (p) => { pr.setPosition(L_(px0, 360, p), (1 - p) * (1 - p) * py0 + 2 * (1 - p) * p * (RIM - 260) + p * p * (BB + 40)); this.pup.setDepth(p > 0.6 ? 10 : 20); this.pupShadow.setVisible(p < 0.3); }, toParcel); });
  }
  /** seated grooming loop (held pose, so she never pops back to standing on top of the parcel) */
  private sitGroom() { if (this.st.over && this.st.phase !== 'end') return;
    const lick = { ...SIT, rs: -150, re: -110, tilt: 12, lean: -2 };
    this.rig.act([{ dur: 0.25, to: lick }, { dur: 0.18, to: { ...lick, re: -125, tilt: 15 } }, { dur: 0.18, to: lick }, { dur: 0.18, to: { ...lick, re: -125, tilt: 15 } }, { dur: 0.3, to: SIT }], true); }

  // ------------------------------------------------------------------ rounds
  private startRound(afterBoop = true) {
    const s = this.st; if (s.over) return; s.phase = 'reset'; s.pup = 'off'; s.firstPick = 1; s.dcDone = 0; s.feintDone = 0; s.pbox = -1; s.dash = 0; s.payoff = ''; this.clockOn = !afterBoop;
    this.anim = undefined; this.inBox = 0; this.extras.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }); this.extras = []; this.hat?.destroy(); this.hat = undefined;
    this.pup.root.setVisible(false).setAngle(0); this.pup.inner.setAngle(0); this.pup.wagAmp = 22; this.pup.tailStretch = 1; this.pup.letGo(); this.pupShadow.setVisible(true);
    let delay = 0;
    if (s.boops >= K.FOUR_AT && s.boxes === 3) { s.boxes = 4; delay = 700; popBanner(this, 'MORE BOXES!', 600, 0x2fa0bf, 800);
      this.boxes.forEach((b, i) => { const x0 = b.x, x1 = XS4[i]; placeBox(b, x0, BB); this.tweens.addCounter({ from: 0, to: 1, duration: 420, onUpdate: (tw) => { const p = tw.getValue()!; placeBox(b, L_(x0, x1, p), BB); b.c.y = BB - Math.sin(p * Math.PI) * 60; } }); });
      const nb = makeBox(this, XS4[3], BB); nb.c.y = BB - 700; this.boxes.push(nb); this.tweens.add({ targets: nb.c, y: BB, duration: 500, delay: 200, ease: 'Bounce.Out' }); }
    else if (s.boops === K.FEINT_FROM && afterBoop) { popBanner(this, 'PUPPY IS GETTING SNEAKY!', 600, 0xbf6a2f, 900); delay = 300; }
    else if (s.boops === K.NEED - 1 && afterBoop) { popBanner(this, 'LAST ONE!', 600, 0xff5c8a, 800); delay = 300; }
    this.time.delayedCall(delay, () => { if (s.over) return;
      // Noir slips back into a box (not the one nearest the door he'll walk in from)
      const side = Math.random() < 0.5 ? 1 : -1, n = this.boxes.length, opts = [...Array(n).keys()].filter(i => side > 0 ? i < n - 1 : i > 0), j = Phaser.Utils.Array.GetRandom(opts);
      s.nState = 'out'; this.hopTo(j);
      this.time.delayedCall(K.HOP * 1000 + 250, () => { if (s.over) return; s.phase = 'hunt'; this.clockOn = true;
        const pr = this.pup.root; pr.setPosition(side > 0 ? W + 110 : -110, LANE).setVisible(true); this.pup.setDepth(20).setFrame('run0');
        this.walkTo(this.pickNext(-1)); s.meowCd = Math.min(s.meowCd, 0.4);
        if (Math.random() < 0.5 && s.boops > 0) this.talk(this.rig.x, 560, pick(LINES.boxNoir), 22, 1300); });
    });
  }
  private clockOn = false;
  // ------------------------------------------------------------------ first-time STEP prompts + slow-mo (the big pointing hand is separate: see draw)
  private showHint(k: string) {
    if (this.hints.has(k) || this.st.over) return; this.hideHint(''); this.hints.add(k); this.st.hint = k;
    const c = this.hintC = this.add.container(0, 0).setDepth(805); let msg = '', ty = 620, slow = 1, step = '';
    if (k === 'meow') { msg = 'He is sniffing YOUR box!\nTap MEOW? to trick him!'; slow = 0.35; step = 'STEP 1'; }
    if (k === 'pounce') { msg = 'His head is in the WRONG box!\nPOUNCE!'; slow = 0.35; step = 'STEP 2'; }
    if (k === 'tug') { msg = ''; step = 'STEP 3'; }
    const lab = txt(this, 360, ty - 75, step, 30, '#fff27a', '#22252b', 7);
    if (msg) { const t = comic(this, 360, ty, msg, 46).setAngle(-3).setScale(0.3); t.setAlign('center'); c.add([lab, t]); this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' }); }
    else c.add(lab.setPosition(360, 680));
    this.st.slow = slow;
  }
  private hideHint(k: string) { const c = this.hintC; if (!c || (k && this.st.hint !== k)) return; this.hintC = undefined; this.st.hint = ''; this.st.slow = 1;
    this.tweens.killTweensOf(c.list); c.destroy(); }
  // ------------------------------------------------------------------ frame
  update(_t: number, dms: number) {
    const s = this.st, dt = Math.min(dms, 50) / 1000; s.t += dt; this.draw(dt);
    if (!s.running || s.over || !this.pup) return;
    const clock = s.phase === 'hunt' || s.phase === 'bust' || (s.phase === 'reset' && this.clockOn);
    if (clock) { s.time -= dt; if (s.time <= 0) { s.time = 0; this.finish(false); return; } }
    this.hud.set(`CATCHES ${s.boops}/${K.NEED}`, s.time, s.boops / K.NEED);
    s.meowCd = Math.max(0, s.meowCd - dt);
    if (s.phase === 'hunt' || s.phase === 'bust') { const adt = dt * s.slow; if (s.phase === 'hunt') this.pupAI(adt); else this.stateT += adt; }
    if (s.phase === 'tug') this.tugTick(dt);
    if (this.wad.on) this.wadTick(dt);
    if (this.anim && this.anim(dt)) this.anim = undefined;
  }
  private draw(dt: number) {
    const s = this.st, g = this.fxg.clear();
    for (const m of this.motes) { m.y -= m.v * dt; m.p += dt; if (m.y < 340) { m.y = 1040; m.x = Phaser.Math.Between(100, 420); } g.fillStyle(0xdfe6ff, 0.25 + Math.sin(m.p * 2) * 0.15).fillCircle(m.x + Math.sin(m.p) * 8, m.y, 2.4); }
    if (!this.pup || !this.rig) return;
    // Noir sinks/peeks inside her box; glowing eyes in the hand-hole while she's ducked
    if (s.nState === 'in' && !s.over) {
      const pr = this.pup.root, dx = Math.abs(pr.x - this.bx(s.noirBox)), duck = s.phase !== 'bust' && (s.phase !== 'hunt' || (pr.visible && (dx < 170 || (this.eyesOpen() && dx < 260))));
      const ty = duck ? DUCK_Y : PEEK_Y; this.rig.setPosition(this.bx(s.noirBox), this.rig.y + (ty - this.rig.y) * (1 - Math.exp(-dt * 14)));
      this.boxes.forEach((b, i) => b.eyes.setVisible(i === s.noirBox && this.rig.y > PEEK_Y + 60 && Math.sin(s.t * 1.7) > -0.93));
    }
    const youOn = (s.phase === 'hunt' || s.phase === 'bust') && s.nState === 'in' && !s.over;
    this.you.setVisible(youOn); if (youOn) this.you.setPosition(this.bx(s.noirBox), BB + 30 + Math.sin(s.t * 4) * 3);
    // Puppy animation (states that are not tween-driven)
    const p = s.pup;
    if (s.phase === 'hunt' || s.phase === 'bust' || s.phase === 'reset') {
      if (p === 'walk') this.pup.update(dt, s.dash ? 1.7 : 1.0, 1);
      else if (p === 'peek') { this.pup.update(dt, 1.2, 1.6); this.pup.wagSpd = 18; this.pup.root.setAngle(180 * s.face + Math.sin(s.t * 9) * 6).setY(PUP_IN + Math.sin(s.t * 14) * 3); }
      else if (p === 'tell') { this.pup.wagSpd = 9; this.pup.setFrame('stand'); this.pup.update(dt, 0, 0.05); this.pup.tailStretch = 1.25; }
      else if (p === 'sniff') { this.pup.update(dt, 0, 1); this.pup.inner.setAngle(s.face * (8 + Math.sin(s.t * 16) * 3)); }
      else if (p === 'count') { this.pup.update(dt, 0, 0.3); this.pup.inner.setAngle(0); }
      else this.pup.update(dt, 0, 1);
      if (p !== 'sniff') this.pup.inner.setAngle(p === 'count' ? 0 : this.pup.inner.angle * 0.8);
      if (p !== 'tell') this.pup.tailStretch += (1 - this.pup.tailStretch) * Math.min(1, dt * 8);
    } else if (s.phase === 'tug') { /* tugTick drives the frames */ this.pup.update(dt, 0, 0); const paw = this.rig.point('rp'); this.pup.holdTo(paw.x, paw.y); }
    else if (!this.wad.on && !this.anim) this.pup.update(dt, 0, 1);
    if (this.q.visible) { const pr = this.pup.root; this.q.setPosition(pr.x, Math.min(pr.y, PUP_IN) - 130); if (p !== 'tell' && p !== 'feint') this.q.setVisible(false); }
    // what to do right now: status pill + the right button lights up + (early on / if you hesitate) a big pointing hand
    const live = s.phase === 'hunt' && p !== 'off', coming = live && (p === 'walk' || p === 'sniff' || p === 'feint') && s.tgt === s.noirBox,
      canM = live && s.meowCd <= 0 && s.nState === 'in' && p !== 'count' && p !== 'dive' && p !== 'up',
      win = live && this.headIn && s.pbox !== s.noirBox && s.nState === 'in';
    let msg = '', col = '#ffffff';
    if (win) { msg = 'HEAD IN THE BOX: POUNCE!'; col = '#7dff9a'; }
    else if (coming) { msg = canM ? "He's coming to YOUR box: MEOW!" : 'Uh-oh... he is coming!'; col = '#ffb0d0'; }
    else if (live && p === 'count') { msg = 'He is counting... get ready'; col = '#bfe8ff'; }
    else if (live) { msg = 'Wait for his head to go in a box...'; col = '#bfe8ff'; }
    else if (s.phase === 'tug') { msg = 'TAP TAP TAP!'; col = '#ffdf6b'; }
    if (this.pill.text !== msg) this.pill.setText(msg); this.pill.setColor(col);
    const gx = s.phase === 'tug' ? 530 : win ? 530 : coming && canM ? 190 : -1;
    if (gx !== this.guideX) { this.guideX = gx; this.guideT = 0; } else this.guideT += dt;
    const showG = gx >= 0 && !s.over && (s.boops < K.GUIDE || this.guideT > K.GUIDE_LATE);
    this.guide.setVisible(showG); if (showG) this.guide.setPosition(gx + 92, 1150);
    const key = `${s.phase}|${canM}|${win}|${coming}|${Math.ceil(s.meowCd * 2)}`;
    if (key !== this.btnKey) { this.btnKey = key;
      const paint = (gr: Phaser.GameObjects.Graphics, col: number, on: boolean, glow = false) => { gr.clear();
        if (glow) gr.fillStyle(0xfff27a, 0.55).fillRoundedRect(-162, -82, 324, 154, 36);
        gr.fillStyle(0x000000, 0.35).fillRoundedRect(-150, -60, 300, 130, 28).fillStyle(on ? col : 0x5a5a6a, 1).lineStyle(6, 0x22252b, 1).fillRoundedRect(-150, -70, 300, 130, 28).strokeRoundedRect(-150, -70, 300, 130, 28);
        if (on) gr.fillStyle(0xffffff, 0.25).fillRoundedRect(-138, -62, 276, 34, 16); };
      if (s.phase === 'tug') { paint(this.mbG, 0xffb02e, true); paint(this.pbG, 0xffb02e, true, true); this.mbT.setText('TAP!'); this.pbT.setText('TAP!').setFontSize(42); }
      else { paint(this.mbG, 0x6b4cc9, canM, canM && coming); paint(this.pbG, 0x2fbf5a, win, win); // POUNCE only lights up when his head is in the wrong box
        this.mbT.setText(canM || !live ? 'MEOW?' : s.meowCd > 0 ? `MEOW ${Math.max(1, Math.ceil(s.meowCd))}` : 'MEOW?'); this.pbT.setText(win ? 'POUNCE NOW!' : 'POUNCE!'); this.pbT.setFontSize(win ? 36 : 42); }
    }
    this.pbtn.setScale(win ? 1 + Math.sin(s.t * 12) * 0.05 : 1); this.mb.setScale(s.phase === 'tug' || (coming && canM) ? 1 + Math.sin(s.t * 14) * 0.04 : 1);
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; s.phase = 'end'; (window as any).__pr.ended = win ? 'win' : 'lose'; this.hideHint(''); this.endTugSafe(); this.guide?.setVisible(false); this.anim = undefined;
    if (!win && this.pup) { this.pup.root.setVisible(true).setAngle(0); this.pup.setDepth(20).setFrame('stand'); this.tweens.add({ targets: this.pup.root, y: LANE - 50, duration: 180, yoyo: true, repeat: 3, ease: 'Quad.Out' });
      this.talk(360, 770, pick(mix(LINES.boxLose, CHEEKY.boxLose)), 22, 1400); }
    popBanner(this, win ? 'RETURN TO SENDER!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Noir', 5, win, s.score + Math.round(s.time) * 20, `${s.boops} catches • ${s.busts} busts`));
  }
  private endTugSafe() { if (this.tapTxt) { this.tapTxt.destroy(); this.tapTxt = undefined; } this.meter?.clear(); }
}
