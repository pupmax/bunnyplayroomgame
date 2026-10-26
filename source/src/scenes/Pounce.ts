// Noir SNEAK & POUNCE: hold SNEAK to creep toward a nervous Puppy. Only move while he looks away (watch for "?").
// Go-big pass: moonlit room (window light shaft, dust motes, lamp glow, rug), cracked/tinted CREAKY boards that flash
// and puff dust, a pulsing NOISE-meter outline + sound rings, "creak!" popups, a floor pounce-range ring (green NEAR /
// gold FLYING band), a big "!" when Puppy SPOTS you, crouch-and-leap pounce with stretch, trail and landing squash.
// Depth: 7 catches in 70s, Puppy grows warier each catch (shorter "?" warnings, shorter look-aways), creaks can make
// him turn, moving in his sight = SPOTTED (he bolts), 2 hiding spots (snack box + plant), pouncing while he turns ("?")
// is a coin flip, FLYING POUNCE from further out (+400), one YARN ball per approach (2.5s distraction),
// phase 2 (2 catches) he paces about, phase 3 (5 catches) he FAKES his turn. SILENT and STREAK bonuses.
// Tuned with pups3-out/noir/sim.mjs (same constants): avg bot ~72%.
import Phaser from 'phaser';
import { GAME_W as W } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, comic, flashVignette, sparks } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { Hud, impact } from '../systems/level';
import { HeroRig, pupFlail } from '../systems/rigs';

// tuned with tests/pouncebots.mjs (see header); exposed as __pr.K so the harness can sweep it
// round 2 (QC r21 "too harsh"): look-aways 1.2-2.6 s, fewer no-"?" glances, gentler meter, sniff 1.6 s, 180 ms crouch; moving behind cover
// still shows at 35% (else walking straight up stays half-hidden), which let the move-meter drop to 115/s and the clock settle at 63 s
const K = { NEED: 7, NOISE_K: 200, DODGE_N: 10, AWAY_MIN: 1.2, AWAY_MAX: 2.6, SUS_MOVE: 115, SUS_STILL: 40, GLANCE_P: 0.08, FAKE_P: 0.2, TIME: 70, SPEED: 110, CAP: 90, SNIFF_T: 1.6, CROUCH: 180, COVER_MOVE: 0.35 };
const FLOOR = 1000, START = 110, NEAR = 200, FAR = 280; const CREAK = [[230, 290], [430, 480]];
const HIDES = [250, 410], HIDE_R = 48, CREAK_N = 45, STEP_N = 3, DECAY = 9, CREAK_ALERT = 1.6, PACE = 40, P2 = 2, P3 = 5, YARN_T = 2.5, FLY_T = 420, NEAR_T = 260;
// Rework v2 (anti "just sneak up"): every timing below is random from the very first catch.
const AWAY: [number, number] = [0.8, 2.0], WARN_T: [number, number] = [0.2, 0.5], LOOK_T: [number, number] = [0.9, 1.6], GLANCE_T: [number, number] = [0.5, 0.7],
  GLANCE_P = 0.18, GLANCE_P3 = 0.26, FAKE_P = 0.2, FAKE_P3 = 0.28,
  // suspicion meter (0..100): full = SPOTTED (he bolts, round resets)
  SUS_MOVE = 190, SUS_STILL = 28, SUS_NEAR = 250, SUS_CREAK = 18, SUS_COVER = 45, SUS_FAR = 30, SUS_IDLE = 6,
  SNIFF_R = 150, KNOCK = 320, DODGE_WATCH = 1.0, DODGE_N = 25, SCAMPER_N = 2;
const YX = 640, YY = 470;
type Look = 'away' | 'warn' | 'look';
type Mode = '' | 'pounce' | 'dodge' | 'flee' | 'catch';

export class PounceScene extends Phaser.Scene {
  st = { time: K.TIME, catches: 0, escapes: 0, score: 0, running: false, over: false, x: START, px: 580, noise: 0, look: 'away' as Look, lookT: 2, hold: false, busy: false,
    phase: 1, yarn: 1, yarnT: 0, streak: 0, spotted: 0, flying: 0, mode: '' as Mode, sus: 0, sniffT: 0, dodges: 0, turned: 0, fake: 0, glance: 0, scampT: 0, dazed: 0 };
  private noir!: Phaser.GameObjects.Container; private rig!: HeroRig; private pup!: Phaser.GameObjects.Image; private q!: Phaser.GameObjects.Text; private cone!: Phaser.GameObjects.Graphics;
  private hud!: Hud; private noiseBar!: Phaser.GameObjects.Graphics; private ring!: Phaser.GameObjects.Graphics; private pb!: Phaser.GameObjects.Container; private sb!: Phaser.GameObjects.Container;
  private boards!: Phaser.GameObjects.Graphics; private fxg!: Phaser.GameObjects.Graphics; private motes: { x: number; y: number; v: number; p: number }[] = [];
  private waves: { x: number; r: number; a: number }[] = []; private creakFlash = [0, 0]; private yarnBtn!: Phaser.GameObjects.Container; private yarnBall?: Phaser.GameObjects.Image;
  private paceDir = 1; private noirBase = 1; private pupBase = 1; private creakCool = 0; private bang!: Phaser.GameObjects.Text;
  private pupOff = 0; private runHop = false; private leaping = false; private cue!: Phaser.GameObjects.Text; private susLift = 0; private sus!: Phaser.GameObjects.Container; private susFill!: Phaser.GameObjects.Image; private susEye!: Phaser.GameObjects.Image; private eyeKey = '';
  constructor() { super('Pounce'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x2a1a3e, 0x6a3e1e);
    this.st = { time: K.TIME, catches: 0, escapes: 0, score: 0, running: false, over: false, x: START, px: 580, noise: 0, look: 'away', lookT: 2, hold: false, busy: false, phase: 1, yarn: 1, yarnT: 0, streak: 0, spotted: 0, flying: 0,
      mode: '', sus: 0, sniffT: 0, dodges: 0, turned: 0, fake: 0, glance: 0, scampT: 0, dazed: 0 };
    this.pupOff = 0; this.eyeKey = ''; this.runHop = false;
    this.motes = []; this.waves = []; this.creakFlash = [0, 0]; this.paceDir = 1; this.creakCool = 0; this.yarnBall = undefined;
    this.makeTextures();
    art(this, 0, 0, 'bg_room');
    // moonlight shaft from the window + lamp pool + rug
    const light = this.add.graphics().setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    light.fillStyle(0xaab8ff, 0.10).fillPoints([new Phaser.Math.Vector2(92, 342), new Phaser.Math.Vector2(268, 342), new Phaser.Math.Vector2(420, 1060), new Phaser.Math.Vector2(150, 1060)], true);
    light.fillStyle(0xaab8ff, 0.07).fillEllipse(285, 1040, 300, 60);
    this.tweens.add({ targets: light, alpha: 0.7, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.easeInOut' });
    const lamp = this.add.image(640, 980, 'pn_glow').setDepth(1).setScale(2.4, 0.5).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffcf8a);
    this.tweens.add({ targets: lamp, alpha: 0.25, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });
    const rug = this.add.graphics().setDepth(1.5); rug.fillStyle(0x7a2a4a, 0.9).fillEllipse(560, 1030, 300, 70).fillStyle(0xb04a6a, 1).fillEllipse(560, 1030, 250, 50).lineStyle(4, 0xffdf6b, 0.6).strokeEllipse(560, 1030, 200, 34);
    for (let i = 0; i < 26; i++) this.motes.push({ x: Phaser.Math.Between(100, 420), y: Phaser.Math.Between(360, 1040), v: Phaser.Math.FloatBetween(6, 18), p: Math.random() * 6 });
    this.boards = this.add.graphics().setDepth(2);
    this.fxg = this.add.graphics().setDepth(35);
    for (const [a, b] of CREAK) txt(this, (a + b) / 2, FLOOR + 56, 'CREAKY', 18, '#ffe0a0', '#2a1408', 4).setDepth(3);
    this.ring = this.add.graphics().setDepth(4);
    this.cone = this.add.graphics().setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(this.st.px, FLOOR + 4, 'pn_shadow').setDepth(9).setName('pshadow');
    this.pup = art(this, this.st.px, FLOOR, 'pup_idle', 0.8).setDepth(10).setFlipX(true); this.pupBase = this.pup.scaleX;
    // suspicion meter over Puppy's head (baked pieces; per frame only crop/tint/position)
    this.susFill = this.add.image(-46, 0, 'pn_susfill').setOrigin(0, 0.5); this.susFill.setCrop(0, 0, 0, 24);
    this.susEye = this.add.image(-72, 0, 'pn_eyez');
    this.sus = this.add.container(this.st.px, FLOOR - 172, [this.add.image(0, 0, 'pn_susbg'), this.susFill, this.add.image(20, 0, 'pn_susshine'), this.susEye]).setDepth(42).setAlpha(0);
    this.q = txt(this, this.st.px, FLOOR - 285, '', 64, '#ffdf6b', '#22252b', 8).setDepth(40);
    this.bang = txt(this, this.st.px, FLOOR - 300, '!', 130, '#ff3b3b', '#22252b', 12).setDepth(41).setVisible(false);
    this.add.image(START, FLOOR + 12, 'pn_shadow').setDepth(11).setName('nshadow');
    this.rig = new HeroRig(this, 'Noir', START, FLOOR + 10, 0.95, { tail: true }).setDepth(12); this.noir = this.rig.root; this.noirBase = 0.95;
    this.noir.addAt(this.add.ellipse(0, -110, 190, 250, 0xc9a6ff, 0.16).setBlendMode(Phaser.BlendModes.ADD), 0); // soft rim so her dark limbs read against the wall
    this.drawCovers();
    this.cue = comic(this, 0, 0, 'wiggle wiggle!', 30, '#d9c2ff', '#ffffff', '#2a1a4a').setDepth(60).setVisible(false) as Phaser.GameObjects.Text;
    this.hud = new Hud(this, 'SNEAKY POUNCE', 0x7dff9a);
    this.noiseBar = this.add.graphics().setDepth(600); txt(this, 120, 372, 'NOISE', 28, '#fff', '#22252b', 6).setDepth(600);
    const mk = (x: number, label: string, col: number) => { const c = this.add.container(x, 1180).setDepth(700); const g = this.add.graphics(); g.fillStyle(0x000000, 0.35).fillRoundedRect(-150, -60, 300, 130, 28).fillStyle(col, 1).lineStyle(6, 0x22252b, 1).fillRoundedRect(-150, -70, 300, 130, 28).strokeRoundedRect(-150, -70, 300, 130, 28);
      c.add([g, txt(this, 0, -5, label, 40, '#fff', '#22252b', 7)]); return c; };
    this.sb = mk(190, 'SNEAK', 0x6b4cc9); this.pb = mk(530, 'POUNCE!', 0xff5c8a);
    this.yarnBtn = this.add.container(YX, YY).setDepth(700);
    { const g = this.add.graphics(); g.fillStyle(0x22252b, 0.8).fillCircle(0, 0, 56).lineStyle(5, 0xffffff, 0.9).strokeCircle(0, 0, 56);
      this.yarnBtn.add([g, this.add.image(0, -6, 'pn_yarn').setScale(0.8), txt(this, 0, 40, 'YARN', 18, '#ffdf6b', '#22252b', 4)]); }
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return;
      if (Math.hypot(w.x - YX, w.y - YY) < 62) return this.throwYarn();
      if (w.y > 1080 && w.x > W / 2) this.pounce(); else this.st.hold = true; });
    this.input.on('pointerup', () => { this.st.hold = false; });
    (window as any).__pr = { scene: 'Pounce', st: this.st, K, force: (win: boolean) => this.finish(win), yarn: () => this.throwYarn() };
    tutorialCard(this, 'noir1', 'SNEAKY POUNCE!', ['You are NOIR! 🐈‍⬛ HOLD SNEAK to creep', 'His 👁 meter fills if he sees you — full = SPOTTED!', 'Freeze or hide when he turns. He can peek fast!', `POUNCE as he looks away • ${K.NEED} catches wins`], () => this.begin());
  }
  private makeTextures() {
    const t = this.textures;
    if (!t.exists('pn_susbg')) { const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x000000, 0.3).fillRoundedRect(4, 8, 200, 48, 24).fillStyle(0xffffff, 1).fillRoundedRect(0, 2, 200, 48, 24).fillStyle(0x22252b, 1).fillRoundedRect(4, 6, 192, 40, 20);
      g.fillStyle(0x3a2a5a, 1).fillRoundedRect(52, 12, 138, 28, 14).fillStyle(0xffffff, 1).fillCircle(28, 26, 21); g.generateTexture('pn_susbg', 206, 58); g.destroy(); }
    if (!t.exists('pn_susfill')) { const g = this.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, 132, 24, 12); g.generateTexture('pn_susfill', 132, 24); g.destroy(); }
    if (!t.exists('pn_susshine')) { const g = this.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0xffffff, 0.35).fillRoundedRect(0, 0, 120, 7, 3.5); g.generateTexture('pn_susshine', 120, 26); g.destroy(); }
    if (!t.exists('pn_eye')) { const g = this.make.graphics({ x: 0, y: 0 }, false); // wide-open suspicious eye
      g.fillStyle(0xffffff, 1).fillEllipse(20, 20, 34, 26).lineStyle(3, 0x22252b, 1).strokeEllipse(20, 20, 34, 26).fillStyle(0x3a2412, 1).fillCircle(17, 21, 9).fillStyle(0x000000, 1).fillCircle(17, 21, 5)
        .fillStyle(0xffffff, 1).fillCircle(14, 18, 3); g.lineStyle(3, 0x22252b, 1).beginPath(); g.moveTo(4, 5); g.lineTo(30, 3); g.strokePath(); g.generateTexture('pn_eye', 40, 40); g.destroy(); }
    if (!t.exists('pn_eyez')) { const g = this.make.graphics({ x: 0, y: 0 }, false); // happy closed eye (^) + blush: not looking
      g.lineStyle(5, 0x22252b, 1).beginPath(); g.arc(20, 26, 11, Math.PI * 1.1, Math.PI * 1.9); g.strokePath(); g.fillStyle(0xff9ab8, 0.8).fillEllipse(20, 32, 16, 6); g.generateTexture('pn_eyez', 40, 40); g.destroy(); }
    if (!t.exists('pn_glow')) { const g = this.make.graphics({ x: 0, y: 0 }, false); for (let i = 30; i > 0; i--) g.fillStyle(0xffffff, 0.04).fillCircle(100, 100, i * 3.3); g.generateTexture('pn_glow', 200, 200); g.destroy(); }
    if (!t.exists('pn_shadow')) { const g = this.make.graphics({ x: 0, y: 0 }, false); for (let i = 8; i > 0; i--) g.fillStyle(0x1a0a08, 0.07).fillEllipse(90, 20, 20 * i + 20, 4 * i + 6); g.generateTexture('pn_shadow', 180, 40); g.destroy(); }
    if (!t.exists('pn_yarn')) { const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x22252b, 1).fillCircle(50, 50, 40).fillStyle(0xff5c8a, 1).fillCircle(50, 50, 35).fillStyle(0xff9ab8, 1).fillCircle(42, 40, 16);
      g.lineStyle(4, 0xb02a5a, 1); for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(50, 50, 12 + i * 5, -2.6 + i * 0.4, -0.2 + i * 0.5); g.strokePath(); }
      g.lineStyle(4, 0xff5c8a, 1).beginPath(); g.moveTo(84, 62); g.lineTo(96, 74); g.lineTo(90, 90); g.strokePath(); g.generateTexture('pn_yarn', 100, 100); g.destroy(); }
  }
  /** Shaded snack box (with a crisp bag peeking out) + potted plant: the two hiding spots. */
  private drawCovers() {
    const box = this.add.graphics().setDepth(20), B = HIDES[0];
    box.fillStyle(0x000000, 0.25).fillEllipse(B, FLOOR + 12, 190, 26);
    box.fillStyle(0xffdf6b, 1).lineStyle(4, 0x2a1408, 1).fillRect(B - 30, FLOOR - 205, 40, 50).strokeRect(B - 30, FLOOR - 205, 40, 50);
    box.fillStyle(0x8a5a2a, 1).lineStyle(6, 0x2a1408, 1).fillRect(B - 75, FLOOR - 170, 150, 180).strokeRect(B - 75, FLOOR - 170, 150, 180);
    box.fillStyle(0xa8743a, 1).fillRect(B + 40, FLOOR - 167, 32, 174).fillStyle(0x6a3e1e, 1).fillRect(B - 72, FLOOR - 167, 16, 174);
    box.fillStyle(0x9a6a32, 1).lineStyle(5, 0x2a1408, 1).fillTriangle(B - 75, FLOOR - 170, B - 110, FLOOR - 200, B - 20, FLOOR - 186).strokeTriangle(B - 75, FLOOR - 170, B - 110, FLOOR - 200, B - 20, FLOOR - 186);
    box.fillTriangle(B + 75, FLOOR - 170, B + 112, FLOOR - 196, B + 20, FLOOR - 186).strokeTriangle(B + 75, FLOOR - 170, B + 112, FLOOR - 196, B + 20, FLOOR - 186);
    box.lineStyle(4, 0x5a3414, 1).lineBetween(B - 75, FLOOR - 120, B + 75, FLOOR - 120); txt(this, B, FLOOR - 60, 'SNACKS', 26, '#ffdf6b', '#2a1408', 5).setDepth(21);
    const pl = this.add.graphics().setDepth(20).setPosition(HIDES[1], FLOOR).setScale(0.72), P = 0, FL = 0;
    pl.fillStyle(0x000000, 0.25).fillEllipse(P, FL + 12, 130, 22);
    const leaf = (a: number, l: number, col: number) => { const x2 = P + Math.cos(a) * l, y2 = FL - 90 + Math.sin(a) * l; pl.fillStyle(col, 1).lineStyle(4, 0x0f2a12, 1);
      const pts = [new Phaser.Math.Vector2(P, FL - 90), new Phaser.Math.Vector2((P + x2) / 2 + Math.sin(a) * 26, (FL - 90 + y2) / 2 - Math.cos(a) * 26), new Phaser.Math.Vector2(x2, y2), new Phaser.Math.Vector2((P + x2) / 2 - Math.sin(a) * 26, (FL - 90 + y2) / 2 + Math.cos(a) * 26)];
      pl.fillPoints(pts, true).strokePoints(pts, true); pl.lineStyle(2, 0x9ae8a0, 0.6).lineBetween(P, FL - 90, x2, y2); };
    [[-2.6, 120, 0x2f8a3a], [-0.5, 120, 0x2f8a3a], [-2.0, 150, 0x3fae4a], [-1.1, 150, 0x3fae4a], [-1.57, 165, 0x4cc458], [-2.9, 90, 0x2a7a32], [-0.25, 90, 0x2a7a32]].forEach(([a, l, c]) => leaf(a, l, c));
    pl.fillStyle(0xc0603a, 1).lineStyle(5, 0x2a1408, 1).fillPoints([new Phaser.Math.Vector2(P - 50, FL - 95), new Phaser.Math.Vector2(P + 50, FL - 95), new Phaser.Math.Vector2(P + 36, FL + 8), new Phaser.Math.Vector2(P - 36, FL + 8)], true)
      .strokePoints([new Phaser.Math.Vector2(P - 50, FL - 95), new Phaser.Math.Vector2(P + 50, FL - 95), new Phaser.Math.Vector2(P + 36, FL + 8), new Phaser.Math.Vector2(P - 36, FL + 8)], true);
    pl.fillStyle(0xe08a5a, 1).fillRect(P + 18, FL - 90, 14, 90).fillStyle(0xa04a2a, 1).fillRect(P - 56, FL - 105, 112, 18).lineStyle(4, 0x2a1408, 1).strokeRect(P - 56, FL - 105, 112, 18);
  }
  private begin() { this.st.lookT = Phaser.Math.FloatBetween(K.AWAY_MIN, 1.6); popBanner(this, 'SHHH...', 700, 0x6b4cc9); this.time.delayedCall(600, () => { this.talk(360, 560, pick(LINES.start.Noir), 22); this.st.running = true; }); }
  private get hidden() { return this.st.dazed <= 0 && HIDES.some(h => Math.abs(this.st.x - h) < HIDE_R); } // dazed after a dodge = tumbled out in the open
  private setMode(m: Mode) { this.st.mode = m; this.st.busy = m !== ''; }
  update(_t: number, dms: number) {
    const s = this.st; const dt = Math.min(dms, 50) / 1000; this.draw(dt);
    if (!s.running || s.over || s.mode === 'catch') return; // the clock only pauses for a successful catch (reward), never for dodges/escapes
    s.time -= dt; if (s.time <= 0) { s.time = 0; return this.finish(false); }
    this.hud.set(`CATCHES ${s.catches}/${K.NEED}`, s.time, s.catches / K.NEED);
    if (s.mode === 'flee') return;
    const ph = s.catches >= P3 ? 3 : s.catches >= P2 ? 2 : 1;
    if (ph !== s.phase) { s.phase = ph; popBanner(this, ph === 2 ? 'PUPPY IS PACING!' : 'SNEAKY PUPPY — QUICK GLANCES!', 600, ph === 2 ? 0x2fa0bf : 0xbf6a2f, 900); Fx.alert(); }
    this.lookCycle(dt, ph);
    if (s.mode === 'pounce') { if (s.yarnT <= 0 && (s.look === 'look' || (s.look === 'warn' && !this.leaping))) s.turned = 1; return; } // turned during the crouch, or looked during the leap -> he dodges
    if (s.mode === 'dodge') return;
    if (s.dazed > 0) s.dazed -= dt;
    if (s.scampT > 0) s.scampT -= dt;
    else if (ph >= 2 && s.yarnT <= 0) { s.px += this.paceDir * PACE * dt; if (s.px > 640) this.paceDir = -1; if (s.px < 520) this.paceDir = 1; }
    const moving = s.hold && s.x < s.px - K.CAP, d = s.px - s.x, hid = this.hidden;
    let creak = false;
    this.creakCool -= dt;
    if (moving) {
      s.x += K.SPEED * dt; s.noise += STEP_N * dt;
      CREAK.forEach(([a, b], i) => { if (s.x > a && s.x < b) { creak = true; s.noise += CREAK_N * dt; this.creakFlash[i] = 1;
        if (this.creakCool <= 0) { this.creakCool = 0.35; this.creakPop(s.x); }
        if (s.look === 'away' && s.yarnT <= 0 && Math.random() < CREAK_ALERT * dt) { s.lookT = Math.min(s.lookT, 0.05); this.ft(s.px, FLOOR - 410, 'huh?', '#ffffff', 30); } } });
      if (s.noise > 25 && Math.random() < dt * 5) this.waves.push({ x: s.x, r: 30, a: Math.min(1, s.noise / 80) });
    } else s.noise = Math.max(0, s.noise - DECAY * dt);
    // suspicion meter: moving in his sight fills it fast, lurking exposed nearby fills it slowly, half rate while he turns ("?");
    // cover or distance drains it; creaky boards always add a little. Full = SPOTTED.
    const eyes = s.yarnT <= 0 && s.look !== 'away' ? (s.look === 'look' ? 1 : 0.5) : 0;
    let rate = 0;
    if (eyes && !hid) rate = moving ? K.SUS_MOVE * eyes * (d > 420 ? 0.6 : 1) : d <= SUS_NEAR ? K.SUS_STILL * eyes * (d < SNIFF_R ? 2 : 1) : 0; // lurking right beside him = twice as risky
    else if (eyes && moving) rate = K.SUS_MOVE * eyes * K.COVER_MOVE; // cover only fully hides you while you keep still
    if (creak) rate += SUS_CREAK;
    if (rate > 0) s.sus = Math.min(100, s.sus + rate * dt);
    else s.sus = Math.max(0, s.sus - (hid ? SUS_COVER : d > SUS_NEAR ? SUS_FAR : eyes ? 0 : SUS_IDLE) * dt);
    if (s.sus >= 100) { s.noise = 100; this.spot(); }
    // close-range sniff: lurking right behind him too long makes him turn round (cover still protects)
    if (d < SNIFF_R && s.look === 'away' && s.yarnT <= 0) { s.sniffT += dt; if (s.sniffT > K.SNIFF_T) { s.sniffT = 0; s.look = 'warn'; s.fake = 0; s.lookT = 0.25; Fx.alert(); this.qPop();
      this.ft(s.px, FLOOR - 410, 'sniff sniff...?', '#ffffff', 28); } } else if (d >= SNIFF_R) s.sniffT = 0;
    if (s.noise >= 100) this.flee();
  }
  /** Puppy's look cycle: away 0.8-2.0 s -> "?" 0.2-0.5 s (sometimes a FAKE that turns back) -> look; sometimes a quick glance with no "?". */
  private lookCycle(dt: number, ph: number) {
    const s = this.st, F = Phaser.Math.FloatBetween;
    if (s.yarnT > 0) { s.yarnT -= dt; s.look = 'away'; if (s.yarnT <= 0) this.yarnDone(); return; }
    s.lookT -= dt * (1 + s.noise / K.NOISE_K);
    if (s.lookT > 0) return;
    if (s.look === 'away') {
      if (Math.random() < (K.GLANCE_P + (ph === 3 ? GLANCE_P3 - GLANCE_P : 0))) { s.look = 'look'; s.glance = 1; s.lookT = F(...GLANCE_T); Fx.alert(); this.qPop(); }
      else { s.look = 'warn'; s.fake = Math.random() < (K.FAKE_P + (ph === 3 ? FAKE_P3 - FAKE_P : 0)) ? 1 : 0; s.lookT = F(...WARN_T); Fx.alert(); this.qPop(); }
    } else if (s.look === 'warn') {
      if (s.fake) { s.look = 'away'; s.fake = 0; s.lookT = F(0.6, 1.4); if (Math.random() < 0.4) this.ft(s.px, FLOOR - 410, '...nah', '#ffffff', 26); }
      else { s.look = 'look'; s.glance = 0; s.lookT = F(...LOOK_T); if (Math.random() < 0.3) this.talk(s.px, FLOOR - 470, pick(LINES.puppyGag), 20, 900); }
    } else { s.look = 'away'; s.glance = 0; s.lookT = F(K.AWAY_MIN, K.AWAY_MAX) * Math.max(0.85, 1 - 0.02 * s.catches); }
  }
  /** floatText kept fully on screen (estimated half-width from the string). */
  private ft(x: number, y: number, t: string, col?: string, size = 40) { const half = t.length * size * 0.3 + 16; floatText(this, Phaser.Math.Clamp(x, half, W - half), y, t, col, size); }
  /** Speech bubble clamped so it never runs off the screen edges. */
  private talk(x: number, y: number, text: string, size?: number, hold?: number) {
    const b = say(this, x, y, text, size, hold) as Phaser.GameObjects.Container;
    const t = b.list.find(o => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    const half = (t ? t.width : 300) / 2 + 30; b.x = Phaser.Math.Clamp(x, half + 8, W - half - 8); return b;
  }
  private qPop() { this.q.setScale(0.3); this.tweens.add({ targets: this.q, scale: 1, duration: 160, ease: 'Back.Out' }); }
  private creakPop(x: number) {
    Fx.step(); const t = comic(this, x + Phaser.Math.Between(-20, 20), FLOOR - 200, 'creak!', 40, '#ffb060', '#fff0d0', '#2a1408').setDepth(60).setAngle(Phaser.Math.Between(-14, 14)).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.Out' }); this.tweens.add({ targets: t, y: t.y - 70, alpha: 0, delay: 250, duration: 450, onComplete: () => t.destroy() });
    for (let i = 0; i < 4; i++) { const d = this.add.circle(x + Phaser.Math.Between(-30, 30), FLOOR + 10, Phaser.Math.Between(6, 12), 0xd9b080, 0.7).setDepth(13);
      this.tweens.add({ targets: d, y: d.y - 40, x: d.x + Phaser.Math.Between(-30, 30), alpha: 0, scale: 1.8, duration: 500, onComplete: () => d.destroy() }); }
    this.noir.setScale(this.noirBase * 1.05, this.noirBase * 0.9); this.tweens.add({ targets: this.noir, scaleX: this.noirBase, scaleY: this.noirBase, duration: 200, ease: 'Back.Out' });
  }
  private spot() {
    const s = this.st; if (s.spotted > 0) return; s.spotted = 1;
    this.bang.setVisible(true).setPosition(s.px, FLOOR - 260).setScale(1.8); this.tweens.add({ targets: this.bang, scale: 1.2, duration: 160, ease: 'Back.Out' });
    this.cameras.main.shake(200, 0.012); flashVignette(this, 0xff3b3b, 0.45); this.ft(s.x, FLOOR - 260, 'SPOTTED!', '#ff6b6b', 44);
  }
  private susK = -1;
  private drawSus(now: number) {
    const s = this.st, show = s.running && !s.over && s.mode !== 'flee' && s.mode !== 'catch';
    if (!show) { this.sus.setAlpha(0); return; }
    const k = s.sus / 100, eyes = s.yarnT <= 0 && s.look !== 'away';
    if (Math.abs(k - this.susK) > 0.002) { const rising = k > this.susK; this.susK = k; this.susFill.setCrop(0, 0, Math.round(132 * k), 24).setTint(k < 0.4 ? 0xffe066 : k < 0.7 ? 0xffa63a : 0xff4a4a);
      this.sus.setScale(rising ? 1.08 : 1); } else this.sus.setScale(1);
    const key = eyes ? 'pn_eye' : 'pn_eyez'; if (key !== this.eyeKey) { this.eyeKey = key; this.susEye.setTexture(key); }
    this.susEye.setScale(eyes ? 1 + 0.08 * Math.sin(now / 70) : 1);
    const jig = k > 0.7 ? Math.sin(now / 22) * 4 * k : 0, near = Phaser.Math.Clamp((250 - (this.pup.x - this.noir.x)) / 90, 0, 1);
    this.susLift += (near - this.susLift) * 0.2; // Noir close -> the meter floats up above both heads, clear of her face
    this.sus.setPosition(Phaser.Math.Clamp(this.pup.x + jig, 112, W - 112), this.pup.y - 172 - this.susLift * 150).setAlpha(k > 0.01 || eyes ? 1 : 0.6);
  }
  private draw(dt: number) {
    const s = this.st, now = this.time.now;
    // Noir: tiptoe slink while sneaking, crouch when frozen
    if (!s.busy) { const sneak = s.hold && s.running; this.noir.x = s.x; this.noir.y = FLOOR + 10 + (sneak ? -Math.abs(Math.sin(now / 90)) * 8 : 0);
      this.noir.setAngle(sneak ? Math.sin(now / 90) * 3 : 0);
      // creeping: low crouch, paws padding forward in turn, legs tiptoeing; otherwise blend back to a relaxed crouch-ready stance
      const w = Math.sin(now / 90), P = this.rig.pose as Record<string, number>;
      const T: Record<string, number> = sneak ? { ls: 70 + w * 25, le: -30, rs: 60 - w * 25, re: -30, lh: -20 + w * 22, lk: 40, rh: 20 - w * 22, rk: -10, lean: 14, sq: -0.08, dy: 10, tilt: 4 }
        : { ls: -12, le: -10, rs: 12, re: 10, lh: -4, lk: 0, rh: 4, rk: 0, lean: 0, sq: 0, dy: 0, tilt: 0 };
      if (!this.rig.busy) { const k = 1 - Math.exp(-dt * 12), nx: Record<string, number> = {}; for (const key in T) nx[key] = P[key] + (T[key] - P[key]) * k; this.rig.setPose(nx); } }
    const behind = this.hidden && !this.leaping; this.noir.setAlpha(behind ? 0.55 : 1).setDepth(behind ? 15 : 22); // in the air = out of cover
    (this.children.getByName('nshadow') as Phaser.GameObjects.Image).setPosition(this.noir.x, FLOOR + 14).setScale(1 - (FLOOR + 10 - this.noir.y) / 400);
    const yarnOn = s.yarnT > 0;
    this.pup.x = s.px + this.pupOff;
    if (s.mode !== 'flee' && s.mode !== 'catch') this.pup.setFlipX(yarnOn ? false : s.look !== 'look').setTexture(yarnOn ? 'pup_hearts' : s.look === 'look' ? (s.noise > 50 || s.spotted || s.sus > 70 ? 'pup_panic' : 'pup_idle') : s.look === 'warn' ? 'pup_lean' : 'pup_idle'); // looking away = plain face turned away (was pup_hearts for most of the round); the starry face is kept for the yarn
    if (!s.busy) this.pup.y = FLOOR - (s.look === 'away' ? Math.abs(Math.sin(now / 200)) * 6 : 0);
    if (this.runHop) { const ph = now / 65; this.pup.setY(FLOOR - Math.abs(Math.sin(ph)) * 14).setAngle(Math.sin(ph) * 8); } // scamper off / back in: hop + waddle instead of a flat slide
    (this.children.getByName('pshadow') as Phaser.GameObjects.Image).setPosition(this.pup.x, FLOOR + 6);
    this.q.setPosition(this.pup.x, FLOOR - 240 - this.susLift * 30 + Math.sin(now / 120) * 6).setText(s.spotted ? '' : s.look === 'warn' ? '?' : s.look === 'look' ? '👀' : yarnOn ? '♥' : '');
    if (!s.spotted) this.bang.setVisible(false); else this.bang.setPosition(this.pup.x + Math.sin(now / 30) * 4, FLOOR - 265);
    this.drawSus(now);
    // vision cone (two soft layers) — reddens as he notices
    const c = this.cone.clear(); if (s.look === 'look' && !s.busy && !yarnOn) { const col = s.sus > 35 || s.noise > 60 ? 0xff7a6a : 0xfff4a0;
      c.fillStyle(col, 0.10).fillTriangle(s.px - 30, FLOOR - 120, 0, FLOOR - 380, 0, FLOOR + 160); c.fillStyle(col, 0.12).fillTriangle(s.px - 30, FLOOR - 120, 0, FLOOR - 300, 0, FLOOR + 80); }
    else if (s.look === 'warn' && !s.busy) c.fillStyle(0xfff4a0, 0.05 + 0.05 * Math.sin(now / 40)).fillTriangle(s.px - 30, FLOOR - 120, s.px - 260, FLOOR - 260, s.px - 260, FLOOR + 40);
    // creaky boards: cracked, tinted, flash orange + shake when stepped on
    const b = this.boards.clear();
    CREAK.forEach(([a, e], i) => { this.creakFlash[i] = Math.max(0, this.creakFlash[i] - dt * 3); const on = s.x > a - 10 && s.x < e + 10 && !s.busy, f = this.creakFlash[i], jig = f > 0 ? Math.sin(now / 25) * 2 * f : 0;
      b.fillStyle(0xc88a4a, 1).fillRect(a, FLOOR - 14 + jig, e - a, 44).fillStyle(0xff8a3a, 0.25 + 0.5 * f + 0.1 * Math.sin(now / 300)).fillRect(a, FLOOR - 14 + jig, e - a, 44);
      b.fillStyle(0x8a5226, 1).fillRect(a, FLOOR + 22 + jig, e - a, 8).lineStyle(4, 0x2a1408, 1).strokeRect(a, FLOOR - 14 + jig, e - a, 44);
      b.lineStyle(3, 0x2a1408, 1).beginPath(); b.moveTo(a + 6, FLOOR - 4 + jig); b.lineTo(a + (e - a) * 0.3, FLOOR + 8 + jig); b.lineTo(a + (e - a) * 0.5, FLOOR + jig); b.lineTo(a + (e - a) * 0.7, FLOOR + 16 + jig); b.lineTo(e - 6, FLOOR + 6 + jig); b.strokePath();
      b.lineBetween(a + (e - a) * 0.5, FLOOR + jig, a + (e - a) * 0.55, FLOOR - 12 + jig); b.fillStyle(0x2a1408, 1).fillCircle(a + 8, FLOOR - 6 + jig, 3).fillCircle(e - 8, FLOOR - 6 + jig, 3);
      if (on) { const gl = 0.5 + 0.5 * Math.sin(now / 110); b.fillStyle(0xffb050, 0.18 + 0.2 * gl).fillRect(a - 10, FLOOR - 24, e - a + 20, 64); b.lineStyle(6, 0xffd070, 0.55 + 0.4 * gl).strokeRect(a - 4, FLOOR - 18, e - a + 8, 52); }
      if (f > 0) { b.lineStyle(3, 0xffd0a0, f).lineBetween(a - 6, FLOOR - 30, a - 18, FLOOR - 50).lineBetween(e + 6, FLOOR - 30, e + 18, FLOOR - 50).lineBetween((a + e) / 2, FLOOR - 34, (a + e) / 2, FLOOR - 58); } });
    // dust motes in the moon shaft
    const fx = this.fxg.clear();
    for (const m of this.motes) { m.y -= m.v * dt; m.x += Math.sin(now / 900 + m.p) * 0.2; if (m.y < 350) { m.y = 1040; m.x = Phaser.Math.Between(110, 400); }
      fx.fillStyle(0xdfe6ff, 0.35 + 0.25 * Math.sin(now / 400 + m.p)).fillCircle(m.x, m.y, 2.2); }
    // sound rings from Noir
    this.waves = this.waves.filter(w => (w.r += 220 * dt) < 160); for (const w of this.waves) fx.lineStyle(4, 0xffb060, w.a * (1 - w.r / 160)).beginPath().arc(w.x, FLOOR - 80, w.r, -Math.PI * 0.85, -Math.PI * 0.15).strokePath();
    // noise meter with pulsing outline (faster + redder as it fills)
    const n = this.noiseBar.clear(), k = s.noise / 100, pulse = 0.5 + 0.5 * Math.sin(now / (220 - 160 * k)), ocol = k > 0.7 ? 0xff3b3b : k > 0.4 ? 0xffc021 : 0xffffff;
    n.lineStyle(6 + pulse * 6 * (0.3 + k), ocol, 0.35 + 0.5 * pulse * (0.3 + k)).strokeRoundedRect(184 - pulse * 3, 346 - pulse * 3, 452 + pulse * 6, 52 + pulse * 6, 26);
    n.fillStyle(0x22252b, 1).lineStyle(4, 0xffffff, 1).fillRoundedRect(190, 352, 440, 40, 20).strokeRoundedRect(190, 352, 440, 40, 20).fillStyle(s.noise > 70 ? 0xff3b3b : s.noise > 40 ? 0xffc021 : 0x7dff9a, 1).fillRoundedRect(196, 358, Math.max(28, 428 * Math.min(1, k)), 28, 14);
    n.fillStyle(0xffffff, 0.25).fillRoundedRect(200, 360, Math.max(20, 420 * Math.min(1, k)), 8, 4);
    n.lineStyle(3, 0xffffff, 0.6).lineBetween(196 + 428 * 0.4, 356, 196 + 428 * 0.4, 388).lineBetween(196 + 428 * 0.7, 356, 196 + 428 * 0.7, 388);
    // pounce-range ring on the floor: green = NEAR, gold = FLYING POUNCE band; Puppy's spot marker lights up when in reach
    const d = s.px - s.x, near = d < NEAR, fly = !near && d < FAR, r = this.ring.clear();
    if (!s.busy && s.running) { const pr = 0.85 + 0.15 * Math.sin(now / 150);
      r.fillStyle(0xffdf6b, fly ? 0.22 : 0.08).fillEllipse(s.x + FAR / 2, FLOOR + 14, FAR * 2, 70).fillStyle(0x7dff9a, near ? 0.28 : 0.1).fillEllipse(s.x + NEAR / 2, FLOOR + 14, NEAR * 2, 58);
      r.lineStyle(4, 0xffdf6b, fly ? 0.9 * pr : 0.35).strokeEllipse(s.x + FAR / 2, FLOOR + 14, FAR * 2, 70).lineStyle(5, 0x7dff9a, near ? 0.95 * pr : 0.4).strokeEllipse(s.x + NEAR / 2, FLOOR + 14, NEAR * 2, 58);
      r.lineStyle(5, near ? 0x7dff9a : fly ? 0xffdf6b : 0xff4a4a, near || fly ? 1 : 0.8).strokeCircle(s.px, FLOOR + 10, 22 + Math.sin(now / 90) * 4);
      if (!near && !fly) r.lineStyle(5, 0xff4a4a, 0.75 * pr).strokeEllipse(s.x + FAR / 2, FLOOR + 14, FAR * 2 + 10, 76); }
    this.pb.setAlpha(near || fly ? 1 : 0.45).setScale(near || fly ? 1 + Math.sin(now / 120) * 0.04 : 1);
    this.yarnBtn.setAlpha(s.yarn > 0 && !yarnOn ? 1 : 0.3).setScale(s.yarn > 0 && s.noise > 50 && !yarnOn ? 1 + Math.sin(now / 100) * 0.06 : 1);
  }
  throwYarn() {
    const s = this.st; if (!s.running || s.over || s.busy || s.yarn <= 0 || s.yarnT > 0) return;
    s.yarn = 0; s.yarnT = YARN_T; s.look = 'away'; Fx.boing(); this.ft(s.px, FLOOR - 410, 'YARN!!', '#ff9ab8', 40);
    this.yarnBall?.destroy(); this.yarnBall = this.add.image(YX, YY, 'pn_yarn').setDepth(30).setScale(0.6);
    this.tweens.add({ targets: this.yarnBall, x: s.px + 90, y: FLOOR - 10, angle: 720, duration: 500, ease: 'Quad.Out', onUpdate: (tw) => { this.yarnBall!.y = Phaser.Math.Linear(YY, FLOOR - 10, tw.progress) - Math.sin(tw.progress * Math.PI) * 160; } });
    if (Math.random() < 0.6) this.talk(s.px, FLOOR - 470, 'Ooh! A YARN ball!!', 20, 900);
  }
  private yarnDone() { this.st.lookT = Math.min(this.st.lookT, 0.6); if (this.yarnBall) { const y = this.yarnBall; this.tweens.add({ targets: y, alpha: 0, duration: 300, onComplete: () => y.destroy() }); this.yarnBall = undefined; } }
  pounce() {
    const s = this.st; if (!s.running || s.over || s.busy) return;
    const d = s.px - s.x; if (d > FAR) { this.ft(s.x + 80, FLOOR - 250, 'too far!', '#fff', 30); s.noise += 15; return; }
    const fly = d >= NEAR, T = fly ? FLY_T : NEAR_T, CROUCH = K.CROUCH; this.setMode('pounce'); this.leaping = false; s.flying = fly ? 1 : 0; this.rig.setMood('smug');
    s.turned = s.yarnT <= 0 && s.look !== 'away' ? 1 : 0; // pouncing while he looks or turns = he sees it coming
    const sx = s.x, tx = s.px - 30, apex = fly ? 280 : 200, E = Phaser.Math.Easing;
    // 250 ms visible wind-up: low crouch + butt wiggle (if Puppy turns now or mid-air, he dodges) -> stretched leap -> landing squash
    this.rig.act([{ dur: CROUCH / 1000, to: { ls: -40, le: 60, rs: -30, re: 60, lh: -50, lk: 80, rh: -30, rk: 70, lean: 18, sq: -0.16, dy: 18, tilt: 6 }, ease: E.Quadratic.Out },
      { dur: T / 1000 * 0.45, to: { ls: 125, le: -10, rs: 110, re: -15, lh: -70, lk: 20, rh: -55, rk: 30, lean: 22, sq: 0.08, dy: -4, tilt: -4 }, ease: E.Cubic.Out },
      { dur: T / 1000 * 0.55, to: { ls: 80, le: 10, rs: 65, re: 10, lh: -20, lk: 30, rh: 10, rk: 20, lean: 18, sq: 0.02, dy: 0 } }], true);
    // wind-up tell, readable even behind the plant: deep squash + butt wiggle, dust puff in front of the cover, "wiggle wiggle" cue
    this.tweens.add({ targets: this.noir, scaleX: this.noirBase * 1.3, scaleY: this.noirBase * 0.7, duration: CROUCH * 0.5, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.noir, angle: { from: -10, to: 10 }, duration: CROUCH / 6, yoyo: true, repeat: 2, onComplete: () => this.noir.setAngle(0) });
    for (let i = 0; i < 4; i++) { const p = this.add.circle(sx + (i - 1.5) * 34, FLOOR + 14, 11, 0xd9b080, 0.8).setDepth(26);
      this.tweens.add({ targets: p, x: p.x + (i - 1.5) * 22, y: FLOOR - 14, scale: 2, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => p.destroy() }); }
    this.cue.setVisible(true).setPosition(sx, FLOOR - 270).setAlpha(1).setScale(0.4).setAngle(-8); this.tweens.killTweensOf(this.cue);
    this.tweens.add({ targets: this.cue, scale: 1, angle: 8, duration: CROUCH * 0.6, ease: 'Back.Out' });
    this.tweens.add({ targets: this.cue, alpha: 0, y: FLOOR - 320, delay: CROUCH + 120, duration: 260, onComplete: () => this.cue.setVisible(false) });
    this.time.delayedCall(CROUCH, () => {
      if (s.mode !== 'pounce' || s.over) return;
      Fx.whoosh(); this.leaping = true;
      this.tweens.addCounter({ from: 0, to: 1, duration: T, ease: 'Sine.easeInOut', onUpdate: (tw) => { const p = tw.getValue()!; this.noir.x = Phaser.Math.Linear(sx, tx, p); this.noir.y = FLOOR + 10 - Math.sin(p * Math.PI) * apex;
          this.noir.setScale(this.noirBase * (0.9 + 0.1 * Math.abs(p - 0.5) * 2), this.noirBase * (1.15 - 0.15 * Math.abs(p - 0.5) * 2)).setAngle((p - 0.5) * 30);
          if (Math.random() < 0.5) { const gh = this.add.ellipse(this.noir.x, this.noir.y - 130, 150, 230, 0x9a7aff, 0.25).setDepth(21).setAngle(this.noir.angle);
            this.tweens.add({ targets: gh, alpha: 0, duration: 220, onComplete: () => gh.destroy() }); } },
        onComplete: () => { if (s.mode !== 'pounce' || s.over) return; this.noir.y = FLOOR + 10; this.noir.setAngle(0); s.x = this.noir.x;
          this.rig.act([{ dur: 0.08, to: { ls: 40, le: 20, rs: 30, re: 20, sq: -0.1, dy: 10, lean: 10, lh: -30, lk: 50, rh: 20, rk: -20 } }, { dur: 0.25, to: { sq: 0, dy: 4, lean: 6 } }], false, 0.25);
          this.noir.setScale(this.noirBase * 1.2, this.noirBase * 0.82); this.tweens.add({ targets: this.noir, scaleX: this.noirBase, scaleY: this.noirBase, duration: 260, ease: 'Back.Out' });
          for (let i = 0; i < 6; i++) { const p = this.add.circle(this.noir.x + Phaser.Math.Between(-50, 50), FLOOR + 10, 10, 0xd9b080, 0.7).setDepth(13); this.tweens.add({ targets: p, y: FLOOR - 30, alpha: 0, scale: 2, duration: 400, onComplete: () => p.destroy() }); }
          this.leaping = false; if (s.turned || (s.yarnT <= 0 && s.look === 'look')) this.dodged(); else this.catch(); } });
    });
  }
  /** Dodge = real cost: clock keeps running, Noir tumbles back OUT of range, Puppy stares ~1 s; dodge him twice and he scampers off to a new spot. */
  private dodged() {
    const s = this.st; s.streak = 0; s.dodges++; this.setMode('dodge');
    Fx.boing(); this.tweens.add({ targets: this.pup, y: FLOOR - 70, duration: 160, yoyo: true, ease: 'Quad.Out' }); this.ft(s.px, FLOOR - 410, 'DODGED!', '#ff8a8a', 36);
    this.rig.setMood('dizzy'); s.noise = Math.min(99, s.noise + K.DODGE_N); this.talk(s.px, FLOOR - 500, pick(s.dodges >= SCAMPER_N ? LINES.pounceFled : LINES.pounceSeen), 20, 1000); // 2nd dodge = he bolts to a new spot
    s.look = 'look'; s.glance = 0; s.fake = 0; s.lookT = DODGE_WATCH; s.sniffT = 0;
    // slapstick: bonk off his nose and tumble backwards head over heels
    const fx = this.noir.x, tx = Math.max(START, s.px - KNOCK);
    this.tweens.addCounter({ from: 0, to: 1, duration: 520, ease: 'Quad.Out', onUpdate: (tw) => { const p = tw.getValue()!; this.noir.x = Phaser.Math.Linear(fx, tx, p); this.noir.y = FLOOR + 10 - Math.sin(p * Math.PI) * 110; this.noir.setAngle(-360 * p); },
      onComplete: () => { this.noir.setAngle(0).setY(FLOOR + 10); s.x = tx; this.noir.setScale(this.noirBase * 1.15, this.noirBase * 0.85); this.tweens.add({ targets: this.noir, scaleX: this.noirBase, scaleY: this.noirBase, duration: 220, ease: 'Back.Out' }); } });
    for (let i = 0; i < 3; i++) { const st = txt(this, fx - 30, FLOOR - 150, '★', 30, '#ffdf6b', '#22252b', 4).setDepth(45); this.tweens.add({ targets: st, x: fx - 110 + (i - 1) * 45, y: FLOOR - 230, alpha: 0, duration: 600, onComplete: () => st.destroy() }); }
    if (s.dodges >= SCAMPER_N) this.time.delayedCall(250, () => this.scamper());
    this.time.delayedCall(650, () => { if (s.mode !== 'dodge' || s.over) return; this.rig.setMood('smug'); s.x = tx; this.noir.setAngle(0).setY(FLOOR + 10); this.setMode('');
      s.dazed = DODGE_WATCH; if (s.yarnT <= 0) { s.look = 'look'; s.glance = 0; s.fake = 0; s.lookT = DODGE_WATCH; } }); // he keeps staring ~1 s after she lands: freeze!
  }
  /** After repeated dodges Puppy scampers to a new spot (and stays a bit jumpier). */
  scamper() {
    const s = this.st; if (s.over || s.mode === 'flee' || s.mode === 'catch') return; s.dodges = 0;
    let np = Phaser.Math.Between(520, 640); if (Math.abs(np - s.px) < 60) np = s.px < 580 ? Phaser.Math.Between(600, 640) : Phaser.Math.Between(520, 550);
    s.scampT = 0.45; s.sus = Math.min(90, s.sus + 20); this.paceDir = np > s.px ? 1 : -1;
    this.ft(s.px, FLOOR - 250, 'scamper!', '#ffe0a0', 30); Fx.step();
    for (let i = 0; i < 4; i++) { const p = this.add.circle(s.px + Phaser.Math.Between(-30, 30), FLOOR, 12, 0xd9b080, 0.6).setDepth(9); this.tweens.add({ targets: p, y: FLOOR - 30, alpha: 0, scale: 2, delay: i * 60, duration: 380, onComplete: () => p.destroy() }); }
    this.tweens.add({ targets: s, px: np, duration: 420, ease: 'Quad.Out' });
  }
  private catch() {
    const s = this.st; this.setMode('catch'); s.catches++; s.streak++; s.dodges = 0; const silent = s.noise < 30;
    const pts = (silent ? 900 : 500) + (s.flying ? 400 : 0) + (s.streak > 1 ? 100 * (s.streak - 1) : 0); s.score += pts;
    Fx.punch(); Fx.boing(); impact(this, s.px, FLOOR - 120, s.flying ? 'FLYING POUNCE!' : pick(['POUNCE!', 'BOOP!', 'GOTCHA!']), pts, [silent ? 'SILENT!' : '', s.streak > 1 ? `x${s.streak} STREAK` : ''].filter(Boolean).join(' '), true);
    sparks(this, s.px, FLOOR - 80, 20, true);
    this.pup.setTexture('pup_dizzy'); pupFlail(this, this.pup, 900); this.tweens.add({ targets: this.pup, angle: 360, scaleY: this.pupBase * 0.8, duration: 400, yoyo: true });
    this.rig.setMood('happy'); this.talk(360, 560, pick(LINES.pounce), 22, 1200);
    if (s.catches >= K.NEED) { this.time.delayedCall(800, () => this.finish(true)); return; }
    this.time.delayedCall(1200, () => this.reset());
  }
  private flee() {
    const s = this.st; if (s.mode === 'flee') return; this.setMode('flee'); s.escapes++; s.streak = 0; Fx.save(); this.talk(s.px, FLOOR - 470, pick(s.sus >= 100 ? LINES.pounceSpotted : LINES.pounceFled), 22, 1100);
    if (!s.spotted) { this.bang.setVisible(true).setPosition(s.px, FLOOR - 290).setScale(1.8); this.tweens.add({ targets: this.bang, scale: 1.2, duration: 160, ease: 'Back.Out' }); s.spotted = 1; }
    this.pup.setTexture('pup_panic').setFlipX(true); this.runHop = true; this.tweens.add({ targets: this, pupOff: W + 150 - s.px, duration: 500, ease: 'Quad.In' });
    for (let i = 0; i < 5; i++) { const p = this.add.circle(s.px - i * 30, FLOOR, 14, 0xd9b080, 0.6).setDepth(9); this.tweens.add({ targets: p, x: p.x - 40, alpha: 0, scale: 2, delay: i * 50, duration: 400, onComplete: () => p.destroy() }); }
    this.time.delayedCall(1100, () => this.reset());
  }
  private reset() {
    const s = this.st; if (s.over) return; const after = s.mode; s.x = START; s.noise = 0; s.look = 'away'; s.lookT = Phaser.Math.FloatBetween(K.AWAY_MIN, 1.6); s.px = Phaser.Math.Between(540, 620); s.yarn = 1; s.yarnT = 0; s.spotted = 0; s.flying = 0;
    s.sus = 0; s.sniffT = 0; s.dodges = 0; s.turned = 0; s.fake = 0; s.glance = 0; s.scampT = 0; s.dazed = 0;
    this.yarnBall?.destroy(); this.yarnBall = undefined; this.tweens.killTweensOf(s); this.tweens.killTweensOf(this);
    this.rig.setMood('smug'); this.noir.setScale(this.noirBase).setAngle(0); this.rig.act([], false, 0.2); this.pup.setAngle(0).setScale(this.pupBase).setY(FLOOR).setFlipX(false);
    this.pupOff = W + 120 - s.px; this.setMode(after === 'catch' ? 'catch' : 'flee'); // the clock stays paused only while re-entering after a catch
    this.runHop = true; this.tweens.add({ targets: this, pupOff: 0, duration: 600, onComplete: () => { this.runHop = false; this.pup.setAngle(0).setY(FLOOR); if (!s.over) this.setMode(''); } });
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; (window as any).__pr.ended = win ? 'win' : 'lose';
    popBanner(this, win ? 'CAUGHT RED-PAWED!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Noir', 5, win, s.score + Math.round(s.time) * 20, `${s.catches} pounces • ${s.escapes} escapes`));
  }
}
