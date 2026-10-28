// Midnight ROOFTOP DIVE: side-scrolling moonlit rooftops. HOLD to flap up, RELEASE to dive-bomb.
// Snatch Puppy (only while diving) as he runs across the roofs. Chimneys bonk you, flashlight beams spot you.
// Go-big pass: 3-layer parallax skyline + drifting clouds, shaded roofs/chimney smoke, speed-scaled wind streaks,
// dive afterimages, moon-glow snatch flash with hit-stop, floating "-1s / -150" penalties.
// Depth: escalating phases (1 run → 2 HOPPY PUPPY hops → 3 PIGEON RUSH), speed ramps over time,
// MOON DIVE bonus (dive from high up), snatch CHAIN multiplier, chimney CLOSE-call near-misses that charge the
// MOON METER → MOONLIGHT mode (5s: invisible to beams, pigeons pass through, bigger snatch reach).
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, FONT } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, flashVignette } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { Hud, impact } from '../systems/level';
import { HeroRig, pupFlail } from '../systems/rigs';

// Tuning (sim-checked in pups3-out/midnight/sim.mjs: avg bot ~66%; eased in audit27: NEED 7->5, CHIM_P .55->.40, chimney stun 1.0->0.7 s, -2 s->-1 s, 0.8 s immunity)
const TIME = 50, NEED = 7, // Marc fb 27 Oct ('a bit too easy'): NEED 5->6, CHIM_P .40->.45; 2nd pass ('still a bit easy'): NEED 6->7, CHIM_P .45->.48, SPEED 280->308, hop gaps 1.2-2.0->0.9-1.5 s
  SPEED = 308, RAMP = 0.3, MX = 190;
const SNATCH_R = 88, MOON_R = 160, HOP_H = 110, CHIM_P = 0.48; // Marc fb 28 Oct ('slightly more difficult'): SNATCH_R 95->88 (catch reach -7%; sim avg bot win 50%->44%)
const AIR_LIMB = 0.78; // Marc fb 28 Oct: airborne Puppy's flailing arms + legs 22% shorter (carry + fling)
const CARRY_T = 2.6; // after a snatch Midnight carries the crying Puppy through the air for CARRY_T s; the clock + hazards pause meanwhile
const STUN = 0.7, BONK_S = 1, IMMUNE = 0.8; // audit27: shorter chimney stun, -1 s, then 0.8 s chimney immunity (blinking) so bonks can't chain
const MOON_SNATCH = 35, MOON_CLOSE = 15, MOON_T = 5, HIGH_DIVE_Y = 470, CHAIN_T = 7;
const MOON_X = 540, MOON_Y = 260;
const HANG = { x: -4, y: 92 }; // snatched Puppy's feet sit this far below Midnight's talon grip (bird space; matches Pups 3's tuned spot at the clenched pose)
interface Roof { x: number; w: number; top: number; chim?: number; close?: boolean; lamp?: { on: boolean; t: number; ang: number }; ant?: number; seed: number }
interface Streak { x: number; y: number; len: number; a: number }
interface Pigeon { img: Phaser.GameObjects.Image; x: number; y: number; hit: boolean }

export class DiveScene extends Phaser.Scene {
  st = { time: TIME, catches: 0, score: 0, running: false, over: false, y: 520, vy: 0, hold: false, stun: 0, immune: 0, carry: 0, spotted: 0, pupT: 1.5, combo: 0, phase: 1, moon: 0, moonT: 0, speed: SPEED, diveFrom: 520 };
  private roofs: Roof[] = []; private g!: Phaser.GameObjects.Graphics; private beams!: Phaser.GameObjects.Graphics; private fx!: Phaser.GameObjects.Graphics;
  private bird!: Phaser.GameObjects.Container; private rig!: HeroRig; private flapT = 0; private wings!: Phaser.GameObjects.Graphics; private aura!: Phaser.GameObjects.Image;
  private pup?: { c: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Ellipse; x: number; roof: Roof; done: boolean; hop: number; hopT: number; hopS: number; carry?: number; cx0?: number; cy0?: number };
  private hud!: Hud; private far!: Phaser.GameObjects.TileSprite; private mid!: Phaser.GameObjects.TileSprite; private clouds: Phaser.GameObjects.Image[] = [];
  private moonGlow!: Phaser.GameObjects.Image; private meter!: Phaser.GameObjects.Graphics; private meterTxt!: Phaser.GameObjects.Text;
  private streaks: Streak[] = []; private pigeons: Pigeon[] = []; private pigT = 3; private trailT = 0; private freeze = 0; private lastSnatch = -99; private zoom0 = 1;
  constructor() { super('Dive'); }
  create() {
    setupCamera(this); this.zoom0 = this.cameras.main.zoom; this.cameras.main.fadeIn(250); setPageBg(0x0b0a24, 0x241f4a);
    this.st = { time: TIME, catches: 0, score: 0, running: false, over: false, y: 520, vy: 0, hold: false, stun: 0, immune: 0, carry: 0, spotted: 0, pupT: 1.5, combo: 0, phase: 1, moon: 0, moonT: 0, speed: SPEED, diveFrom: 520 };
    this.makeTextures();
    art(this, 0, 0, 'bg_night'); this.pup = undefined; this.pigeons = []; this.pigT = 3; this.freeze = 0; this.lastSnatch = -99; this.streaks = [];
    this.moonGlow = this.add.image(MOON_X, MOON_Y, 'dv_glow').setDepth(1).setScale(2.2).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.moonGlow, alpha: 0.4, scale: 2.35, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 14; i++) { const s = this.add.image(Phaser.Math.Between(20, W - 20), Phaser.Math.Between(260, 760), 'dv_star').setDepth(1).setScale(Phaser.Math.FloatBetween(0.5, 1.1));
      this.tweens.add({ targets: s, alpha: 0.15, scale: s.scale * 0.5, yoyo: true, repeat: -1, delay: i * 230, duration: Phaser.Math.Between(700, 1400), ease: 'Sine.easeInOut' }); }
    this.clouds = []; for (let i = 0; i < 4; i++) this.clouds.push(this.add.image(i * 240 + 60, 330 + (i % 2) * 150, 'dv_cloud').setDepth(2).setAlpha(0.55).setScale(0.8 + (i % 3) * 0.2));
    this.far = this.add.tileSprite(0, 690, W, 260, 'dv_far').setOrigin(0, 0).setDepth(3);
    this.mid = this.add.tileSprite(0, 760, W, 300, 'dv_mid').setOrigin(0, 0).setDepth(4);
    this.roofs = []; let x = -40; while (x < W + 400) x = this.addRoof(x);
    this.beams = this.add.graphics().setDepth(8); this.g = this.add.graphics().setDepth(10); this.fx = this.add.graphics().setDepth(26);
    this.bird = this.add.container(MX, this.st.y).setDepth(30);
    this.aura = this.add.image(0, -20, 'dv_glow').setScale(1.1).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.wings = this.add.graphics(); this.rig = new HeroRig(this, 'Midnight', 0, 60, 0.62); this.flapT = 0;
    this.bird.add([this.aura, this.wings, this.rig.root]); this.drawWings(0);
    this.hud = new Hud(this, 'MOONLIGHT DIVE', 0x9a7aff);
    this.meter = this.add.graphics().setDepth(600);
    this.meterTxt = this.add.text(W / 2, 1192, 'MOON', { fontFamily: FONT, fontStyle: '700', fontSize: '26px', color: '#fff4c0', stroke: '#22252b', strokeThickness: 6 }).setOrigin(0.5).setDepth(601);
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.st.hold = true; if (this.st.running) this.feathers(); });
    this.input.on('pointerup', () => { if (this.st.hold && this.st.running) { Fx.whoosh(); this.st.diveFrom = this.st.y; } this.st.hold = false; });
    (window as any).__pr = { scene: 'Dive', st: this.st, force: (win: boolean) => this.finish(win), pup: () => this.pup && !this.pup.done ? { x: this.pup.x, y: this.pup.roof.top - this.pup.hop } : null,
      pigeons: () => this.pigeons.map(p => ({ x: p.x, y: p.y })), moonUp: () => { this.st.moon = 100; } };
    this.hud.set(`CATCHES 0/${NEED}`, TIME, 0); this.drawMeter();
    tutorialCard(this, 'midnight1', 'MOONLIGHT DIVE!', ['You are MIDNIGHT! 🐦‍⬛ HOLD to flap up', 'RELEASE to DIVE — snatch Puppy mid-dive!', 'Dive from HIGH up = MOON DIVE bonus', 'Skim chimneys to charge MOONLIGHT mode', 'Dodge chimneys 🧱, beams 🔦 & pigeons', `Snatch Puppy ${NEED} times in ${TIME}s!`], () => this.begin());
  }
  private makeTextures() {
    const t = this.textures;
    if (!t.exists('dv_glow')) { const g = this.make.graphics({ x: 0, y: 0 }, false); for (let i = 40; i > 0; i--) g.fillStyle(0xfff4c0, 0.035).fillCircle(160, 160, i * 4); g.generateTexture('dv_glow', 320, 320); g.destroy(); }
    if (!t.exists('dv_star')) { const g = this.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0xffffff, 0.35).fillCircle(16, 16, 9).fillStyle(0xffffff, 1).fillTriangle(16, 0, 13, 16, 19, 16).fillTriangle(16, 32, 13, 16, 19, 16).fillTriangle(0, 16, 16, 13, 16, 19).fillTriangle(32, 16, 16, 13, 16, 19); g.generateTexture('dv_star', 32, 32); g.destroy(); }
    if (!t.exists('dv_cloud')) { const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x3a3470, 1); for (const [cx, cy, r] of [[60, 60, 40], [110, 45, 50], [165, 62, 38], [210, 70, 26]]) g.fillCircle(cx, cy, r); g.fillRect(40, 60, 190, 36);
      g.fillStyle(0x6a62b0, 0.8); for (const [cx, cy, r] of [[100, 32, 26], [150, 40, 20]]) g.fillCircle(cx, cy, r); g.generateTexture('dv_cloud', 250, 110); g.destroy(); }
    const sky = (key: string, base: number, hi: number, minH: number, maxH: number, win: number, seed: number) => { if (t.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false); let r = seed; const R = () => (r = (r * 9301 + 49297) % 233280) / 233280;
      const Hh = key === 'dv_far' ? 260 : 300; let x = 0;
      while (x < W) { const w = Math.min(W - x, 50 + R() * 70), h = minH + R() * (maxH - minH); g.fillStyle(base, 1).fillRect(x, Hh - h, w, h); g.fillStyle(hi, 1).fillRect(x + w - 6, Hh - h, 6, h);
        if (R() < 0.3) g.fillStyle(base, 1).fillRect(x + w / 2 - 3, Hh - h - 30, 6, 30).fillTriangle(x + w / 2 - 14, Hh - h, x + w / 2, Hh - h - 18, x + w / 2 + 14, Hh - h);
        for (let wy = Hh - h + 14; wy < Hh - 10; wy += 26) for (let wx = x + 8; wx < x + w - 14; wx += 18) if (R() < win) g.fillStyle(0xffd76b, 0.55 + R() * 0.4).fillRect(wx, wy, 8, 12);
        x += w + 2; }
      g.generateTexture(key, W, Hh); g.destroy(); };
    sky('dv_far', 0x2c265a, 0x3d3678, 60, 220, 0.12, 7); sky('dv_mid', 0x1c1840, 0x2e2862, 80, 240, 0.2, 13);
    if (!t.exists('dv_pigeon')) { const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x8a90a8, 1).lineStyle(4, 0x22252b, 1).fillEllipse(50, 44, 60, 34).strokeEllipse(50, 44, 60, 34);
      g.fillStyle(0x6a7088, 1).fillTriangle(40, 40, 80, 6, 72, 44).strokeTriangle(40, 40, 80, 6, 72, 44);
      g.fillStyle(0x7a8098, 1).fillCircle(22, 36, 16).strokeCircle(22, 36, 16); g.fillStyle(0x5ad0a0, 1).fillEllipse(30, 50, 14, 8);
      g.fillStyle(0xffffff, 1).fillCircle(17, 32, 6).fillStyle(0x000000, 1).fillCircle(15, 32, 3); g.fillStyle(0xffa23b, 1).fillTriangle(6, 36, -2 + 4, 40, 8, 42);
      g.fillStyle(0x6a7088, 1).fillTriangle(78, 40, 98, 34, 96, 52); g.generateTexture('dv_pigeon', 100, 70); g.destroy(); }
  }
  private addRoof(x: number): number {
    const w = Phaser.Math.Between(220, 360), top = Phaser.Math.Between(800, 980);
    const r: Roof = { x, w, top, seed: Math.random() * 1000 };
    if (x > 300 && Math.random() < CHIM_P) r.chim = Phaser.Math.Between(30, w - 90);
    else if (x > 300 && Math.random() < 0.45) r.lamp = { on: false, t: Phaser.Math.FloatBetween(0, 2), ang: 0 };
    if (Math.random() < 0.4) r.ant = Phaser.Math.Between(20, w - 40);
    this.roofs.push(r); return x + w + Phaser.Math.Between(0, 60);
  }
  private begin() { popBanner(this, 'SWOOP!', 700, 0x6b4cc9); this.time.delayedCall(600, () => { say(this, 400, 470, pick(LINES.start.Midnight), 22); this.st.running = true; }); }
  private drawWings(t: number) {
    // wings grow out of her SHOULDERS (rig shoulders sit at about (±22, 10) in bird space), drawn behind the body so the roots tuck under it
    const f = Math.sin(t) * 0.6; const g = this.wings.clear(); const moon = this.st.moonT > 0; const V = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    for (const s of [-1, 1]) {
      const tip = V(s * 150, -34 - f * 78), elb = V(s * 82, -6 - f * 30);
      const pts = [V(s * 10, -6), elb, tip, V(s * 128, 10 - f * 40), V(s * 100, 22 - f * 18), V(s * 70, 34 - f * 6), V(s * 34, 36)];
      g.fillStyle(0x1d1f33, 1).lineStyle(5, 0x0d0a18, 1).fillPoints(pts, true);
      // mid-tone + rim light from the moon (upper right)
      g.fillStyle(0x3b3f5c, 1).fillTriangle(s * 18, 0, tip.x - s * 10, tip.y + 6, s * 74, 26 - f * 6);
      g.fillStyle(moon ? 0xfff4c0 : 0xa9b4ff, moon ? 0.9 : 0.55).fillTriangle(s * 14, -4, elb.x, elb.y + 2, s * 40, 4).fillTriangle(elb.x, elb.y, tip.x, tip.y, elb.x + s * 14, elb.y + 10);
      g.lineStyle(3, 0x0d0a18, 0.8); for (let k = 0; k < 3; k++) { const tx = s * (104 + k * 16), ty = 18 - f * (24 + k * 12) - k * 10; g.lineBetween(elb.x, elb.y + 8, tx, ty); }
      g.fillStyle(0x6b4cc9, 0.55).fillTriangle(s * 26, 8, tip.x - s * 22, tip.y + 16, s * 90, 20 - f * 14);
      g.lineStyle(5, 0x0d0a18, 1).strokePoints(pts, true);
    }
  }
  private feathers() {
    for (let i = 0; i < 2; i++) { const f = this.add.ellipse(MX + Phaser.Math.Between(-60, 60), this.st.y - 60, 10, 26, 0x3b3f5c).setStrokeStyle(2, 0x0d0a18).setDepth(29);
      this.tweens.add({ targets: f, x: f.x - 160 - Math.random() * 80, y: f.y + 140 + Math.random() * 60, angle: Phaser.Math.Between(-200, 200), alpha: 0, duration: 900, ease: 'Sine.easeOut', onComplete: () => f.destroy() }); }
  }
  update(t: number, dms: number) {
    const s = this.st; const dt = Math.min(dms, 100) / 1000;
    this.flapT = t / (s.hold || this.carrying() ? 55 : 140); this.drawWings(this.flapT);
    if (!s.running || s.over) { if (this.carrying()) this.carryFly(dt); this.render(dt, false); return; }
    if (this.freeze > 0) { this.freeze -= dms; this.render(0, false); return; } // snatch hit-stop
    if (s.carry > 0) { // talon carry: clock, spawns and hazards pause; the city keeps drifting by
      s.carry -= dt; this.carryFly(dt);
      if (s.carry <= 0) { s.carry = 0; s.immune = IMMUNE; s.vy = 0; this.lastSnatch = this.time.now / 1000; this.dropPup(); }
      this.render(dt, false); this.hud.set(`CATCHES ${s.catches}/${NEED}`, s.time, s.catches / NEED); this.drawMeter(); return; }
    s.time -= dt; if (s.time <= 0) { s.time = 0; return this.finish(s.catches >= NEED); }
    const el = TIME - s.time;
    const phase = (s.catches >= 3 || s.time < 18) ? 3 : (s.catches >= 1 || s.time < 35) ? 2 : 1;
    if (phase !== s.phase) { s.phase = phase; popBanner(this, phase === 2 ? 'HOPPY PUPPY!' : 'PIGEON RUSH!', 700, phase === 2 ? 0x2fa0bf : 0xbf6a2f); Fx.alert(); }
    s.speed = SPEED * (1 + el / TIME * RAMP);
    // scroll + parallax
    for (const r of this.roofs) r.x -= s.speed * dt;
    this.far.tilePositionX += s.speed * dt * 0.18; this.mid.tilePositionX += s.speed * dt * 0.4;
    for (const c of this.clouds) { c.x -= (s.speed * 0.08 + 12) * dt; if (c.x < -160) c.x = W + 160; }
    while (this.roofs.length && this.roofs[0].x + this.roofs[0].w < -60) this.roofs.shift();
    const last = this.roofs[this.roofs.length - 1]; if (last.x + last.w < W + 300) this.addRoof(last.x + last.w + Phaser.Math.Between(0, 60));
    // flight
    if (s.immune > 0) s.immune -= dt;
    if (s.stun > 0) { s.stun -= dt; s.vy = Math.min(s.vy + 900 * dt, 300); if (s.stun <= 0) s.immune = IMMUNE; }
    else if (s.hold) s.vy = Math.max(-420, s.vy - 1500 * dt); else s.vy = Math.min(760, s.vy + 1250 * dt);
    s.y += s.vy * dt; if (s.y < 380) { s.y = 380; s.vy = 0; }
    const under = this.roofs.find(r => MX > r.x && MX < r.x + r.w); const floor = under ? under.top : H - 60;
    if (s.y > floor - 40) { s.y = floor - 40; if (s.vy > 200) { Fx.step(); } s.vy = -120; }
    const moonOn = s.moonT > 0; if (moonOn) { s.moonT -= dt; if (s.moonT <= 0) { s.moonT = 0; floatText(this, MX + 80, s.y - 120, 'moonlight fades…', '#c9c4ff', 26); } }
    // chimney (bonk or CLOSE call)
    for (const r of this.roofs) if (r.chim !== undefined) { const cx = r.x + r.chim;
      if (s.stun <= 0 && s.immune <= 0 && MX + 40 > cx && MX - 40 < cx + 60 && s.y + 20 > r.top - 110) this.bonk(cx + 30, r.top - 110);
      else if (!r.close && cx + 60 < MX - 40 && cx + 60 > MX - 60) { r.close = true; if (s.stun <= 0 && s.y + 20 > r.top - 170) this.closeCall(cx + 30, r.top - 120); } }
    // flashlights
    for (const r of this.roofs) if (r.lamp) { const L = r.lamp; L.t += dt; if (L.t > (L.on ? 1.8 : 1.4)) { L.t = 0; L.on = !L.on; } L.ang = Math.sin(this.time.now / 600 + r.x) * 0.5;
      if (L.on && s.spotted <= 0 && !moonOn) { const lx = r.x + r.w / 2, ly = r.top; const a = Math.atan2(s.y - ly, MX - lx) + Math.PI / 2; if (Math.abs(a - L.ang) < 0.22 && ly - s.y < 520 && ly - s.y > 0) this.spot(); } }
    s.spotted -= dt;
    // pigeons (phase 3)
    if (phase === 3) { this.pigT -= dt; if (this.pigT <= 0) { this.pigT = Phaser.Math.FloatBetween(2.2, 3.5); this.spawnPigeon(); } }
    for (const p of this.pigeons) { p.x -= (s.speed + 160) * dt; p.y += Math.sin(this.time.now / 150 + p.x / 50) * 0.8; p.img.setPosition(p.x, p.y);
      if (!p.hit && s.stun <= 0 && !moonOn && Math.abs(p.x - MX) < 50 && Math.abs(p.y - s.y) < 50) this.pigeonHit(p); }
    this.pigeons = this.pigeons.filter(p => { if (p.x < -80) { p.img.destroy(); return false; } return true; });
    // Puppy
    s.pupT -= dt; if (!this.pup && s.pupT <= 0) this.spawnPup();
    if (this.pup && !this.pup.done) { const p = this.pup; p.x += (-s.speed + 70) * dt; if (p.x > p.roof.x + p.roof.w - 20) { const nx = this.roofs.find(r => r.x > p.roof.x); if (nx) { p.roof = nx; Fx.boing?.(); } }
      if (phase >= 2) { p.hopT -= dt; if (p.hopT <= 0) { p.hopT = Phaser.Math.FloatBetween(0.9, 1.5); p.hopS = this.time.now; } const k = (this.time.now - p.hopS) / 500; p.hop = k >= 0 && k < 1 ? Math.sin(k * Math.PI) * HOP_H : 0; }
      p.c.setPosition(p.x, p.roof.top - p.hop); p.img.setAngle(p.hop > 5 ? -15 : 0);
      p.shadow.setPosition(p.x, p.roof.top - 4).setScale(1 - p.hop / HOP_H * 0.5).setAlpha(0.45 - p.hop / HOP_H * 0.25);
      if (p.x < -80) { p.c.destroy(); p.shadow.destroy(); this.pup = undefined; s.pupT = 0.6; }
      else if (s.vy > 120 && Phaser.Math.Distance.Between(MX, s.y + 40, p.x, p.roof.top - 70 - p.hop) < (moonOn ? MOON_R : SNATCH_R)) this.snatch(); }
    if (s.moon >= 100 && s.moonT <= 0) this.moonlight();
    if (s.combo > 0 && this.time.now / 1000 - this.lastSnatch > CHAIN_T) s.combo = 0;
    this.render(dt, true);
    this.hud.set(`CATCHES ${s.catches}/${NEED}`, s.time, s.catches / NEED); this.drawMeter();
  }
  private carrying() { const p = this.pup; return !!(p && p.done && p.carry); }
  /** Carry flight: Midnight swoops along on her own (player input ignored), city + pigeons drift past, Puppy cries tears. */
  private carryFly(dt: number) {
    const s = this.st, p = this.pup!, el = (this.time.now - p.carry!) / 1000, sp = s.speed * 0.6;
    for (const r of this.roofs) r.x -= sp * dt; this.far.tilePositionX += sp * dt * 0.18; this.mid.tilePositionX += sp * dt * 0.4;
    while (this.roofs.length && this.roofs[0].x + this.roofs[0].w < -60) this.roofs.shift();
    const last = this.roofs[this.roofs.length - 1]; if (last.x + last.w < W + 300) this.addRoof(last.x + last.w + Phaser.Math.Between(0, 60));
    for (const g of this.pigeons) { g.x -= (sp + 160) * dt; g.img.setPosition(g.x, g.y); }
    const ty = 470 + Math.sin(el * 2.6) * 55 - Math.min(1, el * 2) * 20, vy = (ty - s.y) * 5; s.vy += (vy - s.vy) * Math.min(1, dt * 8); s.y += s.vy * dt;
    this.tearT -= dt; if (this.tearT <= 0 && p.c.active) { this.tearT = 0.09; this.tear(p); }
  }
  private tearT = 0; private pupS = 1;
  private tear(p: NonNullable<DiveScene['pup']>) {
    const mt = p.img.getWorldTransformMatrix(), h = p.img.displayHeight, w = p.img.displayWidth;
    for (const side of [-1, 1]) { if (Math.random() < 0.35) continue; const a = Phaser.Math.DegToRad(p.c.angle), ox = side * w * 0.17, oy = -h * 0.62;
      const x = mt.tx + ox * Math.cos(a) - oy * Math.sin(a), y = mt.ty + ox * Math.sin(a) + oy * Math.cos(a);
      const d = this.add.ellipse(x, y, 11, 16, 0x8fd8ff).setStrokeStyle(2, 0x2a6a9a).setDepth(33);
      this.tweens.add({ targets: d, x: x + side * Phaser.Math.Between(50, 100) - 40, duration: 520, ease: 'Sine.Out' });
      this.tweens.add({ targets: d, y: y + Phaser.Math.Between(70, 140), alpha: 0, scale: 0.6, duration: 520, ease: 'Quad.In', onComplete: () => d.destroy() }); }
  }
  /** End of the carry: Midnight lets go and Puppy tumbles away off-screen (cartoon fling), then play resumes. */
  private dropPup() {
    const p = this.pup; if (!p || !p.carry) return; p.carry = 0; const s = this.st; Fx.boing?.();
    this.tweens.add({ targets: p.c, x: -150, y: 380, angle: -360, duration: 600, ease: 'Quad.In', onComplete: () => { p.c.destroy(); if (this.pup === p) this.pup = undefined; s.pupT = 1.2; } });
  }
  private render(dt: number, live: boolean) {
    const s = this.st, now = this.time.now; const moonOn = s.moonT > 0;
    this.bird.setAlpha(s.immune > 0 ? 0.45 + 0.55 * Math.abs(Math.cos(now / 60)) : 1).setPosition(MX, s.y).setAngle(Phaser.Math.Clamp(s.vy / 14, -20, 40) + (s.stun > 0 ? Math.sin(now / 40) * 20 : 0));
    if (this.rig.mood !== (s.stun > 0 ? 'dizzy' : 'smug')) this.rig.setMood(s.stun > 0 ? 'dizzy' : 'smug');
    // limbs: arms beat with the wings; diving = arms swept back + talons thrust forward-down; stunned = floppy
    if (!this.rig.busy) { const f = Math.sin(this.flapT), dive = s.vy > 220, P = this.rig.pose as Record<string, number>;
      const T: Record<string, number> = this.carrying() ? { ls: -95 - f * 45, le: -20 + f * 20, rs: 95 + f * 45, re: 20 - f * 20, lh: 55, lk: 100, rh: 70, rk: 105, lean: 2, sq: f * 0.03, dy: -f * 3, tilt: 0 }
        : s.stun > 0 ? { ls: -60 + Math.sin(now / 60) * 40, le: 40, rs: 60 - Math.sin(now / 60) * 40, re: -40, lh: -30, lk: 20, rh: 30, rk: -20, lean: 0, sq: 0, dy: 0, tilt: Math.sin(now / 80) * 12 }
        : dive ? { ls: -25, le: -30, rs: 25, re: 30, lh: 55, lk: -25, rh: 75, rk: -35, lean: 8, sq: 0.06, dy: 0, tilt: 6 }
        : { ls: -95 - f * 45, le: -20 + f * 20, rs: 95 + f * 45, re: 20 - f * 20, lh: -8, lk: 45, rh: 8, rk: 45, lean: 0, sq: f * 0.03, dy: -f * 3, tilt: 0 };
      const k = 1 - Math.exp(-dt * 16), nx: Record<string, number> = {}; for (const key in T) nx[key] = P[key] + (T[key] - P[key]) * k; this.rig.setPose(nx); }
    this.aura.setAlpha(moonOn ? 0.55 + Math.sin(now / 90) * 0.2 : 0);
    this.carryPup(now);
    // dive afterimages
    if (live) { this.trailT -= dt; if (s.vy > 350 && this.trailT <= 0) { this.trailT = 0.05;
      const gh = this.add.image(MX, s.y + 60 - 188 * 0.62, this.rig.head.texture.key).setScale(this.rig.head.scaleX * 0.62, this.rig.head.scaleY * 0.62).setDepth(28).setAlpha(0.4).setTint(moonOn ? 0xfff4c0 : 0x8a7aff).setAngle(this.bird.angle);
      this.tweens.add({ targets: gh, x: MX - 90, alpha: 0, duration: 260, onComplete: () => gh.destroy() }); } }
    // wind streaks — count/length scale with scroll speed and dive speed
    const fx = this.fx.clear(); const sp = s.speed / SPEED, dive = Math.max(0, s.vy) / 760;
    const want = Math.round(8 + sp * 6 + dive * 10);
    while (this.streaks.length < want) this.streaks.push({ x: W + Math.random() * W, y: Phaser.Math.Between(330, 1150), len: 0, a: 0 });
    if (this.streaks.length > want) this.streaks.length = want;
    for (const k of this.streaks) { k.x -= s.speed * 2.4 * dt * (1 + dive); k.len = 40 + sp * 50 + dive * 120; k.a = 0.18 + dive * 0.35;
      if (k.x + k.len < 0) { k.x = W + Math.random() * 200; k.y = Phaser.Math.Between(330, 1150); }
      fx.lineStyle(3, 0xc9c4ff, k.a).lineBetween(k.x, k.y, k.x + k.len, k.y); }
    if (dive > 0.35 && live) for (let i = 0; i < 4; i++) { const yy = s.y - 60 + i * 40; fx.lineStyle(4, 0xffffff, dive * 0.5).lineBetween(MX - 60 - i * 12, yy - 40, MX - 20 - i * 6, yy + 30); }
    const g = this.g.clear(), b = this.beams.clear();
    for (const r of this.roofs) {
      // building body with moon-side rim light, brick courses
      g.fillStyle(0x15122e, 1).fillRect(r.x, r.top, r.w, H - r.top);
      g.fillStyle(0x221d48, 1).fillRect(r.x + r.w - 16, r.top, 16, H - r.top);
      g.fillStyle(0x0d0a22, 1).fillRect(r.x, r.top, 14, H - r.top);
      g.lineStyle(2, 0x0b0920, 0.7); for (let yy = r.top + 30; yy < H; yy += 36) g.lineBetween(r.x + 14, yy, r.x + r.w - 16, yy);
      g.lineStyle(5, 0x07061a, 1).strokeRect(r.x, r.top, r.w, H - r.top);
      g.fillStyle(0x3a2f6a, 1).fillTriangle(r.x - 10, r.top + 2, r.x + r.w / 2, r.top - 46, r.x + r.w + 10, r.top + 2);
      g.fillStyle(0x5a4a9a, 1).fillTriangle(r.x + r.w / 2, r.top - 46, r.x + r.w + 10, r.top + 2, r.x + r.w / 2 + 20, r.top + 2);
      g.lineStyle(4, 0x07061a, 1).strokeTriangle(r.x - 10, r.top + 2, r.x + r.w / 2, r.top - 46, r.x + r.w + 10, r.top + 2);
      for (let wx = r.x + 30; wx < r.x + r.w - 40; wx += 80) for (let wy = r.top + 50; wy < H; wy += 110) if (((wx - r.x + wy + r.seed) | 0) % 3) {
        const flick = ((r.seed + wy) | 0) % 7 === 0 ? 0.6 + Math.sin(now / 200 + wy) * 0.3 : 0.9;
        g.fillStyle(0xffd76b, flick).fillRect(wx, wy, 34, 44).fillStyle(0xfff1b0, flick).fillRect(wx + 4, wy + 4, 12, 16).lineStyle(3, 0x07061a, 1).strokeRect(wx, wy, 34, 44).lineBetween(wx + 17, wy, wx + 17, wy + 44); }
      if (r.ant !== undefined) { const ax = r.x + r.ant; g.lineStyle(4, 0x07061a, 1).lineBetween(ax, r.top - 20, ax, r.top - 90).lineBetween(ax - 20, r.top - 70, ax + 20, r.top - 70);
        g.fillStyle(0xff3b3b, 0.5 + 0.5 * Math.sin(now / 300 + r.seed)).fillCircle(ax, r.top - 92, 5); }
      if (r.chim !== undefined) { const cx = r.x + r.chim;
        g.fillStyle(0xa8443a, 1).fillRect(cx, r.top - 110, 60, 120).fillStyle(0xd0655a, 1).fillRect(cx + 44, r.top - 110, 16, 120).fillStyle(0x7a2a22, 1).fillRect(cx, r.top - 110, 10, 120);
        g.lineStyle(2, 0x5a1a14, 0.8); for (let yy = r.top - 90; yy < r.top + 10; yy += 20) g.lineBetween(cx, yy, cx + 60, yy);
        g.lineStyle(5, 0x2a0a08, 1).strokeRect(cx, r.top - 110, 60, 120); g.fillStyle(0x7a2a22, 1).fillRect(cx - 8, r.top - 120, 76, 18).lineStyle(4, 0x2a0a08, 1).strokeRect(cx - 8, r.top - 120, 76, 18);
        for (let i = 0; i < 3; i++) { const k = ((now / 1400 + i / 3 + r.seed) % 1); g.fillStyle(0x8a84b0, 0.35 * (1 - k)).fillCircle(cx + 30 - k * 60 + Math.sin(k * 6 + i) * 8, r.top - 130 - k * 110, 14 + k * 26); } }
      if (r.lamp) { const lx = r.x + r.w / 2, ly = r.top; g.fillStyle(0x2a2a3a, 1).fillRect(lx - 4, ly - 30, 8, 30);
        g.fillStyle(0xffdf6b, 1).lineStyle(4, 0x2a2010, 1).fillCircle(lx, ly - 30, 14).strokeCircle(lx, ly - 30, 14);
        if (r.lamp.on) { const a = r.lamp.ang - Math.PI / 2;
          for (const [w, al] of [[0.3, 0.1], [0.22, 0.22]] as const) b.fillStyle(moonOn ? 0x8a84b0 : 0xfff4a0, moonOn ? al * 0.5 : al).fillTriangle(lx, ly - 30, lx + Math.cos(a - w) * 560, ly - 30 + Math.sin(a - w) * 560, lx + Math.cos(a + w) * 560, ly - 30 + Math.sin(a + w) * 560); }
        else if (r.lamp.t > 1.0) g.fillStyle(0xff3b3b, 0.6 + 0.4 * Math.sin(now / 60)).fillCircle(lx, ly - 30, 7); }
    }
  }
  private drawMeter() {
    const s = this.st, m = this.meter.clear(), x = 160, y = 1210, w = 400; const on = s.moonT > 0; const f = on ? s.moonT / MOON_T : Math.min(1, s.moon / 100);
    m.fillStyle(0x22252b, 0.85).fillRoundedRect(x - 6, y - 6, w + 12, 32, 16).fillStyle(on ? 0xfff4c0 : 0x9a8aff, 1).fillRoundedRect(x, y, Math.max(20, w * f), 20, 10);
    m.fillStyle(0xfff4c0, 1).fillCircle(x - 30, y + 10, 20).fillStyle(0x22252b, 1).fillCircle(x - 22, y + 4, 17);
    this.meterTxt.setText(on ? 'MOONLIGHT! beams can\'t see you' : s.combo > 1 ? `MOON  •  CHAIN x${s.combo}` : 'MOON  (skim chimneys / snatch)').setY(1184);
  }
  private spawnPup() {
    const r = this.roofs.find(rr => rr.x > W * 0.8); if (!r) return;
    const shadow = this.add.ellipse(r.x + 40, r.top - 4, 80, 18, 0x000000, 0.45).setDepth(19);
    const c = this.add.container(r.x + 40, r.top).setDepth(20); const img = art(this, 0, 0, 'pup_idle', 0.62); c.add(img);
    this.tweens.add({ targets: img, y: -12, scaleY: img.scaleY * 0.94, yoyo: true, repeat: -1, duration: 120 });
    this.pup = { c, img, shadow, x: r.x + 40, roof: r, done: false, hop: 0, hopT: Phaser.Math.FloatBetween(0.6, 1.4), hopS: -9999 };
    if (Math.random() < 0.4) say(this, 450, 600, pick(LINES.puppyGag), 20, 1000);
  }
  private spawnPigeon() {
    const y = Phaser.Math.Between(450, 700); const img = this.add.image(W + 60, y, 'dv_pigeon').setDepth(27).setScale(1.1);
    this.tweens.add({ targets: img, scaleY: 0.8, yoyo: true, repeat: -1, duration: 110 });
    this.pigeons.push({ img, x: W + 60, y, hit: false });
  }
  /** Snatched Puppy rides in Midnight's talons (follows the bird up the rebound, dangling) instead of tweening to a fixed spot, then gets flung away.
   *  The grip is the real talon point from the rig (HeroRig.point() now goes through the bird container's tilt), Puppy hangs from it. */
  private carryPup(now: number) {
    const p = this.pup; if (!p || !p.done || !p.carry) return; const s = this.st;
    const lf = this.rig.point('lf'), rf = this.rig.point('rf'), gx = (lf.x + rf.x) / 2, gy = (lf.y + rf.y) / 2; // between the two clenched feet
    // Puppy's container origin is at his feet, so he hangs HANG px below the grip (grabbed by the scruff); the hang direction only follows a
    // little of the bird's tilt (he dangles, gravity wins), and the position is smoothed so the post-snatch tilt shake doesn't jitter him
    const r = Phaser.Math.DegToRad(this.bird.angle * 0.3), tx = gx + HANG.x * Math.cos(r) - HANG.y * Math.sin(r), ty = gy + HANG.x * Math.sin(r) + HANG.y * Math.cos(r);
    const k = Math.min(1, (now - p.carry) / 110), e = 1 - (1 - k) * (1 - k);
    p.cx0! += (tx - p.cx0!) * 0.35 * e; p.cy0! += (ty - p.cy0!) * 0.35 * e; if (k < 1) { p.cx0! += (tx - p.cx0!) * e * 0.3; p.cy0! += (ty - p.cy0!) * e * 0.3; }
    p.c.setPosition(p.cx0!, p.cy0!).setAngle(Math.sin(now / 85) * 10 * k + Math.sin(now / 230) * 8 * k); // dangles + swings under the grip
    p.img.setScale(this.pupS * (1 + Math.sin(now / 70) * 0.04), this.pupS * (1 - Math.sin(now / 70) * 0.04)); // wriggling
  }
  private snatch() {
    const s = this.st, p = this.pup!; p.done = true; s.catches++;
    const nowS = this.time.now / 1000; s.combo = nowS - this.lastSnatch <= CHAIN_T ? s.combo + 1 : 1; this.lastSnatch = nowS;
    const high = s.diveFrom <= HIGH_DIVE_Y; const mult = (1 + 0.25 * (s.combo - 1)) * (high ? 1.5 : 1);
    const pts = Math.round((500 + Math.round(s.vy)) * mult); s.score += pts; s.moon = Math.min(100, s.moon + MOON_SNATCH);
    Fx.punch(); Fx.boing(); impact(this, p.x, p.roof.top - 80 - p.hop, high ? 'MOON DIVE!' : pick(['SNATCH!', 'SWOOP!', 'CAW!']), pts, s.combo > 1 ? `CHAIN x${s.combo}` : 'DIVE!', true);
    // moon glow flash + hit-stop + zoom pulse
    this.freeze = 90; this.tweens.killTweensOf(this.moonGlow);
    this.moonGlow.setAlpha(1).setScale(high ? 4 : 3.2);
    this.tweens.add({ targets: this.moonGlow, alpha: 0.25, scale: 2.2, duration: 900, ease: 'Quad.easeOut', onComplete: () => this.tweens.add({ targets: this.moonGlow, alpha: 0.4, scale: 2.35, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' }) });
    const ring = this.add.circle(MX, s.y + 20, 40).setStrokeStyle(10, 0xfff4c0, 1).setDepth(32).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 450, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    const beam = this.add.triangle(0, 0, MOON_X, MOON_Y, MX - 70, s.y + 40, MX + 70, s.y + 40, 0xfff4c0, 0.35).setOrigin(0, 0).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0, duration: 500, onComplete: () => beam.destroy() });
    flashVignette(this, 0xfff4c0, high ? 0.5 : 0.3);
    const cam = this.cameras.main; cam.zoomTo(this.zoom0 * 1.05, 90, 'Sine.easeOut', true); this.time.delayedCall(160, () => cam.zoomTo(this.zoom0, 260, 'Sine.easeInOut', true));
    this.tweens.killTweensOf(p.img); p.img.setTexture('pup_panic').setAngle(0).setY(0); this.pupS = p.img.scaleX; p.shadow.destroy(); pupFlail(this, p.img, CARRY_T * 1000 + 300, AIR_LIMB); // legs kick the whole carry
    // talon grab: legs snap forward and clench shut around him, wings/arms flare
    this.rig.act([{ dur: 0.05, to: { lh: 80, lk: -10, rh: 95, rk: -15, ls: -130, rs: 130 } }, { dur: 0.08, to: { lh: 60, lk: 95, rh: 75, rk: 100, sq: -0.06 }, ease: Phaser.Math.Easing.Back.Out },
      { dur: 0.45, to: { lh: 55, lk: 100, rh: 70, rk: 105, ls: -110, rs: 110 } }], false, 0.25);
    p.c.setDepth(31); p.carry = this.time.now; p.cx0 = p.c.x; p.cy0 = p.c.y; // carried in the talons for a beat (render() keeps him there), then flung off-screen
    s.vy = -500; s.carry = CARRY_T; this.tearT = 0.2;
    this.time.delayedCall(250, () => { if (p.carry) { say(this, 450, 520, pick(LINES.diveCarry), 22, 1150); } }); // Puppy wails
    this.time.delayedCall(1550, () => { if (p.carry && !s.over) say(this, 450, 520, pick(LINES.dive), 22, 850); });
    if (s.catches >= NEED) this.time.delayedCall(1500, () => this.finish(true)); // the final catch is carried on into the win
  }
  private closeCall(x: number, y: number) {
    const s = this.st; s.moon = Math.min(100, s.moon + MOON_CLOSE); s.score += 50;
    floatText(this, x + 30, y - 30, 'CLOSE! +50 MOON', '#c9c4ff', 30);
  }
  private moonlight() {
    const s = this.st; s.moon = 0; s.moonT = MOON_T; Fx.boing();
    popBanner(this, 'MOONLIGHT!', 600, 0xc9b44a); flashVignette(this, 0xfff4c0, 0.45);
    this.tweens.killTweensOf(this.moonGlow); this.moonGlow.setAlpha(0.9).setScale(3.5);
    this.tweens.add({ targets: this.moonGlow, alpha: 0.4, scale: 2.35, duration: 1200, ease: 'Sine.easeOut', onComplete: () => this.tweens.add({ targets: this.moonGlow, alpha: 0.4, scale: 2.5, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' }) });
  }
  private penalty(sec: number, pts: number) {
    let py = Math.max(260, this.st.y - 90); if (py > 610 && py < 790) py = 600; // never under a phase banner (y≈700)
    const t = this.add.text(MX + 70, py, pts ? `-${sec}s  -${pts}` : `-${sec}s`, { fontFamily: 'Arial Black, Arial', fontSize: '54px', color: '#ff4a4a', stroke: '#22252b', strokeThickness: 10 }).setOrigin(0.5).setDepth(820).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.Out' }); this.tweens.add({ targets: t, y: t.y - 110, alpha: 0, delay: 500, duration: 600, ease: 'Sine.easeIn', onComplete: () => t.destroy() });
  }
  private bonk(x: number, y: number) {
    const s = this.st; s.stun = STUN; s.vy = -200; s.combo = 0; s.time = Math.max(0, s.time - BONK_S);
    Fx.ouch(); this.cameras.main.shake(260, 0.016); flashVignette(this, 0xff3b3b, 0.55); this.penalty(BONK_S, 0); floatText(this, x, y - 40, 'BONK!', '#ffffff', 34); say(this, 420, 520, pick(LINES.diveBonk), 22, 1100);
    for (let i = 0; i < 6; i++) { const br = this.add.rectangle(x, y, 16, 10, 0xa8443a).setStrokeStyle(2, 0x2a0a08).setDepth(29);
      this.tweens.add({ targets: br, x: x + Phaser.Math.Between(-120, 60), y: y + Phaser.Math.Between(60, 200), angle: Phaser.Math.Between(-360, 360), alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => br.destroy() }); }
  }
  private pigeonHit(p: Pigeon) {
    const s = this.st; p.hit = true; s.stun = 0.6; s.vy = -150; s.combo = 0; s.time = Math.max(0, s.time - 1);
    Fx.ouch(); this.cameras.main.shake(180, 0.012); flashVignette(this, 0xff3b3b, 0.4); this.penalty(1, 0); floatText(this, p.x, p.y - 60, 'COO?!', '#ffffff', 34); this.feathers(); this.feathers();
    this.tweens.killTweensOf(p.img); this.tweens.add({ targets: p.img, angle: 540, y: p.y - 120, duration: 600 });
  }
  private spot() {
    const s = this.st; s.spotted = 1.2; s.combo = 0; s.score = Math.max(0, s.score - 150); s.time = Math.max(0, s.time - 1);
    Fx.alert(); flashVignette(this, 0xff3b3b, 0.5); this.penalty(1, 150); floatText(this, MX + 60, s.y - 20, 'SPOTTED!', '#fff4a0', 30);
    if (Math.random() < 0.5) say(this, 420, 520, pick(LINES.diveSpot), 22, 1000);
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; (window as any).__pr.ended = win ? 'win' : 'lose';
    popBanner(this, win ? 'PUPPY AIRLIFTED!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Midnight', 4, win, s.score + Math.round(s.time) * 20, `${s.catches} snatches`));
  }
}
