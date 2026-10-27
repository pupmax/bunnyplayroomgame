// Nana ACORN BARRAGE: you are Nana on a branch. Drag to aim, release to fling acorns at Puppy below. 12 hits in 35 s, 22 acorns.
// Puppy runs (faster as the clock runs down and the more you hit him), hops away from close shots, jukes mid-dash (4+ hits),
// pops an umbrella and hides under leaves. Twists (Marc fb 27 Oct "far too easy, not really fun"):
//  - TAIL WHACK: he stops, crouches and wiggles his tail with a "❗" (the tell). Throw at him then and he spins and whacks the
//    acorn straight back at Nana: she's dazed (~1 s, no throws) and the streak resets. Wait it out, then punish him.
//  - SNACK THIEF: a missed acorn lands on the grass; Puppy may dash over and MUNCH it (meter over his head). Bonk him before he
//    gulps = SNACK ATTACK (counts, stuns him longer, cancels the heal). If he gulps: SUGAR RUSH (he heals 1 hit and zooms faster for a few seconds).
//  - SEEING STARS: a GOLDEN acorn (3-hit streak, or every 7th acorn) knocks him silly for ~1.6 s; every hit while he sees stars
//    counts DOUBLE. The winning hit gets a slow-mo K.O. beat with an acorn shower.
// Wind (4+ hits) and the cardboard decoy (8+ hits) still escalate the round. Tuned with tests/acorn-realtouch.mjs (real touch bot).
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, ensureArt } from '../art/registry';
import { makeMuteButton, pointerInMute } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx, Sfx, Sushi } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, sparks, comic, flashVignette } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { HeroRig, pupFlail } from '../systems/rigs';
import { AcornPup, ACORN_PUP_KEYS } from '../systems/acornPups'; // Puppy look: Tail Catch rig

/** tuning (exposed as __pr.K; a test may pre-set window.__acornK to override for sweeps) */
export const AK = { TIME: 35, NEED: 13, THROWS: 22, HIT_R: 82, GOLD_R: 112, SPEED: 0.8, ASSIST: 30, COOL: 0.38, GOLD_EVERY: 7, STREAK_GOLD: 3,
  STUN: 0.65, STARS: 1.6, DODGE0: 0.1, DODGE_K: 0.02, DODGE_MAX: 0.35, WIND_AT: 4, DECOY_AT: 8, JUKE_AT: 4, JUKE_P: 0.35, WIND_MAX: 60,
  FOCUS_MAX: 1.5, FOCUS_GAIN: 0.5, FOCUS_DELAY: 0.25, UMB_P: 0.16, LEAF_P: 0.14,
  ALERT_AT: 2, ALERT_P: 0.32, ALERT_P3: 0.42, ALERT_T: [1.0, 1.5], SWAT_PAD: 25, DAZE: 1.0,
  MUNCH_P: 0.45, MUNCH_T: 1.6, MUNCH_T3: 1.3, SNACK_N: 1, RUSH_T: 3.5, RUSH_K: 1.35, NEAR_PAD: 50, ASSIST_LEAD: 0, OPEN_T: 0.5, PAUSE: [380, 1000] };
type K = typeof AK;
const FLIGHT = 260; const LAUNCH = { x: 420, y: 330 };
const LEAVES: [number, number][] = [[200, 980], [560, 1120]];
const RING = { x: 612, y: 600, r: 50 };
const FIELD = { x0: 90, x1: 630, y0: 780, y1: 1180 };
const HINT = LINES.acornHint as Record<'swat' | 'munch' | 'stars', string>;

export class AcornScene extends Phaser.Scene {
  K: K = { ...AK };
  st = { time: AK.TIME, hits: 0, shots: 0, score: 0, running: false, over: false, cool: 0, umbrella: false, hiding: -1, golden: false, streak: 0, dizzy: 0, focus: AK.FOCUS_MAX, wind: 0, phase: 1, inFlight: 0,
    alert: false, munch: 0, stars: 0, rush: 0, dazed: 0, swats: 0, munches: 0, snacks: 0, gulps: 0, nears: 0, jukes: 0, dodges: 0, best: 0 };
  private nana!: HeroRig; private held!: Phaser.GameObjects.Image; private aim!: Phaser.GameObjects.Graphics;
  private pup!: Phaser.GameObjects.Container; private pupImg!: Phaser.GameObjects.Image; private umb!: Phaser.GameObjects.Image; private pupSh!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Text; private timeT!: Phaser.GameObjects.Text; private bar!: Phaser.GameObjects.Graphics; private pipKey = ''; private moveTw?: Phaser.Tweens.Tween;
  private ring!: Phaser.GameObjects.Graphics; private ringT!: Phaser.GameObjects.Text; private ringShown = 0; private windG!: Phaser.GameObjects.Graphics; private windT!: Phaser.GameObjects.Text;
  private decoy?: Phaser.GameObjects.Container; private layers: { o: any; k: number; bx: number }[] = []; private parX = 0; private shine!: Phaser.GameObjects.Text;
  private dragging = false; private dragT = 0; private slowT = 0; private wasFocus = false; private ghost?: Phaser.GameObjects.Graphics; private ghostImg?: Phaser.GameObjects.Image; private lastPup = { x: 360, y: 900 }; private pupV = { x: 0, y: 0 }; private roamId = 0; private wadTw?: Phaser.Tweens.Tween; private aimPt = { x: 360, y: 900 };
  private skin: AcornPup | null = null; private umbY = -120;
  // twist props: the "❗" tell, the stolen acorn + munch meter, the x2 star badge, Nana's daze stars, the hint line, dropped acorns
  private tag!: Phaser.GameObjects.Container; private bang!: Phaser.GameObjects.Text; private snack!: Phaser.GameObjects.Image; private munchG!: Phaser.GameObjects.Graphics; private x2!: Phaser.GameObjects.Text;
  private nStars: Phaser.GameObjects.Text[] = []; private hint?: Phaser.GameObjects.Text; private drops: Phaser.GameObjects.Image[] = []; private munchMax = 1; private rushFx = 0; private zoom0 = 1; private mid0 = { x: W / 2, y: H / 2 };
  constructor() { super('Acorn'); }
  create() {
    this.K = { ...AK, ...((window as any).__acornK || {}) }; const K = this.K;
    this.ghost = undefined; this.ghostImg = undefined; this.slowT = 0; this.wasFocus = false; this.hint = undefined; this.drops = []; this.nStars = []; this.rushFx = 0;
    setupCamera(this); this.zoom0 = this.cameras.main.zoom; this.mid0 = { x: this.cameras.main.midPoint.x, y: this.cameras.main.midPoint.y }; this.cameras.main.fadeIn(250); setPageBg(0x9fe0ff, 0x3a8f2a); this.tweens.timeScale = 1;
    this.st = { time: K.TIME, hits: 0, shots: 0, score: 0, running: false, over: false, cool: 0, umbrella: false, hiding: -1, golden: false, streak: 0, dizzy: 0, focus: K.FOCUS_MAX, wind: 0, phase: 1, inFlight: 0,
      alert: false, munch: 0, stars: 0, rush: 0, dazed: 0, swats: 0, munches: 0, snacks: 0, gulps: 0, nears: 0, jukes: 0, dodges: 0, best: 0 };
    this.layers = []; this.parX = 0; this.ringShown = 0; this.decoy = undefined; this.dragging = false; this.wadTw = undefined;
    art(this, 0, 0, 'bg_forest');
    this.buildForest();
    this.nana = new HeroRig(this, 'Nana', 330, 330, 0.95, { tail: true }).setDepth(30).setPose({ lh: -25, lk: 30, rh: 25, rk: -30 });
    this.held = art(this, LAUNCH.x, LAUNCH.y - 30, 'acorn', 0.8).setDepth(31); this.held.setData('s0', this.held.scaleX);
    this.nana.held = this.held; // the ready acorn rides in Nana's throwing paw
    this.shine = txt(this, LAUNCH.x + 22, LAUNCH.y - 60, '✨', 30).setDepth(32).setVisible(false);
    this.tweens.add({ targets: this.shine, angle: 360, scale: { from: 0.7, to: 1.3 }, yoyo: true, repeat: -1, duration: 420 });
    art(this, 650, 520, 'bun_bust_wink', 0.4).setDepth(5);
    this.pup = this.add.container(360, 900).setDepth(20);
    this.pupImg = art(this, 0, 0, 'pup_idle', 0.72); this.pupImg.setData('b', this.pupImg.scaleX);
    this.umb = art(this, 0, -120, 'umbrella', 0.9).setVisible(false); this.umb.setData('s0', this.umb.scaleX);
    this.pupSh = this.add.image(0, 4, 'su_shadow').setScale(0.7, 0.5);
    this.snack = art(this, 0, -120, 'acorn', 0.55).setVisible(false); this.snack.setData('s0', this.snack.scaleX);
    this.bang = txt(this, 0, -300, '❗', 54, '#ff3b3b', '#22252b', 8).setVisible(false);
    this.x2 = txt(this, 0, -330, '⭐ x2 ⭐', 34, '#ffd21f', '#22252b', 7).setVisible(false);
    this.munchG = this.add.graphics();
    this.pup.add([this.pupSh, this.pupImg, this.umb, this.snack]);
    // tell / meter / badge ride in their own container above the HUD so the ring never hides them
    this.tag = this.add.container(this.pup.x, this.pup.y, [this.munchG, this.bang, this.x2]).setDepth(61);
    this.skin = null; this.umbY = -120; this.attachSkin();
    LEAVES.forEach(([x, y], i) => { const l = art(this, x, y, 'leaf', 1.15).setDepth(25); this.tweens.add({ targets: l, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1400 + i * 300, ease: 'Sine.InOut' }); });
    this.aim = this.add.graphics().setDepth(50);
    txt(this, W / 2, 400, 'ACORN BARRAGE', 40, '#ffdf6b', '#22252b', 8).setDepth(60);
    this.hud = txt(this, 170, 452, '', 28, '#fff', '#22252b', 6).setDepth(60);
    this.timeT = txt(this, 580, 452, '', 34, '#fff', '#22252b', 6).setDepth(60);
    this.bar = this.add.graphics().setDepth(60); this.pipKey = '';
    this.ring = this.add.graphics().setDepth(60); this.ringT = txt(this, RING.x, RING.y, '', 30, '#fff', '#22252b', 6).setDepth(61);
    this.windG = this.add.graphics().setDepth(60); this.windT = txt(this, 110, 600, '', 22, '#ffffff', '#22252b', 5).setDepth(61);
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.dragging = true; this.dragT = 0; this.cockArm(); this.drawAim(w.x, w.y); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.dragging && p.isDown) this.drawAim(worldPoint(this, p).x, worldPoint(this, p).y); });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => { if (!this.dragging) return; this.dragging = false; if (this.wasFocus) this.slowT = 0.3; this.ghost?.clear(); this.aim.clear(); const w = worldPoint(this, p); this.fling(w.x, w.y); });
    (window as any).__pr = { pupSkin: () => this.skin?.mode ?? null, scene: 'Acorn', st: this.st, K: this.K, need: K.NEED, throws: K.THROWS, force: (win: boolean) => this.finish(win), pup: () => ({ x: this.pup.x, y: this.pup.y }),
      decoy: () => this.decoy ? { x: this.decoy.x, y: this.decoy.y } : null,
      stats: () => { const s = this.st; return { swats: s.swats, munches: s.munches, snacks: s.snacks, gulps: s.gulps, nears: s.nears, jukes: s.jukes, dodges: s.dodges, best: s.best }; } };
    this.updateHud(); this.roam();
    tutorialCard(this, 'nana2', 'ACORN BARRAGE!', ['You are NANA! 🐿️ DRAG to aim, RELEASE!', 'Aim where he\'s GOING. He JUKES!', '❗ + tail wiggle = he WHACKS it back. WAIT!', 'He EATS missed acorns. BONK him first!', 'GOLDEN = ⭐ stars: hits count DOUBLE!', `${K.NEED} hits in ${K.TIME}s, ${K.THROWS} acorns!`], () => this.begin());
  }
  /** swap the old Puppy sprite for the Tail Catch rig once its on-demand frames exist (the hidden pupImg keeps every gameplay tween) */
  private attachSkin() {
    const go = (now = false) => { if ((!now && !this.sys.isActive() && !this.sys.isPaused()) || this.skin || !this.pup?.scene) return;
      const sk = this.skin = new AcornPup(this, 0.9); this.pupImg.setVisible(false); this.pupSh.setVisible(false); this.pup.addAt(sk.root, 0); this.umbY = sk.umbY;
      if (!this.tweens.isTweening(this.umb)) this.umb.setY(this.umbY);
      const s = this.st; if (s.over) { if ((window as any).__pr?.ended === 'win') sk.win(); else sk.lose(); } else if (s.munch > 0) sk.munch(); else if (s.alert) sk.ready(); else if (s.hiding >= 0) sk.hide(); else if (s.umbrella) sk.umbrella(); else if (this.moveTw?.isPlaying()) sk.run(this.pupImg.flipX ? 1 : -1); };
    if (ACORN_PUP_KEYS.every(k => this.textures.exists(k))) go(true); else ensureArt(this, ACORN_PUP_KEYS).then(() => go());
  }
  private begin() { popBanner(this, 'NUTS TO YOU, PUPPY!', 700, 0xe08a3c); this.time.delayedCall(600, () => { say(this, 440, 570, pick(LINES.start.Nana), 22); this.st.running = true; }); }
  // ---------- painted forest layers (parallax with aim) ----------
  private buildForest() {
    const add = (o: any, k: number) => { this.layers.push({ o, k, bx: o.x }); return o; };
    const shafts = this.add.graphics().setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 4; i++) shafts.fillStyle(0xfff6c8, 0.07).fillTriangle(120 + i * 170, 0, 40 + i * 170, H, 200 + i * 170, H);
    this.tweens.add({ targets: shafts, alpha: { from: 0.6, to: 1 }, yoyo: true, repeat: -1, duration: 2600, ease: 'Sine.InOut' }); add(shafts, 0.02);
    const far = this.add.graphics().setDepth(2);
    for (let i = 0; i < 9; i++) { const x = i * 90 - 20, h = 260 + (i % 3) * 60; far.fillStyle(0x2f6f3a, 0.35).fillRect(x, 760 - h, 26, h).fillCircle(x + 13, 760 - h, 70); }
    add(far, 0.05);
    const mid = this.add.graphics().setDepth(3);
    for (let i = 0; i < 5; i++) { const x = 40 + i * 170; mid.fillStyle(0x5a3a1e, 0.55).fillRect(x, 560, 34, 240); mid.fillStyle(0x3f8f3a, 0.55).fillCircle(x + 17, 560, 90).fillCircle(x - 30, 600, 60).fillCircle(x + 60, 600, 60); }
    add(mid, 0.1);
    // the branch Nana is perched on (shaded bark + leaves)
    const br = this.add.graphics().setDepth(29);
    br.fillStyle(0x6b4220, 1).lineStyle(6, 0x22252b, 1).fillRoundedRect(-30, 352, 640, 46, 23).strokeRoundedRect(-30, 352, 640, 46, 23);
    br.fillStyle(0x8a5a2e, 1).fillRoundedRect(-20, 358, 620, 14, 7); br.lineStyle(3, 0x4a2a10, 0.7); for (let x = 20; x < 600; x += 70) br.lineBetween(x, 380, x + 30, 384);
    br.fillStyle(0x4fa63a, 1).lineStyle(4, 0x22252b, 1); [[540, 350], [590, 372], [70, 352]].forEach(([x, y]) => br.fillEllipse(x, y, 70, 34).strokeEllipse(x, y, 70, 34));
    // foreground ferns (fast parallax), falling leaves particles
    for (let i = 0; i < 7; i++) { const g = this.add.graphics({ x: i * 120 + 10, y: H + 10 }).setDepth(35);
      for (let k = -3; k <= 3; k++) g.fillStyle(k % 2 ? 0x2f7f2a : 0x3f9f2e, 0.95).fillEllipse(k * 18, -60 - Math.abs(k) * -6, 22, 130).setAngle(0);
      this.tweens.add({ targets: g, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 1500 + i * 120, ease: 'Sine.InOut' }); add(g, 0.25); }
    this.time.addEvent({ delay: 450, loop: true, callback: () => { if (this.st.over) return; const l = txt(this, Phaser.Math.Between(0, W), 520, '🍂', Phaser.Math.Between(20, 32)).setDepth(4).setAlpha(0.85);
      const drift = this.st.wind * 4 + Phaser.Math.Between(-80, 80);
      this.tweens.add({ targets: l, y: 1200, x: l.x + drift, angle: Phaser.Math.Between(-360, 360), duration: Phaser.Math.Between(3000, 4500), onComplete: () => l.destroy() }); } });
  }
  private drawAim(x: number, y: number) {
    if (!this.st.running) return; y = Math.max(y, 560); this.aimPt = { x, y }; const L = this.nana.point('rp'); // preview arc starts at the paw
    const g = this.aim.clear(); const col = this.st.golden ? 0xffd21f : 0xffffff, w = this.st.wind;
    for (let i = 1; i < 12; i++) { const t = i / 12; const px = L.x + (x - L.x) * t + w * t * t, py = L.y + (y - L.y) * t - Math.sin(t * Math.PI) * 140; g.fillStyle(0x22252b, 0.9).fillCircle(px, py, 11).fillStyle(col, 1).fillCircle(px, py, 8); }
    const r = this.st.golden ? this.K.GOLD_R : this.K.HIT_R;
    g.lineStyle(11, 0x22252b, 0.9).strokeCircle(x, y, r * 0.8).lineStyle(7, col, 1).strokeCircle(x, y, r * 0.8).lineBetween(x - r - 14, y, x - r + 14, y).lineBetween(x + r - 14, y, x + r + 14, y);
    if (w) g.fillStyle(0x7fd8ff, 0.8).fillCircle(x + w, y, 8); // where the wind will actually carry it
    this.parX = (x - W / 2) / (W / 2);
  }
  /** Puppy's run speed factor: ramps with the clock and with every hit; SUGAR RUSH on top */
  private get fast() { const s = this.st, K = this.K; return (1 + (K.TIME - s.time) / K.TIME * 0.6 + s.hits * 0.03) * K.SPEED * (s.rush > 0 ? K.RUSH_K : 1); }
  private roam() {
    if (this.st.over) return; const id = ++this.roamId; const s = this.st, K = this.K;
    this.umb.setVisible(false); s.umbrella = false; s.hiding = -1; this.setAlert(false); this.pupImg.setTexture('pup_idle').setAlpha(1).setAngle(0); this.skin?.idle();
    const r = Math.random(), fast = this.fast;
    if (s.running && r < K.UMB_P) { // umbrella
      s.umbrella = true; this.skin?.umbrella(); this.umb.setVisible(true).setScale(0); this.tweens.add({ targets: this.umb, scale: this.umb.getData('s0'), duration: 220, ease: 'Back.Out' });
      if (Math.random() < 0.4) say(this, this.pup.x, this.pup.y - 260, 'Puppy: Umbrella! Genius!', 20, 1000);
      this.time.delayedCall(Phaser.Math.Between(1100, 1700), () => id === this.roamId && this.roam()); return;
    }
    let tx: number, ty: number; let hideAt = -1;
    if (s.running && r < K.UMB_P + K.LEAF_P) { hideAt = Phaser.Math.Between(0, LEAVES.length - 1); [tx, ty] = LEAVES[hideAt]; ty += 10; }
    else { tx = Phaser.Math.Between(FIELD.x0, FIELD.x1); ty = Phaser.Math.Between(FIELD.y0, FIELD.y1); }
    const juke = hideAt < 0 && s.running && s.hits >= K.JUKE_AT && Math.random() < K.JUKE_P;
    this.runTo(id, tx, ty, fast, () => {
      if (hideAt >= 0) { s.hiding = hideAt; this.pupImg.setAlpha(0.35); this.pup.setDepth(24); this.skin?.hide(); }
      else if (s.running && s.hits >= K.ALERT_AT && Math.random() < (s.phase >= 3 ? K.ALERT_P3 : K.ALERT_P)) return this.tailTell(id);
      else if (Math.random() < 0.15) { this.pupImg.setTexture('pup_hearts'); this.skin?.gag(); if (s.running && Math.random() < 0.5) say(this, this.pup.x, this.pup.y - 220, pick(LINES.puppyGag), 20, 1100); }
      else this.skin?.stop();
      this.time.delayedCall(hideAt >= 0 ? Phaser.Math.Between(900, 1400) : Phaser.Math.Between(this.K.PAUSE[0], this.K.PAUSE[1]) / fast, () => id === this.roamId && this.roam());
    }, juke);
  }
  /** dash to (tx,ty); a JUKE stops him partway and cuts back the other way at a burst of speed */
  private runTo(id: number, tx: number, ty: number, fast: number, done: () => void, juke = false) {
    const dur = Math.max(320, Phaser.Math.Distance.Between(this.pup.x, this.pup.y, tx, ty) / (260 * fast) * 1000);
    this.pupImg.setFlipX(tx > this.pup.x); this.skin?.run(tx > this.pup.x ? 1 : -1);
    const b = this.pupImg.getData('b'); this.pupImg.setScale(b * 1.1, b * 0.9); // anticipation crouch before the dash
    this.moveTw?.stop();
    this.moveTw = this.tweens.add({ targets: this.pup, x: tx, y: ty, duration: dur, ease: 'Sine.InOut', delay: 70, onUpdate: () => this.pup.setDepth(this.pup.y > 1000 ? 26 : 20), onComplete: () => {
      this.pupImg.setScale(b * 1.12, b * 0.88); this.tweens.add({ targets: this.pupImg, scaleX: b, scaleY: b, duration: 200, ease: 'Back.Out' }); // skid-stop squash
      done(); } });
    this.tweens.add({ targets: this.pupImg, y: -14, scaleY: b * 1.05, scaleX: b * 0.96, duration: 110, delay: 70, yoyo: true, repeat: Math.floor(dur / 220) });
    this.wadTw?.stop(); this.wadTw = this.tweens.add({ targets: this.pupImg, angle: { from: -6, to: 6 }, duration: 110, delay: 70, yoyo: true, repeat: Math.floor(dur / 220), onComplete: () => this.pupImg.setAngle(0), onStop: () => this.pupImg.setAngle(0) });
    if (juke && dur > 600) this.time.delayedCall(70 + dur * 0.42, () => { if (id !== this.roamId || !this.moveTw?.isPlaying() || this.st.over) return;
      this.st.jukes++; this.moveTw.stop(); this.skin?.stop(); floatText(this, this.pup.x, this.pup.y - 230, 'juke!', '#ffffff', 26); Fx.step();
      const nx = Phaser.Math.Clamp(this.pup.x - Math.sign(tx - this.pup.x) * Phaser.Math.Between(170, 300), FIELD.x0, FIELD.x1), ny = Phaser.Math.Clamp(this.pup.y + Phaser.Math.Between(-120, 120), FIELD.y0, FIELD.y1);
      this.time.delayedCall(110, () => id === this.roamId && !this.st.over && this.runTo(id, nx, ny, fast * 1.3, done)); });
  }
  // ---------- TAIL WHACK: the tell ----------
  private tailTell(id: number) {
    const s = this.st; this.setAlert(true); this.skin?.ready(); Fx.alert(); this.showHint('swat');
    if (Math.random() < 0.35) say(this, this.pup.x, this.pup.y - 260, pick(LINES.acornTell), 20, 900);
    this.time.delayedCall(Phaser.Math.Between(this.K.ALERT_T[0] * 1000, this.K.ALERT_T[1] * 1000), () => { if (id !== this.roamId || s.over) return; this.setAlert(false); this.skin?.stop();
      this.time.delayedCall(this.K.OPEN_T * 1000, () => id === this.roamId && !s.over && this.roam()); }); // brief open beat: the reward for waiting
  }
  private setAlert(on: boolean) { this.st.alert = on; this.tweens.killTweensOf(this.bang);
    if (on) { this.bang.setVisible(true).setScale(0).setY(this.skin ? this.umbY - 70 : -300); this.tweens.add({ targets: this.bang, scale: 1, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: this.bang, angle: { from: -10, to: 10 }, yoyo: true, repeat: -1, duration: 120 }); }
    else this.bang.setVisible(false).setAngle(0); }
  /** acorn thrown into the tell: he spins and whacks it back up at Nana with his tail */
  private swatBack(x: number, y: number) {
    const s = this.st; s.swats++; s.streak = 0; this.setAlert(false); const id = ++this.roamId; this.moveTw?.stop(); (window as any).__pr.last = 'swat';
    const dir = x < this.pup.x ? -1 : 1; this.skin?.swat(dir); Fx.whoosh(); Fx.boing();
    const w = comic(this, this.pup.x, this.pup.y - 280, 'TAIL WHACK!', 58).setDepth(75).setScale(0.3).setAngle(dir * -8);
    this.tweens.add({ targets: w, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, delay: 650, duration: 250, onComplete: () => w.destroy() });
    const hx = this.nana.root.x, hy = this.nana.root.y - 120, a = art(this, x, y - 40, 'acorn', 0.8).setDepth(45), o = { t: 0 }, x0 = x, y0 = y - 40;
    const trail = this.add.graphics().setDepth(44); let lx = x0, ly = y0;
    this.tweens.add({ targets: o, t: 1, duration: 380, ease: 'Quad.In', onUpdate: () => { const t = o.t, px = x0 + (hx - x0) * t, py = y0 + (hy - y0) * t - Math.sin(t * Math.PI) * 120;
      trail.lineStyle(7, 0xff6b6b, 0.5).lineBetween(lx, ly, px, py); lx = px; ly = py; a.setPosition(px, py).setAngle(-t * 900); },
      onComplete: () => { a.destroy(); this.tweens.add({ targets: trail, alpha: 0, duration: 200, onComplete: () => trail.destroy() }); if (!s.over) this.bonkNana(); } });
    say(this, this.pup.x, this.pup.y - 230, pick(LINES.acornSwat), 20, 1200);
    this.time.delayedCall(900, () => id === this.roamId && this.roam());
    this.updateHud();
  }
  /** the swatted acorn bonks Nana: dazed, can't throw for K.DAZE s */
  private bonkNana() {
    const s = this.st, K = this.K; s.dazed = K.DAZE; s.cool = Math.max(s.cool, K.DAZE); Fx.punch(); Fx.ouch(); this.cameras.main.shake(220, 0.014); flashVignette(this, 0xff3b3b, 0.45);
    this.dragging = false; this.aim.clear(); this.ghost?.clear(); this.ghostImg?.setVisible(false);
    const hx = this.nana.root.x, hy = this.nana.root.y - 140; sparks(this, hx, hy, 12);
    const p = comic(this, hx - 60, hy - 60, 'BONK!', 50).setDepth(75).setScale(0.3); this.tweens.add({ targets: p, scale: 1, duration: 120, ease: 'Back.Out' }); this.tweens.add({ targets: p, alpha: 0, delay: 500, duration: 200, onComplete: () => p.destroy() });
    this.nana.setMood('dizzy'); this.nana.act([{ dur: 0.08, to: { lean: -14, tilt: -12, sq: -0.08 } }, { dur: 0.3, to: { lean: 0, tilt: 0, sq: 0 }, ease: Phaser.Math.Easing.Back.Out }], false, 0.3);
    this.nStars.forEach(o => o.destroy()); this.nStars = [];
    for (let k = 0; k < 3; k++) { const st = txt(this, hx, hy, '★', 28, '#ffdf6b', '#22252b', 4).setDepth(74); this.nStars.push(st);
      this.tweens.addCounter({ from: 0, to: 720, duration: K.DAZE * 1000, onUpdate: (tw) => { const a = Phaser.Math.DegToRad(tw.getValue()! + k * 120); st.setPosition(this.nana.root.x + Math.cos(a) * 46, this.nana.root.y - 150 + Math.sin(a) * 12); }, onComplete: () => st.destroy() }); }
    this.held.setScale(0); this.time.delayedCall(K.DAZE * 1000, () => { if (s.over) return; this.nana.setMood('smug'); if (s.shots < K.THROWS) this.tweens.add({ targets: this.held, scale: this.held.getData('s0'), duration: 180, ease: 'Back.Out' }); });
    if (Math.random() < 0.6) this.time.delayedCall(450, () => !s.over && say(this, 440, 570, pick(LINES.acornNanaBonk), 22, 1000));
  }
  update(_t: number, dms: number) {
    this.tag?.setPosition(this.pup.x, this.pup.y);
    if (!this.st.umbrella && this.umb.visible && !this.tweens.isTweening(this.umb)) this.umb.setVisible(false); // never a stray umbrella over a munch/tell
    const s = this.st, K = this.K; const dt = Math.min(dms, 250) / 1000;
    this.updateParallax(dt); this.drawRing(dt);
    if (this.skin) { const fo = this.dragging && this.dragT > K.FOCUS_DELAY && s.focus > 0 || this.slowT > 0; this.skin.update(dt, this.pupV.x, this.dragging && s.running ? this.aimPt : null, s.running && fo); }
    this.shine.setPosition(this.held.x + 22, this.held.y - 30); // golden sparkle stays on the acorn in her paw
    if (!s.running || s.over) return;
    s.time -= dt; s.cool -= dt; s.dizzy = Math.max(0, s.dizzy - dt); s.dazed = Math.max(0, s.dazed - dt); s.rush = Math.max(0, s.rush - dt);
    const sb = s.stars; s.stars = Math.max(0, s.stars - dt); if (sb > 0 && s.stars <= 0) this.x2.setVisible(false);
    // FOCUS: holding the aim slows Puppy's clock while the (short) meter lasts
    if (this.dragging) this.dragT += dt;
    this.slowT = Math.max(0, this.slowT - dt);
    const holding = this.dragging && this.dragT > K.FOCUS_DELAY && s.focus > 0; this.wasFocus = holding;
    const focusing = holding || this.slowT > 0; // slow-mo lingers ~0.3s after release so the shot can land
    if (holding) s.focus = Math.max(0, s.focus - dt);
    const k = focusing ? 0.5 : 1; if (this.moveTw) this.moveTw.timeScale = k;
    // SNACK THIEF: munch meter counts down; gulp when it runs out
    if (s.munch > 0) { s.munch = Math.max(0, s.munch - dt * k); this.drawMunch(); if (s.munch <= 0) this.gulp(); }
    if (s.rush > 0 && (this.rushFx -= dt) <= 0 && this.moveTw?.isPlaying()) { this.rushFx = 0.12; const d = txt(this, this.pup.x - Math.sign(this.pupV.x || 1) * 60, this.pup.y - 40, '💨', 30).setDepth(19);
      this.tweens.add({ targets: d, alpha: 0, x: d.x - Math.sign(this.pupV.x || 1) * 60, duration: 350, onComplete: () => d.destroy() }); }
    // lead ghost: faint marker where Puppy will be when the acorn lands
    const vx = (this.pup.x - this.lastPup.x) / Math.max(dt, 1e-3), vy = (this.pup.y - this.lastPup.y) / Math.max(dt, 1e-3); this.lastPup = { x: this.pup.x, y: this.pup.y };
    this.pupV.x += (vx - this.pupV.x) * Math.min(1, dt * 8); this.pupV.y += (vy - this.pupV.y) * Math.min(1, dt * 8);
    if (!this.ghost) this.ghost = this.add.graphics().setDepth(19);
    this.ghost.clear(); if (this.dragging && s.dazed <= 0) { const lead = FLIGHT / 1000 * (focusing ? 0.5 : 1); const gx = this.pup.x + this.pupV.x * lead, gy = this.pup.y + this.pupV.y * lead;
      const far = Math.hypot(gx - this.pup.x, gy - this.pup.y) > 18;
      this.ghost.fillStyle(0xfff4a0, 0.55).fillEllipse(gx, gy + 10, 140, 52).lineStyle(10, 0x22252b, 0.9).strokeEllipse(gx, gy + 10, 140, 52).lineStyle(6, 0xffe14a, 1).strokeEllipse(gx, gy + 10, 140, 52);
      if (far) { this.ghost.lineStyle(9, 0xffe14a, 1); const n = 6; for (let i = 0; i < n; i += 2) { const a0 = i / n, a1 = (i + 1) / n; this.ghost.lineBetween(this.pup.x + (gx - this.pup.x) * a0, this.pup.y + (gy - this.pup.y) * a0, this.pup.x + (gx - this.pup.x) * a1, this.pup.y + (gy - this.pup.y) * a1); } }
      if (!this.ghostImg || !this.ghostImg.scene) this.ghostImg = this.add.image(0, 0, this.pupImg.texture.key).setDepth(19).setTintFill(0xfff4a0);
      if (this.skin) { const gh = this.skin.ghost(); this.ghostImg.setTexture(gh.key).setOrigin(0.5, 238 / 244).setScale(gh.sx, gh.sy).setPosition(gx, gy).setAlpha(far ? 0.7 : 0).setVisible(true); } else
      this.ghostImg.setTexture(this.pupImg.texture.key).setOrigin(this.pupImg.originX, this.pupImg.originY).setScale(this.pupImg.scaleX * this.pup.scaleX, this.pupImg.scaleY * this.pup.scaleY).setPosition(gx, gy + this.pupImg.y * this.pup.scaleY).setAlpha(far ? 0.7 : 0).setVisible(true);
    } else this.ghostImg?.setVisible(false);
    if (s.phase >= 2) { s.wind = Math.sin(this.time.now / 4800) * K.WIND_MAX; this.drawWind(); }
    if (s.time <= 0) { s.time = 0; this.updateHud(); return this.finish(s.hits >= K.NEED); }
    this.updateHud();
  }
  private updateParallax(dt: number) { const t = this.dragging ? this.parX : 0; this.layers.forEach(L => { L.o.x += ((L.bx - t * L.k * 120) - L.o.x) * Math.min(1, dt * 4); }); }
  private drawWind() {
    const g = this.windG.clear(), w = this.st.wind, len = Math.abs(w) * 1.3, d = Math.sign(w) || 1, x = 110, y = 640;
    g.fillStyle(0x22252b, 0.5).fillRoundedRect(x - 90, y - 26, 180, 52, 20);
    g.lineStyle(8, 0x7fd8ff, 1).lineBetween(x - d * len / 2, y, x + d * len / 2, y);
    g.fillStyle(0x7fd8ff, 1).fillTriangle(x + d * (len / 2 + 16), y, x + d * len / 2, y - 12, x + d * len / 2, y + 12);
    this.windT.setText(`WIND ${Math.round(Math.abs(w))}`).setPosition(x, y - 44);
  }
  /** hit ring meter: one wedge per hit, animated fill (drains back when he heals), glows when complete. */
  private drawRing(dt: number) {
    const s = this.st, K = this.K, g = this.ring.clear(); this.ringShown += (s.hits - this.ringShown) * Math.min(1, dt * 8);
    g.fillStyle(0x22252b, 0.85).fillCircle(RING.x, RING.y, RING.r + 12);
    for (let i = 0; i < K.NEED; i++) { const a0 = -Math.PI / 2 + i / K.NEED * Math.PI * 2 + 0.05, a1 = a0 + Math.PI * 2 / K.NEED - 0.1;
      const f = Phaser.Math.Clamp(this.ringShown - i, 0, 1);
      g.lineStyle(14, 0x553344, 1).beginPath(); g.arc(RING.x, RING.y, RING.r, a0, a1); g.strokePath();
      if (f > 0) { g.lineStyle(14, f >= 1 ? 0xffb52e : 0xffdf6b, 1).beginPath(); g.arc(RING.x, RING.y, RING.r, a0, a0 + (a1 - a0) * f); g.strokePath(); } }
    if (s.hits >= K.NEED) g.lineStyle(6, 0xffffff, 0.5 + Math.sin(this.time.now / 80) * 0.4).strokeCircle(RING.x, RING.y, RING.r + 14);
    // focus arc (inner, blue)
    g.lineStyle(6, 0x7fd8ff, 0.9).beginPath(); g.arc(RING.x, RING.y, RING.r - 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.focus / K.FOCUS_MAX); g.strokePath();
    this.ringT.setText(`${s.hits}/${K.NEED}`);
  }
  /** Nana's throwing arm: cocks back behind her head while you aim (held), then whips overhand on release. */
  private cockArm() { if (!this.st.running || this.st.over || this.st.dazed > 0) return;
    this.nana.act([{ dur: 0.14, to: { rs: -150, re: -70, ls: 40, le: 30, lean: -8, sq: -0.04, tilt: -5 }, ease: Phaser.Math.Easing.Quadratic.Out }], true); }
  private throwArm(tx: number) { const side = Phaser.Math.Clamp((tx - 330) / 300, -1, 1);
    this.nana.act([
      { dur: 0.05, to: { rs: -165, re: -80, lean: -10, sq: -0.05 } },
      { dur: 0.08, to: { rs: 25 + side * 20, re: 0, ls: -30, le: -20, lean: 10, sq: 0.05, tilt: 6, dy: 3 }, ease: Phaser.Math.Easing.Cubic.In },
      { dur: 0.12, to: { rs: 50, re: 25, lean: 6, sq: 0.02 }, ease: Phaser.Math.Easing.Quadratic.Out },
    ], false, 0.28);
  }
  fling(x: number, y: number) {
    const s = this.st, K = this.K; if (!s.running || s.over || s.cool > 0 || s.shots >= K.THROWS) { if (s.dazed > 0 && s.running) floatText(this, this.nana.root.x, this.nana.root.y - 230, 'dazed...', '#ffffff', 24); else this.nana.act([], false, 0.2); return; } y = Math.max(y, 560);
    s.cool = K.COOL; s.shots++; s.inFlight++; const gold = s.golden; s.golden = false;
    const L = this.nana.point('rp'); // released from the paw (cocked behind her head)
    Fx.whoosh(); this.throwArm(x);
    const a = art(this, L.x, L.y, gold ? 'gacorn' : 'acorn', gold ? 1.1 : 0.8).setDepth(45); const as = a.scaleX;
    if (s.shots % K.GOLD_EVERY === K.GOLD_EVERY - 1) this.giveGolden(`acorn #${s.shots + 1}`);
    this.held.setTexture(s.golden ? 'gacorn' : 'acorn').setScale(0);
    if (s.shots < K.THROWS) this.tweens.add({ targets: this.held, scale: this.held.getData('s0'), delay: 200, duration: 180, ease: 'Back.Out' });
    this.shine.setVisible(s.golden);
    // close shots make him hop clear ("hup!"): more often the more he's been hit (never mid-tell, mid-munch or while stunned)
    const near = Phaser.Math.Distance.Between(x, y, this.pup.x, this.pup.y) < 160;
    if (near && !s.umbrella && s.hiding < 0 && s.dizzy <= 0 && !s.alert && s.munch <= 0 && Math.random() < Math.min(K.DODGE_MAX, K.DODGE0 + s.hits * K.DODGE_K)) this.time.delayedCall(FLIGHT * 0.45, () => this.hop());
    { // light aim-assist: a landing spot just outside the hit ring around Puppy's predicted spot snaps partway in
      const lead = FLIGHT / 1000 * K.ASSIST_LEAD, gx = this.pup.x + this.pupV.x * lead, gy = this.pup.y + this.pupV.y * lead - 60, r = gold ? K.GOLD_R : K.HIT_R;
      const dx = gx - (x + s.wind), dy = gy - y, d = Math.hypot(dx, dy);
      if (d > r * 0.5 && d < r + K.ASSIST) { const k = (d - r * 0.5) / d * 0.6; x += dx * k; y += dy * k; } }
    const o = { t: 0 }, w = s.wind, ex = x + w, told = s.alert; // thrown while the tell was up -> he's ready for it
    const trail = this.add.graphics().setDepth(44); let lx = L.x, ly = L.y;
    this.tweens.add({ targets: o, t: 1, duration: FLIGHT, onUpdate: () => {
      const t = o.t, px = L.x + (x - L.x) * t + w * t * t, py = L.y + (y - L.y) * t - Math.sin(t * Math.PI) * 140;
      trail.lineStyle(gold ? 10 : 6, gold ? 0xffd21f : 0xffffff, 0.5).lineBetween(lx, ly, px, py); lx = px; ly = py;
      const sc = 1 + Math.sin(t * Math.PI) * 0.35; a.setPosition(px, py).setAngle(t * 720).setScale(as * sc, as * sc * (t > 0.85 ? 0.85 : 1));
      if (gold && Math.random() < 0.6) sparks(this, a.x, a.y, 1);
    }, onComplete: () => { a.destroy(); this.tweens.add({ targets: trail, alpha: 0, duration: 200, onComplete: () => trail.destroy() }); s.inFlight--; this.land(ex, y, gold, told); } });
  }
  private giveGolden(why: string) { const s = this.st; if (s.golden) return; s.golden = true; Sushi.golden(); floatText(this, LAUNCH.x + 120, LAUNCH.y - 40, `GOLDEN! (${why})`, '#ffd21f', 26); this.shine.setVisible(true);
    this.held.setTexture('gacorn'); this.tweens.add({ targets: this.held, scale: { from: this.held.getData('s0') * 1.6, to: this.held.getData('s0') }, duration: 300, ease: 'Back.Out' }); }
  private hop() {
    const s = this.st; if (s.over || s.dizzy > 0 || s.alert || s.munch > 0) return; s.dodges++; this.moveTw?.stop(); const dir = this.pup.x < 360 ? 1 : -1; Fx.boing(); this.pupImg.setTexture('pup_panic'); this.skin?.hop(dir);
    const b = this.pupImg.getData('b'); this.pupImg.setScale(b * 1.2, b * 0.8);
    this.tweens.add({ targets: this.pup, x: this.pup.x + dir * 170, duration: 220, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.pupImg, y: -90, scaleX: b * 0.9, scaleY: b * 1.15, duration: 160, yoyo: true, ease: 'Quad.Out', onComplete: () => { this.pupImg.setScale(b * 1.15, b * 0.85); this.tweens.add({ targets: this.pupImg, scaleX: b, scaleY: b, duration: 200, ease: 'Back.Out' }); } });
    floatText(this, this.pup.x, this.pup.y - 200, 'hup!', '#ffffff', 26);
    const id = ++this.roamId; this.time.delayedCall(500, () => id === this.roamId && this.roam());
  }
  private crater(x: number, y: number) { const c = this.add.ellipse(x, y + 6, 46, 14, 0x3a2410, 0.45).setDepth(19); this.tweens.add({ targets: c, alpha: 0, delay: 1200, duration: 600, onComplete: () => c.destroy() });
    const p = this.add.circle(x, y, 14, 0xffffff, 0.6).setDepth(55); this.tweens.add({ targets: p, scale: 3, alpha: 0, duration: 260, onComplete: () => p.destroy() }); }
  private land(x: number, y: number, gold: boolean, told = false) {
    const s = this.st, K = this.K; if (s.over) return;
    // phase 3: did we bonk the cardboard decoy instead?
    if (this.decoy && Phaser.Math.Distance.Between(x, y, this.decoy.x, this.decoy.y - 60) < K.HIT_R && Phaser.Math.Distance.Between(x, y, this.pup.x, this.pup.y - 60) > K.HIT_R) {
      s.streak = 0; Fx.block(); this.crater(x, y); const dc = this.decoy; this.tweens.add({ targets: dc, angle: { from: -25, to: 0 }, duration: 600, ease: 'Elastic.Out' });
      floatText(this, x, y - 140, 'CARDBOARD!', '#ffffff', 34); say(this, this.pup.x, this.pup.y - 220, 'Puppy: Fooled you!', 20, 900); (window as any).__pr.last = 'decoy'; return this.afterShot(); }
    const d = Phaser.Math.Distance.Between(x, y, this.pup.x, this.pup.y - 60);
    const r = gold ? K.GOLD_R : K.HIT_R;
    if ((s.alert || told) && !gold && d <= r + K.SWAT_PAD) { this.swatBack(x, y); return this.afterShot(); } // threw into the tell
    if (d > r) { s.streak = 0; Fx.step(); sparks(this, x, y, 5); this.crater(x, y); (window as any).__pr.last = 'miss';
      if (d <= r + K.NEAR_PAD && s.hiding < 0 && !s.umbrella) this.nearMiss(x, y);
      else { const p = txt(this, x, y, 'poff', 24, '#fff', '#22252b', 4).setDepth(55); this.tweens.add({ targets: p, y: y - 40, alpha: 0, duration: 400, onComplete: () => p.destroy() });
        if (Math.random() < 0.3) say(this, this.pup.x, this.pup.y - 220, pick(LINES.acornMiss), 20, 1000); }
      this.dropAcorn(x, y); return this.afterShot(); }
    if (!gold && (s.umbrella || s.hiding >= 0)) { s.streak = 0; Fx.block(); Fx.boing(); floatText(this, x, y - 120, s.umbrella ? 'PING!' : 'LEAF!', '#ffffff', 34);
      const b = art(this, x, y - 140, 'acorn', 0.8).setDepth(45); this.tweens.add({ targets: b, x: x + Phaser.Math.Between(-200, 200), y: y - 300, angle: 720, alpha: 0, duration: 600, onComplete: () => b.destroy() });
      if (s.umbrella) this.tweens.add({ targets: this.umb, angle: { from: 12, to: 0 }, duration: 400, ease: 'Elastic.Out' });
      if (Math.random() < 0.5) say(this, W / 2, 570, pick(LINES.acornBlock), 22, 1100); (window as any).__pr.last = 'blocked'; return this.afterShot(); }
    this.hit(gold, d < 24);
  }
  /** WHOOSH past his ear: he flinches, a beat of slow-mo, a cheeky line */
  private nearMiss(x: number, y: number) {
    const s = this.st; s.nears++; Sfx.slip(); this.skin?.flinch(x < this.pup.x ? -1 : 1);
    const t = comic(this, x, y - 110, 'WHOOSH!', 44, '#ffffff', '#bfe9ff', '#1d3a5a').setDepth(75).setScale(0.4).setAngle(Phaser.Math.Between(-10, 10));
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.Out' }); this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, delay: 450, duration: 220, onComplete: () => t.destroy() });
    this.tweens.timeScale = 0.35; this.time.delayedCall(90, () => { if (!s.over) this.tweens.timeScale = 1; });
    if (Math.random() < 0.45) say(this, this.pup.x, this.pup.y - 220, pick(LINES.acornNear), 20, 1000);
  }
  // ---------- SNACK THIEF ----------
  /** a missed acorn stays on the grass for a moment; Puppy may dash over and munch it */
  private dropAcorn(x: number, y: number) {
    const s = this.st, K = this.K; if (y < FIELD.y0 - 20 || y > FIELD.y1 + 20 || x < FIELD.x0 - 30 || x > FIELD.x1 + 30) return;
    const a = art(this, x, y + 4, 'acorn', 0.55).setDepth(18).setAngle(Phaser.Math.Between(-40, 40)); this.drops.push(a);
    this.tweens.add({ targets: a, y: a.y - 26, duration: 160, yoyo: true, ease: 'Quad.Out' });
    this.tweens.add({ targets: a, alpha: 0, delay: 1700, duration: 300, onComplete: () => { a.destroy(); this.drops = this.drops.filter(o => o !== a); } });
    const busy = s.munch > 0 || s.alert || s.dizzy > 0 || s.umbrella || s.hiding >= 0 || this.decoy && false;
    if (!s.running || busy || Math.random() >= K.MUNCH_P) return;
    const id = ++this.roamId; this.moveTw?.stop(); floatText(this, this.pup.x, this.pup.y - 240, '!?', '#ffffff', 34); this.skin?.flinch(x < this.pup.x ? -1 : 1);
    this.time.delayedCall(220, () => { if (id !== this.roamId || s.over || !a.active) return;
      this.runTo(id, Phaser.Math.Clamp(x + (x < this.pup.x ? 30 : -30), FIELD.x0, FIELD.x1), Phaser.Math.Clamp(y, FIELD.y0, FIELD.y1), this.fast * 1.5, () => {
        if (id !== this.roamId || s.over) return; if (!a.active) return this.roam();
        this.tweens.killTweensOf(a); a.destroy(); this.drops = this.drops.filter(o => o !== a); this.startMunch(id); }); });
  }
  private startMunch(_id: number) {
    const s = this.st, K = this.K; s.munches++; this.munchMax = s.phase >= 3 ? K.MUNCH_T3 : K.MUNCH_T; s.munch = this.munchMax; this.skin?.munch(); Sfx.pickup(); this.showHint('munch');
    this.placeSnack(); this.snack.setVisible(true).setScale(0); this.tweens.add({ targets: this.snack, scale: this.snack.getData('s0'), duration: 160, ease: 'Back.Out' });
    say(this, this.pup.x, this.pup.y - 300, pick(LINES.acornMunch), 20, 1100);
    (window as any).__pr.last = 'munch';
  }
  /** the stolen acorn sits in his paws at his mouth */
  private placeSnack() { const m = this.skin?.mouthPos(); if (m) this.snack.setPosition(m.x, m.y); else this.snack.setPosition(this.pupImg.flipX ? 30 : -30, -110); }
  private drawMunch() {
    const g = this.munchG.clear(), s = this.st; if (s.munch <= 0) return; this.placeSnack();
    this.snack.setAngle(Math.sin(this.time.now / 45) * 12).setScale(this.snack.getData('s0') * (0.75 + 0.25 * s.munch / this.munchMax)); // shrinks as he eats it
    const y = this.skin ? this.umbY + 20 : -220, f = 1 - s.munch / this.munchMax;
    g.fillStyle(0x22252b, 0.85).fillCircle(0, y, 34).lineStyle(10, 0x553344, 1).strokeCircle(0, y, 24);
    g.lineStyle(10, f > 0.7 ? 0xff4b4b : 0xffb52e, 1).beginPath(); g.arc(0, y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); g.strokePath();
    g.fillStyle(0xc77a2e, 1).fillEllipse(0, y + 3, 16, 20).fillStyle(0x6b4220, 1).fillRect(-8, y - 9, 16, 6);
    if (Math.random() < 0.15) { const c = this.add.circle(this.pup.x + this.snack.x + Phaser.Math.Between(-10, 10), this.pup.y + this.snack.y, 4, 0xc77a2e).setDepth(this.pup.depth + 1);
      this.tweens.add({ targets: c, x: c.x + Phaser.Math.Between(-40, 40), y: c.y + 60, alpha: 0, duration: 400, onComplete: () => c.destroy() }); }
  }
  private stopMunch() { this.st.munch = 0; this.munchG.clear(); this.snack.setVisible(false); }
  /** he finished it: heals one hit and SUGAR RUSHes */
  private gulp() {
    const s = this.st, K = this.K; this.stopMunch(); s.gulps++; s.streak = 0; const healed = s.hits > 0; s.hits = Math.max(0, s.hits - 1); s.rush = K.RUSH_T; Sushi.gag(); Sfx.powerup();
    const w = comic(this, this.pup.x, this.pup.y - 280, healed ? 'GULP! -1' : 'GULP!', 56, '#ffffff', '#ff9ad0', '#5a0f1c').setDepth(75).setScale(0.3);
    this.tweens.add({ targets: w, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, delay: 650, duration: 250, onComplete: () => w.destroy() });
    floatText(this, this.pup.x, this.pup.y - 200, 'SUGAR RUSH!', '#ff9ad0', 30); say(this, this.pup.x, this.pup.y - 330, pick(LINES.acornGulp), 20, 1200);
    this.skin?.gag(); (window as any).__pr.last = 'gulp'; this.updateHud();
    const id = ++this.roamId; this.time.delayedCall(450, () => id === this.roamId && this.roam());
  }
  private afterShot() { const s = this.st; this.updateHud(); if (s.shots >= this.K.THROWS && s.inFlight <= 0 && s.hits < this.K.NEED) this.time.delayedCall(500, () => { if (!s.over && s.munch <= 0) { popBanner(this, 'OUT OF ACORNS!', 600, 0x6b4cc9, 700); this.finish(false); } else if (!s.over) this.time.delayedCall(Math.max(100, s.munch * 1000 + 600), () => !s.over && s.hits < this.K.NEED && (popBanner(this, 'OUT OF ACORNS!', 600, 0x6b4cc9, 700), this.finish(false))); }); }
  private hit(gold: boolean, head: boolean) {
    const s = this.st, K = this.K; const wasMunch = s.munch > 0, starry = s.stars > 0 && !gold;
    const n = gold ? 2 : wasMunch ? K.SNACK_N : starry ? 2 : 1; const wasDizzy = s.dizzy > 0; s.hits = Math.min(K.NEED, s.hits + n); s.streak++; s.best = Math.max(s.best, s.streak);
    s.focus = Math.min(K.FOCUS_MAX, s.focus + K.FOCUS_GAIN);
    if (wasMunch) { s.snacks++; this.stopMunch(); }
    const moving = !!this.moveTw?.isPlaying();
    const mult = Math.min(4, 1 + Math.floor(s.streak / 2)); // hit-streak score multiplier (x2 at 2, x3 at 4, x4 at 6)
    const pts = ((gold ? 600 : 250) + (head ? 150 : 0) + (moving ? 100 : 0) + (wasDizzy ? 200 : 0) + (wasMunch ? 400 : 0)) * mult; s.score += pts; (window as any).__pr.last = 'hit';
    const x = this.pup.x, y = this.pup.y - 90; const final = s.hits >= K.NEED;
    this.moveTw?.stop(); this.roamId++; this.tweens.killTweensOf(this.pupImg); this.pupImg.setAlpha(1).setY(0); this.setAlert(false);
    Fx.punch(); Fx.boing(); this.cameras.main.shake(gold ? 400 : 200, gold ? 0.025 : 0.012); if (gold) { this.cameras.main.flash(120, 255, 230, 120); flashVignette(this, 0xffd21f, 0.6); }
    // hit-stop
    const stop = final ? 0 : gold ? 140 : starry || wasMunch ? 90 : 60;
    if (stop) { this.tweens.timeScale = 0.05; this.time.delayedCall(stop, () => { if (!s.over) this.tweens.timeScale = 1; }); this.skin?.freeze(stop); }
    if (s.umbrella) { const u = this.umb; this.tweens.add({ targets: u, y: -400, angle: 540, alpha: 0, duration: 600, onComplete: () => u.setVisible(false).setAlpha(1).setAngle(0).setY(this.umbY) }); floatText(this, x, y - 160, 'UMBRELLA BUSTED!', '#ffd21f', 30); }
    sparks(this, x, y, gold ? 30 : 16, gold);
    const ring = this.add.graphics({ x, y }).setDepth(73); ring.lineStyle(8, gold ? 0xffd21f : 0xffffff, 0.9).strokeCircle(0, 0, 36); this.tweens.add({ targets: ring, scale: 2.8, alpha: 0, duration: 280, onComplete: () => ring.destroy() });
    if (wasMunch) { const sn = art(this, x, y - 20, 'acorn', 0.55).setDepth(46); this.tweens.add({ targets: sn, x: x + Phaser.Math.Between(-160, 160), y: y - 260, angle: 900, duration: 420, ease: 'Quad.Out', onComplete: () => this.tweens.add({ targets: sn, y: y + 140, alpha: 0, duration: 320, ease: 'Quad.In', onComplete: () => sn.destroy() }) }); }
    const word = final ? '' : gold ? 'SEEING STARS!' : wasMunch ? 'SNACK ATTACK!' : starry ? 'DOUBLE TONK!' : head ? 'TONK!' : pick(['BONK!', 'PLINK!', 'THOCK!']);
    if (word) { const w = comic(this, x, y - 120, word, gold || wasMunch ? 62 : 64).setDepth(75).setScale(0.3).setAngle(Phaser.Math.Between(-12, 12));
      this.tweens.add({ targets: w, scale: 1, duration: 140, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, delay: 600, duration: 250, onComplete: () => w.destroy() }); }
    const tags = [n > 1 && `+${n} HITS`, head && 'HEAD!', mult > 1 && `STREAK x${mult}`].filter(Boolean).join(' ');
    floatText(this, x - 120, y - 30, `+${pts} ${tags}`, n > 1 ? '#ffd21f' : '#7dff9a', 34);
    if (mult > 1) Fx.combo(s.streak);
    // acorn bounces off his head
    const bo = art(this, x, y - 40, gold ? 'gacorn' : 'acorn', 0.7).setDepth(46); this.tweens.add({ targets: bo, x: x + Phaser.Math.Between(-140, 140), y: y - 220, angle: 540, duration: 380, ease: 'Quad.Out', onComplete: () => this.tweens.add({ targets: bo, y: y + 120, alpha: 0, duration: 300, ease: 'Quad.In', onComplete: () => bo.destroy() }) });
    // slapstick squash: pancake, then boing back up, wobble, stars orbit while DIZZY
    this.pupImg.setTexture('pup_dizzy'); const b = this.pupImg.getData('b'); if (!this.skin) pupFlail(this, this.pupImg, 750); this.nana.setMood('happy'); this.time.delayedCall(700, () => !s.over && s.dazed <= 0 && this.nana.setMood('smug'));
    this.pupImg.setScale(b * 1.4, b * 0.55);
    this.tweens.add({ targets: this.pupImg, scaleX: b, scaleY: b, duration: 420, ease: 'Elastic.Out', easeParams: [1.3, 0.35] });
    this.tweens.add({ targets: this.pupImg, angle: { from: -15, to: 15 }, yoyo: true, repeat: 3, duration: 110, onComplete: () => this.pupImg.setAngle(0) });
    // SEEING STARS: a golden bonk leaves him starry for K.STARS s; every hit in that window counts double (it doesn't extend it)
    const stunMs = gold ? K.STARS * 1000 : starry ? Math.max(300, s.stars * 1000) : (wasMunch ? K.STUN + 0.35 : K.STUN) * 1000; s.dizzy = stunMs / 1000; this.skin?.hit(gold, stunMs);
    if (gold && !final) { s.stars = K.STARS; this.x2.setVisible(true).setY(this.skin ? this.umbY - 60 : -330).setScale(0); this.tweens.add({ targets: this.x2, scale: 1, duration: 200, ease: 'Back.Out' }); this.showHint('stars');
      const z0 = this.zoom0; this.cameras.main.zoomTo(z0 * 1.06, 120, 'Quad.easeOut', true, (_c: any, p: number) => { if (p >= 1) this.cameras.main.zoomTo(z0, 260, 'Quad.easeInOut', true); }); }
    for (let k = 0; k < 3 && !this.skin; k++) { const st = txt(this, x, y - 70, '★', 30, '#ffdf6b', '#22252b', 4).setDepth(74);
      this.tweens.addCounter({ from: 0, to: 720, duration: stunMs, onUpdate: (tw) => { const a = Phaser.Math.DegToRad(tw.getValue()! + k * 120); st.setPosition(this.pup.x + Math.cos(a) * 50, this.pup.y - 170 + Math.sin(a) * 14); }, onComplete: () => st.destroy() }); }
    if (!final) say(this, W / 2, 570, pick(gold ? LINES.golden : wasMunch ? LINES.acornSnack : starry ? LINES.acornStars : LINES.acornHit), 22, 1100);
    if (s.streak > 0 && s.streak % K.STREAK_GOLD === 0 && !final) this.giveGolden(`streak x${s.streak}`);
    // phases
    if (!final && s.phase < 2 && s.hits >= K.WIND_AT) { s.phase = 2; popBanner(this, 'WIND PICKS UP! 🍃 aim into it', 700, 0x3a86ff, 900); }
    if (!final && s.phase < 3 && s.hits >= K.DECOY_AT) { s.phase = 3; popBanner(this, 'CARDBOARD DECOY! hit the REAL one', 700, 0xe0243a, 900); this.spawnDecoy(); }
    this.updateHud();
    if (final) return this.finish(true);
    this.afterShot();
    const id = this.roamId; this.time.delayedCall(stunMs, () => id === this.roamId && this.roam());
  }
  /** Flat cardboard Puppy on a stand: wobbles in place, relocates every few seconds. */
  private spawnDecoy() {
    const c = this.decoy = this.add.container(Phaser.Math.Between(120, 600), Phaser.Math.Between(820, 1120)).setDepth(19);
    const g = this.add.graphics(); g.fillStyle(0xc49a6c, 1).lineStyle(5, 0x22252b, 1).fillRoundedRect(-62, -150, 124, 160, 14).strokeRoundedRect(-62, -150, 124, 160, 14);
    g.fillStyle(0x8a6a44, 1).fillRect(-6, 10, 12, 30).fillRect(-30, 36, 60, 8);
    const face = art(this, 0, -60, 'pup_idle', 0.5).setTint(0xd8b890);
    c.add([g, face]); this.tweens.add({ targets: c, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
    this.time.addEvent({ delay: 3500, loop: true, callback: () => { if (!c.active || this.st.over) return; this.tweens.add({ targets: c, x: Phaser.Math.Between(120, 600), y: Phaser.Math.Between(820, 1120), duration: 500, ease: 'Back.InOut' }); } });
  }
  /** one-line hint the first few times a twist shows up (per device) */
  private showHint(k: 'swat' | 'munch' | 'stars') {
    let n = 0; const key = 'playroom.acorn.hint.' + k; try { n = +(localStorage.getItem(key) || 0); } catch { n = 0; }
    const seen = this.registry.get(key); if (n >= 3 || seen) return; this.registry.set(key, 1); try { localStorage.setItem(key, String(n + 1)); } catch { /* private mode */ }
    if (this.hint?.active) this.hint.destroy();
    const h = this.hint = txt(this, W / 2, 1190, HINT[k], 30, '#fff27a', '#22252b', 8).setDepth(801).setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: h, alpha: 1, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({ targets: h, alpha: 0, delay: 2400, duration: 300, onComplete: () => h.destroy() });
  }
  private updateHud() {
    const s = this.st, K = this.K, left = K.THROWS - s.shots; this.hud.setText(`ACORNS ${left}${s.streak >= 2 ? `  🔥x${s.streak}` : ''}`).setColor(left <= 3 ? '#ff6b6b' : '#fff');
    this.timeT.setText(`0:${String(Math.ceil(s.time)).padStart(2, '0')}`).setColor(s.time < 10 ? '#ff6b6b' : '#fff');
    // ammo pips
    const pk = left + (s.golden ? 'g' : ''); if (pk === this.pipKey) return; this.pipKey = pk; // redraw only on change
    const g = this.bar.clear().fillStyle(0x22252b, 0.85).fillRoundedRect(130, 482, 460, 30, 15), sp = 440 / K.THROWS;
    for (let i = 0; i < K.THROWS; i++) { const x = 146 + i * sp; g.fillStyle(i < left ? (i === left - 1 && s.golden ? 0xffd21f : 0xc77a2e) : 0x553344, 1).fillEllipse(x, 497, 16, 20); if (i < left) g.fillStyle(0x6b4220, 1).fillRect(x - 8, 486, 16, 6); }
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; this.moveTw?.stop(); this.wadTw?.stop(); this.roamId++; this.dragging = false; this.aim.clear();
    this.setAlert(false); this.stopMunch(); this.x2.setVisible(false); this.hint?.destroy(); this.ghost?.clear(); this.ghostImg?.setVisible(false);
    (window as any).__pr.ended = win ? 'win' : 'lose';
    let delay = 1100;
    if (win) { this.skin?.win(); this.pupImg.setTexture('pup_dizzy'); this.tweens.add({ targets: this.pupImg, angle: 90, duration: 500, ease: 'Bounce.Out' }); this.koBeat(); delay = 2000; }
    else { this.skin?.lose(); this.pupImg.setTexture('pup_hearts'); if (s.shots < this.K.THROWS) popBanner(this, 'TIME!', 600, 0x6b4cc9, 800); }
    this.time.delayedCall(delay, () => endCard(this, 'Nana', 3, win, s.score + Math.round(s.time) * 20 + (this.K.THROWS - s.shots) * 100, `${s.hits} acorn hits • ${s.shots}/${this.K.THROWS} thrown`));
  }
  /** the winning bonk: freeze-frame, punch-in on Puppy, K.O.!, then an acorn shower plinks off him while he flops */
  private koBeat() {
    const cam = this.cameras.main, z0 = this.zoom0, mid = this.mid0, px = this.pup.x, py = this.pup.y - 120;
    Fx.punch(); Fx.goal(); cam.flash(160, 255, 240, 160); cam.shake(380, 0.02); flashVignette(this, 0xffd21f, 0.6); sparks(this, px, py, 34, true);
    this.tweens.timeScale = 0.15; this.time.delayedCall(260, () => { this.tweens.timeScale = 1; });
    cam.pan(px, Phaser.Math.Clamp(py, 700, 1000), 260, 'Quad.easeOut', true); cam.zoomTo(z0 * 1.22, 260, 'Quad.easeOut', true);
    const w = comic(this, px, py - 170, 'K.O.!', 120).setDepth(90).setScale(0.2).setAngle(-8);
    this.tweens.add({ targets: w, scale: 1, duration: 220, ease: 'Back.Out' }); this.tweens.add({ targets: w, angle: 8, yoyo: true, repeat: 3, duration: 160 });
    for (let i = 0; i < 9; i++) this.time.delayedCall(250 + i * 90, () => { const a = art(this, px + Phaser.Math.Between(-90, 90), py - 520, i % 4 === 3 ? 'gacorn' : 'acorn', 0.6).setDepth(70);
      this.tweens.add({ targets: a, y: py + Phaser.Math.Between(-30, 30), angle: Phaser.Math.Between(-400, 400), duration: 300, ease: 'Quad.In', onComplete: () => { Fx.step(); sparks(this, a.x, a.y, 3);
        this.tweens.add({ targets: a, x: a.x + Phaser.Math.Between(-160, 160), y: a.y - 120, duration: 220, ease: 'Quad.Out', onComplete: () => this.tweens.add({ targets: a, y: this.pup.y + 40, alpha: 0, duration: 320, ease: 'Quad.In', onComplete: () => a.destroy() }) }); } }); });
    this.time.delayedCall(450, () => say(this, W / 2, 570, pick(LINES.acornKO), 24, 1300));
    this.time.delayedCall(1500, () => { this.tweens.add({ targets: w, alpha: 0, duration: 200, onComplete: () => w.destroy() }); cam.pan(mid.x, mid.y, 300, 'Quad.easeInOut', true); cam.zoomTo(z0, 300, 'Quad.easeInOut', true); });
  }
}
