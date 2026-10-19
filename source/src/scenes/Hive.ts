// Zoe HONEY HIVE BONK: you are Zoe. Puppy pops out of hives; tap to bonk him with your pan.
// Decoys: Puppy holding Bunny's Bunnycano (don't bonk — spills combo) and bee swarms (sting penalty). 45s, reach the target.
// Three escalating phases: 1 WARM-UP, 2 HONEY RUSH (honey-pot helmet pups need 2 bonks, golden pups are worth 3x but duck fast),
// 3 BEE FRENZY (a wandering swarm drifts over the hives; swinging into it stings). Combo x10 lights FEVER: x1.5 points for 5s
// (risk: a sting or spill ends it). Parallax meadow layers drift and shift with your taps.
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art } from '../art/registry';
import { ZoeRig } from '../systems/rigs';
import { makeMuteButton, pointerInMute } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx, Sushi } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, sparks, comic, flashVignette } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';

// Tuning (checked with pups3-out/zoe/sim.mjs): higher target, more decoys, shorter windows, harsher penalties and
// Bunny's drink is "disguised" for CANO_HIDE s (Puppy pops up empty-pawed, then whips it out). ~64% wins for a decent player (sim).
const TIME = 45, TARGET = 2500, CANO_HIDE = 0, CANO_PEN = 100, BEE_PEN = 150, MIN_STAY = 600, STAY_K = 1300;
const PHASE2 = 15, PHASE3 = 30, FEVER_AT = 10, FEVER_T = 5, FEVER_MULT = 1.5, GOLD_PTS = 300, HELM_CHIP = 50;
const HIVES: [number, number][] = [[150, 560], [360, 520], [570, 560], [150, 830], [360, 790], [570, 830]];
type Kind = 'pup' | 'cano' | 'bees';
type Variant = 'helm' | 'gold' | null;
interface Pop { kind: Kind; variant: Variant; hp: number; hat?: Phaser.GameObjects.Graphics; obj: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image; up: boolean; done: boolean; id: number; extend: number }

export class HiveScene extends Phaser.Scene {
  st = { time: TIME, score: 0, combo: 0, best: 0, bonks: 0, stings: 0, spills: 0, running: false, over: false, phase: 1, fever: 0, golds: 0 };
  private pops: (Pop | null)[] = []; private popId = 0; private spawnT = 0;
  private zoe!: ZoeRig;
  private hud!: Phaser.GameObjects.Text; private timeT!: Phaser.GameObjects.Text; private comboT!: Phaser.GameObjects.Text; private bar!: Phaser.GameObjects.Graphics;
  private hives: Phaser.GameObjects.Image[] = []; private fingerC?: Phaser.GameObjects.Text; private shownScore = 0;
  private layers: { o: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject; k: number; bx: number }[] = []; private parX = 0; private parT = 0;
  private feverG!: Phaser.GameObjects.Graphics; private swarm?: Phaser.GameObjects.Container; private swarmV = 0; private bflies: Phaser.GameObjects.Text[] = [];
  constructor() { super('Hive'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x7fd3ff, 0x3f9f2e);
    this.st = { time: TIME, score: 0, combo: 0, best: 0, bonks: 0, stings: 0, spills: 0, running: false, over: false, phase: 1, fever: 0, golds: 0 };
    this.layers = []; this.parX = 0; this.parT = 0; this.swarm = undefined; this.bflies = [];
    this.pops = HIVES.map(() => null); this.spawnT = 0.6; this.hives = []; this.shownScore = 0; this.fingerC = undefined; this.tweens.timeScale = 1;
    art(this, 0, 0, 'bg_meadow');
    this.buildParallax();
    art(this, 640, 330, 'bun_bust_smile', 0.42).setDepth(5);
    HIVES.forEach(([x, y], i) => {
      const hv = art(this, x, y, 'hive', 0.95).setDepth(10 + i * 3); hv.setData('b', hv.scaleX); this.hives.push(hv);
      this.add.ellipse(x, y + 70, 200, 36, 0x1e4a12, 0.3).setDepth(9);
      this.tweens.add({ targets: hv, scaleY: hv.scaleY * 1.025, yoyo: true, repeat: -1, duration: 900 + i * 70, ease: 'Sine.InOut' });
      art(this, x, y, 'hivelip', 0.95).setDepth(12 + i * 3);
    });
    this.zoe = new ZoeRig(this, 230, 1250, 40);
    txt(this, W / 2, 150, 'HONEY HIVE BONK', 40, '#ffdf6b', '#22252b', 8).setDepth(60);
    this.hud = txt(this, 160, 210, '', 30, '#fff', '#22252b', 6).setDepth(60);
    this.timeT = txt(this, 580, 210, '', 34, '#fff', '#22252b', 6).setDepth(60);
    this.comboT = txt(this, W / 2, 1010, '', 44, '#7dff9a', '#22252b', 8).setDepth(60);
    this.bar = this.add.graphics().setDepth(60);
    this.feverG = this.add.graphics().setDepth(55);
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.tap(w.x, w.y); });
    (window as any).__pr = { scene: 'Hive', st: this.st, force: (win: boolean) => this.finish(win), hives: HIVES,
      swarm: () => this.swarm?.active ? { x: this.swarm.x, y: this.swarm.y } : null,
      active: () => this.pops.map((p, i) => p && p.up && !p.done ? { i, kind: p.kind, variant: p.variant, hp: p.hp, x: HIVES[i][0], y: HIVES[i][1] - 60 } : null).filter(Boolean) };
    this.updateHud();
    tutorialCard(this, 'zoe1', 'HONEY HIVE BONK!', ['You are ZOE! 🐻 TAP Puppy to BONK!', 'Puppy pulls out Bunny\'s drink 🥤? DON\'T!', 'Bees 🐝 sting — leave them!', 'Later: 🍯 helmets need 2 bonks, ✨ gold = 3x!', `Combo x${FEVER_AT} = FEVER (x1.5 points)! ${TARGET} to win`], () => this.begin());
  }
  private begin() {
    popBanner(this, 'BONK THAT PUPPY!', 700, 0xff9a1f);
    this.time.delayedCall(600, () => { say(this, 400, 960, pick(LINES.start.Zoe), 24); this.st.running = true; });
  }
  private get speed() { return 1 + (TIME - this.st.time) / TIME * 0.9 + Math.min(this.st.combo, 10) * 0.02; }
  update(_t: number, dms: number) {
    const s = this.st; if (!s.running || s.over) return;
    const dt = Math.min(dms, 250) / 1000;
    s.time -= dt; if (s.time <= 0) { s.time = 0; this.updateHud(); return this.finish(s.score >= TARGET); }
    const el = TIME - s.time, ph = el >= PHASE3 ? 3 : el >= PHASE2 ? 2 : 1;
    if (ph !== s.phase) { s.phase = ph; Fx.special();
      popBanner(this, ph === 2 ? 'HONEY RUSH! 🍯 helmets + ✨ gold' : 'BEE FRENZY! dodge the swarm 🐝', 700, ph === 2 ? 0xffb52e : 0xe0243a, 900);
      if (ph === 3) this.time.delayedCall(1200, () => this.launchSwarm()); }
    if (s.fever > 0) { s.fever -= dt; if (s.fever <= 0) { s.fever = 0; floatText(this, W / 2, 1060, 'fever over', '#ffffff', 28); } }
    this.updateSwarm(dt); this.drawFever(); this.updateParallax(dt);
    for (const p of this.pops) if (p) { if (p.hat?.active) p.hat.setPosition(p.img.x, p.img.y - p.img.displayHeight * 0.36).setAngle(p.img.angle); p.obj.list.forEach(o => { if ((o as any).getData?.('follow')) (o as any).y = p.img.y - 120; }); }
    this.spawnT -= dt * this.speed * (s.fever > 0 ? 1.3 : 1);
    if (this.spawnT <= 0) { this.spawnT = Phaser.Math.FloatBetween(0.72, 1.17); this.spawn(); if (this.speed > 1.8 && Math.random() < 0.35) this.spawn(); }
    this.updateHud();
  }
  // ---------- parallax meadow ----------
  private buildParallax() {
    const add = (o: any, k: number) => { this.layers.push({ o, k, bx: o.x }); return o; };
    // far hills (slow), mid hedge (medium), sun rays, clouds that drift on their own
    const sun = this.add.graphics({ x: 110, y: 120 }).setDepth(1).setAlpha(0.55);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; sun.fillStyle(0xfff6c0, 0.35).fillTriangle(0, 0, Math.cos(a - 0.08) * 420, Math.sin(a - 0.08) * 420, Math.cos(a + 0.08) * 420, Math.sin(a + 0.08) * 420); }
    this.tweens.add({ targets: sun, angle: 360, duration: 60000, repeat: -1 }); add(sun, 0.02);
    for (let i = 0; i < 3; i++) { const c = this.add.graphics({ x: 100 + i * 260, y: 300 + (i % 2) * 50 }).setDepth(1).setAlpha(0.8);
      c.fillStyle(0xffffff, 1).fillEllipse(0, 0, 150, 52).fillEllipse(-50, 10, 90, 40).fillEllipse(55, 8, 100, 44).fillEllipse(10, -20, 80, 50);
      this.tweens.add({ targets: c, x: c.x + 60, yoyo: true, repeat: -1, duration: 7000 + i * 1500, ease: 'Sine.InOut' }); add(c, 0.04); }
    const hills = this.add.graphics().setDepth(2); hills.fillStyle(0x8fd36a, 0.55);
    hills.fillEllipse(120, 470, 520, 160).fillEllipse(520, 450, 600, 170); hills.fillStyle(0x6fbf4f, 0.5).fillEllipse(360, 500, 900, 110); add(hills, 0.08);
    const hedge = this.add.graphics().setDepth(3); for (let x = -60; x < W + 80; x += 46) { hedge.fillStyle(0x4fa63a, 0.85).fillCircle(x, 470 + (x % 3) * 4, 34); hedge.fillStyle(0x7fd36a, 0.5).fillCircle(x - 8, 462, 14); }
    add(hedge, 0.14);
    // foreground grass tufts + flowers (fast layer, in front of the hive bases, sway)
    for (let i = 0; i < 14; i++) { const x = 20 + i * 52 + (i % 2) * 14, y = 960 + (i % 3) * 30, g = this.add.graphics({ x, y }).setDepth(30);
      g.fillStyle(0x3f9f2e, 1).fillTriangle(-14, 0, -4, -46, 2, 0).fillTriangle(-2, 0, 8, -58, 14, 0).fillTriangle(8, 0, 22, -40, 24, 0);
      if (i % 3 === 0) { g.fillStyle([0xff5c8a, 0xffdf6b, 0xffffff][i % 3 === 0 ? (i / 3) % 3 : 0], 1).fillCircle(8, -60, 9); g.fillStyle(0xffb52e, 1).fillCircle(8, -60, 4); }
      this.tweens.add({ targets: g, angle: { from: -5, to: 5 }, yoyo: true, repeat: -1, duration: 1200 + i * 90, ease: 'Sine.InOut' }); add(g, 0.3); }
    // butterflies wander in the mid layer
    for (let i = 0; i < 3; i++) { const b = txt(this, 100 + i * 250, 640, '🦋', 30).setDepth(4).setAlpha(0.9); this.bflies.push(b); add(b, 0.12); }
  }
  private updateParallax(dt: number) {
    this.parX += (this.parT - this.parX) * Math.min(1, dt * 3);
    const now = this.time.now;
    this.layers.forEach(L => { if (this.bflies.includes(L.o as any)) return; (L.o as any).x = L.bx - this.parX * L.k * 100 + ((L.o as any).getData?.('drift') ?? 0); });
    this.bflies.forEach((b, i) => { b.setPosition(140 + i * 230 + Math.sin(now / (1700 + i * 300) + i) * 90 - this.parX * 12, 640 + Math.sin(now / (600 + i * 90)) * 30 + i * 50).setScale(Math.sin(now / 90 + i) > 0 ? 1 : 0.6, 1); });
  }
  // ---------- fever ----------
  private drawFever() {
    const g = this.feverG, f = this.st.fever; g.clear(); if (f <= 0) return;
    const pulse = 0.12 + Math.sin(this.time.now / 90) * 0.05;
    g.lineStyle(26, 0xffb52e, pulse * 2).strokeRect(0, 0, W, H); g.fillStyle(0xffe08a, pulse * 0.5).fillRect(0, 0, W, H);
    g.fillStyle(0x22252b, 1).fillRoundedRect(220, 286, 280, 18, 9).fillStyle(0xffb52e, 1).fillRoundedRect(222, 288, 276 * f / FEVER_T, 14, 7);
  }
  private startFever() { const s = this.st; if (s.fever > 0) return; s.fever = FEVER_T; Fx.special(); popBanner(this, 'FEVER! x1.5 POINTS 🔥', 420, 0xff8a1f, 700); this.cameras.main.flash(150, 255, 210, 120); }
  private endFever(reason: string) { if (this.st.fever <= 0) return; this.st.fever = 0; floatText(this, W / 2, 1060, `FEVER lost (${reason})`, '#ff8a8a', 30); }
  // ---------- bee frenzy swarm ----------
  private launchSwarm() {
    if (this.st.over) return; this.swarm?.destroy();
    const dir = Math.random() < 0.5 ? 1 : -1, row = HIVES[Math.random() < 0.5 ? 0 : 3][1] - 90;
    const c = this.swarm = this.add.container(dir > 0 ? -120 : W + 120, row).setDepth(50); this.swarmV = dir * Phaser.Math.Between(105, 147);
    const halo = this.add.graphics(); halo.fillStyle(0xffdf6b, 0.18).fillCircle(0, 0, 95).lineStyle(4, 0xe0243a, 0.5).strokeCircle(0, 0, 95); c.add(halo);
    for (let k = 0; k < 7; k++) c.add(txt(this, 0, 0, '🐝', 34));
    Sushi.toss();
  }
  private updateSwarm(dt: number) {
    const c = this.swarm; if (!c?.active) return; c.x += this.swarmV * dt; c.y += Math.sin(this.time.now / 300) * 40 * dt;
    c.list.forEach((o, k) => { if (k === 0) return; const a = this.time.now / (180 + k * 20) + k; (o as Phaser.GameObjects.Text).setPosition(Math.cos(a) * 60, Math.sin(a * 1.3) * 40); });
    if (c.x < -200 || c.x > W + 200) { c.destroy(); this.swarm = undefined; this.time.delayedCall(Phaser.Math.Between(1500, 3000), () => this.st.phase === 3 && this.launchSwarm()); }
  }
  private inSwarm(x: number, y: number) { const c = this.swarm; return !!c?.active && Phaser.Math.Distance.Between(x, y, c.x, c.y) < 95; }
  private spawn() {
    const free = this.pops.map((p, i) => p ? -1 : i).filter(i => i >= 0); if (!free.length) return;
    const i = Phaser.Utils.Array.GetRandom(free); const [x, y] = HIVES[i];
    const r = Math.random(); const late = this.st.time < TIME * 0.7;
    const kind: Kind = r < (late ? 0.52 : 0.62) ? 'pup' : r < (late ? 0.76 : 0.82) ? 'cano' : 'bees';
    const ph = this.st.phase, vr = Math.random();
    const variant: Variant = kind !== 'pup' || ph < 2 ? null : vr < (ph === 3 ? 0.24 : 0.22) ? 'helm' : vr < (ph === 3 ? 0.40 : 0.34) ? 'gold' : null;
    const obj = this.add.container(x, y + 20).setDepth(11 + i * 3);
    const img = kind === 'bees' ? art(this, 0, 0, 'bees', 1.05).setOrigin(0.5, 1) : art(this, 0, 0, 'pup_idle', 0.8);
    obj.add(img);
    const m = this.make.graphics({}, false); m.fillRect(x - 120, y - 320, 240, 340); obj.setMask(m.createGeometryMask());
    const hid = kind === 'bees' ? 130 : 190; img.y = hid;
    const pop: Pop = { kind, variant, hp: variant === 'helm' ? 2 : 1, obj, img, up: false, done: false, id: ++this.popId, extend: 0 }; this.pops[i] = pop;
    if (variant === 'gold') { img.setTint(0xffe066); const sp = txt(this, 0, -120, '✨', 40); obj.add(sp); this.tweens.add({ targets: sp, angle: 360, scale: 1.3, yoyo: true, repeat: -1, duration: 300 }); sp.setData('follow', 1); }
    if (variant === 'helm') { const h = pop.hat = this.add.graphics(); this.drawPot(h); obj.add(h); }
    const stay = (Math.max(MIN_STAY, STAY_K / this.speed) + (kind === 'pup' ? 0 : 250)) * (variant === 'gold' ? 0.7 : variant === 'helm' ? 1.35 : 1);
    Sushi.toss();
    // anticipation: the hive shivers, then Puppy springs up stretched and settles with a squash
    const hv = this.hives[i], hb = hv.getData('b'); this.tweens.add({ targets: hv, scaleX: hb * 1.06, duration: 50, yoyo: true });
    const ib = img.scaleX; if (kind !== 'bees') img.setScale(ib * 0.85, ib * 1.2);
    this.tweens.add({ targets: img, scaleX: ib, scaleY: ib, delay: 140, duration: 260, ease: 'Elastic.Out', easeParams: [1.1, 0.45] });
    this.tweens.add({ targets: img, y: kind === 'bees' ? -20 : -40, duration: 140, ease: 'Back.Out', onComplete: () => { pop.up = true;
      if (kind === 'cano') this.time.delayedCall(CANO_HIDE * 1000, () => { if (pop.done) return; img.setTexture('pup_cano');
        img.setScale(ib * 1.15, ib * 0.9); this.tweens.add({ targets: img, scaleX: ib, scaleY: ib, duration: 180, ease: 'Back.Out' });
        const g = txt(this, x + 60, y - 170, '✨', 34).setDepth(70); this.tweens.add({ targets: g, alpha: 0, y: g.y - 30, duration: 400, onComplete: () => g.destroy() }); });
      if (kind === 'bees') this.tweens.add({ targets: img, x: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 60 });
      else if (kind === 'pup' && Math.random() < 0.25) img.setTexture('pup_hearts');
      const leave = () => { if (pop.done || this.pops[i] !== pop) return; if (pop.extend > 0) { const e = pop.extend; pop.extend = 0; this.time.delayedCall(e, leave); return; } pop.done = true;
        if (kind === 'pup' && this.st.running) { this.escape(x, y); }
        this.tweens.add({ targets: img, y: hid, duration: 140, onComplete: () => this.clear(i, pop) }); };
      this.time.delayedCall(stay, leave);
    } });
  }
  /** Honey-pot helmet: shaded clay pot with a honey drip, drawn around (0,0) = top of Puppy's head. */
  private drawPot(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xc77a2e, 1).lineStyle(5, 0x22252b, 1).fillEllipse(0, 0, 130, 70).strokeEllipse(0, 0, 130, 70);
    g.fillStyle(0xe8a050, 1).fillEllipse(-14, -10, 70, 26); g.fillStyle(0x9a5a1e, 1).lineStyle(4, 0x22252b, 1).fillRoundedRect(-52, -46, 104, 20, 8).strokeRoundedRect(-52, -46, 104, 20, 8);
    g.fillStyle(0xffb52e, 1).fillEllipse(-20, -30, 40, 12).fillRoundedRect(-28, -30, 10, 34, 5); g.fillStyle(0xffffff, 0.6).fillEllipse(-30, -4, 18, 8);
  }
  private clear(i: number, pop: Pop) { if (this.pops[i] === pop) this.pops[i] = null; pop.obj.destroy(); }
  private escape(x: number, y: number) {
    if (this.st.combo >= 3) floatText(this, x, y - 160, 'COMBO LOST', '#ff8a8a', 28);
    this.st.combo = 0; if (Math.random() < 0.3) say(this, x, y - 230, pick(LINES.hiveEscape), 20, 1100);
    const hv = this.hives[this.hiveAt(x)]; if (hv) this.tweens.add({ targets: hv, angle: { from: -4, to: 0 }, duration: 300, ease: 'Elastic.Out' });
    const t = txt(this, x + 50, y - 150, 'nyeh! 😛', 26, '#fff', '#22252b', 5).setDepth(70); this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 600, onComplete: () => t.destroy() });
  }
  private hiveAt(x: number) { return HIVES.findIndex(h => h[0] === x); }
  private swing(x: number, y: number) { this.zoe.swingAt(x, y - 40); }
  tap(x: number, y: number) {
    const s = this.st; if (!s.running || s.over) return;
    let best = -1, bd = 1e9;
    HIVES.forEach(([hx, hy], i) => { const d = Phaser.Math.Distance.Between(x, y, hx, hy - 50); if (d < 130 && d < bd) { bd = d; best = i; } });
    this.swing(x, y); this.parT = (x - W / 2) / (W / 2);
    if (this.inSwarm(x, y)) { const c = this.swarm!; return this.swarmSting(c.x, c.y); }
    const pop = best >= 0 ? this.pops[best] : null;
    if (!pop || pop.done || !pop.up) { Fx.whoosh(); if (best >= 0) { floatText(this, x, y - 40, 'whiff!', '#ffffff', 26); s.combo = 0; } this.updateHud(); return; }
    const [hx, hy] = HIVES[best];
    if (pop.kind === 'pup' && pop.hp > 1) { pop.hp--; this.knockPot(pop, hx, hy); this.updateHud(); return; }
    pop.done = true;
    if (pop.kind === 'pup') { this.bonk(best, pop, hx, hy); this.fingerCombo(x, y); }
    else if (pop.kind === 'cano') this.spill(best, pop, hx, hy);
    else this.sting(best, pop, hx, hy);
    this.updateHud();
  }
  /** Combo counter that pops up right next to the finger that scored it. */
  private fingerCombo(x: number, y: number) {
    const c = this.st.combo; if (c < 2) return;
    this.fingerC?.destroy();
    const col = c >= 10 ? '#ff5c8a' : c >= 5 ? '#ffdf6b' : '#7dff9a';
    const t = this.fingerC = comic(this, Phaser.Math.Clamp(x - 90, 70, W - 70), y + 40, `x${c}`, 46 + Math.min(c, 10) * 3, '#ffffff', col).setDepth(80).setScale(0.3).setAngle(-8);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y + 30, delay: 550, duration: 250, onComplete: () => t.destroy() });
  }
  /** Floating score popup that arcs up toward the SCORE readout and bumps it when it lands. */
  private scorePop(x: number, y: number, pts: number, big = false) {
    const good = pts > 0;
    // big: 1.5x size, dark outline, centred just above the 'Bunny's drink!!' banner (y 420, depth 800)
    const t = (big ? comic(this, W / 2, 360, `${pts}`, 60, '#ffe0e0', '#ff5c5c', '#22252b').setDepth(805)
      : comic(this, x + 70, y - 110, `${good ? '+' : ''}${pts}`, good ? 44 : 40, good ? '#eaffe8' : '#ffe0e0', good ? '#2fbf5a' : '#e0243a').setDepth(78)).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, y: t.y - 40, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: t, x: this.hud.x, y: this.hud.y, scale: 0.4, alpha: 0.2, delay: 420, duration: 380, ease: 'Quad.In',
      onComplete: () => { t.destroy(); this.tweens.add({ targets: this.hud, scale: 1.25, duration: 70, yoyo: true }); } });
  }
  /** First hit on a helmet pup: CLINK, the pot flies off spinning, he stays up a beat longer (combo kept). */
  private knockPot(pop: Pop, x: number, y: number) {
    const s = this.st, h = pop.hat; pop.hat = undefined; pop.extend += 350; s.score += HELM_CHIP; this.scorePop(x, y, HELM_CHIP);
    Fx.block(); this.cameras.main.shake(90, 0.006); sparks(this, x, y - 120, 10);
    const w = comic(this, x, y - 200, 'CLINK!', 50, '#ffffff', '#c77a2e').setDepth(75).setScale(0.3); this.tweens.add({ targets: w, scale: 1, duration: 110, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, delay: 350, duration: 200, onComplete: () => w.destroy() });
    if (h) { const wp = h.getWorldTransformMatrix(); h.destroy(); const f = this.add.graphics({ x: wp.tx, y: wp.ty }).setDepth(70); this.drawPot(f); const dir = x < W / 2 ? 1 : -1;
      this.tweens.add({ targets: f, x: f.x + dir * 260, angle: dir * 540, duration: 700, ease: 'Linear' }); this.tweens.add({ targets: f, y: f.y - 160, duration: 300, ease: 'Quad.Out', yoyo: true, onComplete: () => f.destroy() }); }
    const b = pop.img.scaleX; pop.img.setScale(b * 1.15, b * 0.85).setTexture('pup_panic'); this.tweens.add({ targets: pop.img, scaleX: b, scaleY: b, duration: 220, ease: 'Back.Out' });
  }
  private swarmSting(x: number, y: number) {
    const s = this.st; s.combo = 0; s.stings++; s.score = Math.max(0, s.score - BEE_PEN); this.endFever('stung');
    Fx.ouch(); flashVignette(this, 0xff3b3b, 0.6); this.cameras.main.flash(180, 255, 40, 40); this.cameras.main.shake(260, 0.016);
    this.scorePop(x, y + 60, -BEE_PEN); floatText(this, x, y - 100, 'SWARMED!', '#ff6b6b', 36); this.zoe.setTint(0xff9a9a).setMood('dizzy');
    this.time.delayedCall(500, () => { this.zoe.clearTint().setMood('smug'); }); this.updateHud();
  }
  private bonk(i: number, pop: Pop, x: number, y: number) {
    const s = this.st; s.combo++; s.best = Math.max(s.best, s.combo); s.bonks++;
    const base = pop.variant === 'gold' ? GOLD_PTS : pop.variant === 'helm' ? 150 : 100; if (pop.variant === 'gold') s.golds++;
    const pts = Math.round(base * (1 + Math.min(s.combo - 1, 10) * 0.15) * (s.fever > 0 ? FEVER_MULT : 1)); s.score += pts;
    if (s.combo === FEVER_AT) this.startFever();
    if (pop.variant === 'gold') { sparks(this, x, y - 70, 30, true); this.cameras.main.flash(100, 255, 230, 120); }
    Fx.punch(); Fx.combo(s.combo); this.cameras.main.shake(120, 0.008);
    sparks(this, x, y - 70, 16, s.combo >= 5);
    const w = comic(this, x, y - 190, pick(['BONK!', 'BONG!', 'CLANG!', 'BOINK!']), 64).setDepth(75).setScale(0.3).setAngle(Phaser.Math.Between(-12, 12));
    this.tweens.add({ targets: w, scale: 1, duration: 120, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, y: w.y - 30, delay: 380, duration: 250, onComplete: () => w.destroy() });
    this.scorePop(x, y, pts);
    // hit-stop for a few frames so the CLANG lands
    this.tweens.timeScale = 0.05; this.time.delayedCall(60, () => { this.tweens.timeScale = 1; });
    const ring = this.add.graphics({ x, y: y - 80 }).setDepth(73); ring.lineStyle(8, 0xffffff, 0.9).strokeCircle(0, 0, 40);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    const hv = this.hives[i], hb = hv.getData('b'); hv.setScale(hb * 1.1, hb * 0.9); this.tweens.add({ targets: hv, scaleX: hb, scaleY: hb, duration: 300, ease: 'Elastic.Out' });
    for (let k = 0; k < 4; k++) { const d = this.add.circle(x + Phaser.Math.Between(-60, 60), y - 20, Phaser.Math.Between(5, 9), 0xffb52e).setDepth(72);
      this.tweens.add({ targets: d, y: d.y + 90, alpha: 0, duration: 500, ease: 'Quad.In', onComplete: () => d.destroy() }); }
    for (let k = 0; k < 3; k++) { const st = txt(this, x, y - 140, '★', 30, '#ffdf6b', '#22252b', 4).setDepth(74);
      this.tweens.addCounter({ from: 0, to: 360, duration: 600, onUpdate: (tw) => { const a = Phaser.Math.DegToRad(tw.getValue()! + k * 120); st.setPosition(x + Math.cos(a) * 46, y - 130 + Math.sin(a) * 14); }, onComplete: () => st.destroy() }); }
    // slapstick: accordion squash, wobble, then sink back into the hive spinning
    this.tweens.killTweensOf(pop.img); pop.img.setTexture('pup_dizzy'); const b = pop.img.scaleX;
    pop.img.setScale(b * 1.35, b * 0.6).setY(-10);
    this.tweens.add({ targets: pop.img, scaleX: b, scaleY: b, duration: 260, ease: 'Elastic.Out', easeParams: [1.3, 0.35] });
    this.tweens.add({ targets: pop.img, angle: { from: -14, to: 14 }, duration: 70, yoyo: true, repeat: 2 });
    this.tweens.add({ targets: pop.img, y: 190, angle: 200, delay: 280, duration: 200, ease: 'Back.In', onComplete: () => this.clear(i, pop) });
    if (s.combo > 0 && s.combo % 5 === 0) { popBanner(this, `COMBO x${s.combo}!`, 420, 0x2fbf5a, 600); say(this, 400, 960, pick(LINES.hiveBonk), 22, 1200); }
    else if (Math.random() < 0.18) say(this, 400, 960, pick(LINES.hiveBonk), 22, 1000);
  }
  private spill(i: number, pop: Pop, x: number, y: number) {
    const s = this.st; s.spills++; s.score = Math.max(0, s.score - CANO_PEN); this.scorePop(x, y, -CANO_PEN, true); // QC: a spill only costs points; combo + fever survive
    Sushi.wrong(); Sushi.gag(); this.cameras.main.shake(160, 0.01);
    for (let k = 0; k < 14; k++) { const d = this.add.circle(x, y - 80, Phaser.Math.Between(5, 10), 0x4a2410).setDepth(72); const a = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.2, 1.2);
      this.tweens.add({ targets: d, x: x + Math.cos(a) * 120, y: y - 80 + Math.sin(a) * 120 + 140, alpha: 0, duration: 600, ease: 'Quad.In', onComplete: () => d.destroy() }); }
    floatText(this, x, y - 170, 'SPILLED!', '#ff6b6b', 34);
    pop.img.setTexture('pup_panic'); this.tweens.add({ targets: pop.img, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: 3 }); popBanner(this, 'Bunny\'s drink!!', 420, 0xe0243a, 600);
    say(this, 400, 960, pick(LINES.hiveCano), 22, 1300);
    this.tweens.add({ targets: pop.img, y: 150, delay: 250, duration: 160, onComplete: () => this.clear(i, pop) });
  }
  private sting(i: number, pop: Pop, x: number, y: number) {
    const s = this.st; s.combo = 0; s.stings++; s.score = Math.max(0, s.score - BEE_PEN); this.endFever('stung');
    Fx.ouch(); flashVignette(this, 0xff3b3b, 0.6); this.cameras.main.flash(180, 255, 40, 40); this.cameras.main.shake(260, 0.016);
    this.tweens.killTweensOf(pop.img);
    this.tweens.add({ targets: pop.img, x: this.zoe.x - x, y: this.zoe.y - y - 220, duration: 380, ease: 'Quad.In', onComplete: () => this.clear(i, pop) });
    this.time.delayedCall(360, () => { this.zoe.setMood('dizzy'); floatText(this, this.zoe.x, this.zoe.y - 330, 'STING!', '#ff6b6b', 34); this.scorePop(this.zoe.x, this.zoe.y - 200, -BEE_PEN);
      this.cameras.main.flash(120, 255, 40, 40); this.cameras.main.shake(200, 0.012); this.zoe.setTint(0xff9a9a); this.time.delayedCall(300, () => this.zoe.clearTint()); this.time.delayedCall(600, () => this.zoe.setMood('smug')); });
    say(this, 400, 960, pick(LINES.hiveBees), 22, 1300);
  }
  private updateHud() {
    const s = this.st; this.shownScore += Math.sign(s.score - this.shownScore) * Math.max(1, Math.min(Math.abs(s.score - this.shownScore), Math.ceil(Math.abs(s.score - this.shownScore) * 0.2)));
    this.hud.setText(`SCORE ${this.shownScore}`); this.timeT.setText(`0:${String(Math.ceil(s.time)).padStart(2, '0')}`).setColor(s.time < 10 ? '#ff6b6b' : '#fff');
    this.comboT.setText(s.combo >= 2 ? `COMBO x${s.combo}${s.fever > 0 ? ' 🔥x1.5' : s.combo < FEVER_AT ? `  (fever at ${FEVER_AT})` : ''}` : '').setFontSize(s.combo >= 2 && s.combo < FEVER_AT && s.fever <= 0 ? 34 : 44);
    const f = Math.min(1, this.shownScore / TARGET); this.bar.clear().fillStyle(0x22252b, 1).fillRoundedRect(140, 246, 440, 30, 15).fillStyle(f >= 1 ? 0x7dff9a : 0xffc021, 1).fillRoundedRect(144, 250, Math.max(22, 432 * f), 22, 11);
    this.bar.lineStyle(4, 0xffffff, 1).lineBetween(576, 244, 576, 278);
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; this.shownScore = s.score; this.updateHud();
    (window as any).__pr.ended = win ? 'win' : 'lose';
    popBanner(this, win ? 'TIME! PUPPY IS BONKED!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Zoe', 2, win, s.score + s.best * 20, `${s.bonks} bonks • ${s.golds} gold • best combo x${s.best}`));
  }
}
