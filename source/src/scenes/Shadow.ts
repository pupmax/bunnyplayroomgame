// Linye SHADOW TAG: tap a shadow pool to teleport into it. Arrive right next to Puppy to TAG him.
// Puppy flees from you; drifting lanterns light up pools (can't teleport into a lit pool). 9 tags in 32s.
import Phaser from 'phaser';
import { GAME_W as W } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { Hud, impact } from '../systems/level';
import { HeroRig, pupFlail } from '../systems/rigs';
import { SquashCatch, SquashVariant } from '../systems/squash';

const TIME = 32, NEED = 9, TAG_R = 100, WARN_T = 0.8, PHASE2 = 6, LSPD2 = 1.15, SPD_MAX = 480;
const GAG_CAP = 2; // at most 2 Puppy gag bubbles per round (was ~10)
const POOLS: [number, number][] = [[120, 720], [360, 700], [600, 730], [230, 880], [490, 880], [110, 1050], [360, 1040], [610, 1060], [240, 1200], [500, 1200]];

export class ShadowScene extends Phaser.Scene {
  st = { time: TIME, tags: 0, score: 0, running: false, over: false, at: 0, cool: 0, combo: 0 };
  private pools: Phaser.GameObjects.Ellipse[] = []; private lanterns: { o: Phaser.GameObjects.Container; x: number; y: number; vx: number; vy: number }[] = [];
  private linye!: HeroRig; private pup!: Phaser.GameObjects.Image; private pupTw?: Phaser.Tweens.Tween; private hud!: Hud;
  private cones!: Phaser.GameObjects.Graphics; private warnG!: Phaser.GameObjects.Graphics; private vigs: Phaser.GameObjects.Image[] = []; private dustT = 0; private lastPx = 0; private lastPy = 0; private lspd = 1; private sq!: SquashCatch;
  constructor() { super('Shadow'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x120a26, 0x1e1438);
    this.st = { time: TIME, tags: 0, score: 0, running: false, over: false, at: 0, cool: 0, combo: 0 }; this.gags = 0;
    art(this, 0, 0, 'bg_dojo'); this.lspd = 1; this.vigs = [];
    this.buildTex(); this.backdrop();
    this.pools = POOLS.map(([x, y]) => { const e = this.add.ellipse(x, y, 150, 48, 0x0d0618, 0.75).setStrokeStyle(4, 0x9a7aff, 0.6).setDepth(3);
      this.tweens.add({ targets: e, scaleX: 1.06, yoyo: true, repeat: -1, duration: 900 + x, ease: 'Sine.InOut' });
      const v = this.add.image(x, y - 20, 'sh_vig').setDepth(2).setScale(1.5, 0.8); this.vigs.push(v);
      const rip = this.add.ellipse(x, y, 90, 26).setStrokeStyle(2, 0xc9b4ff, 0.5).setDepth(3);
      this.tweens.add({ targets: rip, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 1600, repeat: -1, delay: x * 3 }); return e; });
    this.cones = this.add.graphics().setDepth(3.5).setBlendMode(Phaser.BlendModes.ADD); this.warnG = this.add.graphics().setDepth(5);
    this.add.image(360, 640, 'sh_screenvig').setDepth(30).setScrollFactor(0);
    this.lanterns = [[200, 800, 70, 50], [520, 1100, -60, -45]].map(([x, y, vx, vy]) => { const o = this.add.container(x, y).setDepth(4); const g = this.add.graphics();
      g.fillStyle(0xffc880, 0.22).fillCircle(0, 0, 120).fillStyle(0xffc880, 0.25).fillCircle(0, 0, 70); g.fillStyle(0xff5c3a, 1).lineStyle(4, 0x2a0a08, 1).fillRoundedRect(-20, -100, 40, 50, 12).strokeRoundedRect(-20, -100, 40, 50, 12);
      g.fillStyle(0xffdf6b, 1).fillRect(-12, -92, 24, 6); o.add(g); return { o, x, y, vx, vy }; });
    this.pup = art(this, 500, 900, 'pup_idle', 0.7).setDepth(10); this.lastPx = 500; this.lastPy = 900;
    this.linye = new HeroRig(this, 'Linye', POOLS[0][0], POOLS[0][1] + 10, 0.75).setDepth(12);
    { const glow = this.add.ellipse(0, -70, 170, 190, 0xb78cff, 0.28).setBlendMode(Phaser.BlendModes.ADD); this.linye.root.addAt(glow, 0); // rim-light so her dark outfit reads on the dark floor
      this.tweens.add({ targets: glow, alpha: 0.16, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.InOut' }); }
    this.sq = new SquashCatch(this, this.linye, this.pup); // squash catch art is baked in the background (one small texture at a time)
    this.hud = new Hud(this, 'SHADOW TAG', 0xb78cff);
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.tapAt(w.x, w.y); });
    (window as any).__pr = { scene: 'Shadow', st: this.st, force: (win: boolean) => this.finish(win), pools: POOLS, pup: () => ({ x: this.pup.x, y: this.pup.y }), lit: () => POOLS.map((_, i) => this.lit(i)),
      squash: () => ({ phase: this.sq.phase, v: this.sq.variant, n: this.sq.count, ready: this.sq.ready }), forceSquash: (v?: SquashVariant) => { this.sq.forced = v; } };
    tutorialCard(this, 'linye1', 'SHADOW TAG', ['You are LINYE the hedgehog 🦔', 'TAP a shadow pool to teleport there', 'Land right next to Puppy = TAG!', `Lit pools 🏮 are blocked. ${NEED} tags wins`], () => this.begin());
    this.roam();
  }
  private begin() { popBanner(this, '...TAG.', 700, 0x6b4cc9); this.time.delayedCall(600, () => { this.talk( 360, 560, pick(LINES.start.Linye), 22); this.st.running = true; }); }
  private lit(i: number) { const [x, y] = POOLS[i]; return this.lanterns.some(l => Phaser.Math.Distance.Between(l.x, l.y, x, y) < 110); }
  update(_t: number, dms: number) {
    const s = this.st; const dt = Math.min(dms, 50) / 1000;
    for (const l of this.lanterns) { l.x += l.vx * dt * this.lspd; l.y += l.vy * dt * this.lspd; if (l.x < 80 || l.x > 640) l.vx *= -1; if (l.y < 680 || l.y > 1220) l.vy *= -1; l.o.setPosition(l.x, l.y + Math.sin(this.time.now / 300) * 6); }
    this.pools.forEach((p, i) => { const L = this.lit(i); p.setFillStyle(L ? 0x6a5a8a : 0x0d0618, L ? 0.35 : 0.75); this.vigs[i].setAlpha(Phaser.Math.Linear(this.vigs[i].alpha, L ? 0.1 : 0.85, 0.15)); });
    this.drawCones(); this.footDust(dt); this.waddle(dt);
    if (!s.running || s.over) return;
    if (this.sq.phase) { s.cool -= dt; this.sq.update(dt); this.hud.set(`TAGS ${s.tags}/${NEED}`, s.time, s.tags / NEED); return; } // catch sequence: level timer + Puppy AI frozen
    s.time -= dt; s.cool -= dt; if (s.time <= 0) { s.time = 0; return this.finish(s.tags >= NEED); }
    this.hud.set(`TAGS ${s.tags}/${NEED}`, s.time, s.tags / NEED);
  }
  private roam() {
    if (this.st.over || this.sq?.phase) return; const s = this.st;
    const lx = this.linye.x, ly = this.linye.y; let tx = 0, ty = 0, best = -1;
    for (let k = 0; k < 6; k++) { const x = Phaser.Math.Between(80, 640), y = Phaser.Math.Between(700, 1220); const d = Phaser.Math.Distance.Between(x, y, lx, ly); if (d > best) { best = d; tx = x; ty = y; } }
    // flee speed ramp: same as before early on (first +120), then half the slope, capped at 1.6x the start (late game was ~2.35x)
    const ramp = s.tags * 30 + (TIME - s.time) * 3, speed = Math.min(SPD_MAX, 300 + (ramp <= 120 ? ramp : 120 + (ramp - 120) * 0.5));
    const dur = Math.max(300, Phaser.Math.Distance.Between(this.pup.x, this.pup.y, tx, ty) / speed * 1000);
    this.pup.setFlipX(tx > this.pup.x).setTexture(best > 300 ? 'pup_idle' : 'pup_panic');
    this.pupTw = this.tweens.add({ targets: this.pup, x: tx, y: ty, duration: dur, ease: 'Sine.InOut', onUpdate: () => this.pup.setDepth(this.pup.y > this.linye.y ? 13 : 10), onComplete: () => {
      if (Math.random() < 0.25) { this.pup.setTexture('pup_hearts'); if (s.running && this.gags < GAG_CAP && Math.random() < 0.5) { this.gags++; this.talk( this.pup.x, this.pup.y - 220, pick(LINES.puppyGag), 20, 900); } }
      this.time.delayedCall(Phaser.Math.Between(80, 350), () => this.roam()); } });
  }
  tapAt(x: number, y: number) {
    const s = this.st; if (!s.running || s.over) return;
    if (this.sq.phase) { this.sq.skip(); return; } // during a catch a tap only skips ahead (after 0.5 s of the hold)
    if (s.cool > 0) return;
    let i = -1, bd = 110; POOLS.forEach(([px, py], k) => { const d = Phaser.Math.Distance.Between(x, y, px, py); if (d < bd) { bd = d; i = k; } });
    if (i < 0) return;
    if (this.lit(i)) { Fx.block(); this.tweens.add({ targets: this.pools[i], x: POOLS[i][0] + 8, yoyo: true, repeat: 2, duration: 40, onComplete: () => this.pools[i].setX(POOLS[i][0]) }); floatText(this, POOLS[i][0], POOLS[i][1] - 60, 'LIT! 🏮', '#ffc880', 30); return; }
    s.cool = 0.8; s.at = i; const [px, py] = POOLS[i];
    this.poof(this.linye.x, this.linye.y - 80); Fx.whoosh();
    this.linye.setPosition(px, py + 10).setMood('smug').setFlip(this.pup.x < px); this.linye.root.scaleY = 0;
    this.tweens.add({ targets: this.linye.root, scaleY: 0.75, duration: 160, ease: 'Back.Out' });
    // bursts out of the pool mid-sprint: alternating arm pumps + leg strides, leaning into the run
    const A = { ls: 55, le: -95, rs: -50, re: 95, lh: 45, lk: -55, rh: -40, rk: 50, lean: 12, sq: 0.03, dy: -6 };
    const B = { ls: -50, le: 95, rs: 55, re: -95, lh: -40, lk: 50, rh: 45, rk: -55, lean: 12, sq: -0.02, dy: 2 };
    this.linye.act([{ dur: 0.08, to: A }, { dur: 0.09, to: B }, { dur: 0.09, to: A }, { dur: 0.09, to: B }, { dur: 0.1, to: { ...A, lean: 6 } }], false, 0.22);
    this.poof(px, py - 60); this.ring(px, py, 0x9a7aff);
    const d = Phaser.Math.Distance.Between(px, py, this.pup.x, this.pup.y);
    if (d < TAG_R) this.tag(); else { s.combo = 0; if (Math.random() < 0.3) this.talk( 360, 560, pick(LINES.shadowMiss), 22, 900); if (d < 300) { this.pupTw?.stop(); this.roam(); } }
  }
  private poof(x: number, y: number) { for (let k = 0; k < 8; k++) { const c = this.add.circle(x + Phaser.Math.Between(-50, 50), y + Phaser.Math.Between(-60, 60), Phaser.Math.Between(18, 36), 0x6b4cc9, 0.6).setDepth(20);
    this.tweens.add({ targets: c, scale: 1.8, alpha: 0, duration: 450, onComplete: () => c.destroy() }); } }
  private tag() {
    const s = this.st; s.tags++; s.combo++; const pts = 600 + (s.combo > 1 ? 300 : 0); s.score += pts;
    Fx.punch(); Fx.boing(); this.pupTw?.stop();
    if (s.tags === PHASE2) { this.lspd = LSPD2; popBanner(this, 'LANTERNS QUICKEN 🏮', 700, 0xff8a3a); this.cameras.main.flash(200, 255, 200, 120); }
    // SQUASH catch (random variant, never twice in a row); timer + Puppy frozen until he boings back up
    const px = this.pup.x, py = this.pup.y;
    this.dropTagBubble(); // back-to-back catches: the last 'Gotcha' bubble must not sit on top of the new SQUASHED!/PLOP! stamp
    if (this.sq.start(() => { this.tagBub = this.talk(360, 560, this.catchLine(), 22, 1100); if (s.tags >= NEED) this.finish(true); else this.roam(); })) {
      this.ring(px, py, 0xd9c8ff); const sp = this.sq.scoreAt() ?? { x: Phaser.Math.Clamp(px, 120, 600), y: py - 300 }; floatText(this, sp.x, sp.y, `+${pts}${s.combo > 1 ? '  CHAIN!' : ''}`, '#ffdf6b', 34); return;
    }
    // fallback while the catch art is still baking: the original quick tag
    impact(this, this.pup.x, this.pup.y - 100, pick(['TAG!', 'POOF!', 'BOOP!']), pts, s.combo > 1 ? 'CHAIN!' : '', s.combo > 1);
    this.pup.setTexture('pup_dizzy'); this.linye.setMood('happy'); pupFlail(this, this.pup, 800);
    this.linye.act([{ dur: 0.12, to: { rs: -150, re: -30, ls: 40, le: -20, lean: -6, dy: -10, rh: 20, rk: -30 }, ease: Phaser.Math.Easing.Back.Out }, { dur: 0.35, to: { rs: -160, re: -10 } }], false, 0.3);
    this.time.delayedCall(800, () => this.linye.setMood('smug'));
    this.tweens.add({ targets: this.pup, angle: 360, duration: 500, onComplete: () => { this.pup.setAngle(0); this.roam(); } });
    this.talk( 360, 560, this.catchLine(), 22, 1100);
    this.cameras.main.shake(120, 0.006); this.ring(this.pup.x, this.pup.y, 0xd9c8ff);
    if (s.tags >= NEED) this.time.delayedCall(700, () => this.finish(true));
  }
  private tagBub?: Phaser.GameObjects.Container;
  private dropTagBubble() {
    const b = this.tagBub; this.tagBub = undefined; if (!b || !b.active) return;
    this.tweens.killTweensOf(b); this.tweens.add({ targets: b, alpha: 0, scale: 0.85, duration: 110, onComplete: () => b.destroy() });
  }
  private bubbles: { c: any; hw: number; top: number; bot: number; ty: number; tw?: Phaser.Tweens.Tween }[] = [];
  private gags = 0;
  /** Random catch line from LINES.shadowCatch, never the same one twice in a row. */
  private catchLine() { return pick(LINES.shadowCatch); } // shared shuffle-bag: all 5 of Marc's lines play before any repeats, never twice in a row
  private talk(x: number, y: number, t: string, sz?: number, ms?: number) {
    const c: any = (say as any)(this, x, y, t, sz, ms); const txt = c?.list?.find((o: any) => o.type === 'Text');
    if (!c || !txt) return c;
    const hw = txt.width / 2 + 34; c.x = Phaser.Math.Clamp(c.x, hw, W - hw);
    // stack, don't overlap: older bubbles still on screen slide up above the newest one (tail included)
    const GAP = 10, top = txt.height / 2 + 14, bot = top + 26;
    this.bubbles = this.bubbles.filter(b => b.c.active && b.c.visible);
    const placed = [{ x: c.x, y: c.y, hw, top, bot }];
    for (const b of [...this.bubbles].reverse()) {
      let ty = b.ty;
      for (let guard = 0, moved = true; moved && guard < 6; guard++) { moved = false;
        for (const p of placed) if (Math.abs(b.c.x - p.x) < b.hw + p.hw && ty + b.bot + GAP > p.y - p.top && ty - b.top - GAP < p.y + p.bot) { ty = p.y - p.top - GAP - b.bot; moved = true; } }
      if (ty !== b.ty) { b.ty = ty; b.tw?.stop();
        if (ty - b.top < 150) b.tw = this.tweens.add({ targets: b.c, alpha: 0, duration: 140, onComplete: () => b.c.setVisible(false) }); // no room under the HUD: just fade it
        else b.tw = this.tweens.add({ targets: b.c, y: ty, duration: 180, ease: 'Quad.Out' }); }
      placed.push({ x: b.c.x, y: ty, hw: b.hw, top: b.top, bot: b.bot });
    }
    this.bubbles.push({ c, hw, top, bot, ty: c.y }); return c;
  }
  private buildTex() {
    if (!this.textures.exists('sh_vig')) { const t = this.textures.createCanvas('sh_vig', 200, 200)!; const g = t.context; const r = g.createRadialGradient(100, 100, 10, 100, 100, 100);
      r.addColorStop(0, 'rgba(10,4,24,0.75)'); r.addColorStop(0.6, 'rgba(20,8,40,0.35)'); r.addColorStop(1, 'rgba(20,8,40,0)'); g.fillStyle = r; g.fillRect(0, 0, 200, 200); t.refresh(); }
    if (!this.textures.exists('sh_screenvig')) { const t = this.textures.createCanvas('sh_screenvig', 720, 1280)!; const g = t.context; const r = g.createRadialGradient(360, 760, 300, 360, 760, 820);
      r.addColorStop(0, 'rgba(12,6,30,0)'); r.addColorStop(1, 'rgba(12,6,30,0.6)'); g.fillStyle = r; g.fillRect(0, 0, 720, 1280); t.refresh(); }
    if (!this.textures.exists('sh_mote')) { const g = this.add.graphics(); g.fillStyle(0xffffff, 1).fillCircle(6, 6, 6); g.generateTexture('sh_mote', 12, 12); g.destroy(); }
  }
  private backdrop() {
    const g = this.add.graphics().setDepth(1);
    g.fillGradientStyle(0x1a1036, 0x1a1036, 0x2a1a50, 0x2a1a50, 0.55).fillRect(0, 620, W, 660);
    g.fillStyle(0x0e0820, 0.8); [[90, 600, 70], [250, 590, 50], [470, 600, 80], [650, 590, 55]].forEach(([x, y, w]) => { g.fillTriangle(x - w, y, x + w, y, x, y - w * 0.7); g.fillRect(x - w * 0.6, y, w * 1.2, 30); });
    g.lineStyle(2, 0x9a7aff, 0.15); for (let y = 660; y < 1280; y += 70) g.lineBetween(0, y, W, y);
    for (let k = 0; k < 14; k++) { const m = this.add.image(Phaser.Math.Between(20, 700), Phaser.Math.Between(640, 1260), 'sh_mote').setTint(k % 2 ? 0xd9c8ff : 0xffd98a).setScale(0.35 + Math.random() * 0.4).setAlpha(0.6).setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: m, y: m.y - Phaser.Math.Between(40, 120), x: m.x + Phaser.Math.Between(-40, 40), alpha: 0.1, yoyo: true, repeat: -1, duration: Phaser.Math.Between(2200, 4200), ease: 'Sine.InOut' }); }
  }
  private drawCones() {
    const c = this.cones, w = this.warnG; c.clear(); w.clear(); const t = this.time.now / 1000;
    for (const l of this.lanterns) { const a = Math.atan2(l.vy, l.vx), len = 230, sp = 0.42;
      c.fillStyle(0xffb860, 0.10).slice(l.x, l.y, len, a - sp, a + sp, false).fillPath();
      c.fillStyle(0xffd890, 0.08).slice(l.x, l.y, len * 0.6, a - sp * 0.6, a + sp * 0.6, false).fillPath(); }
    POOLS.forEach(([x, y], i) => { if (this.lit(i)) return;
      const soon = this.lanterns.some(l => { const fx = l.x + l.vx * WARN_T * this.lspd, fy = l.y + l.vy * WARN_T * this.lspd; return Phaser.Math.Distance.Between(fx, fy, x, y) < 110; });
      if (soon) { const pu = 0.5 + 0.5 * Math.sin(t * 14); w.lineStyle(4, 0xffa040, 0.5 + 0.5 * pu); for (let k = 0; k < 12; k++) { const a0 = k / 12 * Math.PI * 2 + t; w.beginPath(); w.arc(x, y, 82, a0, a0 + 0.3); w.strokePath(); }
        w.fillStyle(0xffa040, 0.8).fillTriangle(x - 10, y - 46, x + 10, y - 46, x, y - 30); } });
  }
  /** Puppy used to glide on a bare position tween: rock him foot to foot + a little hop per step while he runs.
   *  The hop shifts the image origin (not y/scale) so the position tween and the squash catch's scale/y are untouched. */
  private wPh = 0; private wLx = 500; private wLy = 900; private oy0 = -1;
  private waddle(dt: number) {
    const p = this.pup; if (this.oy0 < 0) this.oy0 = p.originY;
    const d = Math.hypot(p.x - this.wLx, p.y - this.wLy); this.wLx = p.x; this.wLy = p.y;
    if (this.sq?.phase) { if (p.originY !== this.oy0) p.setOrigin(0.5, this.oy0); return; }
    const hopPx = 12 / Math.max(1, p.height * Math.abs(p.scaleY)); // ~12 px hop in world units
    if (this.pupTw?.isPlaying() && d > 0.5) { this.wPh += d / 30 * Math.PI; p.setAngle(Math.sin(this.wPh) * 7).setOrigin(0.5, this.oy0 + Math.abs(Math.sin(this.wPh)) * hopPx); }
    else if (!this.tweens.getTweensOf(p).some(t => t.isPlaying() && t !== this.pupTw)) { const k = 1 - Math.exp(-dt * 16); p.setAngle(p.angle * (1 - k)).setOrigin(0.5, this.oy0 + (p.originY - this.oy0) * (1 - k)); }
  }
  private footDust(dt: number) {
    const dx = this.pup.x - this.lastPx, dy = this.pup.y - this.lastPy; this.lastPx = this.pup.x; this.lastPy = this.pup.y;
    this.dustT -= dt; if (Math.hypot(dx, dy) < 1.5 || this.dustT > 0) return; this.dustT = 0.09;
    const d = this.add.circle(this.pup.x - Math.sign(dx) * 30 + Phaser.Math.Between(-10, 10), this.pup.y + 4, Phaser.Math.Between(8, 14), 0xcbb8e8, 0.55).setDepth(9);
    this.tweens.add({ targets: d, scale: 2.2, alpha: 0, y: d.y - 18, x: d.x - Math.sign(dx) * 20, duration: 420, onComplete: () => d.destroy() });
  }
  private ring(x: number, y: number, col: number) { const r = this.add.ellipse(x, y, 120, 40).setStrokeStyle(5, col, 0.9).setDepth(19);
    this.tweens.add({ targets: r, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 450, ease: 'Cubic.Out', onComplete: () => r.destroy() }); }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; this.pupTw?.stop(); this.sq?.abort(); (window as any).__pr.ended = win ? 'win' : 'lose';
    popBanner(this, win ? 'TAGGED... YOU\'RE IT!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Linye', 7, win, s.score + Math.round(s.time) * 20, `${s.tags} tags`));
  }
}
