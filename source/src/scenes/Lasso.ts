// BUNNY FINALE — PLAYROOM RODEO: you are Bunny, the 8 girls cheer from the pink couch.
// HOLD to twirl the lasso (longer = bigger loop), SLIDE your finger to where Puppy is GOING, LET GO to fling.
// A loop that lands on him snags him: TAP TAP TAP to reel him in (tug meter, Tail Catch style). Reeled in = hog-tied
// for a moment (clock paused), then he wriggles free. Three rounds (1 + 2 + 2 catches): 1 TROT, 2 SNEAKY (fake stops + a
// cardboard decoy), 3 ZOOMIES (he charges you: SWIPE to dodge, he faceplants = free rope). The last catch stays tied and
// Bunny drags him off by the rope.
import Phaser from 'phaser';
import { leaveOnce } from '../systems/leave';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, artScale, ensureArt } from '../art/registry';
import { pointerInMute, makeMuteButton, makeButton } from '../systems/ui';
import { txt, comic } from '../systems/fx';
import { Fx, Sfx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg } from '../systems/kit';
import { LINES, pick, CHEEKY, mix } from '../lines';
import { TESTER } from '../standalone';
import { Hud, impact } from '../systems/level';
import { Storage } from '../systems/storage';
import { TailPup } from '../systems/tailRigs';
import { bakeG } from '../systems/bake';
import { HangPup, ensureHangArt, type HangKind } from '../art/pupHang';

type Mode = 'idle' | 'twirl' | 'hold' | 'walk' | 'dizzy';
/** Bunny (stays white: same bun_rig body + su_bun limb art as BunnyRig) with a jointed lasso arm.
 *  Angles: 0 = arm hanging down, +ve rotates toward -x (clockwise), 180 = straight up, -90 = pointing right. */
class LassoBunny {
  root: Phaser.GameObjects.Container; torso: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image;
  private legs: Phaser.GameObjects.Image[]; private sh: Phaser.GameObjects.Container; private el: Phaser.GameObjects.Container; private hand: Phaser.GameObjects.Container;
  private t = 0; p = { sh: 20, el: -10, lean: 0, sq: 0, kn: 6 }; throwing = false; yank = 0;
  constructor(private scene: Phaser.Scene, x: number, y: number, private m: number) {
    this.root = scene.add.container(x, y);
    const hipY = -38 * m;
    this.legs = [-21, 21].map(lx => art(scene, lx * m, hipY, 'su_bunLeg', m));
    this.torso = scene.add.container(0, hipY);
    this.body = art(scene, 0, 0, 'bun_rig_wink', m).setOrigin(0.5, 296 / 340);
    this.sh = scene.add.container(48 * m, -52 * m);
    const upper = art(scene, 0, 0, 'su_bunUpper', m * 0.95);
    this.el = scene.add.container(0, 40 * m * 0.95);
    const fore = art(scene, 0, 0, 'su_bunFore', m * 0.95);
    this.hand = scene.add.container(0, 44 * m * 0.95);
    this.el.add([fore, this.hand]); this.sh.add([upper, this.el]); this.torso.add([this.body, this.sh]);
    this.root.add([...this.legs, this.torso]);
  }
  setDepth(d: number) { this.root.setDepth(d); return this; }
  setFace(e: string) { const k = 'bun_rig_' + e; if (this.scene.textures.exists(k)) this.body.setTexture(k); return this; }
  handPos() { const mt = this.hand.getWorldTransformMatrix(); return { x: mt.tx, y: mt.ty }; }
  private aimAt(tx: number, ty: number) { const mt = this.sh.getWorldTransformMatrix(); return Phaser.Math.RadToDeg(Math.atan2(-(tx - mt.tx), ty - mt.ty)); }
  /** throw: whip the arm from overhead down toward the target, then settle back to the idle carry. */
  throwAt(tx: number, ty: number) {
    this.throwing = true; const sc = this.scene; sc.tweens.killTweensOf(this.p);
    const aim = this.aimAt(tx, ty);
    sc.tweens.chain({ targets: this.p, tweens: [
      { sh: 200, el: -40, lean: -8, sq: -0.05, kn: 14, duration: 70, ease: 'Quad.Out' },
      { sh: aim - 15, el: 10, lean: 10, sq: 0.06, kn: 4, duration: 110, ease: 'Cubic.In' },
      { sh: aim + 10, el: 15, lean: 6, sq: 0.02, duration: 140, ease: 'Quad.Out', onComplete: () => { this.throwing = false; } }] });
  }
  stopThrow() { this.scene.tweens.killTweensOf(this.p); this.throwing = false; }
  /** mode: idle carry / twirl overhead / hold the rope taut toward tgt (tension 0..1) / walk left dragging tgt / dizzy wobble */
  update(dt: number, mode: Mode, phase = 0, tgt?: { x: number; y: number }, tension = 0) {
    this.t += dt; const p = this.p, br = Math.sin(this.t * 3.4), m = this.m; this.yank += (0 - this.yank) * (1 - Math.exp(-dt * 10));
    const ease = (k: number, o: Partial<typeof p>) => { const f = 1 - Math.exp(-dt * k); for (const key in o) (p as any)[key] += ((o as any)[key] - (p as any)[key]) * f; };
    let bob = Math.abs(Math.sin(this.t * 3.4)) * 3;
    if (!this.throwing) {
      if (mode === 'twirl') { // arm up and OUT beside her head, hand circles the loop, knees dip
        const a = phase * Math.PI * 2; ease(18, { sh: TW_SH + Math.cos(a) * 10, el: TW_EL + Math.sin(a) * 18, lean: -5 + Math.sin(a) * 3, kn: 14, sq: -0.03 });
      } else if (mode === 'hold' && tgt) { // rope taut in her paw: arm points at the knot, she leans back, heels dug in
        ease(16, { sh: this.aimAt(tgt.x, tgt.y) - p.lean, el: 8, lean: -6 - 12 * tension + this.yank, kn: 16 + 8 * tension, sq: -0.02 });
      } else if (mode === 'walk' && tgt) { // walking left, arm stretched back to the rope
        ease(12, { sh: this.aimAt(tgt.x, tgt.y) - p.lean, el: 6, lean: -9, sq: 0 }); p.kn = Math.sin(this.t * 11) * 22; bob = Math.abs(Math.sin(this.t * 11)) * 8;
      } else if (mode === 'dizzy') { ease(10, { sh: 30 + Math.sin(this.t * 9) * 40, el: -20, lean: Math.sin(this.t * 13) * 12, kn: 10, sq: -0.04 }); }
      else ease(8, { sh: 20 + br * 4, el: -10, lean: 0, kn: 6, sq: 0 });
    }
    const breathe = this.throwing || mode !== 'idle' ? 0 : br * 0.02;
    this.torso.setAngle(p.lean).setScale(1 - (p.sq + breathe) * 0.6, 1 + p.sq + breathe).setY(-38 * m - bob + Math.abs(p.kn) * 0.4);
    this.sh.setAngle(p.sh); this.el.setAngle(p.el);
    this.legs[0].setAngle(p.kn); this.legs[1].setAngle(-p.kn);
  }
}

const TW_SH = 235, TW_EL = -25; // twirl arm: shoulder/elbow angles (180 = straight up, bigger = out to her right)
/** Tuning (real touch on a phone). Times in seconds, distances in game px (720 x 1280). */
export const LK = {
  TIME: 26,            // clock (runs only while Puppy is loose: paused during the tug, the tie-up and round banners)
  NEED: 5,             // catches to win: 1 TROT warm-up, 2 SNEAKY, 2 ZOOMIES
  ROUND_AT: [0, 1, 3], // catches at which rounds 1/2/3 start
  SPIN: 0.45,          // one twirl of the loop
  HOLD_MAX: 0.9,       // hold this long for the BIG loop
  R_MIN: 62, R_MAX: 90, HIT_PAD: 26, // loop radius (small tap -> full twirl) + forgiveness around Puppy's body
  FLY: 0.42,           // loop flight time (so you LEAD him)
  SPD: [200, 280, 340],                           // Puppy run speed per round
  PAUSE: [[0.7, 1.1], [0.45, 0.8], [0.35, 0.6]], // Puppy stands still this long between dashes
  FAKE_P: [0, 0.4, 0.35], FAKE: 0.4,               // fake stop mid-dash (R2/R3), then he darts on 30% faster
  DECOY_P: 0.35, DECOY_CD: 5, DECOY_LIFE: 4,    // R2: chance per wind-up that he swaps in a cardboard Puppy
  CHARGE_FIRST: 1.2, CHARGE_EVERY: [3.2, 5.0],    // R3: Puppy charges Bunny this often (free-time seconds)
  CHARGE_WIND: 1.0, CHARGE_RUN: 0.5,              // warning (paw scrape + red ring) then the dash; swipe any time in between
  PLANT: 2.6, BONK: 0.9, FREE_PAD: 60,           // faceplant (free rope: any loop within FREE_PAD extra px hits) / Bunny bonked
  TUG0: 0.25, TUG_TAP: 0.1, TUG_PULL: [0.13, 0.17, 0.21], TUG_SURGE: 0.14, TUG_GRACE: 0.6, TUG_MIN: 1.8, // tap-fast reel-in
  TIE: 2.5,            // hog-tied moment after each catch (clock paused)
  BANNER: 1.3,         // round banner (clock paused)
};
const GIRLS = ['Ruby', 'Glassia', 'Zoe', 'Nana', 'Midnight', 'Noir', 'Iris', 'Linye'];
const ROPE = 0x8a5a2a, PM = 1.0, PS = 0.78 * PM; // Puppy rig scale; PS = px per Puppy viewBox unit
const BX = 150, BY = 1240; // Bunny's spot
const AX0 = 290, AX1 = 660, AY0 = 905, AY1 = 1190; // Puppy's floor
const KEYS = ['pt_stand', 'pt_panic', 'pt_dizzy', 'pt_tail', 'pup_box_panic', 'pup_idle', 'bun_rig_sneaky', 'bun_rig_laugh', 'bun_rig_stern', 'bun_rig_unimpressed', 'bun_rig_wink', 'bun_rig_cool',
  'bun_full_unimpressed', ...[0, 1, 2, 3, 4, 5].map(i => 'pt_run' + i), ...GIRLS.flatMap(n => ['smug', 'happy', 'dizzy', 'windup'].map(m => `full_${n}_${m}`))];
type PupS = 'run' | 'pause' | 'fake' | 'sneak' | 'wind' | 'charge' | 'crash' | 'plant' | 'bonk' | 'tug' | 'tied' | 'drag';
type Phase = 'intro' | 'free' | 'tug' | 'tied' | 'outro' | 'over';
const ROUND_NAME = ['TROT', 'SNEAKY', 'ZOOMIES'];
/** catch hangs (tie-up visuals only, timing is still LK.TIE): A/B dangle from a ceiling-beam hook by one hind ankle, C hangs by his knees from the lamp bar.
 *  x = the rope / lamp cord column (between the girls' heads), y = the snared ankle (A/B) or the bar (C); land = where he drops to and runs off from. */
const HANG = { A: { x: 400, y: 868, hookY: 46 }, C: { x: 568, y: 900 }, LAND: 1140, DROP: 0.42 };

export class LassoScene extends Phaser.Scene {
  private zoom0 = 1; // base camera zoom (hi-DPI RES), read after setupCamera
  st = LassoScene.fresh();
  static fresh() {
    return { time: LK.TIME, ropes: 0, round: 1, throws: 0, misses: 0, slips: 0, dodges: 0, plants: 0, bonks: 0, decoys: 0, score: 0,
      running: false, over: false, phase: 'intro' as Phase, pup: 'pause' as PupS, px: 480, py: 1060, hold: false, holdT: 0, tx: 450, ty: 1050, flying: false,
      tug: 0, tugT: 0, tieT: 0, clock: 0, bannerT: 0, stun: 0, dodged: false };
  }
  private bunny!: LassoBunny; private pup!: TailPup; private hud!: Hud; private roundChip!: Phaser.GameObjects.Text; private roundPill!: Phaser.GameObjects.Graphics;
  private fx!: Phaser.GameObjects.Graphics; private ropeG!: Phaser.GameObjects.Graphics; private grip!: Phaser.GameObjects.Arc; private meter!: Phaser.GameObjects.Graphics;
  private tiedC!: Phaser.GameObjects.Container; private tiedIn!: Phaser.GameObjects.Container; private girls: { img: Phaser.GameObjects.Image; n: string; x: number; y: number }[] = [];
  private gx = 480; private gy = 1060; private pauseT = 0; private fakeT = 0; private boost = 1; private face = -1; private chargeT = 0; private windT = 0; private plantT = 0;
  private cx0 = 0; private cy0 = 0; private decoy?: Phaser.GameObjects.Container; private decoyT = 0; private decoyCD = 0; private pend = false;
  private tugStart = { x: 0, y: 0 }; private surgeT = 0; private surgeLeft = 0; private tugShout = 0; private freeRope = false; private bigLoop = false;
  private tapTxt?: Phaser.GameObjects.Text; private warn: Phaser.GameObjects.GameObject[] = []; private hint?: Phaser.GameObjects.Container; private outroT = 0; private heartT = 0;
  private hang!: HangPup; private hangG!: Phaser.GameObjects.Graphics; private hangTop!: Phaser.GameObjects.Container; private lamp!: Phaser.GameObjects.Container; private lampBar!: Phaser.GameObjects.Graphics;
  private hanging: HangKind | '' = ''; private hangT = 0; private hangSeq: HangKind[] = []; private hangDrop = false; private hangFx: Phaser.GameObjects.GameObject[] = [];
  private downX = 0; private downY = 0; private downT = 0; private bxOff = 0; private dustT = 0; private lastHud = ''; private stars?: Phaser.GameObjects.Text; private first = { tug: true, plant: true };
  constructor() { super('Lasso'); }
  create() {
    setupCamera(this); this.zoom0 = this.cameras.main.zoom; /* base hi-DPI zoom (RES): the catch punch returns here, not to 1 */ this.cameras.main.fadeIn(250); setPageBg(0x3a1250, 0x8a4a1a);
    this.st = LassoScene.fresh(); const s = this.st;
    (this as any).bunny = undefined; (this as any).hud = undefined; // RETRY restarts this instance: update() must idle until build() re-creates the rig/HUD
    this.girls = []; this.warn = []; this.hanging = ''; this.hangT = 0; this.hangSeq = []; this.hangDrop = false; this.hangFx = []; this.decoy = undefined; this.tapTxt = undefined; this.hint = undefined; this.stars = undefined; this.pend = false;
    Object.assign(this, { gx: 480, gy: 1060, pauseT: 1, fakeT: 0, boost: 1, face: -1, chargeT: LK.CHARGE_FIRST, windT: 0, plantT: 0, decoyT: 0, decoyCD: 0, surgeT: 0, surgeLeft: 0, tugShout: 0,
      freeRope: false, bigLoop: false, outroT: 0, heartT: 0, bxOff: 0, dustT: 0, lastHud: '', first: { tug: true, plant: true } });
    (window as any).__pr = { scene: 'Lasso', st: s, K: LK, force: (win: boolean) => this.finish(win), pup: () => ({ x: s.px, y: s.py }), hangs: this.hangSeq, hang: '' };
    const loading = txt(this, W / 2, H / 2, 'Saddling up...', 34, '#fff', '#22252b', 6);
    Promise.all([ensureArt(this, KEYS), ensureHangArt(this)]).then(() => { if (!this.sys.isActive() && !this.sys.isPaused()) return; loading.destroy(); this.build(); });
  }
  private build() {
    const s = this.st;
    this.room();
    this.pup = new TailPup(this, s.px, s.py, PM); this.pup.setFrame('stand');
    this.tiedC = this.add.container(0, 0).setVisible(false); this.tiedIn = this.add.container(0, 0); this.tiedC.add([this.add.image(0, 4, 'su_shadow').setScale(artScale('su_shadow', 1.5), artScale('su_shadow', 0.7)), this.tiedIn]);
    this.tiedIn.add([art(this, 0, 0, 'pup_box_panic', PS), this.tiedRopes()]);
    this.buildHang();
    this.add.ellipse(BX, BY - 4, 190, 40, 0x000000, 0.28).setDepth(19);
    this.bunny = new LassoBunny(this, BX, BY, 0.9).setDepth(20);
    this.fx = this.add.graphics().setDepth(24); this.ropeG = this.add.graphics().setDepth(21); this.meter = this.add.graphics().setDepth(66);
    this.grip = this.add.circle(0, 0, 15, 0xffffff).setStrokeStyle(5, COLORS.INK).setDepth(22).setVisible(false);
    this.hud = new Hud(this, 'PLAYROOM RODEO', 0xff5c8a);
    this.roundPill = this.add.graphics().setDepth(600); this.roundChip = txt(this, W / 2, 300, '', 26, '#fff', '#22252b', 5).setDepth(601); this.setRoundChip();
    this.drawHud();
    makeMuteButton(this); makePauseButton(this, () => this.st.running && !this.st.over && (this.st.phase === 'free' || this.st.phase === 'tug'));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onUp(p));
    tutorialCard(this, 'bunny2', 'PLAYROOM RODEO!', [`You are BUNNY! 🐰 Rope Puppy ${LK.NEED} times!`, 'HOLD to twirl (longer = BIGGER loop)', 'SLIDE to where Puppy is GOING, let go to fling', 'Roped him? TAP TAP TAP to reel him in!', 'Round 3: SWIPE to dodge his charge!'], () => this.begin());
  }
  private begin() {
    popBanner(this, 'FINAL ROUND!', 700, 0xe0243a, 800);
    this.time.delayedCall(700, () => { if (this.st.over) return; this.talk(400, 860, pick(TESTER ? LINES.startBunnyTest : LINES.start.Bunny), 22, 1600); });
    this.time.delayedCall(1300, () => { if (this.st.over) return; popBanner(this, 'ROUND 1: TROT', 700, 0xff5c8a, 700); this.st.running = true; this.st.phase = 'free'; this.newLeg(); });
    this.time.delayedCall(2600, () => { if (!this.st.over) this.showHint(); });
  }
  // ---------------------------------------------------------------- the couch + girls
  private room() {
    art(this, 0, 0, 'bg_room');
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x000000, 0.25).fillEllipse(W / 2, 800, 760, 50);
    g.fillStyle(0xb8336a, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(10, 520, W - 20, 190, 40).strokeRoundedRect(10, 520, W - 20, 190, 40);
    for (let i = 0; i < 4; i++) { const x = 24 + i * 170; g.fillStyle(0xd0477f, 1).fillRoundedRect(x + 6, 534, 160, 160, 30).lineStyle(4, 0x7a1640, 1).strokeRoundedRect(x + 6, 534, 160, 160, 30);
      g.fillStyle(0xffffff, 0.12).fillRoundedRect(x + 20, 544, 130, 24, 12); }
    bakeG(this, g, 'rodeo_couchback', 0, 500, W, 340);
    GIRLS.forEach((n, i) => { const x = 50 + i * 88.5, y = 765; const img = art(this, x, y, `full_${n}_${i % 3 === 0 ? 'smug' : 'happy'}`, 0.78).setDepth(3);
      this.tweens.add({ targets: img, scaleY: img.scaleY * 1.025, duration: 900 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); this.girls.push({ img, n, x, y }); });
    const f = this.add.graphics().setDepth(4);
    f.fillStyle(0xe05a92, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(20, 688, W - 40, 56, 22).strokeRoundedRect(20, 688, W - 40, 56, 22);
    f.fillStyle(0xffffff, 0.15).fillRoundedRect(36, 694, W - 72, 14, 7);
    f.fillStyle(0x9a2556, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(24, 738, W - 48, 54, 16).strokeRoundedRect(24, 738, W - 48, 54, 16);
    [-6, W - 50].forEach(x => { f.fillStyle(0xc23c74, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(x, 600, 56, 196, 26).strokeRoundedRect(x, 600, 56, 196, 26); });
    f.fillStyle(0x3a1e0a, 1).fillRect(60, 790, 22, 18).fillRect(W - 82, 790, 22, 18);
    bakeG(this, f, 'rodeo_couchfront', -10, 590, W + 20, 230);
    const r = this.add.graphics().setDepth(1); r.fillStyle(0xc88a4a, 0.4).fillEllipse(440, 1060, 600, 330).lineStyle(5, 0xffe2a0, 0.45).strokeEllipse(440, 1060, 600, 330);
    r.lineStyle(3, 0xffe2a0, 0.25).strokeEllipse(440, 1060, 500, 260);
    bakeG(this, r, 'rodeo_rug', 130, 885, 620, 350);
  }
  private setGirl(g: { img: Phaser.GameObjects.Image; n: string }, mood: string) { const k = `full_${g.n}_${mood}`; if (this.textures.exists(k)) g.img.setTexture(k).setScale(artScale(k, 0.78)); }
  /** couch reaction: cheer (hop + YAY), gasp (O_O), party (everyone bouncing, keeps going) */
  private couch(kind: 'cheer' | 'gasp' | 'party' | 'giggle', line?: string) {
    this.girls.forEach((g, i) => {
      this.tweens.killTweensOf(g.img); g.img.setY(g.y).setAngle(0);
      if (kind === 'gasp') { this.setGirl(g, g.n === 'Glassia' ? 'windup' : 'dizzy'); this.tweens.add({ targets: g.img, y: g.y - 8, angle: i % 2 ? -4 : 4, duration: 120, yoyo: true });
        if (i % 3 === 1) this.pop(g.x + 8, 470, i % 2 ? '!?' : 'O_O', '#fff'); }
      else if (kind === 'giggle') { this.setGirl(g, 'happy'); // little giggle hops + head tilts at the hanging Puppy
        this.tweens.add({ targets: g.img, y: g.y - 10, angle: i % 2 ? 5 : -5, duration: 130, delay: i * 45, yoyo: true, repeat: 3, ease: 'Sine.InOut' });
        if (i % 2 === 1) this.time.delayedCall(i * 60, () => this.pop(g.x + 6, 465, pick(LINES.lassoGiggle), i % 4 === 1 ? '#ffdf6b' : '#fff')); }
      else { this.setGirl(g, 'happy');
        this.tweens.add({ targets: g.img, y: g.y - (i % 2 ? 34 : 22), angle: i % 2 ? 6 : -6, duration: 170, delay: i * 25, yoyo: true, repeat: kind === 'party' ? -1 : 2, ease: 'Quad.Out' });
        if (i % 2 === 0 || kind === 'party') this.pop(g.x + 6, 460, ['YAY!', '♥', '!!'][i % 3], i % 3 === 1 ? '#ff5c8a' : '#ffdf6b'); }
    });
    if (line) { const who = GIRLS.indexOf(line.split(':')[0]); const x = who >= 0 ? this.girls[who].x : W / 2; this.talk(x, 440, line, 20, 1500); }
    if (kind !== 'party') this.time.delayedCall(1100, () => { if (this.st.phase === 'outro') return; this.girls.forEach((g, i) => { this.tweens.killTweensOf(g.img); g.img.setY(g.y).setAngle(0); this.setGirl(g, i % 3 === 0 ? 'smug' : 'happy');
      this.tweens.add({ targets: g.img, scaleY: g.img.scaleY * 1.025, duration: 900 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); }); });
  }
  private pop(x: number, y: number, s: string, col: string) { const t = txt(this, x, y, s, 26, col, '#22252b', 6).setDepth(6).setAngle(Phaser.Math.Between(-10, 10)).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 150, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 700, duration: 300, onComplete: () => t.destroy() }); }
  // ---------------------------------------------------------------- input
  private onDown(p: Phaser.Input.Pointer) {
    const w = worldPoint(this, p), s = this.st; if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return;
    this.downX = w.x; this.downY = w.y; this.downT = this.time.now;
    if (s.phase === 'outro') { if (this.outroT > 0.8) this.toChampion(); return; }
    if (!s.running || s.over) return;
    if (s.phase === 'tug') return this.tap();
    if (s.phase !== 'free' || s.flying || s.stun > 0 || s.pup === 'wind' || s.pup === 'charge' || s.pup === 'crash') return;
    s.hold = true; s.holdT = 0; this.setAim(w.x, w.y); this.hint?.destroy(); this.hint = undefined;
    this.bunny.setFace('laugh');
    if (s.round === 2 && this.decoyCD <= 0 && !this.decoy && (s.pup === 'run' || s.pup === 'pause' || s.pup === 'fake') && Math.random() < LK.DECOY_P) this.makeDecoy();
  }
  private onMove(p: Phaser.Input.Pointer) {
    const s = this.st; if (!p.isDown) return; const w = worldPoint(this, p);
    if ((s.pup === 'wind' || s.pup === 'charge') && !s.dodged && Math.abs(w.x - this.downX) > 45) return this.dodge(Math.sign(w.x - this.downX));
    if (s.hold) this.setAim(w.x, w.y);
  }
  private onUp(p: Phaser.Input.Pointer) {
    const s = this.st, w = worldPoint(this, p);
    if ((s.pup === 'wind' || s.pup === 'charge') && !s.dodged && Math.abs(w.x - this.downX) > 45) return this.dodge(Math.sign(w.x - this.downX));
    if (!s.hold) return; s.hold = false; this.setAim(w.x, w.y); this.fling();
  }
  private setAim(x: number, y: number) { this.st.tx = Phaser.Math.Clamp(x, 70, 680); this.st.ty = Phaser.Math.Clamp(y, 860, 1230); }
  private loopR() { return LK.R_MIN + (LK.R_MAX - LK.R_MIN) * Math.min(1, this.st.holdT / LK.HOLD_MAX); }
  private showHint() {
    if (this.st.throws > 0) return; const c = this.hint = this.add.container(W / 2, 860).setDepth(70);
    const t = comic(this, 0, 0, 'HOLD... SLIDE to Puppy... LET GO!', 34); c.add(t); this.tweens.add({ targets: c, scale: 1.07, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  // ---------------------------------------------------------------- throw
  private fling() {
    const s = this.st; s.throws++; s.flying = true; const r = this.loopR(); this.bigLoop = s.holdT >= LK.HOLD_MAX; Fx.whoosh();
    const hp = this.bunny.handPos(), tx = s.tx, ty = s.ty; this.bunny.throwAt(tx, ty);
    const rope = this.add.graphics().setDepth(23);
    this.tweens.addCounter({ from: 0, to: 1, duration: LK.FLY * 1000, ease: 'Sine.InOut', onUpdate: (tw) => { const k = tw.getValue() ?? 0;
      const x = hp.x + (tx - hp.x) * k, y = hp.y + (ty - hp.y) * k - Math.sin(k * Math.PI) * 160, hh = this.bunny.handPos();
      const ew = r * 2 * (0.4 + k * 0.6), eh = r * 0.8 * (0.4 + k * 0.6);
      rope.clear().lineStyle(11, 0xffffff, 0.9).lineBetween(hh.x, hh.y, x, y).strokeEllipse(x, y, ew, eh).lineStyle(6, ROPE, 1).lineBetween(hh.x, hh.y, x, y).strokeEllipse(x, y, ew, eh); },
      onComplete: () => { rope.destroy(); this.land(tx, ty, r); } });
  }
  private land(x: number, y: number, r: number) {
    const s = this.st; s.flying = false; if (s.over || s.phase !== 'free') return;
    const bx = s.px, by = s.py - 70, d = Math.hypot(x - bx, (y - by) * 0.85);
    const free = s.pup === 'plant', hitPup = s.pup !== 'charge' && s.pup !== 'crash' && d < r + LK.HIT_PAD + (free ? LK.FREE_PAD : 0);
    if (!hitPup && this.decoy && Math.hypot(x - this.decoy.x, (y - (this.decoy.y - 70)) * 0.85) < r + LK.HIT_PAD) { // roped the cardboard one
      s.misses++; Fx.block(); this.floorLoop(this.decoy.x, this.decoy.y, r); floatText(this, this.decoy.x, this.decoy.y - 220, 'CARDBOARD!', '#ff8a8a', 40);
      const dc = this.decoy; this.decoy = undefined; this.tweens.add({ targets: dc, angle: -88, y: dc.y + 10, duration: 260, ease: 'Quad.In' }); this.tweens.add({ targets: dc, alpha: 0, delay: 700, duration: 300, onComplete: () => dc.destroy() });
      this.couch('gasp'); this.bunny.setFace('unimpressed'); this.time.delayedCall(700, () => this.bunny.setFace('wink'));
      if (s.time <= 0) this.finish(false); return;
    }
    if (hitPup) return this.snag(free);
    s.misses++; this.floorLoop(x, y, r); Fx.save(); floatText(this, x, y - 120, 'MISS', '#fff', 30); this.bunny.setFace('stern'); this.time.delayedCall(600, () => this.bunny.setFace('wink'));
    if (Math.random() < 0.35) this.talk(400, 860, pick(LINES.lassoMiss), 22, 1000);
    if (s.misses % 3 === 0) this.couch('gasp');
    if (s.time <= 0) this.finish(false);
  }
  private floorLoop(x: number, y: number, r: number) { this.dust(x, y, 8); const lr = this.add.ellipse(x, y, r * 2, r * 0.8).setStrokeStyle(7, ROPE, 1).setDepth(8).setAlpha(0.9);
    this.tweens.add({ targets: lr, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 500, onComplete: () => lr.destroy() }); }
  // ---------------------------------------------------------------- tug
  private snag(free: boolean) {
    const s = this.st; s.phase = 'tug'; s.pup = 'tug'; s.tug = LK.TUG0; s.tugT = 0; this.freeRope = free; this.clearWarn(); this.stars?.destroy(); this.stars = undefined;
    this.pup.root.setAngle(0); this.pup.inner.setAngle(0); this.pup.squash(1, 1);
    this.tugStart = { x: s.px, y: s.py }; this.surgeT = 0.9; this.surgeLeft = 0; this.tugShout = 0.6; this.face = 1; this.pup.flip(false);
    Fx.punch(); this.cameras.main.shake(120, 0.006); this.dust(s.px, s.py, 10);
    this.word(s.px, s.py - 240, free ? 'FREE ROPE!' : 'SNAGGED!', 54, 500);
    this.bunny.setFace('stern'); this.bunny.stopThrow();
    if (Math.random() < 0.5) this.talk(330, 860, pick(LINES.lassoTug), 22, 1000);
    this.tapPrompt(); this.drawMeter();
  }
  private tap() {
    const s = this.st; s.tug = Math.min(this.tugCap(), s.tug + LK.TUG_TAP); this.bunny.yank = -9; Fx.combo(Math.round(s.tug * 10)); Sfx.click();
    if (s.tug >= 1) this.reeled();
  }
  private tugCap() { return LK.TUG0 + (1 - LK.TUG0) * Math.min(1, this.st.tugT / LK.TUG_MIN); }
  private tapPrompt() {
    this.tapTxt?.destroy(); const big = this.first.tug; this.first.tug = false;
    const t = this.tapTxt = comic(this, W / 2, 480, big ? 'TAP TAP TAP\nto reel him in!' : 'TAP TAP TAP!', big ? 50 : 46).setDepth(67).setAngle(-4).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out', onComplete: () => this.tweens.add({ targets: t, scale: 1.1, duration: 170, yoyo: true, repeat: -1, ease: 'Sine.InOut' }) });
  }
  private endTug() { if (this.tapTxt) { this.tweens.killTweensOf(this.tapTxt); this.tapTxt.destroy(); this.tapTxt = undefined; } this.meter.clear(); }
  private drawMeter() {
    const m = this.meter, y = 395, f = Phaser.Math.Clamp(this.st.tug, 0, 1), cap = this.tugCap(); m.clear();
    m.fillStyle(0x22252b, 1).fillRoundedRect(90, y - 30, 540, 60, 30);
    m.fillStyle(0xff5c8a, 1).fillRoundedRect(98, y - 22, Math.max(24, 524 * f), 44, { tl: 22, bl: 22, tr: 0, br: 0 });
    if (f < 0.99) m.fillStyle(0xc27230, 1).fillRoundedRect(98 + 524 * f, y - 22, 524 * (1 - f), 44, { tl: 0, bl: 0, tr: 22, br: 22 });
    if (cap < 0.999) m.lineStyle(4, 0xffffff, 0.6).lineBetween(98 + 524 * cap, y - 22, 98 + 524 * cap, y + 22);
    m.fillStyle(0xffffff, 1).lineStyle(5, 0x22252b, 1).fillCircle(98 + 524 * f, y, 28).strokeCircle(98 + 524 * f, y, 28);
  }
  private updTug(dt: number) {
    const s = this.st, r = s.round - 1; s.tugT += dt;
    if (s.tugT > LK.TUG_GRACE) {
      let drain = LK.TUG_PULL[r];
      this.surgeT -= dt; if (this.surgeT <= 0) { this.surgeT = Phaser.Math.FloatBetween(0.9, 1.4); if (Math.random() < 0.45) { this.surgeLeft = 0.4; this.shout(); } }
      if (this.surgeLeft > 0) { this.surgeLeft -= dt; drain += LK.TUG_SURGE / 0.4; }
      s.tug -= drain * dt;
      if (s.tug <= 0) return this.slip();
    }
    this.tugShout -= dt; if (this.tugShout <= 0) { this.tugShout = Phaser.Math.FloatBetween(1.2, 1.8); if (this.surgeLeft <= 0 && Math.random() < 0.5) this.shout(); }
    const k = Phaser.Math.Clamp((s.tug - LK.TUG0) / (1 - LK.TUG0), 0, 1), end = { x: BX + 205, y: BY - 55 };
    const tx = this.tugStart.x + (end.x - this.tugStart.x) * k, ty = this.tugStart.y + (end.y - this.tugStart.y) * k, f = 1 - Math.exp(-dt * 8);
    s.px += (tx - s.px) * f + (this.surgeLeft > 0 ? 40 * dt : 0); s.py += (ty - s.py) * f;
    this.pup.inner.setAngle(10 + Math.sin(this.time.now / 60) * 3);
    this.pup.update(dt, 2.6, 1); this.pup.root.setPosition(s.px, s.py);
    this.drawMeter();
  }
  private shout() { const s = this.st; floatText(this, s.px + 40, s.py - 210, pick(LINES.lassoTugPup), '#ffdf6b', 32); }
  private slip() {
    const s = this.st; s.slips++; this.endTug(); Fx.boing(); this.bunny.setFace('unimpressed'); this.bunny.p.sq = -0.2;
    const b = comic(this, W / 2, 600, pick(LINES.lassoSlip), 60).setDepth(66).setAngle(-6).setScale(0.3);
    this.tweens.add({ targets: b, scale: 1, duration: 170, ease: 'Back.Out' }); this.tweens.add({ targets: b, alpha: 0, y: b.y - 50, delay: 900, duration: 300, onComplete: () => b.destroy() });
    this.floorLoop(s.px, s.py, 60); this.couch('gasp');
    s.phase = 'free'; this.escape(); this.fakeT = -1; /* wriggled free: a real dash-off, no fake stop */ this.time.delayedCall(700, () => this.bunny.setFace('wink'));
    if (s.time <= 0) this.finish(false);
  }
  // ---------------------------------------------------------------- caught: hog-tied
  private reeled() {
    const s = this.st; this.endTug(); s.ropes++; s.phase = 'tied'; s.pup = 'tied'; s.tieT = 0; this.heartT = 0.2;
    const pts = 1000 + (this.bigLoop ? 300 : 0) + (this.freeRope ? 500 : 0) + (s.round - 1) * 200; s.score += pts;
    const cx = s.px, cy = s.py; this.pup.root.setVisible(false); this.startHang(this.nextHang());
    this.cameras.main.shake(140, 0.008); const z0 = this.zoom0; this.cameras.main.zoomTo(z0 * 1.05, 90, Phaser.Math.Easing.Quadratic.Out); this.time.delayedCall(160, () => this.cameras.main.zoomTo(z0, 220, Phaser.Math.Easing.Quadratic.InOut));
    Fx.goal(); impact(this, cx + 40, 600, pick(['YEE-HAW!', 'ROPED!', 'GOTCHA!']), pts, this.freeRope ? 'FREE ROPE!' : this.bigLoop ? 'BIG LOOP!' : '', true);
    this.confetti(cx, cy - 120); this.bunny.setFace('laugh'); this.hud.pop(); this.drawHud(true);
    if (s.ropes < LK.NEED) { this.couch('cheer', Math.random() < 0.4 ? pick(LINES.lassoCouchCheer) : undefined); if (Math.random() < 0.3) this.time.delayedCall(1200, () => this.talk(330, 860, pick(LINES.lassoHit), 22, 900)); }
    else this.win();
  }
  private updTied(dt: number) {
    const s = this.st; s.tieT += dt; this.heartT -= dt;
    if (this.hanging) this.updHang(dt);
    if (this.heartT <= 0) { this.heartT = 0.7; if (this.hanging && !this.hangDrop) { const h = this.hang.head(); this.hearts(h.x, h.y + 10, 2, true); } else if (!this.hanging) this.hearts(s.px, s.py - 232 * PS, 2); } // hearts from his HEAD only
    if (s.phase === 'tied' && !s.over && s.tieT >= LK.TIE) this.untie();
  }
  private untie() {
    const s = this.st; this.clearWarn();
    if (this.hanging) { this.endHang(); this.pup.root.setVisible(true).setPosition(s.px, s.py); this.pup.setFrame('stand'); this.pup.flip(false); }
    else { this.tweens.killTweensOf(this.tiedIn); this.tiedC.setVisible(false); this.pup.root.setVisible(true);
      Fx.boing(); this.word(s.px, s.py - 200, 'POP!', 50, 300);
      for (let i = 0; i < 3; i++) { const e = this.add.ellipse(s.px, s.py - 30 - i * 25, 120, 34).setStrokeStyle(7, ROPE).setDepth(30);
        this.tweens.add({ targets: e, x: e.x + (i - 1) * 140, y: e.y - 60 + i * 30, angle: (i - 1) * 90, alpha: 0, duration: 500, onComplete: () => e.destroy() }); } }
    s.phase = 'free'; this.bunny.setFace('wink'); this.escape();
    const nr = s.ropes >= LK.ROUND_AT[2] ? 3 : s.ropes >= LK.ROUND_AT[1] ? 2 : 1;
    if (nr !== s.round) { s.round = nr; s.bannerT = LK.BANNER; this.setRoundChip(); popBanner(this, `ROUND ${nr}: ${ROUND_NAME[nr - 1]}!`, 700, nr === 3 ? 0xe0243a : 0x6b4cc9, 900);
      this.time.delayedCall(500, () => this.talk(400, 860, LINES.lassoRound[nr - 2], 22, 1400)); this.chargeT = LK.CHARGE_FIRST; }
    if (s.time <= 0) this.finish(false);
  }
  // ---------------------------------------------------------------- caught: the hang (tie-up VISUALS only; timing/clock are untouched)
  private buildHang() {
    const hx = HANG.A.x, cx = HANG.C.x, by = HANG.C.y;
    this.hang = new HangPup(this, PM); this.hangG = this.add.graphics().setDepth(13);
    const top = this.add.graphics(); // ceiling beam across the top edge + the hook (under the HUD)
    top.fillStyle(0x6b3f1c, 1).lineStyle(5, COLORS.INK, 1).fillRect(-10, -6, W + 20, 40).strokeRect(-10, -6, W + 20, 40);
    top.fillStyle(0x8a5a2a, 1).fillRect(-10, 2, W + 20, 10); top.fillStyle(0x3a1e0a, 1); [70, 250, 470, 650].forEach(x => top.fillCircle(x, 18, 5));
    top.lineStyle(6, COLORS.INK, 1).fillStyle(0xd9a93a, 1).fillRect(hx - 12, 30, 24, 8).strokeRect(hx - 12, 30, 24, 8);
    top.lineStyle(10, COLORS.INK, 1).strokeCircle(hx, HANG.A.hookY - 2, 9).lineStyle(5, 0xffd36b, 1).strokeCircle(hx, HANG.A.hookY - 2, 9);
    this.hangTop = this.add.container(0, 0, [top]).setDepth(5).setVisible(false);
    const l = this.add.graphics(); // the LAMP for hang C: lowered on a long cord so the shade sits below the couch, clear of every girl
    l.lineStyle(9, COLORS.INK, 1).lineBetween(cx, 0, cx, 800).lineStyle(4, 0x4a3a30, 1).lineBetween(cx, 0, cx, 800);
    l.fillStyle(0xfff3b0, 0.22).fillEllipse(cx, 880, 300, 120);
    l.fillStyle(0xffd36b, 1).lineStyle(5, COLORS.INK, 1).fillCircle(cx, 846, 14).strokeCircle(cx, 846, 14);
    l.fillStyle(0xff8fb6, 1).fillPoints([{ x: cx - 24, y: 798 }, { x: cx + 24, y: 798 }, { x: cx + 56, y: 846 }, { x: cx - 56, y: 846 }], true);
    l.strokePoints([{ x: cx - 24, y: 798 }, { x: cx + 24, y: 798 }, { x: cx + 56, y: 846 }, { x: cx - 56, y: 846 }], true);
    l.fillStyle(0xffffff, 0.35).fillRect(cx - 18, 806, 8, 30);
    l.lineStyle(7, COLORS.INK, 1).lineBetween(cx - 44, 846, cx - 80, by).lineBetween(cx + 44, 846, cx + 80, by).lineStyle(3, 0xc9c9d6, 1).lineBetween(cx - 44, 846, cx - 80, by).lineBetween(cx + 44, 846, cx + 80, by);
    this.lamp = this.add.container(0, 0, [l]).setDepth(6).setVisible(false);
    this.lampBar = this.add.graphics().setDepth(14).setVisible(false); // the bar sits IN FRONT of his shins: his knees hook over it
    this.lampBar.fillStyle(0xd9a93a, 1).lineStyle(5, COLORS.INK, 1).fillRoundedRect(cx - 96, by - 8, 192, 16, 8).strokeRoundedRect(cx - 96, by - 8, 192, 16, 8);
    this.lampBar.fillStyle(0xffffff, 0.45).fillRect(cx - 86, by - 4, 172, 3);
  }
  /** a shuffled A/B/C first, then never the same hang twice in a row */
  private nextHang(): HangKind {
    const seq = this.hangSeq, all: HangKind[] = ['A', 'B', 'C'], prev = seq[seq.length - 1];
    const pool = seq.length < 3 ? all.filter(k => !seq.includes(k)) : all.filter(k => k !== prev);
    const k = pool[Math.floor(Math.random() * pool.length)]; seq.push(k); (window as any).__pr.hang = k; return k;
  }
  private startHang(kind: HangKind) {
    const s = this.st, C = kind === 'C', x = C ? HANG.C.x : HANG.A.x, y = C ? HANG.C.y : HANG.A.y;
    this.cloud(s.px, s.py - 80); Fx.whoosh();
    this.hanging = kind; this.hangT = 0; this.hangDrop = false; this.hangSide = s.px < x ? -1 : 1; // he swings in from the side he was caught on
    this.hang.start(kind, x, y).root.setDepth(10 + (HANG.LAND - 900) / 100);
    this.hangAng = 180; this.hangG.clear().setAlpha(1); this.hangTop.setVisible(!C); this.lamp.setVisible(C).setAlpha(1); this.lampBar.setVisible(C).setAlpha(1);
    s.px = x; s.py = HANG.LAND; // he drops here and runs off from here
    this.word(x + (C ? -150 : 150), C ? 1000 : 960, kind === 'B' ? 'SPIN!' : 'YOINK!', 46, 450, kind === 'A' ? 6 : -6);
    if (C) { const coil = this.add.graphics().setDepth(8); // no tie for C: the lasso lies loose on the rug
      [[0, 0, 110, 34], [8, -4, 84, 26], [-6, 3, 64, 20]].forEach(([dx, dy, w, h]) => coil.lineStyle(11, 0xffffff, 0.9).strokeEllipse(330 + dx, 1180 + dy, w, h).lineStyle(6, ROPE, 1).strokeEllipse(330 + dx, 1180 + dy, w, h));
      coil.lineStyle(6, ROPE, 1).lineBetween(385, 1180, 430, 1192); this.hangFx.push(coil); }
    if (kind === 'B') for (let i = 0; i < 3; i++) this.hangFx.push(txt(this, x, y, '★', 30, '#ffdf6b', '#22252b', 5).setDepth(41));
    const bun = C ? LINES.lassoLampBun : LINES.lassoHangBun, pup = kind === 'A' ? LINES.lassoHangPup : kind === 'B' ? LINES.lassoSpinPup : LINES.lassoLampPup;
    this.time.delayedCall(350, () => { if (this.hanging === kind) this.talk(230, 860, pick(bun), 22, 1100); });
    this.time.delayedCall(1250, () => { if (this.hanging === kind && !this.st.over) this.talk(x, 1190, pick(pup), 22, 1150); });
    this.time.delayedCall(1200, () => { if (this.hanging === kind && this.st.phase === 'tied' && !this.st.over) this.couch('giggle'); }); // (5th catch: the couch is already partying)
  }
  private hangSide = 1; private hangAng = 180;
  private updHang(dt: number) {
    const s = this.st, k = this.hanging, h = this.hang, t = (this.hangT += dt), g = this.hangG.clear();
    if (!k) return;
    h.update(dt, 0.5, 5);
    if (!this.hangDrop) {
      if (k === 'C') { // by the knees: swings in, settles into a gentle sway under the bar
        const th = this.hangSide * (6 + 12 * Math.exp(-1.7 * t)) * Math.cos(t * Math.PI * 2 / 1.15);
        this.hangAng = 180 - th; h.root.setPosition(HANG.C.x, HANG.C.y).setAngle(this.hangAng);
      } else { // pendulum on the long rope from the hook; B also spins slowly on it
        const L = HANG.A.y - HANG.A.hookY, amp = k === 'A' ? 3.5 + 6 * Math.exp(-1.3 * t) : 2 + 4 * Math.exp(-1.5 * t); // long rope: a few degrees is a gentle sway
        const th = this.hangSide * amp * Math.cos(t * Math.PI * 2 / 1.6), r = Phaser.Math.DegToRad(th);
        this.hangAng = 180 - th; h.root.setPosition(HANG.A.x + Math.sin(r) * L, HANG.A.hookY + Math.cos(r) * L).setAngle(this.hangAng);
        if (k === 'B') h.root.scaleX = Math.cos(Math.PI * 2 * (0.42 * t + 0.8 * (1 - Math.exp(-1.6 * t)))); // twirls on the rope, winding down to a lazy spin
      }
      if (!s.over && t >= LK.TIE - HANG.DROP) this.dropHang();
    }
    if (k !== 'C') { // the rope + the snare loop around ONE hind ankle
      const a = h.root, top = this.hangDrop ? this.ropeTop : { x: HANG.A.x, y: HANG.A.hookY };
      const end = this.hangDrop ? this.ropeEnd : { x: a.x, y: a.y };
      g.lineStyle(10, 0xffffff, 0.95).lineBetween(top.x, top.y, end.x, end.y).lineStyle(5, ROPE, 1).lineBetween(top.x, top.y, end.x, end.y);
      if (!this.hangDrop) { const w = 30 * Math.max(0.35, Math.abs(a.scaleX)); g.lineStyle(10, 0xffffff, 0.95).strokeEllipse(a.x, a.y + 3, w, 13).lineStyle(5, ROPE, 1).strokeEllipse(a.x, a.y + 3, w, 13); }
    }
    if (k === 'B') { const hd = h.head(); this.hangFx.forEach((o, i) => { if (o instanceof Phaser.GameObjects.Text) { const a = t * 4 + i * 2.094; o.setPosition(hd.x + Math.cos(a) * 62, hd.y + 52 + Math.sin(a) * 16).setDepth(Math.sin(a) > 0 ? 41 : 11).setAlpha(this.hangDrop ? 0 : 1); } }); }
  }
  private ropeTop = { x: 0, y: 0 }; private ropeEnd = { x: 0, y: 0 };
  /** the last moment of the tie-up: the snare / his knees let go, he flips over and lands on his feet (swapping to the normal standing frame mid-flip) */
  private dropHang() {
    const s = this.st, h = this.hang, k = this.hanging; this.hangDrop = true; Fx.boing();
    const a = h.root; this.ropeTop = { x: HANG.A.x, y: HANG.A.hookY }; this.ropeEnd = { x: a.x, y: a.y };
    this.word(Math.min(a.x + 70, W - 120), a.y - 10, k === 'C' ? 'WHOOPS!' : 'POP!', 44, 260);
    if (k !== 'C') { this.tweens.add({ targets: this.ropeEnd, x: HANG.A.x, y: HANG.A.hookY + 30, duration: 260, ease: 'Quad.In' });
      const e = this.add.ellipse(a.x, a.y, 34, 14).setStrokeStyle(6, ROPE).setDepth(30); this.tweens.add({ targets: e, x: e.x + 90 * this.hangSide, y: e.y - 70, angle: 200, alpha: 0, duration: 420, onComplete: () => e.destroy() }); }
    h.pivotTo(100, 166); // spin about his middle
    const u = PS, p = { a: this.hangAng, x: a.x, y: a.y, sx: a.scaleX }, ty = s.py - (238 - 166) * u; let swapped = false;
    this.tweens.add({ targets: p, a: this.hangAng > 180 ? 360 : 0, x: s.px, sx: 1, duration: (HANG.DROP - 0.06) * 1000, ease: 'Sine.InOut',
      onUpdate: () => { a.setAngle(p.a).setX(p.x); a.scaleX = p.sx; if (!swapped && Math.abs(p.a - 180) >= 90) { swapped = true; h.upright(); } } });
    this.tweens.add({ targets: p, y: ty, duration: (HANG.DROP - 0.06) * 1000, ease: 'Quad.In', onUpdate: () => a.setY(p.y), onComplete: () => this.dust(s.px, s.py, 6) });
  }
  private endHang(fade = true) {
    this.hanging = ''; this.hangDrop = false; this.hang.hide(); this.hangG.clear(); this.hangTop.setVisible(false);
    const objs = [this.lamp, this.lampBar, ...this.hangFx]; this.hangFx = [];
    objs.forEach(o => { this.tweens.killTweensOf(o); if (fade && (o === this.lamp || o === this.lampBar) && (o as any).visible) this.tweens.add({ targets: o, alpha: 0, duration: 350, onComplete: () => (o as any).setVisible(false) });
      else if (o === this.lamp || o === this.lampBar) (o as any).setVisible(false); else if (o instanceof Phaser.GameObjects.Graphics) this.tweens.add({ targets: o, alpha: 0, duration: 350, onComplete: () => o.destroy() }); else o.destroy(); });
  }
  /** 5th catch: the outro drag needs the hog-tied bundle, so the hang turns into it in a puff right where he would have landed */
  private hangToTied() {
    if (!this.hanging) return; const s = this.st; this.endHang(); this.cloud(s.px, s.py - 70); Fx.boing();
    this.tiedC.setVisible(true).setPosition(s.px, s.py).setDepth(this.pup.root.depth); this.tweens.killTweensOf(this.tiedIn); this.tiedIn.setAngle(0).setX(0);
    this.tweens.add({ targets: this.tiedIn, angle: { from: -7, to: 7 }, duration: 110, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: this.tiedIn, x: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: -1 });
  }
  // ---------------------------------------------------------------- Puppy AI
  private spd() { return LK.SPD[this.st.round - 1]; }
  private newLeg(far = false) {
    const s = this.st; let best = { x: 480, y: 1050 }, bd = -1;
    for (let i = 0; i < 8; i++) { const x = Phaser.Math.Between(AX0, AX1), y = Phaser.Math.Between(AY0, AY1), d = Math.hypot(x - s.px, (y - s.py) * 1.3);
      const sc = (far ? d : Math.min(d, 260) + Math.random() * 60) - (x < 340 && y > 1100 ? 200 : 0); if (d > 120 && sc > bd) { bd = sc; best = { x, y }; } }
    this.gx = best.x; this.gy = best.y; s.pup = 'run'; this.fakeT = Math.random() < LK.FAKE_P[s.round - 1] ? Phaser.Math.FloatBetween(0.25, 0.5) : -1;
  }
  private escape() { this.boost = 1.5; this.newLeg(true); }
  private updPup(dt: number) {
    const s = this.st; const p = this.pup;
    if (s.pup === 'run' || s.pup === 'sneak') {
      const sp = (s.pup === 'sneak' ? 150 : this.spd()) * this.boost, dx = this.gx - s.px, dy = this.gy - s.py, d = Math.hypot(dx, dy);
      if (this.fakeT > 0 && s.pup === 'run') { this.fakeT -= dt; if (this.fakeT <= 0) { s.pup = 'fake'; this.pauseT = LK.FAKE; p.setFrame('stand'); floatText(this, s.px, s.py - 210, '?!', '#fff', 30); } }
      if (s.pup === 'run' || s.pup === 'sneak') {
        if (d < sp * dt + 2) { s.px = this.gx; s.py = this.gy; s.pup = 'pause'; this.boost = 1; const [a, b] = LK.PAUSE[s.round - 1]; this.pauseT = Phaser.Math.FloatBetween(a, b); p.setFrame('stand'); }
        else { s.px += dx / d * sp * dt; s.py += dy / d * sp * dt; if (Math.abs(dx) > 4) this.face = dx < 0 ? -1 : 1; p.flip(this.face < 0); p.update(dt, s.pup === 'sneak' ? 0.5 : sp / 200, 1); this.runDust(dt, dx / d); }
      }
    } else if (s.pup === 'pause' || s.pup === 'fake') {
      this.pauseT -= dt; p.update(dt, 0, 1.4);
      if (this.pauseT <= 0) { if (s.pup === 'fake') { s.pup = 'run'; this.boost = 1.3; } else this.newLeg(); }
    } else if (s.pup === 'wind') {
      this.windT -= dt; p.update(dt, 0, 2); p.root.setX(s.px + Math.sin(this.time.now / 25) * 3);
      if (this.windT <= 0) { s.pup = 'charge'; this.windT = LK.CHARGE_RUN; this.cx0 = s.px; this.cy0 = s.py; Fx.whoosh(); }
    } else if (s.pup === 'charge') {
      this.windT -= dt; const k = 1 - Math.max(0, this.windT) / LK.CHARGE_RUN, ix = BX + 60, iy = BY - 30;
      s.px = this.cx0 + (ix - this.cx0) * k; s.py = this.cy0 + (iy - this.cy0) * k; p.update(dt, 3, 1); p.squash(1.12, 0.92); this.runDust(dt, -1);
      if (this.windT <= 0) this.impactCharge();
    } else if (s.pup === 'crash') { p.update(dt, 0, 0); }
    else if (s.pup === 'plant') {
      this.plantT -= dt; p.update(dt, 0, 0.3); if (this.stars) this.stars.setPosition(s.px + Math.cos(this.time.now / 150) * 40, s.py - 90 + Math.sin(this.time.now / 150) * 10);
      if (this.plantT <= 0 && !s.flying) { this.stars?.destroy(); this.stars = undefined; this.clearWarn(); p.inner.setAngle(0); p.root.setAngle(0); Fx.boing(); this.escape(); }
    } else if (s.pup === 'bonk') { p.update(dt, 2.5, 1); }
    if (s.phase === 'free' && s.pup !== 'charge' && s.pup !== 'crash' && s.pup !== 'bonk') { s.px = Phaser.Math.Clamp(s.px, s.pup === 'plant' ? 200 : AX0 - 20, AX1 + 10); s.py = Phaser.Math.Clamp(s.py, AY0, AY1 + 20); }
    if (s.pup !== 'wind') p.root.setPosition(s.px, s.py); p.root.setDepth(10 + (s.py - 900) / 100);
    // round 3: charge timer
    if (s.round === 3 && s.phase === 'free' && !s.flying && !s.hold && (s.pup === 'run' || s.pup === 'pause')) { this.chargeT -= dt; if (this.chargeT <= 0) this.startCharge(); }
    // round 2: decoy timers
    this.decoyCD -= dt; if (this.decoy) { this.decoyT -= dt; if (this.decoyT <= 0) { const dc = this.decoy; this.decoy = undefined; this.tweens.add({ targets: dc, alpha: 0, angle: 80, duration: 300, onComplete: () => dc.destroy() }); } }
  }
  private runDust(dt: number, dir: number) { this.dustT -= dt; if (this.dustT > 0) return; this.dustT = 0.11; const s = this.st;
    const d = this.add.circle(s.px - Math.sign(dir || 1) * 30, s.py + 4, Phaser.Math.Between(8, 14), 0xd8b080, 0.6).setDepth(this.pup.root.depth - 0.01);
    this.tweens.add({ targets: d, scale: 2, alpha: 0, y: d.y - 16, duration: 400, onComplete: () => d.destroy() }); }
  private makeDecoy() {
    const s = this.st; s.decoys++; this.decoyCD = LK.DECOY_CD; this.decoyT = LK.DECOY_LIFE;
    const c = this.decoy = this.add.container(s.px, s.py).setDepth(this.pup.root.depth);
    const stand = this.add.graphics(); stand.fillStyle(0x8a5a2a, 1).lineStyle(4, COLORS.INK, 1).fillTriangle(20, 0, 60, 0, 30, -110).strokeTriangle(20, 0, 60, 0, 30, -110);
    const img = art(this, 0, 0, 'pup_idle', PS).setTint(0xe6c48e).setFlipX(this.face < 0);
    c.add([stand, img]);
    this.cloud(s.px, s.py - 80); Fx.boing(); floatText(this, s.px, s.py - 230, 'ZOE DECOY!', '#ffdf6b', 30);
    if (Math.random() < 0.5) this.talk(400, 860, pick(LINES.lassoTrick), 22, 1100); else if (Math.random() < 0.6) this.couch('gasp', pick(LINES.lassoCouchTip));
    s.pup = 'sneak'; this.fakeT = -1; const goLeft = s.px > 480; this.gx = goLeft ? Phaser.Math.Between(AX0, 380) : Phaser.Math.Between(560, AX1); this.gy = Phaser.Math.Between(AY0, AY1);
    s.px += goLeft ? -40 : 40; // pops out from behind the cutout
  }
  private startCharge() {
    const s = this.st; s.pup = 'wind'; s.dodged = false; this.windT = LK.CHARGE_WIND; this.chargeT = Phaser.Math.FloatBetween(LK.CHARGE_EVERY[0], LK.CHARGE_EVERY[1]);
    if (s.hold) { s.hold = false; this.bunny.setFace('unimpressed'); }
    this.face = -1; this.pup.flip(true); this.pup.setFrame('stand'); Fx.alert();
    const ex = txt(this, s.px, s.py - 220, '!', 70, '#ff3b3b', '#22252b', 8).setDepth(70); this.tweens.add({ targets: ex, scale: 1.3, duration: 120, yoyo: true, repeat: 3 });
    const ring = this.add.ellipse(BX + 20, BY - 20, 300, 110).setStrokeStyle(8, 0xff3b3b, 0.9).setDepth(18); this.tweens.add({ targets: ring, scaleX: 0.55, scaleY: 0.55, duration: (LK.CHARGE_WIND + LK.CHARGE_RUN) * 1000 });
    const pr = comic(this, W / 2, 860, '◀ SWIPE to DODGE! ▶', 46).setDepth(70); this.tweens.add({ targets: pr, scale: 1.1, duration: 150, yoyo: true, repeat: -1 });
    this.warn.push(ex, ring, pr); if (Math.random() < 0.35) this.couch('gasp', pick(LINES.lassoCouchCharge));
  }
  private dodge(dir: number) {
    const s = this.st; s.dodged = true; s.dodges++; s.hold = false; Sfx.jump();
    const to = dir < 0 ? -95 : 160; this.tweens.killTweensOf(this); this.tweens.add({ targets: this, bxOff: to, duration: 160, ease: 'Quad.Out' });
    this.bunny.setFace('cool'); floatText(this, BX + to, BY - 300, 'DODGE!', '#7dff9a', 40);
  }
  private impactCharge() {
    const s = this.st; this.clearWarn();
    if (s.dodged) { // he zooms through where she stood, bonks the wall, bounces back into a faceplant
      s.pup = 'crash'; s.plants++; const wx = -30; this.tweens.add({ targets: s, px: wx, duration: 160, ease: 'Quad.In', onComplete: () => {
        Fx.punch(); this.cameras.main.shake(180, 0.012); this.word(110, BY - 220, 'BONK!', 60, 400, 8);
        this.tweens.add({ targets: this, bxOff: 0, duration: 260, ease: 'Quad.InOut' }); this.bunny.setFace('laugh');
        this.pup.setFrame('dizzy'); this.pup.flip(false);
        this.tweens.add({ targets: s, px: 330, duration: 450, ease: 'Sine.Out' }); this.tweens.add({ targets: s, py: { from: BY - 30, to: BY - 60 }, duration: 450, ease: 'Sine.Out' });
        this.tweens.add({ targets: this.pup.inner, angle: 720 + 90, duration: 450, onComplete: () => this.plant() }); } });
    } else { // BONK: he bowls Bunny over and scampers off laughing
      s.bonks++; s.stun = LK.BONK; Fx.ouch(); this.cameras.main.shake(200, 0.014); this.bunny.setFace('unimpressed'); this.word(BX + 60, BY - 330, 'BONK!', 64, 500);
      this.talk(400, 860, pick(LINES.lassoBonk), 22, 1200); this.couch('gasp');
      s.pup = 'bonk'; this.pup.flip(false); this.tweens.add({ targets: s, px: 420, py: 1080, duration: 450, ease: 'Quad.Out', onComplete: () => { this.pup.squash(1, 1); if (s.pup === 'bonk') this.escape(); } });
    }
  }
  private plant() {
    const s = this.st; if (s.phase !== 'free' || s.pup !== 'crash') return; s.pup = 'plant'; this.plantT = LK.PLANT; this.pup.squash(1, 1); this.pup.inner.setAngle(90);
    this.dust(s.px, s.py, 12); Fx.save(); this.couch('cheer');
    this.word(s.px + 30, s.py - 230, 'FACEPLANT!', 56, 900);
    this.time.delayedCall(300, () => this.talk(420, 860, pick(LINES.lassoFaceplant), 22, 1100));
    this.stars = txt(this, s.px, s.py - 90, '✦ ✦', 30, '#ffdf6b', '#22252b', 5).setDepth(41);
    const ring = this.add.ellipse(s.px, s.py - 40, 220, 90).setStrokeStyle(8, 0x7dff9a, 0.9).setDepth(9); this.tweens.add({ targets: ring, alpha: 0.3, scaleX: 1.15, scaleY: 1.15, duration: 300, yoyo: true, repeat: -1 });
    const pr = comic(this, s.px + 10, Math.min(1250, s.py + 50), this.first.plant ? 'FREE ROPE! Throw now!' : 'FREE ROPE!', 40).setDepth(70); this.first.plant = false;
    this.warn.push(ring, pr);
  }
  private clearWarn() { this.warn.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }); this.warn = []; }
  // ---------------------------------------------------------------- frame
  update(_t: number, dms: number) {
    const s = this.st; if (!this.bunny) return; const dt = Math.min(dms, 50) / 1000; const g = this.fx.clear();
    if (s.stun > 0) s.stun -= dt; if (s.running || s.phase === 'outro') s.clock += dt; // game-time since the start (tests/tuning)
    if (s.hold) { s.holdT += dt; }
    const knot = this.knot();
    const mode: Mode = s.phase === 'outro' ? 'walk' : (s.phase === 'tug' || (s.phase === 'tied' && !this.hanging)) ? 'hold' : s.stun > 0 ? 'dizzy' : s.hold ? 'twirl' : 'idle';
    this.bunny.root.setX(BX + this.bxOff + (s.phase === 'outro' ? -this.outroWalk() : 0));
    this.bunny.update(dt, mode, s.holdT / LK.SPIN, knot, s.phase === 'tug' ? s.tug : 0.6);
    if (s.running && s.phase === 'free' && s.bannerT <= 0 && !s.over) {
      s.time = Math.max(0, s.time - dt);
      if (s.time <= 0 && !s.flying && s.pup !== 'charge' && s.pup !== 'crash') { this.finish(false); }
    }
    if (s.bannerT > 0) s.bannerT -= dt;
    if (s.phase === 'free' || s.phase === 'intro') this.updPup(dt);
    else if (s.phase === 'tug') this.updTug(dt);
    else if (s.phase === 'tied') this.updTied(dt);
    else if (s.phase === 'outro') this.updOutro(dt);
    if (s.hold) this.drawAim(g);
    this.drawRope(knot);
    if (!s.over || s.phase === 'outro') this.drawHud();
  }
  /** where the rope ties onto Puppy (waist loop while tugging, the bow knot when tied) */
  private knot() { const s = this.st; return s.phase === 'tug' ? { x: s.px - 34, y: s.py - 58 } : { x: this.tiedC?.x - 18 * PS, y: this.tiedC?.y - 48 * PS }; }
  private drawRope(k: { x: number; y: number }) {
    const s = this.st, r = this.ropeG.clear(); const on = s.phase === 'tug' || (s.phase === 'tied' && !this.hanging) || s.phase === 'outro' || (s.phase === 'over' && s.ropes >= LK.NEED);
    this.grip.setVisible(on); if (!on) return;
    const hp = this.bunny.handPos(), tense = s.phase === 'tug' ? 0.4 + 0.6 * s.tug : 0.8, sag = (1 - tense) * 60 + 8;
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(hp.x, hp.y), new Phaser.Math.Vector2((hp.x + k.x) / 2, Math.max(hp.y, k.y) + sag), new Phaser.Math.Vector2(k.x, k.y));
    const P = curve.getPoints(18); r.lineStyle(12, 0xffffff, 0.95).strokePoints(P); r.lineStyle(7, ROPE, 1).strokePoints(P);
    if (s.phase === 'tug') { const w = 118, h = 34; r.lineStyle(12, 0xffffff, 0.95).strokeEllipse(s.px, s.py - 58, w, h).lineStyle(7, ROPE, 1).strokeEllipse(s.px, s.py - 58, w, h); }
    this.grip.setPosition(hp.x, hp.y);
  }
  private drawAim(g: Phaser.GameObjects.Graphics) {
    const s = this.st, hp = this.bunny.handPos(), r = this.loopR(), a = s.holdT / LK.SPIN * Math.PI * 2, big = s.holdT >= LK.HOLD_MAX;
    const lx = hp.x + Math.cos(a) * 22, ly = hp.y - 34 + Math.sin(a) * 6, lw = r * 1.5, lh = r * 0.45;
    g.lineStyle(12, 0xffffff, 0.9).strokeEllipse(lx, ly, lw, lh).lineStyle(7, ROPE, 1).strokeEllipse(lx, ly, lw, lh);
    if (big) g.lineStyle(18, 0x7dff9a, 0.35).strokeEllipse(lx, ly, lw + 14, lh + 10);
    for (let i = 0; i < 3; i++) g.fillStyle(s.holdT >= (i + 1) / 3 * LK.HOLD_MAX ? 0x7dff9a : 0xffffff, s.holdT >= (i + 1) / 3 * LK.HOLD_MAX ? 1 : 0.35).fillCircle(hp.x - 40 + i * 40, hp.y - 110, 11);
    // dotted arc to the landing spot + the landing loop
    for (let i = 1; i < 12; i++) { const k = i / 12; const x = hp.x + (s.tx - hp.x) * k, y = hp.y + (s.ty - hp.y) * k - Math.sin(k * Math.PI) * 160; g.fillStyle(0xffffff, 0.55).fillCircle(x, y, 5); }
    g.lineStyle(6, 0xffffff, 0.85).strokeEllipse(s.tx, s.ty, r * 2, r * 0.8).lineStyle(3, big ? 0x7dff9a : 0xffdf6b, 0.9).strokeEllipse(s.tx, s.ty, r * 2 - 10, r * 0.8 - 8);
  }
  private drawHud(force = false) {
    const s = this.st, key = `${s.ropes}|${Math.ceil(s.time)}`; if (!force && key === this.lastHud) return; this.lastHud = key;
    this.hud.set(`ROPED ${s.ropes}/${LK.NEED}`, s.time, s.ropes / LK.NEED);
  }
  private setRoundChip() { const s = this.st, t = this.roundChip.setText(`ROUND ${s.round}/3 · ${ROUND_NAME[s.round - 1]}`), g = this.roundPill.clear();
    g.fillStyle(s.round === 3 ? 0xe0243a : s.round === 2 ? 0x6b4cc9 : 0xff5c8a, 0.9).lineStyle(4, COLORS.INK, 1).fillRoundedRect(W / 2 - t.width / 2 - 18, 278, t.width + 36, 44, 20).strokeRoundedRect(W / 2 - t.width / 2 - 18, 278, t.width + 36, 44, 20); }
  // ---------------------------------------------------------------- win: drag him off by the rope
  private win() {
    const s = this.st; this.finish(true);
    this.couch('party'); popBanner(this, 'PUPPY ROUNDED UP!', 600, 0x2fbf5a, 1600); this.cameras.main.flash(300, 255, 240, 200);
    this.time.delayedCall(1300, () => { if (!this.scene.isActive()) return; s.phase = 'outro'; this.outroT = 0; this.bunny.setFace('wink');
      this.talk(260, 860, pick(mix(LINES.lassoOutroBun, CHEEKY.lassoOutroBun)), 22, 1300); this.time.delayedCall(1300, () => this.talk(420, 860, pick(mix(LINES.lassoOutroPup, CHEEKY.lassoOutroPup)), 22, 1400)); });
  }
  private outroWalk() { return Math.max(0, this.outroT - 0.25) * 150; }
  private updOutro(dt: number) {
    if (this.hanging) this.hangToTied(); // 5th catch: the hang turns into the hog-tie for the drag outro
    const s = this.st; this.outroT += dt; this.updTied(dt);
    const hp = this.bunny.handPos(), tx = hp.x + 175; // he slides along on his bottom, a rope-length behind her paw
    if (this.tiedC.x > tx) { this.tiedC.x += (tx - this.tiedC.x) * (1 - Math.exp(-dt * 5)); this.tiedC.y += (BY - 40 - this.tiedC.y) * (1 - Math.exp(-dt * 3)); }
    this.tiedC.setAngle(-12); s.px = this.tiedC.x; s.py = this.tiedC.y;
    this.dustT -= dt; if (this.dustT <= 0 && this.outroT > 0.4) { this.dustT = 0.12; this.dust(this.tiedC.x + 40, this.tiedC.y, 2); }
    if (this.outroT > 3.6) this.toChampion();
  }
  private toChampion() {
    const s = this.st; if (!leaveOnce(this)) return; const score = s.score + Math.round(s.time) * 30;
    this.cameras.main.fadeOut(300); this.time.delayedCall(320, () => this.scene.start('Champion', { score }));
  }
  // ---------------------------------------------------------------- end
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; s.hold = false;
    this.endTug?.(); this.clearWarn();
    const score = s.score + Math.round(s.time) * 30; if (this.hud) this.drawHud(true); // HUD shows the final count/time (never frozen a frame early)
    (window as any).__pr.ended = win ? 'win' : 'lose'; (window as any).__pr.score = score;
    if (win) { Storage.submitLevel('Bunny', score); Storage.setBeaten(9); Fx.sting(true); if (s.phase !== 'tied') this.time.delayedCall(10, () => this.toChampion()); return; }
    s.phase = 'over'; if (this.hanging) this.endHang(); if (this.pup) { this.pup.root.setVisible(true); this.tiedC?.setVisible(false); }
    Fx.sting(false); popBanner(this, 'TIME!', 600, 0x6b4cc9, 700); this.couch?.('gasp');
    this.time.delayedCall(1000, () => this.lossCard(score));
  }
  private lossCard(score: number) {
    const s = this.st; (window as any).__pr.cardShown = true;
    const c = this.add.container(0, 0).setDepth(960);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0).setInteractive();
    const g = this.add.graphics(); g.fillStyle(0xe9e0ff, 1).lineStyle(6, COLORS.INK, 1).fillRoundedRect(60, 200, W - 120, 900, 36).strokeRoundedRect(60, 200, W - 120, 900, 36);
    const t = txt(this, W / 2, 290, 'PUPPY GOT AWAY...\nFOR NOW!', 52, '#6b4cc9', '#22252b', 8).setAlign('center');
    const sc = txt(this, W / 2, 420, `${s.ropes}/${LK.NEED} roped · Round ${s.round}/3\nScore ${score}`, 30, '#22252b', '#fff', 0).setAlign('center');
    const floor = this.add.graphics(); floor.fillStyle(0x7a3f8a, 0.15).fillEllipse(W / 2, 790, 520, 70);
    const hero = art(this, 230, 790, 'bun_full_unimpressed', 1.05); // the real white Bunny art on an opaque panel (not the dimmed level rig)
    const pup = art(this, 500, 790, 'pup_idle', 1.1);
    const loop = this.add.graphics(); loop.lineStyle(10, 0xffffff, 1).strokeEllipse(540, 800, 150, 40).lineStyle(6, ROPE, 1).strokeEllipse(540, 800, 150, 40); // the loop he wriggled out of
    this.tweens.add({ targets: pup, y: '-=30', yoyo: true, repeat: -1, duration: 260, ease: 'Quad.Out' });
    const q1 = txt(this, W / 2, 850, pick(mix(LINES.lassoBunLose, CHEEKY.lassoBunLose)), 28, '#22252b', '#fff', 0).setWordWrapWidth(540).setAlign('center');
    const q2 = txt(this, W / 2, 905, pick(mix(LINES.lassoPupWin, CHEEKY.lassoPupWin)), 24, '#7a3f8a', '#fff', 0).setWordWrapWidth(540).setAlign('center');
    c.add([dim, g, t, sc, floor, loop, hero, pup, q1, q2]);
    // buttons arm only after the fade-in plus a 300 ms tap-free gap (same rule as the shared end card)
    const t0 = this.time.now; let last = -1e9, armed = false, downOk = false;
    const quiet = (n: number) => n - t0 >= 600 && n - last >= 300;
    const onDown = () => { const n = this.time.now; if (!armed && quiet(n)) armed = true; downOk = armed; last = n; };
    this.input.on('pointerdown', onDown); this.events.once('shutdown', () => this.input.off('pointerdown', onDown));
    (window as any).__cardArmed = () => { if (!armed && quiet(this.time.now)) armed = true; return armed; };
    const go = (k: string) => { if (!downOk || !leaveOnce(this)) return; this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => k === 'Lasso' ? this.scene.restart() : this.scene.start(k)); };
    c.add(makeButton(this, W / 2 - 145, 1010, 260, 110, 'RETRY', () => go('Lasso'), COLORS.BUTTON, 44));
    c.add(makeButton(this, W / 2 + 145, 1010, 260, 110, 'HALL', () => go('Hub'), COLORS.BUTTON_ALT, 44));
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 300 });
  }
  // ---------------------------------------------------------------- bits
  private tiedRopes() { // three wraps over his pinned arms, feet bundled, a cross strap and a bow knot (viewBox units * PS)
    const g = this.add.graphics(), s = PS;
    const band = (yy: number, w: number, h: number, lw = 9) => { g.lineStyle((lw + 4) * s, 0xffffff, 1).strokeEllipse(0, yy * s, w * s, h * s); g.lineStyle(lw * s, ROPE, 1).strokeEllipse(0, yy * s, w * s, h * s); };
    band(-62, 150, 34); band(-34, 158, 34); band(-6, 120, 24, 8);
    g.lineStyle(15 * s, 0xffffff, 1).lineBetween(-56 * s, -78 * s, 50 * s, -20 * s); g.lineStyle(9 * s, ROPE, 1).lineBetween(-56 * s, -78 * s, 50 * s, -20 * s);
    g.fillStyle(ROPE, 1).lineStyle(4, COLORS.INK, 1); [[-20, -48], [20, -48]].forEach(([bx, by]) => g.fillEllipse(bx * s, by * s, 34 * s, 22 * s).strokeEllipse(bx * s, by * s, 34 * s, 22 * s));
    g.fillCircle(0, -48 * s, 10 * s).strokeCircle(0, -48 * s, 10 * s); g.lineStyle(7 * s, ROPE, 1).lineBetween(4 * s, -40 * s, 18 * s, -14 * s).lineBetween(-4 * s, -40 * s, -22 * s, -16 * s);
    return g;
  }
  /** little hearts float up from Puppy's HEAD only (never heart eyes, never at Bunny) */
  private hearts(x: number, y: number, n = 2, away = false) { // away: upside-down hang, so they burst sideways/down off his head, never across his body
    for (let i = 0; i < n; i++) { const sd = i % 2 ? 1 : -1; const h = txt(this, x + (away ? sd * Phaser.Math.Between(30, 50) : Phaser.Math.Between(-40, 40)), y, '♥', Phaser.Math.Between(28, 40), '#ff5c8a', '#3b1f10', 5).setDepth(41).setAlpha(0);
      this.tweens.add({ targets: h, alpha: 1, duration: 120, delay: i * 160 });
      this.tweens.add({ targets: h, y: away ? y + 30 + Math.random() * 30 : y - 80 - Math.random() * 40, x: h.x + (away ? sd * Phaser.Math.Between(50, 80) : Phaser.Math.Between(-30, 30)), angle: Phaser.Math.Between(-25, 25), delay: i * 160, duration: 1000, ease: 'Sine.Out', onComplete: () => this.tweens.add({ targets: h, alpha: 0, duration: 200, onComplete: () => h.destroy() }) }); }
  }
  private talk(x: number, y: number, t: string, sz?: number, ms?: number) {
    const c: any = say(this, x, y, t, sz, ms); const tx: any = c?.list?.find((o: any) => o.type === 'Text');
    if (c && tx) { const hw = tx.width / 2 + 34; c.x = Phaser.Math.Clamp(c.x, hw, W - hw); } return c;
  }
  /** a comic word that pops in, holds, floats up and fades */
  private word(x: number, y: number, s: string, size: number, hold: number, ang = -6) {
    const c = comic(this, x, y, s, size).setDepth(70).setAngle(ang).setScale(0.3); this.tweens.add({ targets: c, scale: 1, duration: 150, ease: 'Back.Out' });
    this.tweens.add({ targets: c, alpha: 0, y: y - 40, delay: hold, duration: 250, onComplete: () => c.destroy() }); return c;
  }
  private cloud(x: number, y: number) { for (let k = 0; k < 8; k++) { const d = this.add.circle(x + Phaser.Math.Between(-50, 50), y + Phaser.Math.Between(-50, 50), Phaser.Math.Between(20, 34), 0xffffff, 0.85).setDepth(30);
    this.tweens.add({ targets: d, scale: 1.8, alpha: 0, duration: 450, onComplete: () => d.destroy() }); } }
  private dust(x: number, y: number, n: number) { for (let k = 0; k < n; k++) { const d = this.add.circle(x + Phaser.Math.Between(-60, 60), y + Phaser.Math.Between(-8, 8), Phaser.Math.Between(10, 20), 0xd8b080, 0.7).setDepth(17);
    this.tweens.add({ targets: d, x: d.x + Phaser.Math.Between(-50, 50), y: d.y - Phaser.Math.Between(20, 60), scale: 2, alpha: 0, duration: 500, onComplete: () => d.destroy() }); } }
  private confetti(x: number, y: number) { const C = [0xff5c8a, 0xffdf6b, 0x7dff9a, 0x6bc6ff, 0xffffff]; for (let k = 0; k < 22; k++) { const c = this.add.rectangle(x, y, 14, 8, C[k % 5]).setDepth(31).setAngle(Math.random() * 180);
    this.tweens.add({ targets: c, x: x + Phaser.Math.Between(-220, 220), y: y + Phaser.Math.Between(-200, 120), angle: c.angle + 540, alpha: 0, duration: Phaser.Math.Between(600, 1000), ease: 'Cubic.Out', onComplete: () => c.destroy() }); } }
}
