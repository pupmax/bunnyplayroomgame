// Noir: BOX BANDIT (replaces Sneaky Pounce). Noir hides in cardboard boxes in the moonlit room. Puppy hunts box to box:
// he sniffs a box (nose busy), dives head-first into it (head busy, butt + wagging tail in the air), pulls out and looks
// round. Only move while his eyes are busy. MEOW? throws Noir's voice into the empty box next to hers so he dives into
// the WRONG box; while his head is in a box, POUNCE (or tap him) = BOO-X! He pops out frozen with his tail sticking out:
// TAP the tail to GRAB it, then TAP TAP TAP to win the tug. The box flops down over him, he waddles about blind and
// bonks into the walls, then pops out with a postage stamp stuck on his nose. Last boop: RETURN TO SENDER parcel with
// Noir sitting smugly on top. Busted (seen moving, found, bad pounce) = he covers his eyes and counts while Noir
// relocates; the clock keeps running. Escalation: 3 boxes -> 4 boxes, shorter peeks, double-checks (he pops back out
// mid-peek), feints (he changes his mind mid-walk and heads for YOUR box), and he grows wise to a 3rd MEOW in a row.
// Pounce-only art helpers live in ./pounceArt.ts; K is tuned with tests/boxbandit-bots.mjs (exposed as __pr.K).
import Phaser from 'phaser';
import { GAME_W as W } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, ensureArt } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, comic, flashVignette, sparks } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { Hud, impact } from '../systems/level';
import { HeroRig } from '../systems/rigs';
import { TailPup } from '../systems/tailRigs';
import { BOX_W, BOX_H, BoxGfx, makeBox, placeBox, ensureStampTexture, makeParcel, makeReturnMark } from './pounceArt';

export const K = {
  NEED: 6, TIME: 40,
  WALK: 175, DASH: 330,                   // Puppy speed (px/s): hunting walk / lured dash
  SNIFF: [0.8, 1.2], SNIFF_NOIR: [1.0, 1.35], LURE_SNIFF: 0.3,
  PEEK: [1.2, 1.6], PEEK_DROP: 0.1, PEEK_MIN: 0.8, // head-in-box time, shrinks per boop
  TELL: 0.4,                              // tail freezes stiff + "?" before he pulls out
  DC_FROM: 1, DC_P: 0.3, DC_STEP: 0.06, DC_T: 0.6, // double-check: he pops out mid-peek and looks round (eyes open)
  LOOK_P: 0.4, LOOK_T: [0.45, 0.8],
  FEINT_FROM: 3, FEINT_P: 0.35,
  FIND_P: 0.33, FIND_STEP: 0.05, FIND_MAX: 0.5, // chance his next pick is Noir's box
  MEOW_CD: 2.2, MEOW_ROW: 2,              // the 3rd MEOW before a boop backfires
  HOP: 0.34, HOP_PER: 0.06,               // Noir's box-to-box hop
  LEAP: 0.3, LEAP_PX: 0.0005,             // pounce flight time
  GRAB_T: 1.2,
  TUG0: 0.32, TUG_TAP: 0.085, TUG_DRAIN: 0.3, TUG_MIN: 1.4, TUG_MAX: 4.5,
  COUNT: 2.2, FOUR_AT: 2, WAD: 270,
};
const FLOOR = 1000, BB = FLOOR + 40, RIM = BB - BOX_H, NOIR_M = 0.85, PUP_M = 1.0;
const PEEK_Y = RIM + 142, DUCK_Y = PEEK_Y + 100, LANE = BB - 2, PUP_IN = RIM - 92;
const XS3 = [180, 360, 540], XS4 = [120, 280, 440, 600];
const ART = ['pt_stand', 'pt_panic', 'pt_dizzy', 'pt_tail', 'su_shadow', ...[0, 1, 2, 3, 4, 5].map(i => 'pt_run' + i)];
const CROUCH = { ls: -40, le: 60, rs: -30, re: 60, lh: -50, lk: 80, rh: -30, rk: 70, lean: 18, sq: -0.16, dy: 18, tilt: 6 };
const SIT = { ls: 15, le: 95, rs: -15, re: -100, lh: 8, lk: -4, rh: 26, rk: -10, lean: -3, tilt: -7, sq: 0.03, dy: 0 }; // seated, paws crossed, legs dangling
const STRETCH = { ls: -150, le: 10, rs: -140, re: 10, lh: 30, lk: 20, rh: -30, rk: 10, lean: 20, sq: 0.08, dy: 0, tilt: 8 };
type Pup = 'off' | 'walk' | 'feint' | 'sniff' | 'dive' | 'peek' | 'tell' | 'up' | 'look' | 'count' | 'seq';
type Phase = 'wait' | 'hunt' | 'bust' | 'seq' | 'grab' | 'tug' | 'reset' | 'end';
type NState = 'in' | 'hop' | 'out' | 'seq';
const F = (r: number[]) => Phaser.Math.FloatBetween(r[0], r[1]);

export class PounceScene extends Phaser.Scene {
  st = this.fresh();
  private fresh() {
    return { time: K.TIME, boops: 0, score: 0, running: false, over: false, phase: 'wait' as Phase, pup: 'off' as Pup, px: 820, face: -1, tgt: 0, pbox: -1,
      noirBox: 0, nState: 'in' as NState, noirOut: 0, sees: 1, meowCd: 0, meowRow: 0, busts: 0, slips: 0, streak: 0, tug: 0, grabT: 0, t: 0, dash: 0,
      boxes: 3, firstPick: 1, dc: 0, dcDone: 0, feintDone: 0, wise: 0, slow: 1, hint: '', lastHopAt: -9 };
  }
  private boxes: BoxGfx[] = []; private rig!: HeroRig; private pup!: TailPup; private pupShadow!: Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => any };
  private hud!: Hud; private badge!: Phaser.GameObjects.Container; private badgeEye!: Phaser.GameObjects.Image; private badgeRing!: Phaser.GameObjects.Graphics;
  private pill!: Phaser.GameObjects.Text; private mb!: Phaser.GameObjects.Container; private pbtn!: Phaser.GameObjects.Container; private mbG!: Phaser.GameObjects.Graphics; private pbG!: Phaser.GameObjects.Graphics;
  private mbT!: Phaser.GameObjects.Text; private pbT!: Phaser.GameObjects.Text; private btnKey = ''; private fxg!: Phaser.GameObjects.Graphics; private motes: { x: number; y: number; v: number; p: number }[] = [];
  private q!: Phaser.GameObjects.Text; private hints = new Set<string>(); private hintC?: Phaser.GameObjects.Container; private tapTxt?: Phaser.GameObjects.Text; private meter!: Phaser.GameObjects.Graphics;
  private stamp?: Phaser.GameObjects.Image; private tugAge = 0; private shoutT = 0; private wad = { on: 0, x: 0, dir: 1, bonks: 0, t: 0, final: 0 }; private flopBox = -1; private away = 1; private tugX = 0;
  private stateT = 0; private peekLeft = 0; private sniffTxtT = 0; private lookFlipT = 0; private countN = 0; private noirTween?: Phaser.Tweens.Tween; private seqLock = 0;
  constructor() { super('Pounce'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x2a1a3e, 0x6a3e1e);
    this.st = this.fresh(); this.boxes = []; this.motes = []; this.hints = new Set(); this.hintC = undefined; this.tapTxt = undefined; this.stamp = undefined; this.btnKey = '';
    this.wad = { on: 0, x: 0, dir: 1, bonks: 0, t: 0, final: 0 }; this.seqLock = 0;
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
    // eye badge over Puppy: OPEN = he can see you (stay put), SHUT = busy (move!)
    this.badgeRing = this.add.graphics(); this.badgeEye = this.add.image(0, 0, 'pn_eye').setScale(1.2);
    this.badge = this.add.container(0, 0, [this.badgeRing, this.badgeEye]).setDepth(42).setVisible(false);
    const mk = (x: number, label: string) => { const c = this.add.container(x, 1180).setDepth(700), g = this.add.graphics(), t = txt(this, 0, -5, label, 42, '#fff', '#22252b', 7); c.add([g, t]); return { c, g, t }; };
    { const a = mk(190, 'MEOW?'); this.mb = a.c; this.mbG = a.g; this.mbT = a.t; const b = mk(530, 'POUNCE!'); this.pbtn = b.c; this.pbG = b.g; this.pbT = b.t; }
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.tapAt(w.x, w.y); });
    (window as any).__pr = { scene: 'Pounce', st: this.st, K, ready: false, force: (win: boolean) => this.finish(win), tap: (x: number, y: number) => this.tapAt(x, y),
      meow: () => this.meow(), pounce: () => this.pounce(), hop: (i: number) => this.hopTo(i), grab: () => this.grab(), boxX: () => this.boxes.map(b => b.x),
      tip: () => this.pup ? this.pup.tipPos() : null };
    ensureArt(this, ART).then(() => { if (!this.sys.isActive() && !this.sys.isPaused()) return; this.build(); });
  }
  private build() {
    const s = this.st;
    this.rig = new HeroRig(this, 'Noir', XS3[0], DUCK_Y, NOIR_M, { tail: true }).setDepth(9);
    this.rig.root.addAt(this.add.ellipse(0, -110, 190, 250, 0xc9a6ff, 0.16).setBlendMode(Phaser.BlendModes.ADD), 0); // soft rim so her dark limbs read on the wall
    const mg = this.make.graphics({ x: 0, y: 0 }, false); mg.fillStyle(0xffffff).fillRect(0, 0, W, BB); this.rig.root.setMask(mg.createGeometryMask()); // she sinks INTO boxes (clipped at the box base)
    this.pup = new TailPup(this, s.px, LANE, PUP_M); this.pup.setDepth(20); this.pup.flip(true); this.pupShadow = this.pup.root.list[0] as any; this.pup.root.setVisible(false);
    (window as any).__pr.ready = true;
    tutorialCard(this, 'noir2', /* Box Bandit: new tutorial id so everyone sees it once */ 'BOX BANDIT!', ['You are NOIR! 🐈‍⬛ Hide in the boxes.', 'MEOW? tricks him into the WRONG box', 'Head in a box? POUNCE! = BOO-X!', 'Then TAP his tail + TAP TAP TAP!',
      `Move only when his 👁 is shut • ${K.NEED} boops`], () => this.begin());
  }
  private makeTextures() {
    const t = this.textures;
    if (!t.exists('pn_eye')) { const g = this.make.graphics({ x: 0, y: 0 }, false); // wide-open eye: he can see
      g.fillStyle(0xffffff, 1).fillEllipse(20, 20, 34, 26).lineStyle(3, 0x22252b, 1).strokeEllipse(20, 20, 34, 26).fillStyle(0x3a2412, 1).fillCircle(17, 21, 9).fillStyle(0x000000, 1).fillCircle(17, 21, 5)
        .fillStyle(0xffffff, 1).fillCircle(14, 18, 3); g.lineStyle(3, 0x22252b, 1).beginPath(); g.moveTo(4, 5); g.lineTo(30, 3); g.strokePath(); g.generateTexture('pn_eye', 40, 40); g.destroy(); }
    if (!t.exists('pn_eyez')) { const g = this.make.graphics({ x: 0, y: 0 }, false); // shut eye (^): busy
      g.lineStyle(5, 0x22252b, 1).beginPath(); g.arc(20, 26, 11, Math.PI * 1.1, Math.PI * 1.9); g.strokePath(); g.fillStyle(0xff9ab8, 0.8).fillEllipse(20, 32, 16, 6); g.generateTexture('pn_eyez', 40, 40); g.destroy(); }
    if (!t.exists('pn_glow')) { const g = this.make.graphics({ x: 0, y: 0 }, false); for (let i = 30; i > 0; i--) g.fillStyle(0xffffff, 0.04).fillCircle(100, 100, i * 3.3); g.generateTexture('pn_glow', 200, 200); g.destroy(); }
    if (!t.exists('pn_shadow')) { const g = this.make.graphics({ x: 0, y: 0 }, false); for (let i = 8; i > 0; i--) g.fillStyle(0x1a0a08, 0.07).fillEllipse(90, 20, 20 * i + 20, 4 * i + 6); g.generateTexture('pn_shadow', 180, 40); g.destroy(); }
  }
  private begin() {
    const s = this.st; popBanner(this, 'SHHH...', 700, 0x6b4cc9);
    this.time.delayedCall(600, () => { this.talk(360, 560, pick(LINES.start.Noir), 22); s.running = true; this.startRound(); });
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
  private boxAt(x: number, y: number) { if (y < RIM - 200 || y > BB + 70) return -1; const half = this.st.boxes === 3 ? 90 : 80; return this.boxes.findIndex(b => Math.abs(x - b.x) < half); }
  // ------------------------------------------------------------------ input
  tapAt(x: number, y: number) {
    const s = this.st; if (!s.running || s.over || !this.pup) return;
    if (s.phase === 'grab') { const tp = this.pup.tipPos(); if (Math.hypot(x - tp.x, y - tp.y) < 170 || Math.hypot(x - this.pup.root.x, y - (this.pup.root.y - 90)) < 140 || (y > 1090 && x > W / 2)) this.grab(); else this.ft(tp.x, tp.y - 60, 'tap the TAIL!', '#7dff9a', 30); return; }
    if (s.phase === 'tug') { this.tugTap(); return; }
    if (s.phase !== 'hunt') return;
    if (y > 1090) { if (x < W / 2) this.meow(); else this.pounce(); return; }
    // tapping Puppy's wiggling butt / the box he's in = POUNCE (big target)
    if (this.headIn && s.pbox >= 0 && Math.abs(x - this.bx(s.pbox)) < BOX_W / 2 + 20 && y > RIM - 230 && y < BB + 40) { this.pounce(); return; }
    const i = this.boxAt(x, y); if (i >= 0 && i !== s.noirBox) this.hopTo(i);
  }
  // ------------------------------------------------------------------ Noir moves
  /** hop (box to box, or from the floor/rim into box j). Exposed above the rims = he sees you if his eyes are open. */
  hopTo(j: number, auto = false) {
    const s = this.st; if (s.over || !this.rig || j < 0 || j >= this.boxes.length) return;
    if (!auto && (s.phase !== 'hunt' || s.nState !== 'in' || j === s.noirBox)) return;
    if (!auto && this.headIn && j === s.pbox) return this.pounce();
    const from = s.nState === 'in' ? s.noirBox : -1, x0 = this.rig.x, y0 = this.rig.y, x1 = this.bx(j), fromOut = s.nState !== 'in';
    const n = from >= 0 ? Math.abs(from - j) : Math.max(1, Math.round(Math.abs(x1 - x0) / 160));
    const dur = (K.HOP + K.HOP_PER * Math.max(0, n - 1)) * 1000, apex = RIM - 110 - Math.min(70, Math.abs(x1 - x0) * 0.12), cy = 2 * apex - (y0 + DUCK_Y) / 2;
    this.boxes.forEach(b => b.eyes.setVisible(false));
    s.nState = 'hop'; s.noirBox = j; s.lastHopAt = s.t; this.hideHint('sneak');
    this.rig.setFlip(x1 < x0).setMood('smug');
    this.rig.act([{ dur: 0.07, to: CROUCH }, { dur: dur / 2000, to: STRETCH }, { dur: dur / 2000, to: CROUCH }], false, 0.2);
    Fx.whoosh(); this.noirTween?.stop();
    this.noirTween = this.tweens.addCounter({ from: 0, to: 1, duration: dur, ease: 'Sine.InOut', onUpdate: (tw) => {
      const p = tw.getValue()!, y = (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * cy + p * p * DUCK_Y; this.rig.setPosition(Phaser.Math.Linear(x0, x1, p), y);
      const above = y < RIM + 6; this.rig.setDepth(above || (p < 0.5 && fromOut) ? 22 : 9); s.noirOut = y < RIM + 70 || (p < 0.5 && fromOut) ? 1 : 0; },
    onComplete: () => { s.nState = 'in'; s.noirOut = 0; this.rig.setDepth(9); this.boxes[j].c.setAngle(0); this.wobbleBox(j, 6); Fx.step(); } });
  }
  private wobbleBox(i: number, a = 5) { const b = this.boxes[i]; if (!b || this.flopBox === i) return; this.tweens.killTweensOf(b.c); b.c.setAngle(0).setScale(1);
    this.tweens.add({ targets: b.c, angle: { from: -a, to: a }, duration: 70, yoyo: true, repeat: 2, onComplete: () => b.c.setAngle(0) });
    this.tweens.add({ targets: [b.flapL, b.flapR], angle: { from: 0, to: -14 }, duration: 90, yoyo: true }); }
  // ------------------------------------------------------------------ MEOW
  meow() {
    const s = this.st; if (s.phase !== 'hunt' || s.nState !== 'in' || s.meowCd > 0) return;
    if (s.pup === 'count' || s.pup === 'dive' || s.pup === 'up' || s.pup === 'off' || s.pup === 'seq') { this.ft(190, 1060, 'not now!', '#ffffff', 28); return; }
    s.meowCd = K.MEOW_CD; s.meowRow++; this.hideHint('meow'); this.hints.add('meow');
    const nx = this.bx(s.noirBox); Fx.alert();
    if (s.meowRow > K.MEOW_ROW) { // he's wise to it: the meow came from HER box
      s.wise++; this.meowBubble(s.noirBox); this.pupTalk(pick(LINES.boxWise), 1200); this.lure(s.noirBox, K.SNIFF_NOIR[0]); return; }
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
    const s = this.st; if (s.phase !== 'hunt' || !this.rig) return; if (s.nState === 'hop' || s.nState === 'seq') return;
    this.hideHint('pounce');
    const target = this.headIn && s.pbox >= 0 && s.pbox !== s.noirBox ? s.pbox : -1;
    const x0 = this.rig.x, y0 = this.rig.y, tx = target >= 0 ? this.bx(target) : Phaser.Math.Clamp(this.pup.root.x - s.face * 90, 80, 640), ty = target >= 0 ? RIM + 4 : LANE;
    const dur = (K.LEAP + Math.abs(tx - x0) * K.LEAP_PX) * 1000, cy = 2 * (Math.min(y0, ty) - 170) - (y0 + ty) / 2;
    s.nState = 'hop'; s.phase = 'hunt'; s.noirOut = 1; this.boxes.forEach(b => b.eyes.setVisible(false));
    this.rig.setFlip(tx < x0).setMood('smug').act([{ dur: 0.08, to: CROUCH }, { dur: dur / 1000, to: STRETCH }], true);
    Fx.whoosh(); this.noirTween?.stop();
    this.noirTween = this.tweens.addCounter({ from: 0, to: 1, duration: dur, ease: 'Quad.In', onUpdate: (tw) => { const p = tw.getValue()!;
      this.rig.setPosition(Phaser.Math.Linear(x0, tx, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * cy + p * p * ty); this.rig.setDepth(p > 0.1 ? 22 : 9); },
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
    this.pup.setFrame('stand'); Fx.boing(); const found = i === s.noirBox;
    this.tweens.addCounter({ from: 0, to: 1, duration: 320, ease: 'Sine.InOut', onUpdate: (tw) => { const p = tw.getValue()!;
      this.pup.root.setPosition(Phaser.Math.Linear(x0, b, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (PUP_IN - 120) + p * p * PUP_IN).setAngle(180 * f * Phaser.Math.Easing.Sine.In(p));
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
      this.pup.root.setPosition(Phaser.Math.Linear(b, x1, p), (1 - p) * (1 - p) * PUP_IN + 2 * (1 - p) * p * (PUP_IN - 60) + p * p * LANE).setAngle(a0 * (1 - p));
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
        else { pr.y = LANE; this.setFace(-side); s.pup = 'sniff'; this.stateT = 0; this.sniffTxtT = 0; this.pup.setFrame('stand'); if (s.tgt === s.noirBox && !this.hints.has('sneak')) this.showHint('sneak'); }
        // feint (later rounds): halfway to the wrong box he changes his mind and heads for HERS
        if (s.boops >= K.FEINT_FROM && !s.dash && !s.feintDone && s.tgt !== s.noirBox && this.stateT > 0.35 && Math.abs(d) < 260 && Math.abs(d) > 120) {
          s.feintDone = 1; if (Math.random() < K.FEINT_P) { s.pup = 'feint'; this.stateT = 0; this.pup.setFrame('stand'); this.pupTalk(pick(LINES.boxFeint), 900); this.qPop(); } }
        break; }
      case 'feint': if (this.stateT > 0.35) { this.walkTo(s.noirBox, true); this.sniffLen = F(K.SNIFF_NOIR) * 0.75; } break;
      case 'sniff': {
        this.sniffTxtT -= dt; if (this.sniffTxtT <= 0) { this.sniffTxtT = 0.55; this.ft(pr.x + s.face * 40, pr.y - 230, pick(LINES.boxSniff), '#ffffff', 24); this.wobbleBox(s.tgt, 2); }
        if (this.stateT > this.sniffLen) { this.dive(s.tgt); this.hideHint('sneak'); } break; }
      case 'peek': {
        if (s.dc && this.stateT > this.nextCheck) { // double-check: a quick stiff tail, then he pops out to look round
          s.dc = 0; s.dcDone = 1; this.peekLeft -= this.stateT; s.pup = 'tell'; this.stateT = 0; this.tellLen = 0.22; this.dcTell = 1; this.qPop(); break; }
        if (this.stateT > this.peekLeft) { s.pup = 'tell'; this.stateT = 0; this.tellLen = K.TELL; this.dcTell = 0; this.qPop(); } break; }
      case 'tell': if (this.stateT > this.tellLen) { if (this.dcTell) { const box = s.pbox; this.pullOut(() => { s.pup = 'look'; this.stateT = 0; this.lookT = K.DC_T; this.lookFlipT = 0.2; this.dcBox = box; this.ft(pr.x, pr.y - 260, 'hmm?!', '#ffffff', 34); }, 0.22); }
        else this.afterPeek(); } break;
      case 'look': {
        this.lookFlipT -= dt; if (this.lookFlipT <= 0) { this.lookFlipT = 0.3; this.setFace(-s.face); }
        if (this.stateT > this.lookT) { if (this.dcBox >= 0) { const b = this.dcBox; this.dcBox = -1; if (b === s.noirBox) { this.walkTo(b); this.sniffLen = 0.25; } else { this.walkTo(b); this.sniffLen = 0.15; this.peekBack = 1; } } else this.walkTo(this.pickNext(-1)); } break; }
      case 'count': {
        const n = Math.min(3, Math.floor(this.stateT / (K.COUNT / 3)) + 1); if (n !== this.countN) { this.countN = n; this.ft(pr.x, pr.y - 250, n < 3 ? `${n}...` : '3!', '#ffffff', 46); Fx.step(); }
        if (this.stateT > K.COUNT) { this.pupTalkMaybe(['Puppy: Ready or not!'], 0.5); s.firstPick = 1; this.walkTo(this.pickNext(-1)); } break; }
    }
  }
  private tellLen = 0.4; private dcTell = 0; private dcBox = -1; private peekBack = 0;
  private qPop() { const pr = this.pup.root; this.q.setText('?').setVisible(true).setPosition(pr.x, Math.min(pr.y, PUP_IN) - 120).setScale(1.6); this.tweens.add({ targets: this.q, scale: 1, duration: 160, ease: 'Back.Out' }); Fx.alert(); }
  // ------------------------------------------------------------------ busts
  private foundYou(i: number) {
    const s = this.st; s.pbox = i; this.rig.setPosition(this.bx(i), PEEK_Y - 40); this.wobbleBox(i, 9); this.bang(this.bx(i), RIM - 160);
    this.pullOut(() => {}, 0.25); this.bust('found');
  }
  private bang(x: number, y: number) { const t = txt(this, x, y, '!', 120, '#ff3b3b', '#22252b', 12).setDepth(45).setScale(1.8); this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 250, onComplete: () => t.destroy() }); }
  /** busted: he saw her / found her / she whiffed. He covers his eyes and counts while Noir relocates (clock keeps running). */
  private bust(kind: 'seen' | 'found' | 'dodge' | 'early') {
    const s = this.st; if (s.phase !== 'hunt' || s.over) return; s.phase = 'bust'; s.busts++; s.streak = 0; this.hideHint('');
    Fx.save(); flashVignette(this, 0xff3b3b, 0.25); this.rig.setMood('dizzy');
    if (kind === 'seen') this.bang(this.rig.x, this.rig.y - 300);
    if (kind === 'early') { this.tweens.add({ targets: this.pup.root, y: LANE - 90, duration: 170, yoyo: true, ease: 'Quad.Out' }); }
    const line = kind === 'found' ? LINES.boxFound : kind === 'seen' ? LINES.boxBust : LINES.boxDodge;
    this.time.delayedCall(kind === 'found' ? 260 : 120, () => { if (!s.over) this.pupTalk(pick(line), 1100); });
    this.ft(360, 470, 'BUSTED!', '#ff8a8a', 50);
    this.time.delayedCall(kind === 'found' ? 1000 : 850, () => { if (s.over) return;
      const go = () => { s.phase = 'hunt'; s.pup = 'count'; this.stateT = 0; this.countN = 0; this.pup.setFrame('stand'); this.pup.root.setAngle(0).setY(LANE); this.setFace(this.pup.root.x < 360 ? -1 : 1);
        this.pupTalkMaybe(LINES.boxCount, 0.6); this.rig.setMood('smug');
        // Noir slips into another box while he counts (unless the player moves her first)
        const hopAt = s.t; this.time.delayedCall(450, () => { if (s.over || s.pup !== 'count' || s.lastHopAt > hopAt) return;
          const opts = this.boxes.map((_, i) => i).filter(i => i !== s.noirBox || s.nState !== 'in'); this.hopTo(Phaser.Utils.Array.GetRandom(opts), true); }); };
      if (s.pup === 'up' || s.pup === 'dive') this.time.delayedCall(300, go); else go(); });
  }
  // ------------------------------------------------------------------ BOO-X! -> GRAB -> TAP TAP -> FLOP -> waddle -> stamp
  private boox(i: number) {
    const s = this.st; s.phase = 'seq'; s.pup = 'seq'; s.nState = 'seq'; s.noirOut = 0; this.q.setVisible(false); this.hideHint('');
    const b = this.bx(i), first = !this.hints.has('grab'); s.score += 300;
    Fx.punch(); Fx.boing(); impact(this, b, RIM - 80, s.boops === 0 ? 'BOO-X!' : pick(['BOO-X!', 'BOO-X!', 'SURPRISE!', 'PEEKABOO-X!']), 300, '', true); flashVignette(this, 0xffffff, 0.35);
    this.rig.setMood('happy').act([{ dur: 0.1, to: { ls: -160, le: 20, rs: -160, re: 20, lean: 0, sq: 0.1, dy: -6 } }], true);
    this.wobbleBox(i, 10);
    // Puppy shoots out of the box and lands frozen on the floor, tail toward Noir
    this.away = b < 360 ? 1 : -1; const lx = Phaser.Math.Clamp(b + this.away * 175, 150, 570), a0 = this.pup.root.angle, x0 = this.pup.root.x;
    this.pup.setFrame('panic'); this.pup.wagAmp = 0; this.pup.tailStretch = 1.15;
    this.tweens.addCounter({ from: 0, to: 1, duration: 520, ease: 'Sine.Out', onUpdate: (tw) => { const p = tw.getValue()!;
      this.pup.root.setPosition(Phaser.Math.Linear(x0, lx, p), (1 - p) * (1 - p) * PUP_IN + 2 * (1 - p) * p * (PUP_IN - 300) + p * p * LANE).setAngle(a0 + (360 * this.away - a0) * p);
      this.pup.setDepth(p > 0.25 ? 20 : 10); this.pupShadow.setVisible(p > 0.8); },
    onComplete: () => { if (s.over) return; this.pup.root.setAngle(0); s.pbox = -1; this.setFace(this.away); this.ft(lx, LANE - 270, 'EEK!', '#ffffff', 44);
      // Noir hops down off the rim behind him
      const nx0 = this.rig.x, ny0 = this.rig.y, nx1 = Phaser.Math.Clamp(lx - this.away * 150, 70, 650);
      this.rig.setFlip(this.away < 0).act([{ dur: 0.12, to: CROUCH }, { dur: 0.2, to: { sq: 0, dy: 0 } }], false, 0.15);
      this.tweens.addCounter({ from: 0, to: 1, duration: 300, onUpdate: (tw) => { const p = tw.getValue()!; this.rig.setPosition(Phaser.Math.Linear(nx0, nx1, p), (1 - p) * (1 - p) * ny0 + 2 * (1 - p) * p * (RIM - 60) + p * p * LANE); },
        onComplete: () => { if (s.over) return; s.phase = 'grab'; s.grabT = K.GRAB_T; this.grabBox = i; if (first) this.showHint('grab'); else this.ft(360, 470, 'GRAB HIS TAIL!', '#7dff9a', 46); } });
    } });
  }
  private grabBox = 0;
  grab() {
    const s = this.st; if (s.phase !== 'grab') return; this.hideHint('grab'); s.phase = 'tug'; s.tug = K.TUG0; this.tugAge = 0; this.shoutT = 0.4;
    const tp = this.pup.tipPos(), nx1 = Phaser.Math.Clamp(tp.x - this.away * 60, 60, 660), nx0 = this.rig.x; Fx.block(); this.pup.tail.clearTint();
    this.tweens.addCounter({ from: 0, to: 1, duration: 140, onUpdate: (tw) => this.rig.setPosition(Phaser.Math.Linear(nx0, nx1, tw.getValue()!), LANE) });
    this.rig.act([{ dur: 0.12, to: { ls: -95, le: -10, rs: -100, re: -10, lh: -25, lk: 30, rh: 35, rk: -10, lean: -16, sq: 0, dy: 6, tilt: -8 } }], true);
    this.tugX = this.pup.root.x; comic(this, this.pup.root.x - this.away * 50, LANE - 140, 'GRAB!', 46).setDepth(70).setAngle(-6).setData('k', 1);
    this.time.delayedCall(10, () => { const t = this.children.list.find(o => (o as any).getData?.('k') === 1) as Phaser.GameObjects.Text | undefined; if (t) this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, delay: 380, duration: 250, onComplete: () => t.destroy() }); });
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
    const s = this.st; if (s.tug >= 0.995) { this.endTug(); this.flop(); return; }
    this.tugAge += dt; s.tug = Math.max(0, s.tug - K.TUG_DRAIN * dt);
    const pr = this.pup.root, pull = 1 - s.tug; pr.x = Phaser.Math.Clamp(this.tugX + this.away * (pull * 60 - 20), 60, 660); pr.y = LANE - Math.abs(Math.sin(this.tugAge * 18)) * 6;
    this.pup.setFrame('run' + (Math.floor(this.tugAge * 20) % 6)); this.pup.inner.setAngle(this.away * 10); this.pup.tailStretch = 1.2 + pull * 0.5;
    const paw = this.rig.point('rp'); this.pup.holdTo(paw.x, paw.y);
    this.rig.setPosition(Phaser.Math.Clamp(pr.x - this.away * 175, 50, 670), LANE);
    this.shoutT -= dt; if (this.shoutT <= 0) { this.shoutT = 0.9; this.ft(pr.x + this.away * 60, pr.y - 250, pick(LINES.boxPupTug), '#ffffff', 26); }
    // meter
    const g = this.meter.clear(), y = 470; g.fillStyle(0x22252b, 0.85).fillRoundedRect(110, y, 500, 46, 23).fillStyle(s.tug > 0.75 ? 0x7dff9a : 0xffdf6b, 1).fillRoundedRect(116, y + 6, 488 * s.tug, 34, 17).lineStyle(5, 0xffffff, 1).strokeRoundedRect(110, y, 500, 46, 23);
    if ((s.tug <= 0.02 && this.tugAge > 0.6) || this.tugAge > K.TUG_MAX) { this.endTug(); this.slip(); }
  }
  private slip() {
    const s = this.st; s.phase = 'seq'; s.slips++; s.streak = 0; Fx.save(); this.pup.tail.clearTint();
    this.rig.setMood('dizzy').act([{ dur: 0.15, to: { lean: -30, sq: -0.15, dy: 20 } }], false, 0.4);
    this.pupTalk(pick(LINES.boxSlip), 1000); this.pup.setFrame('panic'); this.pup.inner.setAngle(0);
    const x0 = this.pup.root.x, x1 = this.away > 0 ? W + 160 : -160;
    for (let i = 0; i < 5; i++) { const p = this.add.circle(x0 - this.away * i * 30, LANE, 14, 0xd9b080, 0.6).setDepth(19); this.tweens.add({ targets: p, x: p.x - this.away * 40, alpha: 0, scale: 2, delay: i * 50, duration: 400, onComplete: () => p.destroy() }); }
    this.tweens.addCounter({ from: 0, to: 1, duration: 650, ease: 'Quad.In', onUpdate: (tw) => { const p = tw.getValue()!; this.pup.root.x = Phaser.Math.Linear(x0, x1, p); this.pup.setFrame('run' + (Math.floor(p * 30) % 6)); },
      onComplete: () => this.startRound(false) });
  }
  private flop() {
    const s = this.st; s.phase = 'seq'; s.boops++; s.streak++; s.meowRow = 0; const bonus = s.streak > 1 ? 200 * (s.streak - 1) : 0, pts = 500 + bonus + (s.busts === 0 ? 200 : 0); s.score += pts;
    const i = this.grabBox, box = this.boxes[i], pr = this.pup.root, L = Phaser.Math.Clamp(pr.x - this.away * 70, 140, 580); this.flopBox = i;
    this.rig.setMood('happy').act([{ dur: 0.1, to: { ls: -40, le: -40, rs: -30, re: -40, lean: -30, dy: 10 } }, { dur: 0.3, to: { lean: 6 } }], false, 0.3);
    Fx.special(); this.ft(360, 470, pick(LINES.boxBoop), '#7dff9a', 42); floatText(this, 250, 420, `+${pts}${bonus ? ` x${s.streak} STREAK` : ''}`, '#7dff9a', 38);
    this.pup.setFrame('panic'); this.pup.inner.setAngle(0); const px0 = pr.x;
    this.tweens.addCounter({ from: 0, to: 1, duration: 620, ease: 'Sine.InOut', onUpdate: (tw) => { const p = tw.getValue()!; pr.setPosition(Phaser.Math.Linear(px0, L, p), LANE - Math.sin(p * Math.PI) * 330).setAngle(-360 * this.away * p); } });
    // the box hops off its spot, flips over in the air and FLOPS down over him
    this.tweens.killTweensOf(box.c); box.back.setVisible(false); box.flapL.setVisible(false); box.flapR.setVisible(false); box.eyes.setVisible(false); box.shadow.setVisible(false); box.c.setDepth(24);
    const bx0 = box.x, yEnd = BB - 52 - BOX_H; // raised: his legs + tail poke out underneath
    this.tweens.addCounter({ from: 0, to: 1, duration: 620, ease: 'Sine.InOut', onUpdate: (tw) => { const p = tw.getValue()!;
      box.c.setPosition(Phaser.Math.Linear(bx0, L, p), (1 - p) * (1 - p) * BB + 2 * (1 - p) * p * (BB - 520) + p * p * yEnd).setAngle(180 * p); },
    onComplete: () => { if (s.over) return; pr.setAngle(0).setPosition(L, LANE); this.pup.setDepth(23); this.pup.setFrame('run0'); this.pupShadow.setVisible(true);
      Fx.kick(); this.cameras.main.shake(160, 0.012); comic(this, L, LANE - 260, 'FLOP!', 64).setDepth(75).setAngle(-8);
      this.time.delayedCall(10, () => this.fadeLastComic());
      for (let k = 0; k < 8; k++) { const d = this.add.circle(L + Phaser.Math.Between(-80, 80), LANE, 12, 0xd9b080, 0.7).setDepth(25); this.tweens.add({ targets: d, y: LANE - 40, x: d.x + Phaser.Math.Between(-40, 40), alpha: 0, scale: 2, duration: 450, onComplete: () => d.destroy() }); }
      const final = s.boops >= K.NEED;
      this.wad = { on: 1, x: L, dir: L < 360 ? -1 : 1, bonks: 0, t: 0, final: final ? 1 : 0 };
      this.time.delayedCall(350, () => { if (!s.over) this.pupTalk(pick(LINES.boxBlind), 1200); });
      // Noir perches on another box to watch (sits on the rim, grooming)
      if (!final) this.perch(); } });
  }
  private fadeLastComic() { const t = [...this.children.list].reverse().find(o => o instanceof Phaser.GameObjects.Text && (o as any).depth === 75) as Phaser.GameObjects.Text | undefined;
    if (t) this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, delay: 450, duration: 250, onComplete: () => t.destroy() }); }
  private perch() {
    const opts = this.boxes.map((_, i) => i).filter(i => i !== this.flopBox), j = opts.sort((a, b) => Math.abs(this.bx(a) - 360) - Math.abs(this.bx(b) - 360))[0];
    const x0 = this.rig.x, y0 = this.rig.y, x1 = this.bx(j), y1 = RIM + 6; this.rig.setFlip(x1 < x0).act([{ dur: 0.08, to: CROUCH }, { dur: 0.2, to: STRETCH }, { dur: 0.15, to: CROUCH }], false, 0.2);
    this.tweens.addCounter({ from: 0, to: 1, duration: 420, onUpdate: (tw) => { const p = tw.getValue()!; this.rig.setPosition(Phaser.Math.Linear(x0, x1, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (RIM - 200) + p * p * y1).setDepth(22); },
      onComplete: () => { this.perchBox = j; this.groom(); } });
  }
  private perchBox = -1;
  private groom() { if (this.st.over) return; this.rig.setMood('smug').act([{ dur: 0.25, to: { rs: -150, re: -100, tilt: 10, lean: -4 } }, { dur: 0.2, to: { rs: -140, re: -120, tilt: 14 } }, { dur: 0.2, to: { rs: -150, re: -100, tilt: 10 } }], false, 0.3); }
  private wadTick(dt: number) {
    const w = this.wad, s = this.st, box = this.boxes[this.flopBox], pr = this.pup.root; if (!w.on || !box) return; w.t += dt;
    const target = w.final && w.bonks >= 1 ? 360 : w.dir < 0 ? 95 : 625;
    w.x += w.dir * K.WAD * (w.final && w.bonks >= 1 ? 0.6 : 1) * dt;
    this.setFace(w.dir); this.pup.update(dt, 1.4, 1); pr.x = w.x; pr.y = LANE;
    box.c.setPosition(w.x + Math.sin(w.t * 20) * 3, BB - 52 - BOX_H - Math.abs(Math.sin(w.t * 12)) * 6).setAngle(180 + Math.sin(w.t * 12) * 5);
    if (w.final && w.bonks >= 1 && (w.dir > 0 ? w.x >= target : w.x <= target)) { w.on = 0; this.parcelOutro(); return; }
    if (!(w.final && w.bonks >= 1) && (w.dir > 0 ? w.x >= target : w.x <= target)) { // BONK into the wall
      w.bonks++; w.dir = -w.dir; w.x = target; Fx.ouch(); this.cameras.main.shake(140, 0.01);
      const bxw = target + (w.dir > 0 ? -75 : 75); comic(this, Phaser.Math.Clamp(bxw, 120, 600), BB - 230, 'BONK!', 54).setDepth(75).setAngle(Phaser.Math.Between(-10, 10)); this.time.delayedCall(10, () => this.fadeLastComic());
      for (let k = 0; k < 3; k++) { const st = txt(this, bxw, BB - 200, '★', 34, '#ffdf6b', '#22252b', 4).setDepth(45); this.tweens.add({ targets: st, x: bxw + w.dir * (30 + k * 30), y: BB - 260 - k * 20, alpha: 0, duration: 650, onComplete: () => st.destroy() }); }
      if (w.final) { w.dir = 360 > w.x ? 1 : -1; this.time.delayedCall(200, () => this.pupTalk(pick(LINES.boxBlind), 1000)); }
      else if (w.bonks >= 2 || w.t > 3.2) { w.on = 0; this.popOut(); }
    }
    void s;
  }
  private popOut() {
    const s = this.st, i = this.flopBox, box = this.boxes[i], pr = this.pup.root; Fx.boing(); this.ft(pr.x, LANE - 280, 'POP!', '#ffffff', 50);
    const x0 = box.c.x, y0 = box.c.y, slot = (s.boxes === 3 ? XS3 : XS4)[i];
    this.tweens.addCounter({ from: 0, to: 1, duration: 650, ease: 'Sine.InOut', onUpdate: (tw) => { const p = tw.getValue()!;
      box.c.setPosition(Phaser.Math.Linear(x0, slot, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (BB - 560) + p * p * BB).setAngle(180 + 180 * p); },
    onComplete: () => { placeBox(box, slot, BB); box.c.setDepth(14).setAngle(0); box.back.setVisible(true); box.flapL.setVisible(true); box.flapR.setVisible(true); box.shadow.setVisible(true); this.flopBox = -1; this.wobbleBox(i, 6); Fx.kick(); } });
    // Puppy: dizzy, postage stamp stuck on his nose
    this.pup.setDepth(20).setFrame('dizzy'); this.setFace(pr.x < 360 ? 1 : -1); this.stampOn();
    this.time.delayedCall(300, () => { if (!s.over) this.pupTalk(pick(LINES.boxStamp), 1300); });
    this.time.delayedCall(1500, () => { if (s.over) return; this.peelStamp();
      this.time.delayedCall(450, () => { if (s.over) return; const x1 = pr.x < 360 ? -170 : W + 170, xa = pr.x; this.setFace(Math.sign(x1 - xa));
        this.tweens.addCounter({ from: 0, to: 1, duration: 700, ease: 'Quad.In', onUpdate: (tw) => { const p = tw.getValue()!; pr.x = Phaser.Math.Linear(xa, x1, p); this.pup.setFrame('run' + (Math.floor(p * 26) % 6)); pr.y = LANE - Math.abs(Math.sin(p * 26 / 6 * Math.PI * 2)) * 5; },
          onComplete: () => this.startRound(true) }); }); });
  }
  private stampOn() {
    this.stamp?.destroy(); const st = this.stamp = this.add.image(4, -124 * 0.78 * PUP_M + 26, 'bb_stamp').setScale(0.1).setAngle(-12); this.pup.inner.add(st);
    this.tweens.add({ targets: st, scale: 0.55, duration: 220, ease: 'Back.Out' }); sparks(this, this.pup.root.x, this.pup.root.y - 100, 8);
  }
  private peelStamp() { const st = this.stamp; if (!st) return; this.stamp = undefined; const m = st.getWorldTransformMatrix(), x = m.tx, y = m.ty; st.destroy();
    const f = this.add.image(x, y, 'bb_stamp').setScale(0.55).setAngle(-12).setDepth(60); this.ft(x, y - 50, 'peel!', '#ffffff', 28); Fx.whoosh();
    this.tweens.add({ targets: f, y: LANE + 10, x: x + Phaser.Math.Between(-60, 60), angle: 200, duration: 900, ease: 'Sine.In' }); this.tweens.add({ targets: f, alpha: 0, delay: 700, duration: 300, onComplete: () => f.destroy() }); }
  /** last boop: he waddles to the middle, sits down, the box becomes a parcel, Noir hops on top, RETURN TO SENDER */
  private parcelOutro() {
    const s = this.st, i = this.flopBox, box = this.boxes[i]; s.phase = 'end'; Fx.kick();
    // clear the stage: the other boxes scoot off, the buttons fade (it's the curtain call)
    this.boxes.forEach((b, j) => { if (j === i) return; const d = (b.x < 360 ? -1 : 1) * 520; b.eyes.setVisible(false);
      this.tweens.add({ targets: [b.c, b.back, b.shadow], x: `+=${d}`, duration: 520, delay: 60 * j, ease: 'Back.In' }); });
    this.tweens.add({ targets: [this.mb, this.pbtn], alpha: 0, duration: 300 });
    this.tweens.add({ targets: box.c, y: BB - BOX_H, duration: 180, ease: 'Quad.In', onComplete: () => {
      box.c.setVisible(false); this.pup.root.setVisible(false); const { c, face } = makeParcel(this, 360, BB, 24); c.setScale(1.06, 0.94); this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 200, ease: 'Back.Out' });
      this.tweens.add({ targets: face, x: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      // Noir hops up and SITS on top, legs dangling over the front, then grooms smugly
      const x0 = this.rig.x, y0 = this.rig.y, y1 = BB - BOX_H - 22 + 46 * NOIR_M; this.rig.setFlip(x0 > 360).act([{ dur: 0.08, to: CROUCH }, { dur: 0.22, to: STRETCH }, { dur: 0.16, to: SIT }], true);
      this.tweens.addCounter({ from: 0, to: 1, duration: 460, onUpdate: (tw) => { const p = tw.getValue()!; this.rig.setPosition(Phaser.Math.Linear(x0, 360, p), (1 - p) * (1 - p) * y0 + 2 * (1 - p) * p * (y1 - 240) + p * p * y1).setDepth(26); },
        onComplete: () => { this.rig.setMood('smug'); Fx.block(); this.sitGroom();
          this.time.delayedCall(350, () => { const m = makeReturnMark(this, 372, BB - 30).setDepth(27).setScale(3).setAngle(-10).setAlpha(0);
            this.tweens.add({ targets: m, scale: 0.55, alpha: 1, duration: 200, ease: 'Quad.In', onComplete: () => { Fx.punch(); this.cameras.main.shake(200, 0.015); sparks(this, 372, BB - 30, 14); } }); });
          this.time.delayedCall(800, () => this.talk(360, 600, pick(LINES.boxWin), 24, 1800));
          this.time.delayedCall(1700, () => this.talk(360, 1150, pick(LINES.boxWinPup), 22, 1500));
          this.time.delayedCall(2900, () => this.finish(true)); } });
    } });
  }
  /** seated grooming loop (held pose, so she never pops back to standing on top of the parcel) */
  private sitGroom() { if (this.st.over && this.st.phase !== 'end') return;
    const lick = { ...SIT, rs: -150, re: -110, tilt: 12, lean: -2 };
    this.rig.act([{ dur: 0.25, to: lick }, { dur: 0.18, to: { ...lick, re: -125, tilt: 15 } }, { dur: 0.18, to: lick }, { dur: 0.18, to: { ...lick, re: -125, tilt: 15 } }, { dur: 0.3, to: SIT }], true); }

  // ------------------------------------------------------------------ rounds
  private startRound(afterBoop = true) {
    const s = this.st; if (s.over) return; s.phase = 'reset'; s.pup = 'off'; s.firstPick = 1; s.dcDone = 0; s.feintDone = 0; s.pbox = -1; s.dash = 0; this.clockOn = !afterBoop;
    this.pup.root.setVisible(false).setAngle(0); this.pup.inner.setAngle(0); this.pup.wagAmp = 22; this.pup.tailStretch = 1; this.pup.letGo(); this.pupShadow.setVisible(true);
    let delay = 0;
    if (s.boops >= K.FOUR_AT && s.boxes === 3) { s.boxes = 4; delay = 700; popBanner(this, 'MORE BOXES!', 600, 0x2fa0bf, 800);
      this.boxes.forEach((b, i) => { const x0 = b.x, x1 = XS4[i]; placeBox(b, x0, BB); this.tweens.addCounter({ from: 0, to: 1, duration: 420, onUpdate: (tw) => { const p = tw.getValue()!; placeBox(b, Phaser.Math.Linear(x0, x1, p), BB); b.c.y = BB - Math.sin(p * Math.PI) * 60; } }); });
      const nb = makeBox(this, XS4[3], BB); nb.c.y = BB - 700; this.boxes.push(nb); this.tweens.add({ targets: nb.c, y: BB, duration: 500, delay: 200, ease: 'Bounce.Out' }); }
    else if (s.boops === K.FEINT_FROM && afterBoop) { popBanner(this, 'PUPPY IS GETTING SNEAKY!', 600, 0xbf6a2f, 900); delay = 300; }
    else if (s.boops === K.NEED - 1 && afterBoop) { popBanner(this, 'LAST ONE!', 600, 0xff5c8a, 800); delay = 300; }
    this.time.delayedCall(delay, () => { if (s.over) return;
      // Noir slips back into a box (not the one nearest the door he'll walk in from)
      const side = Math.random() < 0.5 ? 1 : -1, n = this.boxes.length, opts = [...Array(n).keys()].filter(i => side > 0 ? i < n - 1 : i > 0), j = Phaser.Utils.Array.GetRandom(opts);
      s.nState = 'out'; this.hopTo(j, true);
      this.time.delayedCall(K.HOP * 1000 + 250, () => { if (s.over) return; s.phase = 'hunt'; this.clockOn = true;
        const pr = this.pup.root; pr.setPosition(side > 0 ? W + 110 : -110, LANE).setVisible(true); this.pup.setDepth(20).setFrame('run0');
        this.walkTo(this.pickNext(-1)); s.meowCd = Math.min(s.meowCd, 0.4);
        if (!this.hints.has('meow')) this.time.delayedCall(700, () => { if (!s.over && s.phase === 'hunt' && s.pup === 'walk') this.showHint('meow'); });
        if (Math.random() < 0.5 && s.boops > 0) this.talk(this.rig.x, 560, pick(LINES.boxNoir), 22, 1300); });
    });
  }
  private clockOn = false;
  // ------------------------------------------------------------------ first-occurrence hints (STEP prompts + tapping hand + slow-mo)
  private showHint(k: string) {
    if (this.hints.has(k) || this.st.over) return; this.hideHint(''); this.hints.add(k); this.st.hint = k;
    const c = this.hintC = this.add.container(0, 0).setDepth(805); let hx = 0, hy = 0, msg = '', ty = 640, slow = 1;
    const s = this.st;
    if (k === 'meow') { hx = 190; hy = 1165; msg = 'Tap MEOW? to fool him\ninto the WRONG box!'; ty = 560; slow = 0.5; }
    if (k === 'sneak') { const others = this.boxes.map((_, i) => i).filter(i => i !== s.noirBox && i !== s.tgt); const o = others.length ? others[0] : 0; hx = this.bx(o); hy = RIM + 60; msg = 'He is sniffing YOUR box!\nTap another box to sneak away'; ty = 620; slow = 0.35; }
    if (k === 'pounce') { hx = this.bx(s.pbox); hy = RIM - 40; msg = 'His head is in a box!\nTap him or POUNCE!'; ty = 620; slow = 0.35; }
    if (k === 'grab') { const tp = this.pup.tipPos(); hx = tp.x; hy = tp.y; msg = 'TAP his tail\nto GRAB it!'; ty = 620; slow = 0.35; }
    if (k === 'tug') { hx = 620; hy = 690; msg = ''; slow = 1; }
    const lab = txt(this, 360, ty - 75, k === 'tug' ? 'STEP 2' : k === 'grab' ? 'STEP 1' : 'TIP', 30, '#fff27a', '#22252b', 7);
    if (msg) { const t = comic(this, 360, ty, msg, 46).setAngle(-3).setScale(0.3); t.setAlign('center'); c.add([lab, t]); this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' }); }
    else c.add(lab.setPosition(360, 615));
    const hand = this.tapHand(hx, hy, k === 'tug' ? 150 : 520); c.add(hand); c.setData('hand', hand); s.slow = slow;
    if (k === 'meow') this.time.delayedCall(4500, () => this.hideHint('meow'));
  }
  private hideHint(k: string) { const c = this.hintC; if (!c || (k && this.st.hint !== k)) return; this.hintC = undefined; this.st.hint = ''; this.st.slow = 1;
    const hand = c.getData('hand') as Phaser.GameObjects.Container; if (hand) { this.tweens.killTweensOf(hand.list); } this.tweens.killTweensOf(c.list); c.destroy(); }
  private tapHand(x: number, y: number, ms: number) {
    const c = this.add.container(x, y), g = this.add.graphics(), k = 0x22252b;
    g.fillStyle(0xffffff, 1).lineStyle(5, k, 1);
    g.fillRoundedRect(-13, 0, 26, 74, 13).strokeRoundedRect(-13, 0, 26, 74, 13); g.fillRoundedRect(-34, 52, 74, 76, 26).strokeRoundedRect(-34, 52, 74, 76, 26);
    g.fillRoundedRect(-50, 66, 30, 44, 14).strokeRoundedRect(-50, 66, 30, 44, 14); g.lineStyle(4, k, 0.6).lineBetween(-8, 82, -8, 100).lineBetween(10, 80, 10, 100).lineBetween(26, 80, 26, 98);
    const ring = this.add.circle(0, 0, 18).setStrokeStyle(6, 0xfff27a); c.add([ring, g]);
    this.tweens.add({ targets: g, y: 16, scale: 0.94, duration: ms * 0.45, yoyo: true, repeat: -1, ease: 'Sine.InOut', onYoyo: () => { ring.setScale(0.6).setAlpha(1); this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: ms * 1.6 }); } });
    return c;
  }
  // ------------------------------------------------------------------ frame
  update(_t: number, dms: number) {
    const s = this.st, dt = Math.min(dms, 50) / 1000; s.t += dt; this.draw(dt);
    if (!s.running || s.over || !this.pup) return;
    const clock = s.phase === 'hunt' || s.phase === 'bust' || (s.phase === 'reset' && this.clockOn);
    if (clock) { s.time -= dt; if (s.time <= 0) { s.time = 0; this.finish(false); return; } }
    this.hud.set(`BOOPS ${s.boops}/${K.NEED}`, s.time, s.boops / K.NEED);
    s.meowCd = Math.max(0, s.meowCd - dt);
    if (s.phase === 'hunt' || s.phase === 'bust') {
      const adt = dt * s.slow; if (s.phase === 'hunt') this.pupAI(adt); else this.stateT += adt;
      if (this.peekBack && s.pup === 'peek') { this.peekBack = 0; }
      s.sees = this.eyesOpen() ? 1 : 0;
      if (s.phase === 'hunt' && s.noirOut && s.sees) this.bust('seen');
    }
    if (s.phase === 'grab') { s.grabT -= dt * s.slow; const tp = this.pup.tipPos(); this.pup.root.x += Math.sin(s.t * 60) * 0.8;
      if (this.hintC && s.hint === 'grab') (this.hintC.getData('hand') as Phaser.GameObjects.Container).setPosition(tp.x, tp.y);
      if (s.grabT <= 0) { this.hideHint(''); this.slip(); } }
    if (s.phase === 'tug') this.tugTick(dt);
    if (this.wad.on) this.wadTick(dt);
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
    } else if (s.phase === 'grab') { this.pup.update(dt, 0, 0); this.pup.tail.setTint(Math.sin(s.t * 14) > 0 ? 0x7dff9a : 0xffffff); }
    else if (s.phase === 'tug') { /* tugTick drives the frames */ this.pup.update(dt, 0, 0); const paw = this.rig.point('rp'); this.pup.holdTo(paw.x, paw.y); }
    else if (!this.wad.on) this.pup.update(dt, 0, 1);
    if (this.q.visible) { const pr = this.pup.root; this.q.setPosition(pr.x, Math.min(pr.y, PUP_IN) - 130); if (p !== 'tell' && p !== 'feint') this.q.setVisible(false); }
    // eye badge
    const show = (s.phase === 'hunt') && this.pup.root.visible && p !== 'off';
    this.badge.setVisible(show);
    if (show) { const open = this.eyesOpen(), pr = this.pup.root, by = (p === 'peek' || p === 'tell' || p === 'dive') ? RIM - 140 : pr.y - 255; // peek badge nudged down 35 px (was RIM-175): clear of the TIP text, still above his tail
      this.badge.setPosition(Phaser.Math.Clamp(pr.x, 60, 660), by); this.badgeEye.setTexture(open ? 'pn_eye' : 'pn_eyez');
      this.badgeRing.clear().fillStyle(0xffffff, 1).fillCircle(0, 0, 34).lineStyle(6, open ? 0xff3b3b : 0x2fbf5a, 1).strokeCircle(0, 0, 34); }
    // status pill (what you may do right now)
    let msg = '', col = '#ffffff';
    if (s.phase === 'hunt' && p !== 'off') {
      if (this.headIn && s.pbox !== s.noirBox) { msg = 'HEAD IN A BOX: POUNCE!'; col = '#7dff9a'; }
      else if (p === 'count') { msg = 'He is counting: sneak to a box!'; col = '#7dff9a'; }
      else if (this.eyesOpen()) { msg = 'He can SEE: stay hidden!'; col = '#ff8a8a'; }
      else { msg = 'Eyes busy: you can sneak'; col = '#bfe8ff'; }
    } else if (s.phase === 'grab') { msg = 'GRAB HIS TAIL!'; col = '#7dff9a'; } else if (s.phase === 'tug') { msg = 'TAP TAP TAP!'; col = '#ffdf6b'; }
    if (this.pill.text !== msg) this.pill.setText(msg); this.pill.setColor(col);
    // buttons
    const live = s.phase === 'hunt' && p !== 'off', canM = live && s.meowCd <= 0 && s.nState === 'in' && p !== 'count' && p !== 'dive' && p !== 'up',
      win = live && this.headIn && s.pbox !== s.noirBox && s.nState === 'in';
    const key = `${s.phase}|${canM}|${win}|${Math.ceil(s.meowCd * 2)}`;
    if (key !== this.btnKey) { this.btnKey = key;
      const paint = (gr: Phaser.GameObjects.Graphics, col: number, on: boolean) => { gr.clear().fillStyle(0x000000, 0.35).fillRoundedRect(-150, -60, 300, 130, 28).fillStyle(on ? col : 0x5a5a6a, 1).lineStyle(6, 0x22252b, 1).fillRoundedRect(-150, -70, 300, 130, 28).strokeRoundedRect(-150, -70, 300, 130, 28);
        if (on) gr.fillStyle(0xffffff, 0.25).fillRoundedRect(-138, -62, 276, 34, 16); };
      if (s.phase === 'grab') { paint(this.mbG, 0x5a5a6a, false); paint(this.pbG, 0x2fbf5a, true); this.mbT.setText('MEOW?'); this.pbT.setText('GRAB!'); }
      else if (s.phase === 'tug') { paint(this.mbG, 0xffb02e, true); paint(this.pbG, 0xffb02e, true); this.mbT.setText('TAP!'); this.pbT.setText('TAP!'); }
      else { paint(this.mbG, 0x6b4cc9, canM); paint(this.pbG, win ? 0x2fbf5a : 0xff5c8a, live && s.nState === 'in'); this.mbT.setText(canM || !live ? 'MEOW?' : s.meowCd > 0 ? `MEOW ${s.meowCd.toFixed(0) === '0' ? '1' : Math.ceil(s.meowCd)}` : 'MEOW?'); this.pbT.setText(win ? 'POUNCE NOW!' : 'POUNCE!'); this.pbT.setFontSize(win ? 36 : 42); }
    }
    this.pbtn.setScale(win || s.phase === 'grab' ? 1 + Math.sin(s.t * 12) * 0.04 : 1); this.mb.setScale(s.phase === 'tug' ? 1 + Math.sin(s.t * 16) * 0.03 : 1);
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; s.phase = 'end'; (window as any).__pr.ended = win ? 'win' : 'lose'; this.hideHint(''); this.endTugSafe();
    if (!win && this.pup) { this.pup.root.setVisible(true).setAngle(0); this.pup.setDepth(20).setFrame('stand'); this.tweens.add({ targets: this.pup.root, y: LANE - 50, duration: 180, yoyo: true, repeat: 3, ease: 'Quad.Out' });
      this.talk(360, 770, pick(LINES.boxLose), 22, 1400); }
    popBanner(this, win ? 'RETURN TO SENDER!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Noir', 5, win, s.score + Math.round(s.time) * 20, `${s.boops} boops • ${s.busts} busts`));
  }
  private endTugSafe() { if (this.tapTxt) { this.tapTxt.destroy(); this.tapTxt = undefined; } this.meter?.clear(); }
}
