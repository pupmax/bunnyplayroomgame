// Ruby BOXING — PUNCHING-BAG edition. You are Ruby (over-the-shoulder). Puppy is comically stuffed inside a big red
// heavy bag (head, paws, tail and dangling legs poking out — pure slapstick, nothing tying him) that swings like a pendulum.
// PUNCH when the swing marker is in the GREEN zone (timing ring closes on the bag; dead-centre = PERFECT).
// At a swing extreme the bag may come back AT Ruby ("DUCK!", shrinking red ring): DODGE the safe way -> the bag
// wobbles OPEN for free hits; a counter-punch right at the end of the ring = COUNTER. Get bonked = Ruby goes DIZZY.
// 3 ROUNDS (swing speeds up, more swing-backs, shorter tells), combos, SUPER SWING meter, KO ending.
// Tuned with pups3-out/bag/sim.mjs (same constants): avg bot ~66% wins.
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera, worldPoint, RES, LOWQ, LOWQ_PINNED, rememberLowQ, clearLowQ } from '../systems/resolution';
import { art } from '../art/registry';
import { makeMuteButton, pointerInMute } from '../systems/ui';
import { BoxerArms, ArmPose } from '../systems/boxerRig';
import { makePauseButton, pointerInPause, setPageBg, lastWord, sparks, comic, flashVignette } from '../systems/kit';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';

const RP: Record<string, ArmPose> = { cock: { ex: 230, ey: -190, wx: 200, wy: -270, gs: 1.1 }, idle: { ex: 200, ey: -230, wx: 160, wy: -330, gs: 1 },
  jab: { ex: 90, ey: -380, wx: 20, wy: -560, gs: 0.72 }, dizzy: { ex: 210, ey: -150, wx: 270, wy: -220, gs: 0.95 },
  guard: { ex: 160, ey: -260, wx: 45, wy: -390, gs: 0.95 }, cheer: { ex: 225, ey: -360, wx: 215, wy: -505, gs: 0.92 } }; // dodge tuck, points-win arms up
const TIME = 60, PUP_HP = 1250, RUBY_HP = 100, GREEN = 0.32, PERF = 0.08, HIT = 16, PERF_BONUS = 8, COMBO_MAX = 4, COUNTER = 18, SUPER_DMG = 45, // Marc fb 27 Oct: hits 10->16, perfect +6->+8, counter +12->+18, super 24->45 (KO by R2-3)
  PERIOD = [1.7, 1.45, 1.2], ATK_P = [0.3, 0.42, 0.45], WIND = [1.2, 1.15, 1.05], OPEN_T = 1.7, BONK = 15, DIZZY = 1.2, COOL_HIT = 0.22, COOL_MISS = 0.45, PTS = 0.40, // time-up win: bag at 40% or less
  // counter-swing variety (per round): feint chance, double-swing chance after a dodge, mid-swing snap-back chance; dodge only counts in the last DODGE_WIN s
  FEINT_P = [0.05, 0.2, 0.25], DOUBLE_P = [0.05, 0.3, 0.4], SNAP_P = [0.05, 0.12, 0.18], DODGE_WIN = 0.75, DODGE_CD = 0.75, EARLY_CD = 0.2, WIND_MIN = 0.62;
  //  AND a smaller share left than Ruby's
const ANG = 15, PIVX = 360, PIVY = -40, LEN = 440, INK = '#2a1a14';
type PState = 'guard' | 'windup' | 'punch' | 'open' | 'stun' | 'ko';
const PUP_SAYS = LINES.boxingPup as Record<'hit' | 'perfect' | 'incoming' | 'bonk' | 'open' | 'whiff', string[]>; // lines live in src/lines.ts (EDIT ME)
const RUBY_SAY = { x: 190, y: 800 }; // Ruby's own bubbles sit by her, bottom-left

export class BoxingScene extends Phaser.Scene {
  private ruby!: Phaser.GameObjects.Container; private rArms!: BoxerArms; private rBody!: Phaser.GameObjects.Image; private rBase = 1; private pawT = 0;
  private rig!: Phaser.GameObjects.Container; private bagC!: Phaser.GameObjects.Container; private chainG!: Phaser.GameObjects.Graphics;
  private pupImg!: Phaser.GameObjects.Image; private legsG!: Phaser.GameObjects.Graphics; private topG!: Phaser.GameObjects.Graphics; private pupBase = 1;
  private angV = 0; private extSide = 0; private faceLock = 0; private motionG!: Phaser.GameObjects.Graphics; private armsOut = 0;
  private legs = [{ a: 0, v: 0 }, { a: 0, v: 0 }]; private tail = { a: 0, v: 0 }; private lastAng = 0; private spinPh = 0; private squish = 0;
  private hb!: Phaser.GameObjects.Container; private bars!: Phaser.GameObjects.Graphics; private ringG!: Phaser.GameObjects.Graphics;
  private hitsT!: Phaser.GameObjects.Text; private timerT!: Phaser.GameObjects.Text; private roundT!: Phaser.GameObjects.Text; private comboT!: Phaser.GameObjects.Text;
  private duckT!: Phaser.GameObjects.Container; private dizzyR!: Phaser.GameObjects.Container; private dizzyT!: Phaser.GameObjects.Text; private pupStars!: Phaser.GameObjects.Container;
  st = { pupHp: PUP_HP, rubyHp: RUBY_HP, time: TIME, meter: 0, combo: 0, score: 0, state: 'guard' as PState, side: 1, running: false, dodge: 0, hits: 0, landed: 0, dodgeDir: 0, cool: 0,
    round: 1, x: 0, ph: 0, dizzy: 0, perfects: 0, counters: 0, bonks: 0, atk: 0, feints: 0, doubles: 0, snaps: 0 };
  private stT = 0; private lastExt = -9; private crowd: Phaser.GameObjects.Container[] = []; private ropeWob = 0; private stage!: Phaser.GameObjects.Graphics;
  private bulbs: { x: number; y: number; t: number }[] = []; private hitStop = 0; private ang = 0; private depthK = 1; private koMode = false; private exts = 0; private lastAtk = 0; private timerCol = ''; private lowQ = false; private perfAcc = 0; private perfN = 0; private perfT = 0; private goodWins = 0; private hudStatic?: Phaser.GameObjects.Image; private chainTS?: Phaser.GameObjects.TileSprite; private chainLen = -1; private windT = 1; private feint = false; private spd = 1; private snapArmed = true; private dcd = 0; private followUp = false; private plainAtk = false;
  constructor() { super('Boxing'); }
  create() {
    this.begun = false; this.lastTalk = -9999; this.ghostHp = PUP_HP; this.chipT = 0; this.barFlash = 0;
    setupCamera(this); this.cameras.main.fadeIn(250);
    this.st = { pupHp: PUP_HP, rubyHp: RUBY_HP, time: TIME, meter: 0, combo: 0, score: 0, state: 'guard', side: 1, running: false, dodge: 0, hits: 0, landed: 0, dodgeDir: 0, cool: 0, round: 1, x: 0, ph: 0, dizzy: 0, perfects: 0, counters: 0, bonks: 0, atk: 0, feints: 0, doubles: 0, snaps: 0 };
    this.stT = 0; this.lastExt = -9; this.crowd = []; this.ropeWob = 0; this.bulbs = []; this.hitStop = 0; this.tweens.timeScale = 1; this.koMode = false; this.spinPh = 0; this.squish = 0; this.exts = 0; this.lastAtk = 0; this.timerCol = ''; this.chainLen = -1; this.lowQ = LOWQ; this.perfAcc = 0; this.perfN = 0; this.perfT = 0; this.goodWins = 0; this.windT = 1; this.feint = false; this.spd = 1; this.snapArmed = true; this.dcd = 0; this.followUp = false;
    this.legs = [{ a: 0, v: 0 }, { a: 0, v: 0 }]; this.tail = { a: 0, v: 0 }; this.pawT = 0; this.angV = 0; this.extSide = 0; this.faceLock = 0; this.armsOut = 0;
    this.makeGloves();
    art(this, 0, 0, 'bg_arena');
    this.stage = this.add.graphics().setDepth(0);
    this.buildCrowd();
    ['Zoe', 'Nana', 'Iris', 'Noir', 'Midnight'].forEach((n, i) => { const h = art(this, 80 + i * 140, 500, `head_${n}_happy`, 0.42).setDepth(1);
      this.tweens.add({ targets: h, y: 485, yoyo: true, repeat: -1, duration: 300 + i * 60 }); this.crowd.push(h as any); });
    this.buildBag(); this.makeBagTextures();
    // Ruby from behind
    this.ruby = this.add.container(W / 2, 1290).setDepth(40);
    this.rBody = art(this, 0, 0, 'ruby_back', 1.6); this.rBase = this.rBody.scaleX; this.ruby.add(this.rBody);
    this.rArms = new BoxerArms(this, this.ruby, { shoulder: [138, -150], upper: 0xe0243a, fore: 0xfff4f0, upperW: 40, foreW: 36, glove: 'bx_glove_ruby', gloveSize: 1.5, wrap: 0xffffff }, RP.idle);
    this.dizzyR = this.add.container(0, -330).setVisible(false); for (let i = 0; i < 5; i++) this.dizzyR.add(txt(this, 0, 0, '★', 40, '#ffdf6b', '#22252b', 5)); this.ruby.add(this.dizzyR);
    this.dizzyT = txt(this, 560, 1000, 'DIZZY!', 44, '#ffdf6b', '#22252b', 8).setDepth(101).setVisible(false);
    this.ringG = this.add.graphics().setDepth(49);
    this.duckT = this.add.container(150, 280).setDepth(60).setVisible(false);
    { const g = this.add.graphics(); g.fillStyle(0xffdf6b, 1).lineStyle(7, COLORS.INK, 1).fillRoundedRect(-115, -44, 230, 84, 26).strokeRoundedRect(-115, -44, 230, 84, 26);
      this.duckT.add([g, txt(this, 0, -2, 'DUCK!', 58, '#e0243a', '#22252b', 6)]); this.duckT.setAngle(-5); }
    // HUD
    this.bars = this.add.graphics().setDepth(100);
    const box = (x: number, label: string, col: string) => { this.bars; txt(this, x, 102, label, 22, col, '#22252b', 5).setDepth(102); return txt(this, x, 142, '', 42, '#fff', '#22252b', 7).setDepth(102); };
    this.hitsT = box(122, 'HITS', '#ffdf6b'); this.timerT = box(360, 'TIME', '#7fd4ff');
    this.roundT = txt(this, 360, 200, 'PUPPY IN THE BAG!', 28, '#ff7aa0', '#22252b', 6).setDepth(102);
    this.comboT = txt(this, 600, 1012, '', 34, '#ffdf6b', '#22252b', 7).setDepth(101);
    this.hb = this.add.container(W / 2, 1060).setDepth(120).setVisible(false);
    const hg = this.add.graphics(); hg.fillStyle(0xffdf6b, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(-200, -46, 400, 92, 30).strokeRoundedRect(-200, -46, 400, 92, 30);
    this.hb.add([hg, txt(this, 0, 0, 'SUPER SWING!', 44, '#e0243a', '#22252b', 6)]); this.bake(hg, 'super', -204, -50, 408, 100);
    this.tweens.add({ targets: this.hb, scale: 1.08, yoyo: true, repeat: -1, duration: 300 });
    makeMuteButton(this); makePauseButton(this, () => this.st.running); setPageBg(0x0d0618, 0x1f4fb8);
    this.makeControls();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.press(worldPoint(this, p)));
    (window as any).__pr = { scene: 'Boxing', st: this.st, force: (win: boolean, pts = false) => this.finish(win, pts), stT: () => this.stT, dodgeCue: () => [this.dl, this.dr].some(c => (c.getByName('glow') as Phaser.GameObjects.Graphics).visible), bag: () => this.bagPos(), swingBack: (side = 1) => { if (this.st.running && this.st.state === 'guard') { this.startAttack(side, WIND[this.st.round - 1], false); this.plainAtk = true; } } };
    tutorialCard(this, 'rubybag', 'PUPPY IN THE BAG!', ['You are RUBY! 🐑 Puppy hid in the bag!', 'PUNCH when the marker is in the GREEN', 'Dead centre = PERFECT!', 'Bag swings at you? DODGE the lit side', 'Dodged → bag wobbles OPEN: free hits!', 'Combos fill SUPER SWING!'], () => this.begin(), 'boxing');
  }
  // ---------- art ----------
  private svgTex(key: string, vb: [number, number, number, number], body: string, defs: string, onReady: () => void) {
    if (this.textures.exists(key)) { onReady(); return; }
    const k = 2, svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vb[2] * k}" height="${vb[3] * k}" viewBox="${vb.join(' ')}"><defs>${defs}</defs>${body}</svg>`;
    const img = new Image(); img.onload = () => { if (!this.textures.exists(key)) this.textures.addImage(key, img); if (this.sys.isActive() || this.sys.settings.status > 0) onReady(); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  private bagDefs = `<linearGradient id="bagG" x1="0" x2="1"><stop offset="0" stop-color="#8a0f20"/><stop offset="0.22" stop-color="#e0243a"/><stop offset="0.42" stop-color="#ff5a6e"/><stop offset="0.7" stop-color="#d01c33"/><stop offset="1" stop-color="#6a0816"/></linearGradient>
<radialGradient id="holeG" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#1a0508"/><stop offset="1" stop-color="#4a0a14"/></radialGradient>
<linearGradient id="rimG" x1="0" x2="1"><stop offset="0" stop-color="#5a0a14"/><stop offset="0.4" stop-color="#ff7a8a"/><stop offset="1" stop-color="#5a0a14"/></linearGradient>
<linearGradient id="chainG" x1="0" x2="1"><stop offset="0" stop-color="#7a8396"/><stop offset="0.45" stop-color="#ffffff"/><stop offset="1" stop-color="#6b7591"/></linearGradient>`;
  private backImg?: Phaser.GameObjects.Image; private frontImg?: Phaser.GameObjects.Image; private bagLbl!: Phaser.GameObjects.Container;
  private makeBagTextures() {
    const w = 120, h = 380;
    const back = `<g stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"><path d="M${-w + 8} 4 L0 -205 L${w - 8} 4"/></g><g stroke="#3a2a2a" stroke-width="4" fill="none"><path d="M${-w + 8} 4 L0 -205 L${w - 8} 4"/></g>`
      + `<circle cx="0" cy="-210" r="16" fill="none" stroke="${INK}" stroke-width="11"/><circle cx="0" cy="-210" r="16" fill="none" stroke="url(#chainG)" stroke-width="6"/>`
      + `<ellipse cx="0" cy="0" rx="${w}" ry="30" fill="url(#holeG)" stroke="${INK}" stroke-width="6"/>`;
    let front = `<path d="M${-w} 0 Q${-w - 6} ${h * 0.5} ${-w + 6} ${h - 40} Q0 ${h + 26} ${w - 6} ${h - 40} Q${w + 6} ${h * 0.5} ${w} 0 Q0 34 ${-w} 0Z" fill="url(#bagG)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>`
      + `<path d="M${-w} 0 Q0 34 ${w} 0" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M${-w + 4} 1 Q0 33 ${w - 4} 1" fill="none" stroke="url(#rimG)" stroke-width="7" stroke-linecap="round"/>`;
    for (const y of [70, h - 70]) front += `<path d="M${-w - 3} ${y} Q0 ${y + 30} ${w + 3} ${y}" fill="none" stroke="${INK}" stroke-width="22"/><path d="M${-w - 1} ${y} Q0 ${y + 30} ${w + 1} ${y}" fill="none" stroke="#2b2b3a" stroke-width="14"/><path d="M${-w + 30} ${y + 8} Q0 ${y + 24} ${w - 50} ${y + 10}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="3"/>`;
    front += `<path d="M${-w + 22} 40 Q${-w + 14} ${h * 0.5} ${-w + 30} ${h - 60}" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="12" stroke-linecap="round"/>`
      + `<path d="M${-w + 46} 110 Q${-w + 40} ${h * 0.5} ${-w + 50} ${h - 110}" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="6" stroke-linecap="round"/>`
      + `<path d="M30 ${h * 0.5 - 50} l0 100" stroke="#7a0614" stroke-width="3" stroke-dasharray="6 7"/>`
      + `<path d="M${-w + 30} ${h - 18} Q0 ${h + 22} ${w - 30} ${h - 18}" fill="none" stroke="${INK}" stroke-width="6"/>`;
    this.svgTex('bb_back', [-140, -235, 280, 275], back, this.bagDefs, () => this.backImg?.setTexture('bb_back').setDisplaySize(280, 275).setVisible(true));
    this.svgTex('bb_front', [-132, -12, 264, 424], front, this.bagDefs, () => this.frontImg?.setTexture('bb_front').setDisplaySize(264, 424).setVisible(true));
  }
  private buildBag() {
    this.rig = this.add.container(PIVX, PIVY).setDepth(20); this.motionG = this.add.graphics().setDepth(19);
    this.chainG = this.add.graphics(); this.bagC = this.add.container(0, LEN);
    this.backImg = this.add.image(-140, -235, this.textures.exists('bb_back') ? 'bb_back' : '__WHITE').setOrigin(0, 0);
    if (this.textures.exists('bb_back')) this.backImg.setDisplaySize(280, 275); else this.backImg.setVisible(false);
    this.pupImg = art(this, 0, 150, 'pup_box_idle', 1.7); this.pupBase = this.pupImg.scaleX; // sits low in the bag: rim at about neck level
    this.legsG = this.add.graphics();
    this.frontImg = this.add.image(-132, -12, this.textures.exists('bb_front') ? 'bb_front' : '__WHITE').setOrigin(0, 0);
    if (this.textures.exists('bb_front')) this.frontImg.setDisplaySize(264, 424); else this.frontImg.setVisible(false);
    this.topG = this.add.graphics();
    this.pupStars = this.add.container(0, -150).setVisible(false); for (let i = 0; i < 4; i++) this.pupStars.add(txt(this, 0, 0, i % 2 ? '★' : '✦', 34, '#ffdf6b', '#22252b', 5));
    // BONK! label lives outside the bag texture so it can be counter-flipped and never reads mirrored while spinning
    this.bagLbl = this.add.container(0, 190).setAngle(-6); { const lg = this.add.graphics(); lg.fillStyle(0xffdf6b, 1).lineStyle(6, 0x2a1a14, 1).fillRoundedRect(-76, -34, 152, 60, 14).strokeRoundedRect(-76, -34, 152, 60, 14);
      this.bagLbl.add([lg, txt(this, 0, -4, 'BONK!', 34, '#e0243a', '#2a1a14', 3)]); this.bake(lg, 'baglbl', -80, -38, 160, 68); }
    this.bagC.add([this.backImg, this.pupImg, this.legsG, this.frontImg, this.bagLbl, this.topG, this.pupStars]);
    this.rig.add([this.chainG, this.bagC]);
    // chain: one baked two-link tile repeated down a TileSprite (was ~25 ellipses re-tessellated every frame)
    const CK = 'bxb_chain';
    if (!this.textures.exists(CK)) { const P = (v: number) => v * RES, cg = this.make.graphics({}, false), cx = 20, ry = 21, by = 55;
      cg.lineStyle(P(10), 0x2a1a14, 1).strokeEllipse(P(cx), P(ry), P(26), P(42)); cg.lineStyle(P(5), 0xc9d0dc, 1).strokeEllipse(P(cx), P(ry), P(26), P(42));
      cg.lineStyle(P(2), 0xffffff, 0.9).beginPath().arc(P(cx - 4), P(ry - 4), P(10), Math.PI * 1.1, Math.PI * 1.5).strokePath();
      cg.fillStyle(0xdfe4ee, 1).lineStyle(P(4), 0x2a1a14, 1).fillEllipse(P(cx), P(by), P(10), P(40)).strokeEllipse(P(cx), P(by), P(10), P(40));
      cg.generateTexture(CK, P(40), P(68)); cg.destroy(); }
    this.chainTS = this.add.tileSprite(0, -21, 40, 68, CK).setOrigin(0.5, 0).setTileScale(1 / RES, 1 / RES);
    this.rig.addAt(this.chainTS, this.rig.getIndex(this.chainG)); this.chainG.setVisible(false);
  }
  /** Chain links from pivot to the bag ring (redrawn as the bag pulls toward/away from the camera). */
  private drawChain(len: number) {
    if (this.chainTS) { if (Math.abs(len - this.chainLen) > 0.5) { this.chainLen = len; this.chainTS.setSize(40, len + 42); } return; }
    const g = this.chainG.clear(); const n = Math.max(2, Math.round(len / 34));
    for (let i = 0; i < n; i++) { const y = len * i / (n - 1);
      if (i % 2) { g.fillStyle(0xdfe4ee, 1).lineStyle(4, 0x2a1a14, 1).fillEllipse(0, y, 10, 40).strokeEllipse(0, y, 10, 40); }
      else { g.lineStyle(10, 0x2a1a14, 1).strokeEllipse(0, y, 26, 42); g.lineStyle(5, 0xc9d0dc, 1).strokeEllipse(0, y, 26, 42); g.lineStyle(2, 0xffffff, 0.9).beginPath().arc(-4, y - 4, 10, Math.PI * 1.1, Math.PI * 1.5).strokePath(); } }
  }
  /** Legs, feet, tail and paws: spring-driven secondary motion that lags the swing, kicks while panicking, flails on hits. */
  private drawLimbs(dt: number, now: number) {
    const s = this.st, w = 120, h = 380; const angVel = (this.ang - this.lastAng) / Math.max(dt, 1e-3); this.lastAng = this.ang;
    const panic = s.state === 'windup' || s.state === 'punch' || this.koMode, dizzy = s.state === 'open' || s.state === 'stun' || s.state === 'ko';
    this.legs.forEach((L, i) => { const kick = Math.sin(now / (panic ? 70 : dizzy ? 260 : 120) + i * Math.PI) * (panic ? 0.6 : dizzy ? 0.3 : 0.35);
      const target = -angVel * 0.012 + kick + (i ? 1.05 : -1.05); // legs poke out the lower SIDES of the bag, kicking up and down
      L.v += ((target - L.a) * 90 - L.v * 9) * dt; L.a += L.v * dt; L.a = i ? Phaser.Math.Clamp(L.a, 0.45, 1.75) : Phaser.Math.Clamp(L.a, -1.6, -0.45); });
    this.tail.v += ((Math.sin(now / (panic ? 60 : 120)) * 0.6 - angVel * 0.01 - this.tail.a) * 70 - this.tail.v * 7) * dt; this.tail.a += this.tail.v * dt;
    const g = this.legsG.clear();
    this.legs.forEach((L, i) => { const sx = i ? 100 : -100, hx = sx, hy = h - 50, len = 82, a = L.a, ex = hx + Math.sin(a) * len, ey = hy + Math.cos(a) * len;
      const kx = hx + Math.sin(a * 0.6) * len * 0.55, ky = hy + Math.cos(a * 0.6) * len * 0.55; // knee bends with the swing
      g.lineStyle(48, 0x2a1a14, 1).lineBetween(hx, hy, kx, ky).lineBetween(kx, ky, ex, ey); g.fillStyle(0x2a1a14, 1).fillCircle(kx, ky, 24);
      g.lineStyle(38, 0xc27230, 1).lineBetween(hx, hy, kx, ky).lineBetween(kx, ky, ex, ey); g.fillStyle(0xc27230, 1).fillCircle(kx, ky, 19);
      g.lineStyle(8, 0xe0a060, 0.6).lineBetween(hx - 9, hy, kx - 9, ky);
      const fa = a + (i ? -0.3 : 0.3), fx = ex + Math.sin(fa + Math.PI / 2) * (i ? 10 : -10), fy = ey + 10;
      g.fillStyle(0x2a1a14, 1).fillEllipse(fx, fy, 64, 40); g.fillStyle(0xd4823c, 1).fillEllipse(fx, fy, 54, 31);
      g.fillStyle(0xff9ab0, 1).fillEllipse(fx, fy + 6, 22, 12); g.lineStyle(3, 0x2a1a14, 1); for (const o of [-12, 0, 12]) g.lineBetween(fx + o, fy - 14, fx + o, fy - 6);
      g.fillStyle(0xffffff, 0.45).fillEllipse(fx - 10, fy - 8, 14, 6); });
    // tail out of the side seam + paws on the rim (drawn over the bag front)
    const t = this.topG.clear(), tx = w - 6, ty = h * 0.62, ta = this.tail.a - 0.4;
    const tp = (u: number, v: number) => [tx + Math.cos(ta) * u - Math.sin(ta) * v, ty + Math.sin(ta) * u + Math.cos(ta) * v];
    const [a1, b1] = tp(0, -8), [a2, b2] = tp(34, -18), [a3, b3] = tp(56, -46), [a4, b4] = tp(20, 6);
    t.fillStyle(0x2a1a14, 1).fillTriangle(a1, b1, a2, b2, a4, b4).fillTriangle(a2, b2, a3, b3, a4, b4); t.lineStyle(14, 0x2a1a14, 1).lineBetween(tx, ty, a3, b3);
    t.lineStyle(8, 0xc27230, 1).lineBetween(tx, ty, a2, b2).lineBetween(a2, b2, a3, b3);
    this.pawT = Math.max(0, this.pawT - dt); const flail = this.pawT > 0; // paws flap up over the rim on a hit
    const up = panic || this.koMode || flail, wig = Math.sin(now / (flail ? 45 : 90)) * (flail ? 16 : panic ? 8 : 2);
    // arms stick out of the bag and flail with the swing speed (and after punches)
    this.armsOut = Math.max(0, this.armsOut - dt * 1.5); const fl = Math.min(1, Math.abs(angVel) / 90 + this.armsOut + (up ? 0.6 : 0.25));
    for (const sg of [-1, 1]) { const flap = Math.sin(now / 70 + (sg > 0 ? 0 : 1.7)) * 0.9 * fl - angVel * 0.004 * sg;
      const reach = 38 + 70 * fl, ax = sg * (w - 30), ay = 2, px = ax + sg * Math.cos(flap) * reach, py = ay - Math.sin(flap) * reach * 0.8 - 18 * fl + (sg > 0 ? wig : -wig);
      t.lineStyle(30, 0x2a1a14, 1).lineBetween(ax, ay, px, py); t.lineStyle(21, 0xc27230, 1).lineBetween(ax, ay, px, py);
      t.fillStyle(0x2a1a14, 1).fillEllipse(px, py, 56, 48); t.fillStyle(0xc7772f, 1).fillEllipse(px, py, 46, 38);
      t.lineStyle(3, 0x2a1a14, 1); for (const o of [-8, 1, 10]) t.lineBetween(px + o, py + 6, px + o, py - 3); t.fillStyle(0xffffff, 0.45).fillEllipse(px - 7, py - 8, 14, 8); }
  }
  /** Chain creak at a swing end: a little 'creak' squiggle by the pivot and a puff of rust-dust. */
  private creak(side: number) {
    const t = txt(this, PIVX + side * 70, PIVY + 175, Math.random() < 0.5 ? 'creak' : 'creeak', 24, '#e8e2d0', '#2a1a14', 5).setDepth(22).setAngle(side * 12).setAlpha(0.95);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 520, ease: 'Sine.Out', onComplete: () => t.destroy() });
  }
  /** Speed lines trailing the bag through the bottom of its arc. */
  private drawMotion() {
    const g = this.motionG.clear(), v = Math.abs(this.angV); if (v < 45 || this.koMode || this.lowQ) return;
    const k = Math.min(1, (v - 45) / 90), dir = -Math.sign(this.angV), d = LEN + 190 * this.depthK;
    for (let i = 0; i < 4; i++) { const r = d - 120 + i * 80, a0 = Phaser.Math.DegToRad(this.ang), a1 = a0 + dir * Phaser.Math.DegToRad(6 + 10 * k);
      g.lineStyle(7 - i, 0xffffff, 0.55 * k).beginPath(); g.arc(PIVX, PIVY, r, Math.PI / 2 - a1, Math.PI / 2 - a0 - dir * 0.03, dir < 0); g.strokePath(); }
  }
  private bagPos() { const r = Phaser.Math.DegToRad(this.ang), d = LEN + 190 * this.depthK; return { x: PIVX + Math.sin(r) * d, y: PIVY + Math.cos(r) * d }; }
  private setFace(k: 'idle' | 'panic' | 'dizzy' | 'hearts') { this.pupImg.setTexture({ idle: 'pup_box_idle', panic: 'pup_box_panic', dizzy: 'pup_box_dizzy', hearts: 'pup_box_dizzy' }[k]); } // 'hearts' = woozy swirl eyes now (no heart eyes on Puppy); hearts/stars pop from his head instead (popHead)
  /** little hearts + stars popping up from Puppy's head (rides in the bag container so it follows the swing) */
  private popHead(n = 3) { for (let i = 0; i < n; i++) { const t = txt(this, (i - (n - 1) / 2) * 44, -60, i % 2 ? '★' : '♥', 32, i % 2 ? '#ffdf6b' : '#ff6b9a', '#22252b', 4).setScale(0.3);
    this.bagC.add(t); this.tweens.add({ targets: t, scale: 1, y: -120 - (i % 2) * 16, x: t.x * 1.5, duration: 520, delay: i * 90, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 650 + i * 90, duration: 300, onComplete: () => t.destroy() }); } }
  // ---------- flow ----------
  private begun = false;
  private begin() {
    if (this.begun) return; // idempotent: a stray second start must never re-run the intro
    this.begun = true;
    this.st.running = true;
    popBanner(this, 'ROUND 1 — SWING!', 380, 0xff8a1f);
    this.time.delayedCall(900, () => say(this, 230, 660, pick(LINES.start.Ruby), 26));
  }
  private dl!: Phaser.GameObjects.Container; private dr!: Phaser.GameObjects.Container; private pb!: Phaser.GameObjects.Container;
  private btns: { x: number; y: number; w: number; h: number; c: Phaser.GameObjects.Container; act: () => void }[] = [];
  private makeControls() {
    this.btns = [];
    const mk = (x: number, y: number, w: number, h: number, label: string, col: number, act: () => void) => {
      const c = this.add.container(x, y).setDepth(130);
      const g = this.add.graphics(); g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 30);
      g.fillStyle(col, 0.92).lineStyle(6, COLORS.INK, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 30).strokeRoundedRect(-w / 2, -h / 2, w, h, 30);
      const glow = this.add.graphics().setName('glow'); glow.lineStyle(6, 0xffdf6b, 1).strokeRoundedRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 36); glow.setVisible(false);
      c.add([g, glow, txt(this, 0, 0, label, 40, '#fff', '#22252b', 7)]);
      this.bake(g, `btn${w}x${h}_${col}`, -w / 2 - 4, -h / 2 - 4, w + 8, h + 16); this.bake(glow, `glow${w}x${h}`, -w / 2 - 12, -h / 2 - 12, w + 24, h + 24);
      this.btns.push({ x, y, w, h, c, act }); return c;
    };
    this.dl = mk(110, 1190, 190, 150, '◀\nDODGE', 0x3a86ff, () => this.dodge(-1));
    this.dr = mk(610, 1190, 190, 150, 'DODGE\n▶', 0x3a86ff, () => this.dodge(1));
    this.pb = mk(W / 2, 1190, 290, 150, 'PUNCH!', 0xff5c8a, () => this.punch());
  }
  private glow(c: Phaser.GameObjects.Container, on: boolean) { (c.getByName('glow') as Phaser.GameObjects.Graphics).setVisible(on); }
  private press(p: { x: number; y: number }) {
    if (!this.st.running || pointerInMute(p.x, p.y) || pointerInPause(p.x, p.y)) return;
    if (this.hb.visible && Math.abs(p.x - W / 2) < 210 && Math.abs(p.y - this.hb.y) < 60) return this.superSwing();
    for (const b of this.btns) if (Math.abs(p.x - b.x) < b.w / 2 + 10 && Math.abs(p.y - b.y) < b.h / 2 + 10) {
      this.tweens.add({ targets: b.c, scale: 0.9, duration: 50, yoyo: true }); return b.act(); }
    if (p.y > 880 && p.x < 150) return this.dodge(-1); if (p.y > 880 && p.x > W - 150) return this.dodge(1);
    if (p.y > 300) this.punch();
  }
  dodge(dir: number) {
    const s = this.st; if (s.dizzy > 0 || this.dcd > 0) return; Fx.whoosh();
    // only a dodge in the last DODGE_WIN s before impact holds until the punch lands; an early one wears off (the bag can feint)
    const tti = s.state === 'windup' ? this.stT + 0.22 : s.state === 'punch' ? this.stT : 99;
    const pending = tti <= DODGE_WIN && !this.feint, attacking = tti < 99;
    // during a swing-back a non-holding dodge only costs a short cooldown, so the player can still dodge when the button lights up
    this.dcd = attacking && !pending ? EARLY_CD : DODGE_CD;
    if (attacking && tti > DODGE_WIN) floatText(this, W / 2 + dir * 150, 1040, 'too early!', '#ffffff', 30); // only for genuinely early taps (never reveals a feint)
    s.dodge = pending ? 99 : 0.45; s.dodgeDir = dir;
    this.tweens.killTweensOf(this.ruby); this.ruby.setPosition(W / 2, 1290).setScale(1);
    this.afterimage(); this.ruby.setScale(1.08, 0.9); this.rArms.to('both', RP.guard, 90, 'Quad.Out'); // gloves tuck up to cover her face
    this.tweens.add({ targets: this.ruby, x: W / 2 + dir * 210, angle: dir * 16, duration: 110, ease: 'Back.Out' });
    this.tweens.add({ targets: this.ruby, scaleX: 1, scaleY: 1, duration: 220, ease: 'Elastic.Out', easeParams: [1.2, 0.5] });
    if (!pending) this.time.delayedCall(460, () => { if (this.st.dodge < 50) this.returnRuby(); });
    for (let i = 0; i < 3; i++) { const d = txt(this, W / 2 + dir * (60 + i * 50), 1000, '~', 50, '#ffffff', '#22252b', 4).setAlpha(0.8);
      this.tweens.add({ targets: d, x: d.x - dir * 80, alpha: 0, duration: 300, onComplete: () => d.destroy() }); }
  }
  private returnRuby() { if (this.st.dizzy <= 0 && this.st.running) this.rArms.to('both', RP.idle, 200, 'Back.Out');
    this.tweens.add({ targets: this.ruby, x: W / 2, angle: 0, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' }); }
  private afterimage() {
    for (let k = 0; k < 2; k++) { const g = art(this, this.ruby.x, this.ruby.y, 'ruby_back', 1.6).setDepth(39).setAlpha(0.35 - k * 0.12).setTint(0xffb0c8).setAngle(this.ruby.angle);
      this.tweens.add({ targets: g, alpha: 0, scaleX: g.scaleX * 1.05, delay: k * 40, duration: 220, onComplete: () => g.destroy() }); }
  }
  /** Chatter bubble with a shared 1.2 s gap so lines never pile up (force = always show, still resets the gap). */
  private chat(x: number, y: number, line: string, size: number, hold: number, force = false) {
    if (!this.st.running || (!force && this.time.now - this.lastTalk < 1200)) return; this.lastTalk = this.time.now; say(this, x, y, line, size, hold);
  }
  private lastTalk = -9999;
  // energy bar feedback: a white chunk shows the hit's damage, holds briefly, then drains; the bar flashes on every hit
  private ghostHp = PUP_HP; private chipT = 0; private barFlash = 0;
  private freeze(ms: number) { this.tweens.timeScale = 0.04; this.hitStop = ms / 1000; }
  punch() {
    const s = this.st; if (s.cool > 0) return;
    if (s.dizzy > 0) { floatText(this, W / 2, 980, 'too dizzy!', '#9ad0ff', 30); s.cool = 0.15; return; }
    const side = s.hits++ % 2 ? 1 : -1, i = side > 0 ? 1 : 0; s.cool = 0.1;
    this.rArms.set(i, RP.idle); this.rArms.to(i, RP.cock, 35, 'Quad.Out');
    this.tweens.killTweensOf(this.ruby); const bx = this.ruby.x; this.ruby.setY(1290);
    this.tweens.chain({ targets: this.ruby, tweens: [
      { scaleX: 1.05, scaleY: 0.94, angle: -side * 3, y: 1300, duration: 35, ease: 'Quad.Out' },
      { scaleX: 0.96, scaleY: 1.07, angle: side * 6, y: 1262, x: bx + side * 10, duration: 60, ease: 'Quad.Out' },
      { scaleX: 1, scaleY: 1, angle: 0, y: 1290, x: bx, duration: 200, ease: 'Back.Out' }] });
    this.time.delayedCall(35, () => { this.rArms.to(i, RP.jab, 55, 'Quad.In'); Fx.whoosh(); this.streak(side); });
    const tap = { x: s.x, state: s.state, stT: this.stT }; // judge on what the player saw at the tap; the 90 ms delay is only the glove travelling
    this.time.delayedCall(90, () => { this.rArms.to(i, RP.idle, 220, 'Back.Out'); this.connect(side, tap); });
  }
  private streak(side: number) {
    const g = this.add.graphics().setDepth(41); g.lineStyle(6, 0xffffff, 0.8);
    for (let k = 0; k < 4; k++) { const x = W / 2 + side * (40 + k * 22); g.lineBetween(x, 1000 - k * 6, x - side * 30, 1130 - k * 6); }
    this.tweens.add({ targets: g, alpha: 0, y: -40, duration: 180, onComplete: () => g.destroy() });
  }
  private connect(side: number, tap: { x: number; state: string; stT: number }) {
    const s = this.st; if (!s.running) return;
    const bp = this.bagPos(), hx = bp.x + side * 20, hy = bp.y - 20;
    const counter = tap.state === 'windup' && tap.stT <= 0.2;
    const inGreen = tap.state === 'guard' && Math.abs(tap.x) < GREEN, perfect = inGreen && Math.abs(tap.x) < PERF;
    if (tap.state === 'open' || tap.state === 'stun' || inGreen || counter) {
      s.combo++; s.landed++; const dmg = HIT + Math.min(s.combo, COMBO_MAX) * 2 + (perfect ? PERF_BONUS : 0) + (counter ? COUNTER : 0);
      s.cool = COOL_HIT; s.meter = Math.min(100, s.meter + (perfect || counter ? 15 : 8)); s.score += 50 * s.combo + (perfect ? 150 : 0) + (counter ? 250 : 0);
      Fx.punch(); Fx.combo(s.combo); if (perfect) s.perfects++; if (counter) s.counters++;
      this.hitFx(hx, hy, dmg, perfect || counter, side, counter ? 'COUNTER!' : undefined);
      if (perfect) { const p = comic(this, 570, 620, 'PERFECT!', 36, '#ffdf6b').setDepth(76); this.tweens.add({ targets: p, y: 580, alpha: 0, delay: 500, duration: 300, onComplete: () => p.destroy() }); }
      if (counter) { this.stT = 0; this.setPup('stun', 1.0); }
      else if (s.state === 'guard') { s.ph += (tap.x > 0 ? 1 : -1) * 0.25; } // knock the swing on a bit
      this.hurtPup(dmg);
      const r = Math.random();
      if (perfect) { if (r < 0.7) this.chat(560, 300, pick(PUP_SAYS.perfect), 24, 1100); }
      else if (r < 0.25) this.chat(560, 300, pick(PUP_SAYS.hit), 24, 1100);
      else if (r < (counter ? 0.75 : 0.37)) this.chat(RUBY_SAY.x, RUBY_SAY.y, pick(LINES.rubyHit), 22, 1000); // Ruby talks in her own level
    } else {
      s.combo = 0; s.cool = COOL_MISS; Fx.block();
      floatText(this, hx, hy, tap.state === 'windup' ? 'too early!' : 'swish!', '#ffffff', 34);
      this.tweens.add({ targets: this.ruby, angle: side * -6, duration: 90, yoyo: true });
      const r = Math.random(), near = tap.state === 'guard' && Math.abs(tap.x) < GREEN * 1.35;
      if (near && r < 0.4) this.chat(RUBY_SAY.x, RUBY_SAY.y, pick(LINES.near), 22, 1000);
      else if (r < 0.15) this.chat(560, 300, pick(PUP_SAYS.whiff), 22, 1000);
      else if (r < 0.27) this.chat(RUBY_SAY.x, RUBY_SAY.y, pick(LINES.rubyBlock), 22, 1000);
    }
  }
  /** POW burst, stars, damage pop, shake, bag squish + spin, Puppy squished dizzy face, legs flail. */
  private hitFx(x: number, y: number, dmg: number, big: boolean, side: number, label?: string) {
    const k = big ? 1.6 : 1;
    const burst = this.add.graphics({ x, y }).setDepth(70); const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = (i % 2 ? 60 : 118 + (i % 4) * 6) * k; pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
    burst.fillStyle(0xff8a1f, 1).lineStyle(7, COLORS.INK, 1).fillPoints(pts, true).strokePoints(pts, true); burst.fillStyle(0xffdf6b, 1).fillCircle(0, 0, 66 * k).fillStyle(0xfffbe0, 1).fillCircle(0, 0, 36 * k);
    burst.setScale(0.3).setAngle(Phaser.Math.Between(-15, 15));
    this.tweens.add({ targets: burst, scale: 1, duration: 110, ease: 'Back.Out' }); this.tweens.add({ targets: burst, alpha: 0, scale: 1.3, delay: 260, duration: 200, onComplete: () => burst.destroy() });
    lastWord.forEach(o => o.destroy()); lastWord.length = 0;
    const word = label ?? pick(big ? ['POW!!', 'KA-POW!'] : ['POW!', 'BOP!', 'BAM!', 'WHAP!', 'THWUMP!']);
    const w = comic(this, x, y + 10, word, 76 * (big ? 1.3 : 1), '#e0243a', '#ffdf6b', '#22252b').setDepth(75).setAngle(-10).setScale(0.2);
    this.tweens.add({ targets: w, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, y: w.y - 50, delay: 420, duration: 250, onComplete: () => w.destroy() }); lastWord.push(w);
    const n = comic(this, x + 170, y - 60, `+1`, 60, '#7dff9a', '#c8ffd8', '#22252b').setDepth(76);
    this.tweens.add({ targets: n, y: n.y - 100, alpha: 0, duration: 800, ease: 'Quad.Out', onComplete: () => n.destroy() });
    for (let i = 0; i < (big ? 10 : 4); i++) { const st = txt(this, x, y, '★', 34 + Math.random() * 20, '#ffdf6b', '#22252b', 4).setDepth(74); const a = Math.random() * Math.PI * 2, d = 140 + Math.random() * 100 * k;
      this.tweens.add({ targets: st, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, angle: 360, alpha: 0, duration: 550, ease: 'Quad.Out', onComplete: () => st.destroy() }); }
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2, l = this.add.graphics({ x, y }).setDepth(69).setRotation(a);
      l.fillStyle(0xffffff, 0.75).fillTriangle(180 * k, -4 - (i % 3) * 2, 180 * k, 4 + (i % 3) * 2, 300 * k, 0); this.tweens.add({ targets: l, alpha: 0, scaleX: 1.3, duration: 260, onComplete: () => l.destroy() }); }
    sparks(this, x, y, big ? 36 : 14, big); if (big) flashVignette(this, 0xffffff, 0.6);
    this.freeze(big ? 120 : 65); this.ropeWob = Math.max(this.ropeWob, big ? 1 : 0.4);
    this.cameras.main.shake(big ? 300 : 150, big ? 0.022 : 0.012);
    // bag reaction: squish, spin kick, legs flail opposite the punch
    this.squish = 1; this.spinPh += big ? Math.PI * 2 : 0.6 * (Math.random() < 0.5 ? 1 : -1);
    this.legs.forEach((L, i) => { L.v += (side > 0 ? -1 : 1) * (12 + i * 4) * (big ? 1.6 : 1); }); this.tail.v += 14; this.pawT = big ? 0.7 : 0.45;
    this.angV += side * (big ? 140 : 85); this.faceLock = 0.6; this.armsOut = 1; // punch knocks the bag into a bouncy wobble
    this.setFace('dizzy'); this.pupImg.setTint(0xffb0b0); this.pupStars.setVisible(true);
    this.time.delayedCall(450, () => { this.pupImg.clearTint(); this.restoreFace(); });
  }
  private restoreFace() { const s = this.st; this.pupStars.setVisible(s.state === 'open' || s.state === 'stun' || s.state === 'ko');
    this.setFace(s.state === 'windup' || s.state === 'punch' ? 'panic' : s.state === 'open' || s.state === 'stun' || s.state === 'ko' ? 'dizzy' : s.dizzy > 0 ? 'hearts' : 'idle'); }
  superSwing() {
    const s = this.st; s.meter = 0; this.hb.setVisible(false); Fx.special();
    popBanner(this, 'SUPER SWING!', 380, 0xe0243a, 800);
    this.tweens.add({ targets: this.ruby, y: 1180, scale: 1.15, duration: 140, yoyo: true, ease: 'Quad.In' });
    this.rArms.to('both', RP.jab, 120, 'Quad.In', true, 80);
    this.time.delayedCall(150, () => { if (!s.running) return; const bp = this.bagPos(); s.score += 800; Fx.punch(); Fx.ouch();
      this.hitFx(bp.x, bp.y - 20, SUPER_DMG, true, 1, 'MEGA POW!'); this.cameras.main.flash(160, 255, 255, 255); this.spinPh += Math.PI * 4; this.hurtPup(SUPER_DMG);
      if (s.running) { this.stT = 0; this.setPup('stun', 1.6); this.chat(RUBY_SAY.x, RUBY_SAY.y, pick(LINES.headbutt), 24, 1100, true); } });
  }
  private hurtPup(d: number) { const s = this.st; if (!s.running) return; (window as any).__pr.lastDmg = d; if (this.chipT <= 0) this.ghostHp = Math.max(this.ghostHp, s.pupHp); s.pupHp = Math.max(0, s.pupHp - d); this.chipT = 0.45; this.barFlash = d >= 30 ? 0.22 : 0.14; floatText(this, 393 + 294 * s.pupHp / PUP_HP, 205, `-${d}`, d >= 30 ? '#ff5c5c' : '#ffdf6b', d >= 30 ? 34 : 24); if (s.pupHp <= 0) this.finish(true); }
  /** Windup tell length: varies around the round's base, never below WIND_MIN so there is always a fair visible tell. */
  private rollWind(r: number) { return Phaser.Math.Clamp(WIND[r] * (0.62 + Math.random() * 0.5), WIND_MIN, 1.3); }
  private startAttack(side: number, wind: number, canFeint: boolean) {
    const s = this.st; s.side = side || 1; s.atk++; this.plainAtk = false; this.windT = wind; this.feint = canFeint && this.exts >= 3 && Math.random() < FEINT_P[s.round - 1];
    this.setPup('windup', wind);
  }
  private setPup(state: PState, t: number) {
    const s = this.st; s.state = state; this.stT = t;
    this.glow(this.dl, false); this.glow(this.dr, false); this.tweens.killTweensOf([this.dl, this.dr]); this.dl.setScale(1); this.dr.setScale(1);
    if (state !== 'windup') this.duckT.setVisible(false);
    if (state === 'windup') { Fx.alert(); const safe = s.side > 0 ? this.dl : this.dr; this.tweens.add({ targets: safe, scale: 1.1, yoyo: true, repeat: -1, duration: 140 });
      this.duckT.setVisible(true).setScale(0).setPosition(s.side > 0 ? 560 : 160, 280); this.tweens.add({ targets: this.duckT, scale: 1, duration: 180, ease: 'Back.Out' });
      if (Math.random() < 0.15) this.chat(s.side > 0 ? 220 : 500, 300, pick(PUP_SAYS.incoming), 24, 900); }
    if (state === 'open' && Math.random() < 0.4) this.chat(520, 300, pick(PUP_SAYS.open), 22, 1000);
    this.restoreFace();
  }
  private land() {
    const s = this.st; if (!s.running) return;
    const dodged = s.dodge > 0 && s.dodgeDir === -s.side && s.dizzy <= 0, wrong = s.dodge > 0 && !dodged;
    s.dodge = 0; this.time.delayedCall(200, () => this.returnRuby());
    if (dodged) {
      s.meter = Math.min(100, s.meter + 10); s.score += 150;
      if (!this.plainAtk && Math.random() < DOUBLE_P[s.round - 1]) { // swings straight back from the other side: dodge again!
        s.doubles++; floatText(this, W / 2, 600, 'AGAIN!', '#ffdf6b', 44); this.dcd = 0; this.startAttack(-s.side, WIND_MIN + Math.random() * 0.15, false); return; }
      floatText(this, W / 2, 600, 'DODGED! FREE HITS!', '#7dff9a', 40);
      if (Math.random() < 0.45) this.chat(RUBY_SAY.x, RUBY_SAY.y, pick(LINES.rubyDodge), 22, 1000, true);
      this.setPup('open', OPEN_T);
    } else {
      s.rubyHp = Math.max(0, s.rubyHp - BONK); s.combo = 0; s.bonks++; s.dizzy = DIZZY; Fx.ouch(); this.cameras.main.shake(280, 0.02); this.freeze(90);
      this.tweens.killTweensOf(this.ruby); this.ruby.setScale(1.15, 0.85).setY(1310).setAngle(-s.side * 18);
      this.tweens.add({ targets: this.ruby, scaleX: 0.92, scaleY: 0.92, y: 1240, x: W / 2 + s.side * -110, duration: 320, ease: 'Elastic.Out', easeParams: [1, 0.45] });
      this.rArms.to(0, RP.idle, 120); this.rArms.to(1, RP.dizzy, 160, 'Back.Out');
      sparks(this, 170, 820, 14);
      const bx = this.add.container(170, 800).setDepth(75).setAngle(-20);
      const bg = this.add.graphics(); const pts: Phaser.Math.Vector2[] = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = i % 2 ? 55 : 100; pts.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
      bg.fillStyle(0xffdf6b, 1).lineStyle(7, COLORS.INK, 1).fillPoints(pts, true).strokePoints(pts, true);
      bx.add([bg, comic(this, 0, 10, 'BONK!', 58, '#3a86ff', '#bfe0ff', '#22252b')]); bx.setScale(0.3);
      this.tweens.add({ targets: bx, scale: 1, duration: 120, ease: 'Back.Out' }); this.tweens.add({ targets: bx, alpha: 0, y: 740, delay: 600, duration: 260, onComplete: () => bx.destroy() });
      this.cameras.main.flash(120, 255, 80, 80); flashVignette(this, 0xff2a4a, 0.35);
      if (wrong) floatText(this, W / 2, 600, 'WRONG WAY!', '#ff3b6b');
      const hurt = Math.random() < 0.4; this.time.delayedCall(250, () => s.running && this.chat(205, 300, pick(hurt ? LINES.rubyHurt : PUP_SAYS.bonk), 22, 1600, true));
      if (s.rubyHp <= 0) return this.finish(false);
      this.setPup('guard', 0); s.ph = s.side > 0 ? Math.PI / 2 + 0.3 : -Math.PI / 2 + 0.3; this.setFace('hearts'); this.faceLock = 0.7; this.time.delayedCall(200, () => this.popHead()); // swings away, Puppy woozy + little hearts from his head
    }
  }
  /** Adaptive quality: sustained slow frames (avg > 20 ms over 2 s while playing) turn off the extras now and drop to 1x render on the next load. */
  private watchPerf(dms: number) {
    if (LOWQ_PINNED || !this.st.running || document.hidden) return;
    this.perfAcc += Math.min(dms, 100); this.perfN++; this.perfT += dms;
    if (this.perfT < 2000) return;
    const avg = this.perfAcc / this.perfN; this.perfAcc = this.perfN = this.perfT = 0;
    if (!this.lowQ) { if (avg > 20) this.enterLowQ(); return; }
    // in low quality: 10 s of solid frames (avg < 18 ms, i.e. holding 60 fps, in five 2 s windows in a row) -> next load goes back to normal
    this.goodWins = avg < 18 ? this.goodWins + 1 : 0;
    if (this.goodWins >= 5 && !(window as any).__lowQNow) { clearLowQ(); (window as any).__lowQRecovered = true; this.goodWins = -1e9; }
  }
  private enterLowQ() {
    this.lowQ = true; rememberLowQ(); (window as any).__lowQNow = true;
    this.tweens.getTweens().forEach(tw => { const tg = (Array.isArray(tw.targets) ? tw.targets : []) as any[]; if (tg.some(o => this.crowd.includes(o) || (o && o.blendMode === Phaser.BlendModes.ADD) || (o && o.texture && o.texture.key === 'bxb_crowd'))) tw.pause(); });
    this.motionG.clear(); this.stage.clear(); this.bulbs = [];
  }
  update(_t: number, dms: number) {
    const dt = Math.min(dms, 250) / 1000, s = this.st, now = this.time.now; this.watchPerf(this.game.loop.rawDelta || dms); // raw frame time: Phaser's smoothed delta hides slow frames (reads ~16.7 ms at 15 fps)
    if (this.chipT > 0) this.chipT -= dt; else if (this.ghostHp > s.pupHp) this.ghostHp = Math.max(s.pupHp, this.ghostHp - PUP_HP * 0.6 * dt);
    if (this.barFlash > 0) this.barFlash -= dt;
    if (this.hitStop > 0) { this.hitStop -= dt; if (this.hitStop <= 0) this.tweens.timeScale = 1; }
    this.updateBag(dt, now);
    this.drawHud(); this.drawStage(now); const dz = s.dizzy > 0 && s.running, br = Math.sin(now / (dz ? 120 : 170));
    this.rArms.bob = br * (dz ? 9 : 5); this.rArms.draw(); // boxer bounce: body + arms breathe together (wobblier while dizzy)
    this.rBody.setY(br * 4).setScale(this.rBase * (1 - br * 0.008), this.rBase * (1 + br * 0.015)).setAngle(dz ? Math.sin(now / 210) * 4 : 0);
    const dzOn = s.dizzy > 0 && !this.koMode; // KO: Ruby has left the ring, her DIZZY tag + stars go with her
    this.dizzyR.setVisible(dzOn); this.dizzyT.setVisible(dzOn).setScale(1 + Math.sin(now / 90) * 0.06);
    if (s.dizzy > 0) { this.dizzyR.list.forEach((o, i) => { const a = now / 160 + i * Math.PI * 0.4; (o as Phaser.GameObjects.Text).setPosition(Math.cos(a) * 110, Math.sin(a) * 24).setScale(0.8 + 0.25 * Math.sin(a)); }); }
    if (this.pupStars.visible) this.pupStars.list.forEach((o, i) => { const a = now / 200 + i * Math.PI / 2; (o as Phaser.GameObjects.Text).setPosition(Math.cos(a) * 100, Math.sin(a) * 22); });
    if (!s.running) return;
    s.time -= dt; s.dodge = Math.max(0, s.dodge - dt); s.cool = Math.max(0, s.cool - dt); this.dcd = Math.max(0, this.dcd - dt);
    if (s.dizzy > 0) { s.dizzy -= dt; if (s.dizzy <= 0) { this.returnRuby(); this.rArms.to('both', RP.idle, 200); this.restoreFace(); } }
    const rd = s.time > 40 ? 1 : s.time > 20 ? 2 : 3;
    if (rd !== s.round) { s.round = rd; Fx.special(); popBanner(this, rd === 2 ? 'ROUND 2 — faster swings!' : 'FINAL ROUND — WILD SWINGS!', 380, rd === 2 ? 0xff8a1f : 0xe0243a, 900); this.cameras.main.flash(150, 255, 255, 255); }
    if (s.time <= 0) { s.time = 0; return this.finish(s.pupHp / PUP_HP <= PTS && s.pupHp / PUP_HP < s.rubyHp / RUBY_HP, true); }
    if (s.meter >= 100 && !this.hb.visible) { this.hb.setVisible(true); popBanner(this, 'METER FULL! SUPER SWING!', 380, 0xffdf6b, 800); }
    const r = rd - 1;
    if (s.state === 'guard') { const w = 2 * Math.PI / PERIOD[r] * this.spd, px = s.x; s.ph += w * dt; s.x = Math.sin(s.ph);
      const outward = Math.abs(s.x) > Math.abs(px);
      if (Math.abs(s.x) < 0.3) this.snapArmed = true;
      // snap-back: sometimes the bag cuts its swing short and comes back early (still with a full visible tell)
      if (this.snapArmed && outward && Math.abs(s.x) > 0.72 && Math.abs(s.x) < 0.9 && s.dizzy <= 0 && this.exts >= 2) { this.snapArmed = false;
        if (Math.random() < SNAP_P[r]) { s.snaps++; this.lastAtk = this.exts; this.startAttack(Math.sign(s.x), this.rollWind(r), true); return; } }
      if (Math.abs(s.x) > 0.97 &&  TIME - s.time - this.lastExt > 0.3) { this.lastExt = TIME - s.time; this.spd = 0.82 + Math.random() * 0.4; // each half-swing a little faster or slower
        this.exts++; if ((Math.random() < ATK_P[r] || this.followUp || this.exts - this.lastAtk >= (r === 2 ? 5 : 4) || (this.lastAtk === 0 && this.exts >= 2)) && s.dizzy <= 0) { this.lastAtk = this.exts; this.followUp = false; this.startAttack(Math.sign(s.x), this.rollWind(r), true); } } }
    else if (s.state === 'windup') { this.stT -= dt; s.x = s.side;
      if (this.feint && this.stT <= this.windT * 0.38) { // feint: pulls the swing and drops back into the rhythm; the real one may follow quickly
        this.feint = false; s.feints++; floatText(this, this.bagPos().x, 520, 'fake!', '#ffffff', 30); this.setPup('guard', 0); s.ph = s.side > 0 ? Math.PI / 2 + 0.15 : -Math.PI / 2 + 0.15;
        this.followUp = Math.random() < 0.6; this.lastExt = TIME - s.time; }
      else if (this.stT <= 0) { this.setPup('punch', 0.22); } }
    else if (s.state === 'punch') { this.stT -= dt; s.x = s.side * Math.max(0, this.stT / 0.22); if (this.stT <= 0) { this.land(); } }
    if (s.state === 'windup' || s.state === 'punch') { const tti = s.state === 'windup' ? this.stT + 0.22 : this.stT; this.glow(s.side > 0 ? this.dl : this.dr, tti <= DODGE_WIN && !this.feint); }
    else if (s.state === 'open' || s.state === 'stun') { this.stT -= dt; s.x = Math.sin(now / 120) * 0.08; if (this.stT <= 0) { s.combo = 0; s.ph = 0; this.setPup('guard', 0); } }
  }
  private updateBag(dt: number, now: number) {
    const s = this.st; let depth = 1, ang = ANG * s.x;
    if (this.koMode) { ang = Math.sin(now / 400) * 14; depth = 1.05; }
    else if (s.state === 'windup') { const k = 1 - Math.max(0, this.stT) / this.windT; ang = s.side * (ANG + 7 * Phaser.Math.Easing.Sine.Out(k)); depth = 1 - 0.12 * k; }
    else if (s.state === 'punch') { const k = 1 - Math.max(0, this.stT) / 0.22; ang = s.side * (ANG + 7) * (1 - k * 1.5); depth = 0.88 + 0.45 * Phaser.Math.Easing.Quadratic.In(k); }
    else if (s.state === 'open' || s.state === 'stun') { ang = Math.sin(now / 160) * 7; depth = 1.04; }
    else depth = 1 + 0.04 * Math.cos(s.ph * 2);
    { const K = 260, D = 15, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n; // under-damped pendulum: lags, overshoots, wobbles
      for (let i = 0; i < n; i++) { this.angV += ((ang - this.ang) * K - this.angV * D) * h; this.ang += this.angV * h; } }
    // swing ends: chain creak + squash/stretch; mid-swing: motion lines
    const end = s.state === 'guard' && !this.koMode ? Math.abs(s.x) : 0, endSide = end > 0.96 ? Math.sign(s.x) : 0;
    if (endSide && endSide !== this.extSide) { this.extSide = endSide; Fx.creak(); this.creak(endSide); }
    if (Math.abs(s.x) < 0.5) this.extSide = 0;
    this.drawMotion();
    this.depthK += (depth - this.depthK) * Math.min(1, dt * 14);
    this.rig.setAngle(-this.ang); this.bagC.setY(LEN - 210 * (this.depthK - 1)).setScale(this.depthK); this.drawChain(LEN - 210 * (this.depthK - 1) - 205 * this.depthK);
    // spin around the chain axis (scaleX ~ cos) + squash on impact
    this.spinPh *= Math.pow(this.koMode ? 0.3 : 0.004, dt); const spinX = Math.cos(this.spinPh); this.squish *= Math.pow(0.003, dt);
    this.bagC.scaleX = this.depthK * (Math.abs(spinX) < 0.3 ? 0.3 * Math.sign(spinX || 1) : spinX) * (1 + this.squish * 0.18);
    this.bagLbl.scaleX = this.bagC.scaleX < 0 ? -1 : 1;
    const endK = Math.max(0, (end - 0.85) / 0.15); // stretch along the chain as it hangs at the end, squash through the bottom
    this.bagC.scaleX *= 1 - endK * 0.06 + Math.min(1, Math.abs(this.angV) / 120) * 0.04;
    this.bagC.scaleY = this.depthK * (1 - this.squish * 0.12) * (1 + endK * 0.07 - Math.min(1, Math.abs(this.angV) / 120) * 0.04); this.bagC.setAngle(Math.sin(this.spinPh) * 8 + this.squish * 6);
    this.pupImg.setScale(this.pupBase * (1 + this.squish * 0.28), this.pupBase * (1 - this.squish * 0.22));
    // Puppy leans into the swing and pulls a face that matches the direction (only in the idle swing, not over hit/KO faces)
    this.faceLock = Math.max(0, this.faceLock - dt); this.pupImg.setAngle(Phaser.Math.Clamp(-this.angV * 0.12, -16, 16));
    if (s.state === 'guard' && s.running && s.dizzy <= 0 && this.faceLock <= 0 && !this.koMode) {
      const want = Math.abs(s.x) < 0.45 ? 'pup_box_idle' : this.angV > 0 ? 'pup_box_panic' : 'pup_box_dizzy'; // was pup_hearts: heart eyes AND a second baked arm popped in on every back-swing
      if (this.pupImg.texture.key !== want) this.pupImg.setTexture(want); this.pupImg.setFlipX(this.angV < 0); }
    this.drawLimbs(dt, now);
  }
  /** Bake a static Graphics into a texture (at RES so it stays sharp) and swap in an Image: Phaser re-tessellates every Graphics on every frame. */
  private bake(g: Phaser.GameObjects.Graphics, key: string, x0: number, y0: number, w: number, h: number): Phaser.GameObjects.Image {
    const k = 'bxb_' + key;
    if (!this.textures.exists(k)) {
      const dt = this.textures.addDynamicTexture(k, Math.ceil(w * RES), Math.ceil(h * RES));
      if (dt) { const ox = g.x, oy = g.y, sx = g.scaleX, sy = g.scaleY, ang = g.angle, vis = g.visible, a = g.alpha;
        g.setPosition(-x0 * RES, -y0 * RES).setScale(RES).setAngle(0).setVisible(true).setAlpha(1); dt.draw(g); g.setPosition(ox, oy).setScale(sx, sy).setAngle(ang).setVisible(vis).setAlpha(a); }
    }
    if (!this.textures.exists(k)) return g as unknown as Phaser.GameObjects.Image; // no renderer support: keep the Graphics
    const img = this.add.image(g.x + x0 * g.scaleX, g.y + y0 * g.scaleY, k).setOrigin(0, 0).setScale(g.scaleX / RES, g.scaleY / RES).setDepth(g.depth).setVisible(g.visible).setAlpha(g.alpha).setName(g.name);
    const parent = g.parentContainer; if (parent) { parent.addAt(img, parent.getIndex(g)); parent.remove(g); } g.destroy();
    return img;
  }
  private bakeHud(): Phaser.GameObjects.Image {
    const g = this.add.graphics().setDepth(99.9), mx = 360, my = 1060;
    const panel = (x: number, w: number) => g.fillStyle(0x22252b, 0.75).fillRoundedRect(x, 70, w, 86, 24).lineStyle(4, 0xffffff, 0.85).strokeRoundedRect(x, 70, w, 86, 24);
    panel(22, 200); panel(270, 180);
    g.fillStyle(0x22252b, 1).fillRoundedRect(30, 228, 300, 18, 9).fillRoundedRect(390, 228, 300, 18, 9);
    const top = this.bake(g, 'hudtop', 18, 66, 680, 186);
    const m = this.add.graphics().setDepth(99.9);
    m.fillStyle(0x22252b, 0.8).fillRoundedRect(mx - 230, my - 14, 460, 28, 14).lineStyle(4, 0xffffff, 1).strokeRoundedRect(mx - 230, my - 14, 460, 28, 14);
    m.fillStyle(0x4ade80, 1).fillRoundedRect(mx - GREEN * 230, my - 10, GREEN * 460, 20, 10).fillStyle(0xb6ffcf, 1).fillRoundedRect(mx - PERF * 230, my - 10, PERF * 460, 20, 6);
    m.fillStyle(0x22252b, 1).fillRoundedRect(mx - 200, my + 22, 400, 10, 5);
    this.bake(m, 'hudmeter', mx - 236, my - 20, 472, 56);
    return top;
  }
  private drawHud() {
    const s = this.st, b = this.bars; b.clear();
    if (!this.hudStatic) this.hudStatic = this.bakeHud();
    this.hitsT.setText(String(s.landed)); const t = Math.ceil(s.time); this.timerT.setText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`); const tc = s.time < 10 ? '#ff6b6b' : '#fff'; if (tc !== this.timerCol) { this.timerCol = tc; this.timerT.setColor(tc); } // setColor re-renders the text every call: only on change
    this.roundT.setText(`PUPPY IN THE BAG!  •  R${s.round}`);
    // Ruby wooziness + bag stuffing bars
    b.fillStyle(0xff5c8a, 1).fillRoundedRect(33, 231, Math.max(12, 294 * s.rubyHp / RUBY_HP), 12, 6);
    if (this.ghostHp > s.pupHp) b.fillStyle(0xffffff, 1).fillRoundedRect(393, 229, Math.max(12, 294 * this.ghostHp / PUP_HP), 16, 7); // damage chunk
    if (this.barFlash > 0) b.fillStyle(0xfff27a, 1).fillRoundedRect(391, 227, Math.max(16, 298 * s.pupHp / PUP_HP), 20, 9); // bar swells + flashes on a hit
    else b.fillStyle(0x7dff9a, 1).fillRoundedRect(393, 231, Math.max(12, 294 * s.pupHp / PUP_HP), 12, 6);
    // swing meter
    const mx = 360, my = 1060;
    b.fillStyle(0xff4d6d, s.state === 'windup' ? 0.6 + 0.4 * Math.sin(this.time.now / 50) : 1).fillRoundedRect(mx + 170, my - 10, 56, 20, 10).fillRoundedRect(mx - 226, my - 10, 56, 20, 10);
    const kx = mx + Phaser.Math.Clamp(s.state === "guard" ? s.x : this.ang / ANG, -1, 1) * 230; // same 230 px scale as the green zone // guard: the real swing position (the drawn bag lags/overshoots on its spring)
    b.fillStyle(0xffffff, 1).lineStyle(5, COLORS.INK, 1).fillCircle(kx, my, 17).strokeCircle(kx, my, 17);
    if (s.meter > 0) b.fillStyle(0xffdf6b, 1).fillRoundedRect(mx - 200, my + 22, Math.max(10, 400 * s.meter / 100), 10, 5);
    this.comboT.setText(s.combo >= 2 ? `x${s.combo} COMBO` : '');
    // timing ring on the bag
    const g = this.ringG.clear(); if (!s.running) return; const bp = this.bagPos(), cy = bp.y - 10;
    g.lineStyle(6, 0x4ade80, 1); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath().arc(bp.x, cy, 70, a, a + 0.32).strokePath(); }
    if (s.state === 'guard') { const ax = Math.abs(s.x), inG = ax < GREEN; g.lineStyle(inG ? 12 : 8, inG ? 0x4ade80 : 0xffffff, inG ? 1 : 0.6).strokeCircle(bp.x, cy, 70 + ax * 150); }
    else if (s.state === 'windup' || s.state === 'punch') { const f = s.state === 'punch' ? 1 : 1 - this.stT / this.windT, late = this.stT <= 0.2;
      g.lineStyle(14, 0xffffff, 0.35).strokeCircle(bp.x, cy, 120); g.lineStyle(18, 0x2a1a14, 1).beginPath().arc(bp.x, cy, 120, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2).strokePath();
      g.lineStyle(10, late ? 0x4ade80 : 0xff4d6d, 1).beginPath().arc(bp.x, cy, 120, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2).strokePath(); }
    else if (s.state === 'open' || s.state === 'stun') g.lineStyle(10, 0x4ade80, 0.6 + 0.4 * Math.sin(this.time.now / 60)).strokeCircle(bp.x, cy, 78);
  }
  private buildCrowd() {
    const back = this.add.graphics().setDepth(0.5);
    for (let row = 0; row < 2; row++) for (let x = -20; x < W + 40; x += 38) { const y = 300 + row * 44 + (x % 3) * 4, c = [0x2b1838, 0x341d44, 0x22122f][(x / 38 + row) % 3 | 0];
      back.fillStyle(c, 1).fillCircle(x, y, 17 + row * 3).fillRoundedRect(x - 20, y + 10, 40, 40, 14); }
    const backImg = this.bake(back, 'crowd', -44, 276, W + 88, 136);
    this.tweens.add({ targets: backImg, y: backImg.y - 4, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
    const signs: [number, string, number][] = [[110, 'GO RUBY!', 0xff5c8a], [600, 'BONK THE BAG!', 0x3a86ff]];
    signs.forEach(([x, label, col], i) => { const c = this.add.container(x, 395).setDepth(0.6); const g = this.add.graphics();
      g.fillStyle(0x6b4220, 1).fillRect(-4, 0, 8, 50); g.fillStyle(col, 1).lineStyle(4, 0x22252b, 1).fillRoundedRect(-72, -34, 144, 40, 8).strokeRoundedRect(-72, -34, 144, 40, 8);
      c.add([g, txt(this, 0, -14, label, 20, '#fff', '#22252b', 4)]); this.bake(g, 'sign' + i, -76, -38, 152, 92); this.crowd.push(c);
      this.tweens.add({ targets: c, angle: { from: -8, to: 8 }, y: 385, yoyo: true, repeat: -1, duration: 500 + i * 90, ease: 'Sine.InOut' }); });
    for (let i = 0; i < 8; i++) { const st = this.add.rectangle(40 + i * 92, 380, 8, 46, [0x7dff9a, 0xff5c8a, 0x7fd8ff][i % 3]).setDepth(0.55).setAlpha(0.85).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: st, angle: { from: -30, to: 30 }, yoyo: true, repeat: -1, duration: 380 + i * 40, ease: 'Sine.InOut' }); }
  }
  private makeGloves() {
    const mk = (key: string, base: number, dark: number, light: number) => { if (this.textures.exists(key)) return;
      const g = this.make.graphics({}, false), k = 2, P = (v: number) => v * k;
      g.fillStyle(0x22252b, 1).fillEllipse(P(50), P(46), P(86), P(84)).fillRoundedRect(P(14), P(46), P(74), P(46), P(18));
      g.fillStyle(dark, 1).fillEllipse(P(50), P(46), P(76), P(74)).fillRoundedRect(P(19), P(46), P(64), P(40), P(16));
      g.fillStyle(base, 1).fillEllipse(P(46), P(42), P(64), P(62)).fillRoundedRect(P(22), P(44), P(52), P(36), P(14));
      g.fillStyle(light, 1).fillEllipse(P(38), P(28), P(34), P(22)); g.fillStyle(0xffffff, 0.85).fillEllipse(P(34), P(22), P(16), P(8));
      g.fillStyle(0x22252b, 1).fillEllipse(P(16), P(56), P(30), P(40)); g.fillStyle(base, 1).fillEllipse(P(17), P(55), P(22), P(32)); g.fillStyle(light, 0.7).fillEllipse(P(14), P(48), P(8), P(12));
      g.fillStyle(0xffffff, 0.5); for (let a = -2.4; a < -0.6; a += 0.22) g.fillCircle(P(50 + Math.cos(a) * 30), P(46 + Math.sin(a) * 30), P(1.4));
      g.fillStyle(0x22252b, 1).fillRoundedRect(P(18), P(84), P(64), P(34), P(8)); g.fillStyle(0xffffff, 1).fillRoundedRect(P(22), P(87), P(56), P(28), P(6));
      g.fillStyle(0xc9ced8, 1).fillRect(P(22), P(100), P(56), P(3)); g.lineStyle(P(2.5), dark, 1); for (let y = 90; y < 112; y += 7) { g.lineBetween(P(40), P(y), P(60), P(y + 5)); g.lineBetween(P(60), P(y), P(40), P(y + 5)); }
      g.generateTexture(key, P(100), P(120)); g.destroy(); };
    mk('bx_glove_ruby', 0xe0243a, 0x7a0614, 0xff8a96);
  }
  private drawStage(now: number) {
    const g = this.stage; g.clear(); if (this.lowQ) { const bp = this.bagPos(); g.fillStyle(0x0a1640, 0.32).fillEllipse(bp.x + 20, 1000, 300 * this.depthK, 50); return; }
    for (let i = 0; i < 2; i++) { const sx = i ? 520 : 200, cx = W / 2 + Math.sin(now / 1400 + i * 2.2) * 170;
      g.fillStyle(0xfff6d8, 0.07).fillTriangle(sx - 20, 40, cx - 170, 1000, cx + 170, 1000); g.fillStyle(0xfff6d8, 0.06).fillEllipse(cx, 1000, 360, 90); }
    if (Math.random() < 0.06) this.bulbs.push({ x: Phaser.Math.Between(20, 700), y: Phaser.Math.Between(320, 470), t: 0.18 });
    this.bulbs = this.bulbs.filter(b => (b.t -= 1 / 60) > 0);
    for (const b of this.bulbs) { g.fillStyle(0xffffff, b.t * 3).fillCircle(b.x, b.y, 5); g.fillStyle(0xffffff, b.t * 1.2).fillCircle(b.x, b.y, 20); }
    this.ropeWob *= 0.9; const wob = this.ropeWob;
    if (wob > 0.05) [560, 625, 690].forEach((y, i) => { const col = [0xff3b6b, 0xffffff, 0x3a86ff][i], sag = 18 + Math.sin(now / 40 + i) * 22 * wob;
      for (const [lw, c] of [[16, 0x22111a], [11, col]] as const) { g.lineStyle(lw, c, 1).beginPath(); g.moveTo(30, y); for (let k = 1; k <= 12; k++) g.lineTo(30 + k * 55, y + Math.sin(k / 12 * Math.PI) * sag); g.strokePath(); } });
    const bp = this.bagPos(); g.fillStyle(0x0a1640, 0.32).fillEllipse(bp.x + 20, 1000, 300 * this.depthK, 50);
  }
  finish(win: boolean, points = false) {
    const s = this.st; if (!s.running) return; // only a live round can end
    s.running = false; this.duckT.setVisible(false); this.hb.setVisible(false); this.ringG.clear();
    if (win && points) { this.setPup('stun', 99); this.rArms.to('both', RP.cheer, 200, 'Back.Out'); popBanner(this, 'WIN ON POINTS!', 400, 0x3a86ff, 900); }
    else if (win) { this.setPup('ko', 99); this.koShow(); }
    else { this.rArms.to(0, RP.dizzy, 240, 'Back.Out'); this.rArms.to(1, RP.dizzy, 300, 'Back.Out'); popBanner(this, 'RUBY IS DIZZY...', 400, 0x6b4cc9, 900); this.setFace('hearts'); this.popHead(4); say(this, 205, 300, 'Aww! Best sparring buddy EVER! ♥', 22, 1600); }
    const score = win ? s.score + Math.round(s.rubyHp * 20 + s.time * 30) : s.score;
    (window as any).__pr.ended = win ? 'win' : 'lose';
    this.time.delayedCall(win && !points ? 2400 : 1300, () => { this.cameras.main.setZoom(RES).centerOn(W / 2, H / 2); endCard(this, 'Ruby', 0, win, score, win ? (points ? `Won on points with ${s.landed} hits!` : `Bag K.O. with ${Math.ceil(s.time)}s left!`) : 'The bag swung back one time too many.', { points }); });
  }
  /** KO: Ruby steps out of frame, camera pushes in on the bag, it spins like a top, Puppy goes squishy-dizzy, legs flail, ref counts. */
  private koShow() {
    const cam = this.cameras.main; this.tweens.killTweensOf(this.ruby); this.koMode = true;
    this.tweens.add({ targets: this.ruby, y: 1650, x: W / 2 - 120, alpha: 0, duration: 420, ease: 'Quad.In' });
    cam.shake(520, 0.035); cam.flash(220, 255, 255, 255); flashVignette(this, 0xffffff, 0.8); Fx.special(); this.ropeWob = 1.5;
    cam.pan(W / 2, H / 2, 600, 'Sine.easeInOut'); cam.zoomTo(RES * 1.03, 600, 'Sine.easeInOut'); // gentle push-in: pause button + Puppy stay in frame
    this.spinPh += Math.PI * 10; this.squish = 1; this.legs.forEach((L, i) => L.v += i ? -25 : 25); this.setFace('dizzy'); this.pupStars.setVisible(true);
    popBanner(this, 'K.O.!', 400, 0xff5c8a, 1400);
    this.time.delayedCall(500, () => say(this, 520, 330, 'Wheee… best… workout… EVER! ★', 22, 1600));
    ['1!', '2!', '3!'].forEach((n, i) => this.time.delayedCall(700 + i * 420, () => { const t = comic(this, W / 2 - 160 + i * 160, 820, n, 70).setDepth(80).setScale(0.3); this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 300, onComplete: () => t.destroy() }); Fx.block(); }));
    this.crowd.forEach((c, i) => this.tweens.add({ targets: c, y: (c as any).y - 30, yoyo: true, repeat: 3, duration: 160, delay: i * 30 }));
  }
}
