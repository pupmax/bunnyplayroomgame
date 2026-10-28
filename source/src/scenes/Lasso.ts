// BUNNY FINALE — PLAYROOM RODEO: you are Bunny, the 8 girls cheer from the pink couch.
// HOLD to twirl the lasso (longer = bigger loop), SLIDE your finger to where Puppy is GOING, LET GO to fling.
// A loop that lands on him snags him: TAP TAP TAP to reel him in (tug meter, Tail Catch style). Reeled in = hog-tied
// for a moment (clock paused), then he wriggles free. 28 Oct v3 (Marc: 'too easy, it's the finale'): Puppy is DODGY by default and can
// only be roped inside short gold NOW! windows (R1 he stops to pant, R2 he sniffs a treat from the couch, R3 he poses for Iris's photo
// or faceplants after a dodged charge). A throw that lands outside a window: he sidesteps, taunts, the clock loses 0.7 s.
// Three rounds (1 + 2 + 2 catches): 1 TROT, 2 SNEAKY (fake stops + a
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
import { HangPup, ensureHangArt, drawSnare, headHearts, type HangKind } from '../art/pupHang';

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
  TIME: 34,            // v4 boss tune: 38 -> 34. clock (runs only while Puppy is loose: paused during the tug, the tie-up and round banners)
  NEED: 5,             // catches to win: 1 TROT warm-up, 2 SNEAKY, 2 ZOOMIES
  ROUND_AT: [0, 1, 3], // catches at which rounds 1/2/3 start
  SPIN: 0.45,          // one twirl of the loop
  HOLD_MAX: 0.9,       // hold this long for the BIG loop
  R_MIN: 62, R_MAX: 90, HIT_PAD: 12, // loop radius (small tap -> full twirl) + forgiveness around Puppy's body (v4: 26 -> 12, a smaller catch zone)
  FLY: 0.42,           // loop flight time (so you LEAD him)
  SPD: [200, 280, 340],                           // Puppy run speed per round
  PAUSE: [[0.7, 1.1], [0.45, 0.8], [0.35, 0.6]], // Puppy stands still this long between dashes
  FAKE_P: [0, 0.4, 0.35], FAKE: 0.4,               // fake stop mid-dash (R2/R3), then he darts on 30% faster
  DECOY_P: 0.35, DECOY_CD: 5, DECOY_LIFE: 4,    // R2: chance per wind-up that he swaps in a cardboard Puppy
  CHARGE_FIRST: 1.2, CHARGE_EVERY: [3.2, 5.0],    // R3: Puppy charges Bunny this often (free-time seconds)
  CHARGE_WIND: 1.0, CHARGE_RUN: 0.5,              // warning (paw scrape + red ring) then the dash; swipe any time in between
  PLANT: 1.6, BONK: 0.9, FREE_PAD: 60,           // faceplant = an R3 catch window (free rope: any loop within FREE_PAD extra px hits) / Bunny bonked
  // catch windows (28 Oct v3): Puppy is only catchable inside these. TELL = the ears-perk + faint ring warning before a window opens
  WIN_FIRST: [1.0, 1.2, 1.2],                       // first window this long (free time) after a round starts / he is let go
  WIN_EVERY: [[2.2, 2.8], [2.8, 3.6], [3.4, 4.2]],  // then one every this many seconds (free time)
  WIN: [1.1, 0.9, 0.75],                            // how long a window stays open, per round (BOSS tune 28 Oct v4: was 1.5 / 1.1 / 0.75)
  FAKEWIN_P: [0, 0.3, 0.4], FAKE_PANT: 0.35,          // v4: R2/R3 fake windows: PINK '?' + butt-wiggle tell (real = GOLD '!' + ear hop), a fake pant, then HEHE! he bolts
  SWAY: [0, 60, 80], SWAY_T: [1, 0.9, 0.75],  // (random start phase each window: you can't pre-learn which way he'll shuffle)          // v4: he shuffles side to side (px amplitude, period s) while a window is open, so you have to LEAD him
  TELL: 0.5, WIN_GRACE: 0.1,                        // warning before it opens / a loop landing this soon after it shuts still counts
  OFF_COST: 0.7, OFF_LOCK: 0.6,                     // a throw that lands outside a window: clock penalty + no throwing for this long
  TUG0: 0.15,          // v4 TIMING TUG (was a tap-mash): a marker swings along the bar, TAP when it is in the GOLD zone. 1-2 good taps = reeled in (~1-1.5 s)
  TUG_HITS: [1, 2, 2], TUG_SWEEP: [0.7, 0.65, 0.6], TUG_ZONE: [0.32, 0.28, 0.26], TUG_MISS: 2, TUG_IDLE: 3.0, // hits needed / s per one-way sweep / gold zone width (0-1) / misses = he wriggles free / no tap this long = he wriggles free
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
      tug: 0, tugT: 0, tieT: 0, clock: 0, bannerT: 0, stun: 0, dodged: false, win: 'closed' as 'closed' | 'tell' | 'open' | 'fake', wins: 0, fakes: 0, mk: 0, mkDir: 1, zone0: 0, zone1: 0, hits: 0, tugMiss: 0, mkSpd: 1, offs: 0, nopes: 0, lock: 0 };
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
  private swayX0 = 0; private swayT = 0; private swayPh = 0; private tugIdle = 0; private winT = 0; private tellT = 0; private winLeft = 0; private winLen = 1; private closedAgo = 9; private winFx: Phaser.GameObjects.GameObject[] = []; private nowRing?: Phaser.GameObjects.Ellipse; private glow?: Phaser.GameObjects.Graphics;
  private floorTalk?: Phaser.GameObjects.Container; private byOff = 0; private bunShadow!: Phaser.GameObjects.Ellipse; private firstNow = true;
  private downX = 0; private downY = 0; private downT = 0; private bxOff = 0; private dustT = 0; private lastHud = ''; private stars?: Phaser.GameObjects.Text; private first = { tug: true, plant: true };
  constructor() { super('Lasso'); }
  create() {
    setupCamera(this); this.zoom0 = this.cameras.main.zoom; /* base hi-DPI zoom (RES): the catch punch returns here, not to 1 */ this.cameras.main.fadeIn(250); setPageBg(0x3a1250, 0x8a4a1a);
    this.st = LassoScene.fresh(); const s = this.st;
    (this as any).bunny = undefined; (this as any).hud = undefined; // RETRY restarts this instance: update() must idle until build() re-creates the rig/HUD
    this.girls = []; this.warn = []; this.hanging = ''; this.hangT = 0; this.hangSeq = []; this.hangDrop = false; this.hangFx = []; this.decoy = undefined; this.tapTxt = undefined; this.hint = undefined; this.stars = undefined; this.pend = false;
    Object.assign(this, { gx: 480, gy: 1060, pauseT: 1, fakeT: 0, boost: 1, face: -1, chargeT: LK.CHARGE_FIRST, windT: 0, plantT: 0, decoyT: 0, decoyCD: 0, surgeT: 0, surgeLeft: 0, tugShout: 0,
      freeRope: false, bigLoop: false, outroT: 0, heartT: 0, bxOff: 0, byOff: 0, dustT: 0, lastHud: '', first: { tug: true, plant: true },
      winT: LK.WIN_FIRST[0], tellT: 0, winLeft: 0, closedAgo: 9, winFx: [], nowRing: undefined, glow: undefined, floorTalk: undefined, firstNow: true });
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
    this.bunShadow = this.add.ellipse(BX, BY - 4, 190, 40, 0x000000, 0.28).setDepth(19);
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
    tutorialCard(this, 'bunny3', 'PLAYROOM RODEO!', [`You are BUNNY! 🐰 Rope Puppy ${LK.NEED} times!`, 'He can ONLY be caught in a gold NOW! ring', 'HOLD to twirl, SLIDE to him, LET GO to fling', 'PINK ? = he is FAKING! Too early = lose time!', 'Roped him? TAP when the marker hits GOLD!', 'Round 3: SWIPE to dodge his charge!'], () => this.begin());
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
    if (s.phase !== 'free' || s.flying || s.stun > 0 || s.lock > 0 || s.pup === 'wind' || s.pup === 'charge' || s.pup === 'crash') return;
    s.hold = true; s.holdT = 0; this.setAim(w.x, w.y); this.hint?.destroy(); this.hint = undefined;
    this.bunny.setFace('laugh');
    if (s.round === 2 && s.win === 'closed' && this.decoyCD <= 0 && !this.decoy && (s.pup === 'run' || s.pup === 'pause' || s.pup === 'fake') && Math.random() < LK.DECOY_P) this.makeDecoy();
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
    const free = s.pup === 'plant', near = s.pup !== 'charge' && s.pup !== 'crash' && d < r + LK.HIT_PAD + (free ? LK.FREE_PAD : 0);
    const inWin = this.inWindow(), hitPup = near && inWin;
    if (!hitPup && this.decoy && Math.hypot(x - this.decoy.x, (y - (this.decoy.y - 70)) * 0.85) < r + LK.HIT_PAD) { // roped the cardboard one
      s.misses++; Fx.block(); this.floorLoop(this.decoy.x, this.decoy.y, r); floatText(this, this.decoy.x, this.decoy.y - 220, 'CARDBOARD!', '#ff8a8a', 40);
      const dc = this.decoy; this.decoy = undefined; this.flatten(dc, true);
      this.couch('gasp'); this.bunny.setFace('unimpressed'); this.time.delayedCall(700, () => this.bunny.setFace('wink'));
      if (s.time <= 0) this.finish(false); return;
    }
    if (hitPup) return this.snag(free);
    if (!inWin) return this.offWindow(x, y, r, near);
    s.misses++; this.floorLoop(x, y, r); Fx.save(); floatText(this, x, y - 120, 'MISS', '#fff', 30); this.bunny.setFace('stern'); this.time.delayedCall(600, () => this.bunny.setFace('wink'));
    if (Math.random() < 0.35) this.talk(400, 860, pick(LINES.lassoMiss), 22, 1000);
    if (s.misses % 3 === 0) this.couch('gasp');
    if (s.time <= 0) this.finish(false);
  }
  /** the loop must LAND inside a window (a hair of grace either side) */
  private inWindow() { const s = this.st; return s.win === 'open' || (s.win === 'tell' && this.tellT <= LK.WIN_GRACE) || (s.win === 'closed' && this.closedAgo <= LK.WIN_GRACE); }
  /** a throw that lands outside a NOW! window: Puppy sidesteps it (NOPE!) and taunts, the clock loses OFF_COST, short throw lock-out */
  private offWindow(x: number, y: number, r: number, near: boolean) {
    const s = this.st; s.offs++; s.misses++; s.time = Math.max(0, s.time - LK.OFF_COST); s.lock = LK.OFF_LOCK; this.drawHud(true);
    this.floorLoop(x, y, r); Fx.save(); floatText(this, 580, 260, `-${LK.OFF_COST}s`, '#ff8a8a', 32);
    if (near) { s.nopes++; Fx.whoosh(); const dir = s.px < 470 ? 1 : -1, to = Phaser.Math.Clamp(s.px + dir * 100, AX0, AX1);
      this.word(s.px, s.py - 225, 'NOPE!', 48, 450, dir * 6); this.face = dir; this.pup.flip(dir < 0);
      this.tweens.add({ targets: s, px: to, duration: 170, ease: 'Quad.Out' }); this.tweens.add({ targets: this.pup.inner, y: { from: 0, to: -26 }, duration: 85, yoyo: true, ease: 'Quad.Out' });
      if (s.win === 'closed' && (s.pup === 'run' || s.pup === 'pause' || s.pup === 'fake' || s.pup === 'sneak')) { s.pup = 'pause'; this.pauseT = 0.35; this.pup.setFrame('stand'); } }
    else floatText(this, x, y - 120, 'TOO EARLY!', '#fff', 30);
    if (near || Math.random() < 0.4) this.talk(400, 860, pick(LINES.lassoNope), 22, 1000);
    this.bunny.setFace('unimpressed'); this.time.delayedCall(600, () => this.bunny.setFace('wink'));
    if (s.time <= 0) this.finish(false);
  }
  // ---------------------------------------------------------------- catch windows
  private winRound() { return this.st.round - 1; }
  private winReady() { const s = this.st; return s.phase === 'free' && !s.over && (s.pup === 'run' || s.pup === 'pause' || s.pup === 'fake' || s.pup === 'sneak'); }
  private updWin(dt: number) {
    const s = this.st; this.closedAgo += dt;
    if (s.win === 'closed') { if (this.winReady()) { this.winT -= dt; if (this.winT <= 0) { if (Math.random() < LK.FAKEWIN_P[this.winRound()]) this.fakeWindow(); else this.tellWindow(); } } }
    else if (s.win === 'fake') { this.tellT -= dt; this.pup.inner.setAngle(Math.sin(this.time.now / 45) * 9); if (this.tellT <= 0) this.breakFake(); }
    else if (s.win === 'tell') { this.tellT -= dt; if (this.tellT <= 0) this.openWindow(); }
    else if (s.pup !== 'plant') { // open (the faceplant runs its own clock)
      this.winLeft -= dt; const k = Phaser.Math.Clamp(this.winLeft / this.winLen, 0, 1), r = this.winRound();
      if (LK.SWAY[r] > 0) { this.swayT += dt; const nx = Phaser.Math.Clamp(this.swayX0 + LK.SWAY[r] * (Math.sin(this.swayT * Math.PI * 2 / LK.SWAY_T[r] + this.swayPh) - Math.sin(this.swayPh)), AX0 - 20, AX1 + 10);
        const dir = Math.sign(nx - s.px); if (dir) { this.face = dir; this.pup.flip(dir < 0); } s.px = nx; this.pup.update(dt, 0.7, 1); }
      this.nowRing?.setPosition(s.px, s.py - 30).setScale(0.4 + 0.6 * k); this.glow?.setPosition(s.px, s.py);
      if (this.winLeft <= 0) this.closeWindow(); }
  }
  /** the tell: Puppy stops, ears perk (a little hop), the round's gag starts, a faint gold ring */
  private tellWindow() {
    const s = this.st, r = this.winRound(); s.win = 'tell'; this.tellT = LK.TELL; s.pup = 'pause'; this.pauseT = 99; this.fakeT = -1; this.boost = 1;
    this.pup.setFrame('stand'); this.pup.squash(1, 1); this.tweens.add({ targets: this.pup.inner, y: { from: 0, to: -16 }, duration: 110, yoyo: true, ease: 'Quad.Out' });
    const ex = txt(this, s.px + 46, s.py - 215, '!', 44, '#ffdf6b', '#22252b', 6).setDepth(70).setScale(0.3); this.tweens.add({ targets: ex, scale: 1, duration: 120, ease: 'Back.Out' });
    this.tweens.add({ targets: ex, alpha: 0, delay: 380, duration: 150, onComplete: () => ex.destroy() });
    const ring = this.nowRing = this.add.ellipse(s.px, s.py - 30, 250, 92).setStrokeStyle(7, 0xffd84d, 0.45).setDepth(9); this.winFx.push(ring);
    if (r === 0) { floatText(this, s.px, s.py - 200, pick(LINES.lassoPant), '#fff', 28); }
    else if (r === 1) this.treat();
    else this.photo();
  }
  /** v4 FAKE window (R2/R3): the tell is different on purpose so players can learn it: a PINK '?' (not the gold '!'), a pink wobbly ring
   *  and a butt-wiggle instead of the ear-hop; he pants for a beat like a real window... then HEHE! and he bolts. Throwing at it = NOPE. */
  private fakeWindow() {
    const s = this.st; s.win = 'fake'; s.fakes++; this.tellT = LK.TELL + LK.FAKE_PANT; s.pup = 'pause'; this.pauseT = 99; this.fakeT = -1; this.boost = 1;
    this.pup.setFrame('stand'); this.pup.squash(1, 1);
    const q = txt(this, s.px + 46, s.py - 215, '?', 48, '#ff7ad9', '#22252b', 6).setDepth(70).setScale(0.3).setAngle(12); this.tweens.add({ targets: q, scale: 1, duration: 120, ease: 'Back.Out' });
    this.tweens.add({ targets: q, angle: -12, duration: 90, yoyo: true, repeat: 3 }); this.winFx.push(q);
    const ring = this.add.ellipse(s.px, s.py - 30, 250, 92).setStrokeStyle(6, 0xff7ad9, 0.6).setDepth(9); this.tweens.add({ targets: ring, scaleX: 1.1, scaleY: 0.9, duration: 90, yoyo: true, repeat: -1 }); this.winFx.push(ring);
  }
  private breakFake() {
    const s = this.st; this.pup.inner.setAngle(0); this.word(s.px, s.py - 230, 'HEHE!', 44, 350, 6); Fx.boing();
    if (Math.random() < 0.5) floatText(this, Phaser.Math.Clamp(s.px - 40, 170, 550), s.py - 180, pick(LINES.lassoFakeOut), '#ffb3ec', 26);
    this.closeWindow(false); this.escape();
  }
  private openWindow() {
    const s = this.st; s.win = 'open'; s.wins++; this.swayX0 = s.px; this.swayT = 0; this.swayPh = Math.random() * Math.PI * 2; this.winLen = this.winLeft = LK.WIN[this.winRound()]; Sfx.click();
    const glow = this.glow = this.add.graphics().setDepth(this.pup.root.depth - 0.02); glow.fillStyle(0xffd84d, 0.28).fillEllipse(0, -80, 210, 230).fillStyle(0xfff3a0, 0.22).fillEllipse(0, -80, 160, 180);
    glow.setPosition(s.px, s.py); this.tweens.add({ targets: glow, alpha: { from: 1, to: 0.55 }, duration: 160, yoyo: true, repeat: -1 }); this.winFx.push(glow);
    this.nowRing?.setStrokeStyle(9, 0xffd84d, 1);
    const big = this.firstNow; this.firstNow = false;
    const now = comic(this, Phaser.Math.Clamp(s.px, big ? 190 : 120, big ? 530 : 600), s.py - 245, big ? 'NOW! THROW!' : 'NOW!', big ? 50 : 44).setDepth(70).setScale(0.3).setAngle(-5); this.winFx.push(now);
    this.tweens.add({ targets: now, scale: 1, duration: 130, ease: 'Back.Out', onComplete: () => this.tweens.add({ targets: now, scale: 1.08, duration: 140, yoyo: true, repeat: -1 }) });
    if (this.winRound() === 1) floatText(this, Phaser.Math.Clamp(s.px - 40, 170, 550), s.py - 190, pick(LINES.lassoSniff), '#fff', 26);
    if (this.winRound() === 2) floatText(this, Phaser.Math.Clamp(s.px - 40, 170, 550), s.py - 190, pick(LINES.lassoPose), '#fff', 26);
  }
  /** window over (or used up by a catch): clear the glow, Puppy dashes on; next one after WIN_EVERY */
  private closeWindow(run = true) {
    const s = this.st, [a, b] = LK.WIN_EVERY[this.winRound()]; const was = s.win; s.win = 'closed'; this.pup.inner?.setAngle(0); if (was === 'open') this.closedAgo = 0; this.winT = Phaser.Math.FloatBetween(a, b);
    this.winFx.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }); this.winFx = []; this.nowRing = undefined; this.glow = undefined;
    if (run && s.phase === 'free' && s.pup === 'pause') this.newLeg();
  }
  /** R2: a couch girl tosses a dog cookie; it bounces to his paws and he stops to sniff it */
  private treat() {
    const s = this.st, line = pick(LINES.lassoTreat), who = GIRLS.indexOf(line.split(':')[0]), g = this.girls[who >= 0 ? who : 3];
    if (Math.random() < 0.6) this.talk(g.x, 440, line, 20, 1100);
    const tx = s.px + (this.face < 0 ? -58 : 58), ty = s.py - 6, bone = this.add.graphics().setDepth(this.pup.root.depth + 0.01);
    bone.fillStyle(0xf3dcae, 1).lineStyle(4, COLORS.INK, 1).fillRoundedRect(-16, -6, 32, 12, 6).strokeRoundedRect(-16, -6, 32, 12, 6);
    [-16, 16].forEach(x => [-6, 6].forEach(y => bone.fillCircle(x, y, 7).strokeCircle(x, y, 7))); bone.fillStyle(0xf3dcae, 1).fillRoundedRect(-14, -4, 28, 8, 4);
    bone.setPosition(g.x, 640).setScale(0.8); this.winFx.push(bone);
    const p = { k: 0 }; this.tweens.add({ targets: p, k: 1, duration: LK.TELL * 1000, ease: 'Linear', onUpdate: () => { if (!bone.active) return;
      bone.setPosition(g.x + (tx - g.x) * p.k, 640 + (ty - 640) * p.k - Math.sin(p.k * Math.PI) * 150).setAngle(p.k * 540); } });
  }
  /** R3: Iris snaps his photo: flash on the couch, CLICK!, he freezes in a pose */
  private photo() {
    const s = this.st, g = this.girls[6]; if (Math.random() < 0.6) this.talk(g.x, 440, pick(LINES.lassoPhoto), 20, 1100);
    const fl = this.add.circle(g.x + 20, 640, 30, 0xffffff, 1).setDepth(7); this.tweens.add({ targets: fl, scale: 3, alpha: 0, duration: 300, onComplete: () => fl.destroy() });
    this.word(g.x + 10, 590, 'CLICK!', 34, 300, 8); Fx.whoosh();
    const sp = txt(this, s.px - 60, s.py - 170, '✦', 34, '#fff27a', '#22252b', 5).setDepth(70); this.winFx.push(sp); this.tweens.add({ targets: sp, angle: 180, scale: 1.3, duration: 400, yoyo: true, repeat: -1 });
  }
  private floorLoop(x: number, y: number, r: number) { this.dust(x, y, 8); const lr = this.add.ellipse(x, y, r * 2, r * 0.8).setStrokeStyle(7, ROPE, 1).setDepth(8).setAlpha(0.9);
    this.tweens.add({ targets: lr, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 500, onComplete: () => lr.destroy() }); }
  // ---------------------------------------------------------------- tug
  private snag(free: boolean) {
    const s = this.st; s.phase = 'tug'; s.pup = 'tug'; s.tug = LK.TUG0; s.tugT = 0; s.hits = 0; s.tugMiss = 0; this.tugIdle = 0; this.newZone(true); this.freeRope = free; this.clearWarn(); this.stars?.destroy(); this.stars = undefined;
    this.closeWindow(false); this.tweens.killTweensOf(this.pup.inner); this.pup.inner.setY(0);
    this.pup.root.setAngle(0); this.pup.inner.setAngle(0); this.pup.squash(1, 1); this.pup.setFrame('panic');
    this.tugStart = { x: s.px, y: s.py }; this.surgeT = 0.9; this.surgeLeft = 0; this.tugShout = 0.6; this.face = 1; this.pup.flip(false);
    Fx.punch(); this.cameras.main.shake(120, 0.006); this.dust(s.px, s.py, 10);
    this.word(s.px, s.py - 240, free ? 'FREE ROPE!' : 'SNAGGED!', 54, 500);
    this.bunny.setFace('stern'); this.bunny.stopThrow();
    if (Math.random() < 0.5) this.talk(330, 860, pick(LINES.lassoTug), 22, 1000);
    this.tapPrompt(); this.drawMeter();
  }
  /** v4 timing tug: TAP while the swinging marker is inside the gold zone. A hit yanks him closer (new zone), a miss = he wriggles (marker speeds up) */
  private tap() {
    const s = this.st; if (s.tugT < 0.12) return; this.tugIdle = 0;
    if (s.mk >= s.zone0 && s.mk <= s.zone1) {
      s.hits++; this.bunny.yank = -14; Fx.punch(); Sfx.click(); this.cameras.main.shake(80, 0.004);
      const hx = 98 + 524 * s.mk; this.word(Phaser.Math.Clamp(hx, 150, 570), 330, s.hits >= LK.TUG_HITS[s.round - 1] ? 'YANK!' : 'PULL!', 40, 260, -4);
      if (s.hits >= LK.TUG_HITS[s.round - 1]) { s.tug = 1; return this.reeled(); }
      this.newZone(false);
    } else {
      s.tugMiss++; Fx.block(); this.bunny.yank = 6; this.shout(); s.mkSpd *= 1.15; this.cameras.main.shake(90, 0.005);
      floatText(this, Phaser.Math.Clamp(98 + 524 * s.mk, 150, 570), 330, 'MISS!', '#ff8a8a', 30);
      if (s.tugMiss >= LK.TUG_MISS) return this.slip();
    }
  }
  /** a new gold zone, away from where the marker is now; first one: the marker starts at an end */
  private newZone(first: boolean) {
    const s = this.st, r = s.round - 1, w = LK.TUG_ZONE[r];
    if (first) { s.mkDir = Math.random() < 0.5 ? 1 : -1; s.mk = s.mkDir > 0 ? 0 : 1; s.mkSpd = 1 / LK.TUG_SWEEP[r]; }
    // next zone sits AHEAD of the marker (first one ~0.5 s away so you can spot it, then 0.45-0.6 of a sweep along its path, bouncing off the ends) so each press comes ~0.3 s later: quick, never a long wait
    let c = s.mk + s.mkDir * Phaser.Math.FloatBetween(first ? 0.75 : 0.45, first ? 0.9 : 0.6); if (c > 1) c = 2 - c; else if (c < 0) c = -c;
    const z0 = Phaser.Math.Clamp(c - w / 2, 0.04, 0.96 - w);
    s.zone0 = z0; s.zone1 = z0 + w;
  }
  private tapPrompt() {
    this.tapTxt?.destroy(); const big = this.first.tug; this.first.tug = false;
    const t = this.tapTxt = comic(this, W / 2, 480, big ? 'TAP when it\'s in the GOLD!' : 'TAP in the GOLD!', big ? 46 : 44).setDepth(67).setAngle(-4).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out', onComplete: () => this.tweens.add({ targets: t, scale: 1.1, duration: 170, yoyo: true, repeat: -1, ease: 'Sine.InOut' }) });
  }
  private endTug() { if (this.tapTxt) { this.tweens.killTweensOf(this.tapTxt); this.tapTxt.destroy(); this.tapTxt = undefined; } this.meter.clear(); }
  private drawMeter() {
    const m = this.meter, y = 395, s = this.st; m.clear();
    m.fillStyle(0x22252b, 1).fillRoundedRect(90, y - 30, 540, 60, 30);
    m.fillStyle(0xc27230, 1).fillRoundedRect(98, y - 22, 524, 44, 22);
    m.fillStyle(0xffd84d, 1).lineStyle(4, 0xfff3a0, 1).fillRect(98 + 524 * s.zone0, y - 22, 524 * (s.zone1 - s.zone0), 44).strokeRect(98 + 524 * s.zone0, y - 22, 524 * (s.zone1 - s.zone0), 44);
    const need = LK.TUG_HITS[s.round - 1]; for (let i = 0; i < need; i++) { const x = W / 2 - (need - 1) * 22 + i * 44; m.fillStyle(i < s.hits ? 0xff5c8a : 0x22252b, 1).lineStyle(4, 0xffffff, 1).fillCircle(x, y + 52, 13).strokeCircle(x, y + 52, 13); }
    const mx = 98 + 524 * s.mk; m.fillStyle(0xffffff, 1).lineStyle(5, 0x22252b, 1).fillRoundedRect(mx - 9, y - 40, 18, 80, 8).strokeRoundedRect(mx - 9, y - 40, 18, 80, 8);
  }
  private updTug(dt: number) {
    const s = this.st, r = s.round - 1; s.tugT += dt; this.tugIdle += dt;
    s.mk += s.mkDir * s.mkSpd * dt; if (s.mk >= 1) { s.mk = 2 - s.mk; s.mkDir = -1; } else if (s.mk <= 0) { s.mk = -s.mk; s.mkDir = 1; }
    if (this.tugIdle > LK.TUG_IDLE) return this.slip();
    this.tugShout -= dt; if (this.tugShout <= 0) { this.tugShout = Phaser.Math.FloatBetween(1.0, 1.5); if (Math.random() < 0.5) this.shout(); }
    const goal = LK.TUG0 + (1 - LK.TUG0) * 0.8 * s.hits / LK.TUG_HITS[r]; s.tug += (goal - s.tug) * (1 - Math.exp(-dt * 10));
    const k = Phaser.Math.Clamp((s.tug - LK.TUG0) / (1 - LK.TUG0), 0, 1), end = { x: BX + 205, y: BY - 55 };
    const tx = this.tugStart.x + (end.x - this.tugStart.x) * k, ty = this.tugStart.y + (end.y - this.tugStart.y) * k, f = 1 - Math.exp(-dt * 8), wr = Math.sin(this.time.now / 70) * 14;
    s.px += (tx + wr - s.px) * f; s.py += (ty - s.py) * f;
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
    s.phase = 'free'; this.pup.setFrame('stand'); this.escape(); this.fakeT = -1; /* wriggled free: a real dash-off, no fake stop */ this.winT = Phaser.Math.FloatBetween(...LK.WIN_EVERY[this.winRound()] as [number, number]); this.time.delayedCall(700, () => this.bunny.setFace('wink'));
    if (s.time <= 0) this.finish(false);
  }
  // ---------------------------------------------------------------- caught: hog-tied
  private reeled() {
    const s = this.st; this.endTug(); s.ropes++; s.phase = 'tied'; s.pup = 'tied'; s.tieT = 0; this.heartT = 0.2;
    const pts = 1000 + (this.bigLoop ? 300 : 0) + (this.freeRope ? 500 : 0) + (s.round - 1) * 200; s.score += pts;
    const cx = s.px, cy = s.py, last = s.ropes >= LK.NEED; this.pup.root.setVisible(false);
    if (last) this.showTied(); else this.startHang(this.nextHang()); // the 5th catch goes straight to the hog-tie for the drag outro (no hang, no puff swap)
    // 28 Oct v3: no zoom punch (it jolted the HUD); the word sits above the girls' heads, the burst is the normal size
    this.cameras.main.shake(120, 0.006);
    Fx.goal(); impact(this, Phaser.Math.Clamp(cx + 40, 170, W - 170), 560, last ? 'ROPED!' : pick(['YEE-HAW!', 'ROPED!', 'GOTCHA!']), pts, this.freeRope ? 'FREE ROPE!' : this.bigLoop ? 'BIG LOOP!' : '', false);
    if (!last) this.confetti(cx, cy - 120); this.bunny.setFace('laugh'); this.hud.pop(); this.drawHud(true);
    if (s.ropes < LK.NEED) { this.couch('cheer', Math.random() < 0.4 ? pick(LINES.lassoCouchCheer) : undefined); if (Math.random() < 0.3) this.time.delayedCall(1200, () => this.talk(330, 860, pick(LINES.lassoHit), 22, 900)); }
    else this.win();
  }
  private updTied(dt: number) {
    const s = this.st; s.tieT += dt; this.heartT -= dt;
    if (this.hanging) this.updHang(dt);
    if (this.heartT <= 0) { this.heartT = 0.7; if (this.hanging && !this.hangDrop) headHearts(this, this.hang, 2, 41); else if (!this.hanging) this.hearts(this.tiedC.x, this.tiedC.y - 200 * PS, 2); } // hearts from his HEAD only
    if (s.phase === 'tied' && !s.over && s.tieT >= LK.TIE) this.untie();
  }
  private untie() {
    const s = this.st; this.clearWarn();
    if (this.hanging) { this.endHang(); this.pup.root.setVisible(true).setPosition(s.px, s.py).setAngle(0); this.pup.root.list[0] && (this.pup.root.list[0] as Phaser.GameObjects.Image).setVisible(true); this.pup.setFrame('stand'); this.pup.flip(false); }
    else { this.tweens.killTweensOf(this.tiedIn); this.tiedC.setVisible(false); this.pup.root.setVisible(true);
      Fx.boing(); this.word(s.px, s.py - 200, 'POP!', 50, 300);
      for (let i = 0; i < 3; i++) { const e = this.add.ellipse(s.px, s.py - 30 - i * 25, 120, 34).setStrokeStyle(7, ROPE).setDepth(30);
        this.tweens.add({ targets: e, x: e.x + (i - 1) * 140, y: e.y - 60 + i * 30, angle: (i - 1) * 90, alpha: 0, duration: 500, onComplete: () => e.destroy() }); } }
    s.phase = 'free'; this.bunny.setFace('wink'); this.escape();
    const nr = s.ropes >= LK.ROUND_AT[2] ? 3 : s.ropes >= LK.ROUND_AT[1] ? 2 : 1;
    if (nr !== s.round) { s.round = nr; s.bannerT = LK.BANNER; this.setRoundChip(); popBanner(this, `ROUND ${nr}: ${ROUND_NAME[nr - 1]}!`, 700, nr === 3 ? 0xe0243a : 0x6b4cc9, 900);
      this.time.delayedCall(500, () => this.talk(400, 860, LINES.lassoRound[nr - 2], 22, 1400)); this.chargeT = LK.CHARGE_FIRST; }
    this.winT = LK.WIN_FIRST[this.winRound()]; s.win = 'closed';
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
    this.hang.start(kind, x, y).setDepth(10 + (HANG.LAND - 900) / 100, 14.5); // C: shins + paws in FRONT of the lamp bar (depth 14), the rest behind it
    this.hangG.clear().setAlpha(1); this.hangTop.setVisible(!C).setAlpha(1); this.lamp.setVisible(C).setAlpha(1); this.lampBar.setVisible(C).setAlpha(1);
    s.px = x; s.py = HANG.LAND; // he drops here and runs off from here
    if (kind === 'B') this.word(x + 150, 960, 'SPIN!', 46, 450, 6);
    if (C) { const coil = this.add.graphics().setDepth(8); // no tie for C: the lasso lies loose on the rug
      [[0, 0, 110, 34], [8, -4, 84, 26], [-6, 3, 64, 20]].forEach(([dx, dy, w, h]) => coil.lineStyle(11, 0xffffff, 0.9).strokeEllipse(330 + dx, 1180 + dy, w, h).lineStyle(6, ROPE, 1).strokeEllipse(330 + dx, 1180 + dy, w, h));
      coil.lineStyle(6, ROPE, 1).lineBetween(385, 1180, 430, 1192); this.hangFx.push(coil); }
    if (kind === 'B') for (let i = 0; i < 3; i++) this.hangFx.push(txt(this, x, y, '★', 30, '#ffdf6b', '#22252b', 5).setDepth(41));
    if (kind === 'B') { const sw = this.add.graphics().setDepth(13.5); this.hangFx.push(sw); } // twist swooshes round his middle
    const bun = C ? LINES.lassoLampBun : LINES.lassoHangBun, pup = kind === 'A' ? LINES.lassoHangPup : kind === 'B' ? LINES.lassoSpinPup : LINES.lassoLampPup;
    this.time.delayedCall(350, () => { if (this.hanging === kind) this.talk(230, 860, pick(bun), 22, 1100); });
    this.time.delayedCall(1250, () => { if (this.hanging === kind && !this.st.over) this.talk(x, 1190, pick(pup), 22, 1150); });
    this.time.delayedCall(1200, () => { if (this.hanging === kind && this.st.phase === 'tied' && !this.st.over) this.couch('giggle'); });
  }
  private hangSide = 1;
  private updHang(dt: number) {
    const s = this.st, k = this.hanging, h = this.hang, t = (this.hangT += dt), g = this.hangG.clear();
    if (!k || this.hangDrop) return; // (the drop is the regular rig tumbling)
    if (k === 'C') { // by the knees: swings in, settles into a small sway under the bar
      const th = this.hangSide * (3 + 9 * Math.exp(-1.7 * t)) * Math.cos(t * Math.PI * 2 / 1.15);
      h.root.setPosition(HANG.C.x, HANG.C.y).setAngle(180 - th);
    } else { // pendulum on the long rope from the hook
      const L = HANG.A.y - HANG.A.hookY, amp = k === 'A' ? 3.5 + 6 * Math.exp(-1.3 * t) : 2 + 4 * Math.exp(-1.5 * t);
      const th = this.hangSide * amp * Math.cos(t * Math.PI * 2 / 1.6), r = Phaser.Math.DegToRad(th);
      h.root.setPosition(HANG.A.x + Math.sin(r) * L, HANG.A.hookY + Math.cos(r) * L).setAngle(180 - th);
      // B (28 Oct v3, was a flat scaleX card-flip): he TWISTS on the rope like a wound-up yo-yo: a 3/4 turn each way that winds down.
      // The body narrows a little (never below 80 %), the face slides round his head and fades at the far edge, the tail swings round.
      if (k === 'B') h.twist = this.hangSide * (18 + 62 * Math.exp(-0.7 * t)) * Math.sin(t * Math.PI * 2 / 0.95);
    }
    h.update(dt, 0.5, 5);
    if (k !== 'C') drawSnare(g, h, { x: HANG.A.x, y: HANG.A.hookY }, ROPE);
    if (k === 'B') { const hd = h.headPos(), hr = h.headR(), mid = h.world(100, 175), ph = Phaser.Math.DegToRad(h.twist);
      this.hangFx.forEach((o, i) => { if (o instanceof Phaser.GameObjects.Text) { const a = t * 4 + i * 2.094; o.setPosition(hd.x + Math.cos(a) * (hr.rx + 10), hd.y + hr.ry + 14 + Math.sin(a) * 12).setDepth(Math.sin(a) > 0 ? 41 : 11); } });
      const sw = this.hangFx.find(o => o instanceof Phaser.GameObjects.Graphics && o !== this.hangFx[0]) as Phaser.GameObjects.Graphics | undefined;
      if (sw) { sw.clear(); const sp = Math.cos(t * Math.PI * 2 / 0.95), al = Phaser.Math.Clamp(Math.abs(sp) * Math.abs(ph) * 1.1, 0, 0.85); // swoosh arcs in the direction of the turn
        for (const [dy, w] of [[-30, 70], [10, 64]] as const) { const P: Phaser.Math.Vector2[] = []; for (let j = 0; j <= 10; j++) { const q = (j / 10 - 0.5) * 2.2 * Math.sign(sp || 1); P.push(new Phaser.Math.Vector2(mid.x + Math.sin(q) * w, mid.y + dy + Math.cos(q) * 12)); }
          sw.lineStyle(5, 0xffffff, al).strokePoints(P); } } }
    if (!s.over && t >= LK.TIE - HANG.DROP) this.dropHang();
  }
  /** the end of the tie-up (28 Oct v3, was a mid-flip texture swap): POP, a puff at his middle, the rope / bar lets go and the NORMAL
   *  running Puppy tumbles out of it head-over-heels to land on his feet. The hook / lamp / coil fade out right now, not after. */
  private dropHang() {
    const s = this.st, h = this.hang, k = this.hanging; this.hangDrop = true; Fx.boing();
    const mid = h.world(100, 175), side = this.hangSide, pivot = { x: h.root.x, y: h.root.y };
    this.word(Phaser.Math.Clamp(mid.x + 90 * side, 120, W - 120), mid.y - 60, k === 'C' ? 'WHOOPS!' : 'POP!', 44, 260);
    this.cloud(mid.x, mid.y); h.hide(); this.hangG.clear();
    if (k !== 'C') { // the rope springs back up to the hook, the empty snare flies off
      const rg = this.add.graphics().setDepth(13); this.hangFx.push(rg); const e = { x: pivot.x, y: pivot.y };
      this.tweens.add({ targets: e, x: HANG.A.x, y: HANG.A.hookY + 30, duration: 260, ease: 'Quad.In', onUpdate: () => { if (!rg.active) return; rg.clear().lineStyle(10, 0xffffff, 0.95).lineBetween(HANG.A.x, HANG.A.hookY, e.x, e.y).lineStyle(5, ROPE, 1).lineBetween(HANG.A.x, HANG.A.hookY, e.x, e.y); } });
      const lp = this.add.ellipse(pivot.x, pivot.y, 34, 14).setStrokeStyle(6, ROPE).setDepth(30); this.tweens.add({ targets: lp, x: lp.x + 90 * side, y: lp.y - 70, angle: 200, alpha: 0, duration: 420, onComplete: () => lp.destroy() }); }
    [this.lamp, this.lampBar, this.hangTop, ...this.hangFx.filter(o => o instanceof Phaser.GameObjects.Graphics || o instanceof Phaser.GameObjects.Text)].forEach(o => { if ((o as any).visible) this.tweens.add({ targets: o, alpha: 0, duration: 300 }); });
    const p = this.pup, sh = p.root.list[0] as Phaser.GameObjects.Image, M = 92; // M: feet -> middle of the standing rig (px)
    p.setFrame('panic'); p.flip(side > 0); p.squash(1, 1); p.inner.setAngle(0).setY(0); sh.setVisible(false);
    p.root.setVisible(true).setDepth(10 + (s.py - 900) / 100);
    const st = { k: 0 }, c0 = mid, c1 = { x: s.px, y: s.py - M }, dir = side > 0 ? -1 : 1, D = (HANG.DROP - 0.04) * 1000;
    const place = () => { const th = Phaser.Math.DegToRad(180 + 180 * st.k * dir), ky = st.k * st.k, cx = c0.x + (c1.x - c0.x) * st.k, cy = c0.y + (c1.y - c0.y) * ky;
      p.root.setPosition(cx - M * Math.sin(th), cy + M * Math.cos(th)).setAngle(Phaser.Math.RadToDeg(th)); };
    place(); this.tweens.add({ targets: st, k: 1, duration: D, ease: 'Linear', onUpdate: place, onComplete: () => { p.root.setAngle(0).setPosition(s.px, s.py); sh.setVisible(true); p.setFrame('stand'); p.squash(1.12, 0.88); this.dust(s.px, s.py, 6);
      this.time.delayedCall(90, () => p.squash(1, 1)); } });
  }
  private endHang(fade = true) {
    this.hanging = ''; this.hangDrop = false; this.hang.hide(); this.hangG.clear(); this.hangTop.setVisible(false);
    const objs = [this.lamp, this.lampBar, ...this.hangFx]; this.hangFx = [];
    objs.forEach(o => { this.tweens.killTweensOf(o); if (fade && (o === this.lamp || o === this.lampBar) && (o as any).visible && (o as any).alpha > 0.05) this.tweens.add({ targets: o, alpha: 0, duration: 200, onComplete: () => (o as any).setVisible(false) });
      else if (o === this.lamp || o === this.lampBar) (o as any).setVisible(false); else if (o instanceof Phaser.GameObjects.Graphics && (o as any).alpha > 0.05) this.tweens.add({ targets: o, alpha: 0, duration: 200, onComplete: () => o.destroy() }); else o.destroy(); });
  }
  /** 5th catch: straight into the hog-tie bundle (the drag outro needs it), right where he was caught */
  private showTied() {
    const s = this.st; this.cloud(s.px, s.py - 70);
    this.tiedC.setVisible(true).setPosition(s.px, s.py).setDepth(10 + (s.py - 900) / 100); this.tweens.killTweensOf(this.tiedIn); this.tiedIn.setAngle(0).setX(0);
    this.tweens.add({ targets: this.tiedIn, angle: { from: -7, to: 7 }, duration: 110, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: this.tiedIn, x: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: -1 });
  }
  private hangToTied() { if (this.hanging) { this.endHang(false); this.showTied(); } }
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
      this.plantT -= dt; p.update(dt, 0, 0.3);
      if (this.stars) this.stars.setPosition(s.px + Math.cos(this.time.now / 150) * 50, s.py - 120 + Math.sin(this.time.now / 150) * 10);
      if (this.plantT <= 0 && !s.flying) { this.stars?.destroy(); this.stars = undefined; this.clearWarn(); this.tweens.killTweensOf(p.inner); p.inner.setAngle(0); p.root.setAngle(0); p.squash(1, 1); p.setFrame('stand'); Fx.boing();
        this.closeWindow(false); this.escape(); }
    } else if (s.pup === 'bonk') { p.update(dt, 2.5, 1); }
    if (s.phase === 'free' && s.pup !== 'charge' && s.pup !== 'crash' && s.pup !== 'bonk') { s.px = Phaser.Math.Clamp(s.px, s.pup === 'plant' ? 200 : AX0 - 20, AX1 + 10); s.py = Phaser.Math.Clamp(s.py, AY0, AY1 + 20); }
    if (s.pup !== 'wind') p.root.setPosition(s.px, s.py); p.root.setDepth(10 + (s.py - 900) / 100);
    // round 3: charge timer
    if (s.round === 3 && s.phase === 'free' && s.win === 'closed' && !s.flying && !s.hold && (s.pup === 'run' || s.pup === 'pause')) { this.chargeT -= dt; if (this.chargeT <= 0) this.startCharge(); }
    // round 2: decoy timers
    this.decoyCD -= dt; if (this.decoy) { this.decoyT -= dt; if (this.decoyT <= 0) { const dc = this.decoy; this.decoy = undefined; this.flatten(dc, false); } }
  }
  private runDust(dt: number, dir: number) { this.dustT -= dt; if (this.dustT > 0) return; this.dustT = 0.11; const s = this.st;
    const d = this.add.circle(s.px - Math.sign(dir || 1) * 30, s.py + 4, Phaser.Math.Between(8, 14), 0xd8b080, 0.6).setDepth(this.pup.root.depth - 0.01);
    this.tweens.add({ targets: d, scale: 2, alpha: 0, y: d.y - 16, duration: 400, onComplete: () => d.destroy() }); }
  /** R2 decoy (28 Oct v3, was an identical second Puppy): a flat CARDBOARD cut-out on a wooden stake: pale card print, a brown card
   *  edge showing its thickness, two strips of tape, Zoe's scribbled tag. He pops out from behind it and tiptoes off. */
  private makeDecoy() {
    const s = this.st; s.decoys++; this.decoyCD = LK.DECOY_CD; this.decoyT = LK.DECOY_LIFE;
    const c = this.decoy = this.add.container(s.px, s.py).setDepth(this.pup.root.depth);
    const L = -36, D = PS * 1.4; // the cut-out stands on its stake, a little off the floor; printed life-size (D matches the live rig)
    const stake = this.add.graphics(); stake.fillStyle(0x000000, 0.25).fillEllipse(0, 4, 80, 16).fillStyle(0x8a5a2a, 1).lineStyle(4, COLORS.INK, 1).fillRect(-8, -90, 16, 94).strokeRect(-8, -90, 16, 94);
    const rim = art(this, 0, L + 7, 'pup_idle', D * 1.07).setTintFill(0xe9d3a8).setFlipX(this.face < 0);   // the card rim round the print (scissor cut)
    const edge = art(this, 10, L + 9, 'pup_idle', D * 1.07).setTintFill(0x8d6236).setFlipX(this.face < 0); // the card's cut edge (thickness)
    const img = art(this, 0, L, 'pup_idle', D).setTint(0xffe4bd).setFlipX(this.face < 0);                     // the printed side
    (img as any).preFX?.addColorMatrix().saturate(-0.35); // a faded print, not a live pup
    const top = L - img.displayHeight * img.originY; // top of the print
    const deco = this.add.graphics(); deco.fillStyle(0xd9d4c4, 0.95).lineStyle(2, 0xa9a494, 1); [[-70, top + 18, 0.3], [36, top + 12, -0.25]].forEach(([x, y, a]) => { deco.save(); deco.translateCanvas(x + 17, y + 6); deco.rotateCanvas(a); deco.fillRect(-19, -7, 38, 14).strokeRect(-19, -7, 38, 14); deco.restore(); }); // tape
    deco.lineStyle(4, 0x6b4cc9, 0.9).beginPath(); deco.moveTo(-40, L - 26); [[-24, L - 40], [-8, L - 24], [8, L - 40], [24, L - 26]].forEach(([x, y]) => deco.lineTo(x, y)); deco.strokePath(); // Zoe's crayon zigzag
    const tag = txt(this, 40, L - 6, 'ZOE', 20, '#6b4cc9', '#fff', 4).setAngle(-8);
    c.setAngle(this.face < 0 ? 3 : -3);
    c.add([stake, edge, rim, img, deco, tag]);
    this.cloud(s.px, s.py - 80); Fx.boing(); floatText(this, s.px, s.py - 230, 'ZOE DECOY!', '#ffdf6b', 30);
    if (Math.random() < 0.5) this.talk(400, 860, pick(LINES.lassoTrick), 22, 1100); else if (Math.random() < 0.6) this.couch('gasp', pick(LINES.lassoCouchTip));
    s.pup = 'sneak'; this.fakeT = -1; const goLeft = s.px > 480; this.gx = goLeft ? Phaser.Math.Between(AX0, 380) : Phaser.Math.Between(560, AX1); this.gy = Phaser.Math.Between(AY0, AY1);
    s.px += goLeft ? -90 : 90; // pops out from behind the cutout, clear of it
  }
  /** the cut-out tips over backwards flat onto the floor (it squashes toward its base: a flat card falling away from you) */
  private flatten(dc: Phaser.GameObjects.Container, roped: boolean) {
    this.tweens.add({ targets: dc, scaleY: 0.1, y: dc.y + 6, duration: roped ? 240 : 300, ease: 'Quad.In', onComplete: () => { this.dust(dc.x, dc.y, 5); if (roped) this.word(dc.x, dc.y - 90, 'THWAP!', 36, 300, 4); } });
    this.tweens.add({ targets: dc, alpha: 0, delay: roped ? 800 : 500, duration: 300, onComplete: () => dc.destroy() });
  }
  private startCharge() {
    const s = this.st; s.pup = 'wind'; s.dodged = false; this.windT = LK.CHARGE_WIND; this.chargeT = Phaser.Math.FloatBetween(LK.CHARGE_EVERY[0], LK.CHARGE_EVERY[1]);
    if (s.hold) { s.hold = false; this.bunny.setFace('unimpressed'); }
    if (this.floorTalk?.active) { this.tweens.killTweensOf(this.floorTalk); this.floorTalk.destroy(); } this.floorTalk = undefined; // nothing covers the dodge prompt
    this.face = -1; this.pup.flip(true); this.pup.setFrame('stand'); Fx.alert();
    const ex = txt(this, s.px, s.py - 220, '!', 70, '#ff3b3b', '#22252b', 8).setDepth(70); this.tweens.add({ targets: ex, scale: 1.3, duration: 120, yoyo: true, repeat: 3 });
    const ring = this.add.ellipse(BX + 20, BY - 20, 300, 110).setStrokeStyle(8, 0xff3b3b, 0.9).setDepth(18); this.tweens.add({ targets: ring, scaleX: 0.55, scaleY: 0.55, duration: (LK.CHARGE_WIND + LK.CHARGE_RUN) * 1000 });
    const pr = comic(this, W / 2, 860, '◀ SWIPE to DODGE! ▶', 46).setDepth(70); this.tweens.add({ targets: pr, scale: 1.1, duration: 150, yoyo: true, repeat: -1 });
    this.warn.push(ex, ring, pr); if (Math.random() < 0.35) this.couch('gasp', pick(LINES.lassoCouchCharge));
  }
  private dodge(dir: number) {
    const s = this.st; s.dodged = true; s.dodges++; s.hold = false; Sfx.jump();
    // 28 Oct v3: she hops BACK into the room (up the screen), out of his lane, so he zooms past in FRONT of her instead of through her
    const to = dir < 0 ? -40 : 60; this.tweens.killTweensOf(this); this.tweens.add({ targets: this, bxOff: to, byOff: -175, duration: 180, ease: 'Quad.Out' });
    this.bunny.setFace('cool'); floatText(this, BX + to, BY - 480, 'DODGE!', '#7dff9a', 40); this.clearWarn(); // the SWIPE prompt + target ring go as soon as she is out of the lane
  }
  private impactCharge() {
    const s = this.st; this.clearWarn();
    if (s.dodged) { // he zooms past in front of her, SPLATS into the wall (on screen), bounces back and lands in a faceplant
      s.pup = 'crash'; s.plants++; const wx = 72; this.pup.root.setDepth(21); this.tweens.add({ targets: s, px: wx, duration: 170, ease: 'Quad.In', onComplete: () => {
        Fx.punch(); this.cameras.main.shake(180, 0.012); this.word(150, BY - 260, 'BONK!', 60, 400, 8);
        this.pup.squash(0.62, 1.12); this.time.delayedCall(110, () => this.pup.squash(1, 1)); this.bunny.setFace('laugh');
        this.time.delayedCall(110, () => { this.pup.setFrame('dizzy'); this.pup.flip(false);
          this.tweens.add({ targets: s, px: 330, duration: 430, ease: 'Sine.Out' }); this.tweens.add({ targets: s, py: { from: BY - 30, to: BY - 70 }, duration: 430, ease: 'Sine.Out' });
          this.tweens.add({ targets: this.pup.inner, angle: 720, duration: 430, onComplete: () => { this.pup.inner.setAngle(0); this.plant(); } }); });
        this.time.delayedCall(560, () => this.tweens.add({ targets: this, bxOff: 0, byOff: 0, duration: 240, ease: 'Quad.InOut' })); } }); // she hops back down once he is past
    } else { // BONK: he bowls Bunny over and scampers off laughing
      s.bonks++; s.stun = LK.BONK; Fx.ouch(); this.cameras.main.shake(200, 0.014); this.bunny.setFace('unimpressed'); this.word(BX + 60, BY - 330, 'BONK!', 64, 500);
      this.talk(400, 860, pick(LINES.lassoBonk), 22, 1200); this.couch('gasp');
      s.pup = 'bonk'; this.pup.flip(false); this.tweens.add({ targets: s, px: 420, py: 1080, duration: 450, ease: 'Quad.Out', onComplete: () => { this.pup.squash(1, 1); if (s.pup === 'bonk') this.escape(); } });
    }
  }
  private plant() {
    const s = this.st; if (s.phase !== 'free' || s.pup !== 'crash') return; s.pup = 'plant'; this.plantT = LK.PLANT; this.pup.inner.setAngle(0); this.pup.setFrame('dizzy');
    this.pup.root.setDepth(10 + (s.py - 900) / 100);
    // 28 Oct v3 (was the sprite turned 90 deg): a cartoon SPLAT: he lands flat, squashes wide, wobbles; dizzy face, stars round his head
    const sq = { x: 1.3, y: 0.62 }; this.pup.squash(sq.x, sq.y); this.tweens.add({ targets: sq, x: 1.16, y: 0.78, duration: 160, yoyo: true, repeat: 3, ease: 'Sine.InOut', onUpdate: () => { if (s.pup === 'plant') this.pup.squash(sq.x, sq.y); } });
    // the faceplant IS a catch window (R3): no tell, the splat is the tell
    this.closeWindow(false); s.win = 'open'; s.wins++; this.winLen = this.winLeft = LK.PLANT;
    this.dust(s.px, s.py, 12); Fx.save(); this.couch('cheer');
    this.word(s.px + 30, s.py - 230, 'FACEPLANT!', 56, 900);
    this.time.delayedCall(300, () => this.talk(420, 860, pick(LINES.lassoFaceplant), 22, 1100));
    this.stars = txt(this, s.px, s.py - 120, '✦ ✦', 30, '#ffdf6b', '#22252b', 5).setDepth(41);
    const ring = this.add.ellipse(s.px, s.py - 30, 250, 92).setStrokeStyle(9, 0xffd84d, 1).setDepth(9); this.tweens.add({ targets: ring, scaleX: 0.45, scaleY: 0.45, duration: LK.PLANT * 1000 });
    const pr = comic(this, s.px + 10, Math.min(1250, s.py + 50), this.first.plant ? 'FREE ROPE! NOW!' : 'NOW!', 40).setDepth(70); this.first.plant = false;
    this.warn.push(ring, pr);
  }
  private clearWarn() { this.warn.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }); this.warn = []; }
  // ---------------------------------------------------------------- frame
  update(_t: number, dms: number) {
    const s = this.st; if (!this.bunny) return; const dt = Math.min(dms, 50) / 1000; const g = this.fx.clear();
    if (s.stun > 0) s.stun -= dt; if (s.lock > 0) s.lock -= dt; if (s.running || s.phase === 'outro') s.clock += dt; // game-time since the start (tests/tuning)
    if (s.hold) { s.holdT += dt; }
    const knot = this.knot();
    const mode: Mode = s.phase === 'outro' ? 'walk' : (s.phase === 'tug' || (s.phase === 'tied' && !this.hanging)) ? 'hold' : s.stun > 0 ? 'dizzy' : s.hold ? 'twirl' : 'idle';
    this.bunny.root.setPosition(BX + this.bxOff + (s.phase === 'outro' ? -this.outroWalk() : 0), BY + this.byOff); this.bunShadow.setPosition(this.bunny.root.x, BY - 4 + this.byOff * 0.97).setScale(1 + this.byOff / 900);
    this.bunny.update(dt, mode, s.holdT / LK.SPIN, knot, s.phase === 'tug' ? s.tug : 0.6);
    if (s.running && s.phase === 'free' && s.bannerT <= 0 && !s.over) {
      s.time = Math.max(0, s.time - dt);
      if (s.time <= 0 && !s.flying && s.pup !== 'charge' && s.pup !== 'crash') { this.finish(false); }
    }
    if (s.bannerT > 0) s.bannerT -= dt;
    if (s.running && s.phase === 'free' && s.bannerT <= 0 && !s.over) this.updWin(dt);
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
    const lx = hp.x + 46 + Math.cos(a) * 22, ly = hp.y - 70 + Math.sin(a) * 6, lw = r * 1.5, lh = r * 0.45; // 28 Oct v3: overhead + out to her right (was across her face)
    g.lineStyle(5, ROPE, 1).lineBetween(hp.x, hp.y, lx - lw * 0.42, ly + 4); // the short rope from her paw up to the spinning loop
    g.lineStyle(12, 0xffffff, 0.9).strokeEllipse(lx, ly, lw, lh).lineStyle(7, ROPE, 1).strokeEllipse(lx, ly, lw, lh);
    if (big) g.lineStyle(18, 0x7dff9a, 0.35).strokeEllipse(lx, ly, lw + 14, lh + 10);
    for (let i = 0; i < 3; i++) g.fillStyle(s.holdT >= (i + 1) / 3 * LK.HOLD_MAX ? 0x7dff9a : 0xffffff, s.holdT >= (i + 1) / 3 * LK.HOLD_MAX ? 1 : 0.35).fillCircle(hp.x + 6 + i * 40, hp.y - 130, 11);
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
    this.couch('party'); this.time.delayedCall(650, () => { if (this.scene.isActive()) popBanner(this, 'PUPPY ROUNDED UP!', 600, 0x2fbf5a, 1300); }); // one beat at a time: catch burst, THEN the banner (no white flash)
    this.time.delayedCall(1700, () => { if (!this.scene.isActive()) return; s.phase = 'outro'; this.outroT = 0; this.bunny.setFace('wink');
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
  /** hog-tie (28 Oct v3, was three full ellipses = a slinky): two wraps that go ROUND him (only the front half of each loop shows, the
   *  back half is behind his body), one over his pinned arms and one round his ankles, joined by a single tie line and a bow knot. */
  private tiedRopes() {
    const g = this.add.graphics(), s = PS;
    const wrap = (yy: number, w: number, h: number, lw: number) => { const P: Phaser.Math.Vector2[] = []; for (let i = 0; i <= 16; i++) { const t = Math.PI * i / 16; P.push(new Phaser.Math.Vector2(-Math.cos(t) * w / 2 * s, (yy + Math.sin(t) * h / 2) * s)); }
      g.lineStyle((lw + 5) * s, 0xffffff, 1).strokePoints(P); g.lineStyle(lw * s, ROPE, 1).strokePoints(P);
      g.lineStyle(2.5 * s, 0xf2c48d, 0.9); for (let i = 2; i < 16; i += 3) { const q = P[i]; g.lineBetween(q.x - 3 * s, q.y - 3 * s, q.x + 3 * s, q.y + 3 * s); } };
    wrap(-60, 150, 30, 10); wrap(-8, 104, 20, 9);
    g.lineStyle(14 * s, 0xffffff, 1).lineBetween(6 * s, -44 * s, 6 * s, 2 * s); g.lineStyle(9 * s, ROPE, 1).lineBetween(6 * s, -44 * s, 6 * s, 2 * s); // tie line arms -> ankles
    g.fillStyle(ROPE, 1).lineStyle(4, COLORS.INK, 1); [[-14, -46], [26, -46]].forEach(([bx, by]) => g.fillEllipse(bx * s, by * s, 30 * s, 20 * s).strokeEllipse(bx * s, by * s, 30 * s, 20 * s));
    g.fillCircle(6 * s, -46 * s, 9 * s).strokeCircle(6 * s, -46 * s, 9 * s);
    return g;
  }
  /** little hearts float up from Puppy's HEAD only (never heart eyes, never at Bunny) */
  private hearts(x: number, y: number, n = 2, away = false) { // away: upside-down hang, so they burst sideways/down off his head, never across his body
    for (let i = 0; i < n; i++) { const sd = i % 2 ? 1 : -1; const h = txt(this, x + (away ? sd * Phaser.Math.Between(30, 50) : Phaser.Math.Between(-40, 40)), y, '♥', Phaser.Math.Between(28, 40), '#ff5c8a', '#3b1f10', 5).setDepth(41).setAlpha(0);
      this.tweens.add({ targets: h, alpha: 1, duration: 120, delay: i * 160 });
      this.tweens.add({ targets: h, y: away ? y + 30 + Math.random() * 30 : y - 80 - Math.random() * 40, x: h.x + (away ? sd * Phaser.Math.Between(50, 80) : Phaser.Math.Between(-30, 30)), angle: Phaser.Math.Between(-25, 25), delay: i * 160, duration: 1000, ease: 'Sine.Out', onComplete: () => this.tweens.add({ targets: h, alpha: 0, duration: 200, onComplete: () => h.destroy() }) }); }
  }
  private talk(x: number, y: number, t: string, sz?: number, ms?: number) {
    const fl = y >= 800, s = this.st; if (fl && (s.pup === 'wind' || s.pup === 'charge')) return undefined; // the SWIPE to DODGE prompt owns the floor
    const c: any = say(this, x, y, t, sz, ms); if (fl) this.floorTalk = c; const tx: any = c?.list?.find((o: any) => o.type === 'Text');
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
