// Glassia BALL BONK: you are Glassia. Puppy runs, dodges and hides behind cones / a goal post / a bench.
// Swipe up to kick, bend the swipe to curve around cover. 8 kicks, 3+ bonks wins. Curved / far / moving hits score more.
import Phaser from 'phaser';
import { GAME_W as W, GAME_H as H, COLORS } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art } from '../art/registry';
import { makeMuteButton, pointerInMute } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, sparks, comic, flashVignette } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { HeroRig, pupFlail } from '../systems/rigs';

// Tuning (see pups3-out/glassia/sim.mjs): 7 kicks, slightly larger hit radius, Puppy freezes more often on '!!',
// dodges less, and cover only blocks its middle so a bent kick can sneak round the edge. ~60% wins for a decent player.
const KICKS = 7, NEED = 3, HIT_R = 70, DODGE_P = 0.4, FREEZE_P = 0.6, COVER_CORE = 0.3; const BALL0 = { x: 400, y: 1080 };
interface Cover { x: number; y: number; w: number; h: number; name: string }
const COVERS: Cover[] = [
  { x: 170, y: 560, w: 70, h: 80, name: 'cone' }, { x: 560, y: 470, w: 70, h: 80, name: 'cone' },
  { x: 210, y: 780, w: 190, h: 60, name: 'bench' }, { x: 610, y: 720, w: 40, h: 170, name: 'post' },
];
const SPOTS = [[120, 470], [360, 440], [500, 600], [300, 620], [440, 700], [380, 520], [250, 470], [560, 560]];

export class FootballScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Container; private pup!: Phaser.GameObjects.Container; private pupImg!: Phaser.GameObjects.Image; private gla!: HeroRig;
  private trail!: Phaser.GameObjects.Graphics; private marks!: Phaser.GameObjects.Text[]; private kickT!: Phaser.GameObjects.Text; private crowd: Phaser.GameObjects.Image[] = [];
  st = { kick: 0, hits: 0, results: [] as boolean[], ready: false, score: 0, over: false, flying: false };
  private path: { x: number; y: number }[] = []; private moveTw?: Phaser.Tweens.Tween; private dodgedThis = false;
  private coverG: Phaser.GameObjects.Graphics[] = []; private net!: Phaser.GameObjects.Graphics; private netAmp = 0; private netX = 0; private ballSh!: Phaser.GameObjects.Ellipse; private dizzy?: Phaser.GameObjects.Container;
  constructor() { super('Football'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250);
    this.st = { kick: 0, hits: 0, results: [], ready: false, score: 0, over: false, flying: false }; this.crowd = []; this.tweens.timeScale = 1; this.coverG = []; this.netAmp = 0; this.dizzy = undefined;
    art(this, 0, 0, 'bg_pitch');
    ['Ruby', 'Zoe', 'Nana', 'Iris', 'Noir'].forEach((n, i) => this.crowd.push(art(this, 80 + i * 140, 262, `head_${n}_happy`, 0.38)));
    art(this, 650, 150, 'bun_bust_smile', 0.5);
    // Puppy (drawn before covers so he can hide behind them)
    this.pup = this.add.container(SPOTS[1][0], SPOTS[1][1]).setDepth(10);
    this.pupImg = art(this, 0, 0, 'pup_idle', 0.75); this.pup.add([this.add.image(0, 4, 'su_shadow').setScale(0.7, 0.5), this.pupImg]);
    this.drawCovers();
    this.gla = new HeroRig(this, 'Glassia', 250, 1230, 1.3, { number: '7', tail: true }).setDepth(40);
    this.ballSh = this.add.ellipse(BALL0.x, BALL0.y + 30, 60, 18, 0x0b3a14, 0.35).setDepth(44);
    this.ball = this.add.container(BALL0.x, BALL0.y).setDepth(45);
    const bg = this.add.graphics(); bg.fillStyle(0xffffff, 1).lineStyle(5, COLORS.INK, 1).fillCircle(0, 0, 32).strokeCircle(0, 0, 32);
    bg.fillStyle(COLORS.INK, 1).fillCircle(0, 0, 10); [0, 1, 2, 3, 4].forEach(i => { const a = i * 1.256; bg.fillCircle(Math.cos(a) * 24, Math.sin(a) * 24, 6); });
    this.ball.add(bg);
    this.trail = this.add.graphics().setDepth(50);
    this.kickT = txt(this, 290, 60, '', 32, '#fff', '#22252b', 7).setDepth(60);
    this.marks = Array.from({ length: KICKS }, (_, i) => txt(this, W / 2 - (KICKS - 1) * 35 + i * 70, 120, '·', 40, '#fff', '#22252b', 5).setDepth(60));
    makeMuteButton(this); makePauseButton(this, () => !this.st.over); setPageBg(0x4fb3ff, 0x2f8f3a);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.path = [w]; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (!p.isDown || !this.path.length) return; this.path.push(worldPoint(this, p)); this.drawTrail(); });
    this.input.on('pointerup', () => { if (this.path.length) this.shoot(); });
    (window as any).__pr = { scene: 'Football', st: this.st, force: (win: boolean) => this.finish(win), pup: () => ({ x: this.pup.x, y: this.pup.y }) };
    this.updateHud(); this.roam();
    tutorialCard(this, 'glassia3', 'BALL BONK!', ['You are GLASSIA! 🐴', 'SWIPE toward Puppy to kick the ball', 'Hiding behind cover? Only a CURVED kick (bend your swipe) gets round it!', `${KICKS} kicks — BONK him ${NEED} times!`], () => this.begin());
  }
  private drawCovers() {
    for (const c of COVERS) {
      // each cover is its own Graphics anchored at its base so it can wobble when the ball smacks it
      const by = c.y + c.h / 2, g = this.add.graphics({ x: c.x, y: by }).setDepth(20); this.coverG.push(g);
      g.fillStyle(0x0b3a14, 0.3).fillEllipse(0, 4, c.w * 1.4, 18);
      if (c.name === 'cone') { const top = -c.h - 10, hw = c.w / 2;
        g.fillStyle(0xff8a1f, 1).lineStyle(5, COLORS.INK, 1).fillTriangle(0, top, -hw, 0, hw, 0).strokeTriangle(0, top, -hw, 0, hw, 0);
        g.fillStyle(0xffffff, 1).fillRect(-c.w * 0.3, -c.h / 2 + 2, c.w * 0.6, 12); g.fillStyle(0xffffff, 0.35).fillTriangle(-4, top + 14, -hw * 0.55, -6, -hw * 0.3, -6);
        g.fillStyle(0xd0601a, 1).lineStyle(4, COLORS.INK, 1).fillRoundedRect(-hw - 8, -8, c.w + 16, 12, 4).strokeRoundedRect(-hw - 8, -8, c.w + 16, 12, 4); }
      if (c.name === 'bench') { g.fillStyle(0x7a4520, 1).lineStyle(4, COLORS.INK, 1).fillRect(-c.w / 2 + 12, -c.h / 2, 14, c.h / 2).fillRect(c.w / 2 - 26, -c.h / 2, 14, c.h / 2).strokeRect(-c.w / 2 + 12, -c.h / 2, 14, c.h / 2).strokeRect(c.w / 2 - 26, -c.h / 2, 14, c.h / 2);
        g.fillStyle(0xa85f36, 1).lineStyle(5, COLORS.INK, 1).fillRoundedRect(-c.w / 2, -c.h, c.w, c.h * 0.55, 8).strokeRoundedRect(-c.w / 2, -c.h, c.w, c.h * 0.55, 8);
        g.lineStyle(3, 0x7a4520, 0.8).lineBetween(-c.w / 2 + 8, -c.h + 12, c.w / 2 - 8, -c.h + 12); g.fillStyle(0xffffff, 0.25).fillRoundedRect(-c.w / 2 + 6, -c.h + 4, c.w - 12, 5, 2); }
      if (c.name === 'post') { g.fillStyle(0xffffff, 1).lineStyle(5, COLORS.INK, 1).fillRect(-c.w / 2, -c.h, c.w, c.h).strokeRect(-c.w / 2, -c.h, c.w, c.h);
        g.fillStyle(0xdfe6f2, 1).fillRect(c.w / 6, -c.h + 4, c.w / 4, c.h - 8); this.netX = c.x; }
    }
    this.net = this.add.graphics().setDepth(19); this.drawNet(0);
  }
  /** Goal net to the right of the post; ripples (damped sine wave) when the ball hits or passes through it. */
  private drawNet(now: number) {
    const c = COVERS[3], g = this.net, x0 = c.x + c.w / 2, top = c.y - c.h / 2, bot = c.y + c.h / 2, A = this.netAmp; g.clear();
    g.lineStyle(3, 0xffffff, 0.7);
    for (let i = 0; i <= 5; i++) { const y = top + (bot - top) * i / 5; g.beginPath(); g.moveTo(x0, y);
      for (let k = 1; k <= 8; k++) { const xx = x0 + k * 10; g.lineTo(xx, y + Math.sin(now / 45 + k * 0.9 + i) * A * Math.sin(k / 8 * Math.PI)); } g.strokePath(); }
    for (let k = 1; k <= 8; k++) { const xx = x0 + k * 10, sw = Math.sin(now / 45 + k * 0.9) * A * Math.sin(k / 8 * Math.PI); g.lineBetween(xx + sw * 0.4, top + sw, xx - sw * 0.4, bot + sw); }
  }
  update(_t: number, dms: number) {
    if (this.netAmp > 0.05) { this.netAmp *= Math.pow(0.04, dms / 1000); this.drawNet(this.time.now); } else if (this.netAmp) { this.netAmp = 0; this.drawNet(0); }
    if (this.dizzy?.active) this.dizzy.list.forEach((o, i) => { const a = this.time.now / 200 + i * 2.09; (o as Phaser.GameObjects.Text).setPosition(Math.cos(a) * 60, Math.sin(a) * 16); });
  }
  private rippleNet(power = 1) { this.netAmp = Math.max(this.netAmp, 14 * power); }
  private wobble(i: number) { const g = this.coverG[i]; if (!g) return; this.tweens.killTweensOf(g); g.setAngle(0).setScale(1);
    this.tweens.add({ targets: g, angle: { from: 9, to: 0 }, duration: 600, ease: 'Elastic.Out', easeParams: [1.4, 0.3] });
    this.tweens.add({ targets: g, scaleY: { from: 0.85, to: 1 }, scaleX: { from: 1.12, to: 1 }, duration: 380, ease: 'Back.Out' }); }
  /** Puppy trots between spots; sometimes ducks behind cover, sometimes gets distracted. */
  private roamId = 0;
  private roam() {
    if (this.st.over) return; const id = ++this.roamId;
    const hide = Math.random() < 0.5;
    let tx: number, ty: number;
    if (hide) { const c = Phaser.Utils.Array.GetRandom(COVERS); tx = c.x + Phaser.Math.Between(-10, 10); ty = c.y - 10; }
    else { const s = Phaser.Utils.Array.GetRandom(SPOTS); tx = s[0]; ty = s[1]; }
    const speed = 0.9 + this.st.hits * 0.15;
    const dur = Phaser.Math.Distance.Between(this.pup.x, this.pup.y, tx, ty) / (260 * speed) * 1000;
    this.pupImg.setFlipX(tx > this.pup.x).setTexture('pup_idle');
    this.moveTw = this.tweens.add({ targets: this.pup, x: tx, y: ty, duration: Math.max(300, dur), ease: 'Sine.InOut', onComplete: () => {
      const pause = hide ? Phaser.Math.Between(900, 1700) : Phaser.Math.Between(300, 900);
      if (!hide && Math.random() < 0.2) { this.pupImg.setTexture('pup_hearts'); if (!this.st.flying && this.st.ready) say(this, this.pup.x, this.pup.y - 170, pick(LINES.puppyGag), 20, 1200); }
      this.time.delayedCall(pause, () => id === this.roamId && this.roam());
    } });
    const base = this.pupImg.getData('b') ?? this.pupImg.scaleX; this.pupImg.setData('b', base);
    this.tweens.add({ targets: this.pupImg, y: -14, scaleY: base * 1.06, scaleX: base * 0.95, duration: 120, yoyo: true, ease: 'Sine.Out', repeat: Math.floor(dur / 240),
      onRepeat: () => this.pupImg.setScale(base * 1.08, base * 0.9) });
  }
  private begin() {
    popBanner(this, 'BONK THE PUPPY!', 800, 0x3a86ff);
    this.time.delayedCall(700, () => { say(this, 470, 960, pick(LINES.start.Glassia), 24); this.st.ready = true; });
  }
  private drawTrail() {
    this.trail.clear().lineStyle(12, 0xffdf6b, 0.8); const p = this.path;
    for (let i = 1; i < p.length; i++) this.trail.lineBetween(p[i - 1].x, p[i - 1].y, p[i].x, p[i].y);
  }
  private updateHud() {
    const s = this.st; this.kickT.setText(`KICK ${Math.min(s.kick + 1, KICKS)}/${KICKS}   BONKS ${s.hits}/${NEED}`);
    this.marks.forEach((m, i) => { const r = s.results[i]; m.setText(r === undefined ? '·' : r ? '★' : '✖').setColor(r === false ? '#ff3b6b' : r ? '#ffdf6b' : '#fff'); });
  }
  shoot() {
    const p = this.path; this.path = []; this.time.delayedCall(150, () => this.trail.clear());
    const s = this.st; if (!s.ready) return;
    if (p.length < 2) { floatText(this, W / 2, 900, 'Swipe UP!', '#fff', 40); (window as any).__pr.hint = 1; return; }
    const a = p[0], b = p[p.length - 1], dx = b.x - a.x, dy = b.y - a.y;
    if (dy > -60) { floatText(this, W / 2, 900, 'Swipe UP!', '#fff', 40); (window as any).__pr.hint = 1; return; }
    s.ready = false;
    // direction from swipe; range from swipe length; curve from how the middle bowed
    const len = Math.hypot(dx, dy), range = 1050;
    const ux = dx / len, uy = dy / len;
    const end = { x: BALL0.x + ux * range, y: BALL0.y + uy * range };
    const mid = p[Math.floor(p.length / 2)];
    const curve = Phaser.Math.Clamp(mid.x - (a.x + b.x) / 2, -130, 130);
    this.kick(end, curve);
  }
  private kick(end: { x: number; y: number }, curve: number) {
    const s = this.st;
    this.gla.setMood('smug');
    // anticipation: crouch back, kicking leg cocks behind, arms counter-balance; then the leg whips through the ball
    this.tweens.chain({ targets: this.gla.root, tweens: [
      { x: 225, y: 1245, duration: 90, ease: 'Quad.Out' },
      { x: 330, y: 1150, duration: 70, ease: 'Quad.In', onComplete: () => this.contact() },
      { x: 250, y: 1230, duration: 260, ease: 'Back.Out' }] });
    this.gla.act([
      { dur: 0.09, to: { rh: -70, rk: 60, lh: 8, lk: -14, ls: 70, le: 40, rs: -60, re: -30, lean: -10, sq: -0.07, dy: 6, tilt: -6 }, ease: Phaser.Math.Easing.Quadratic.Out },
      { dur: 0.07, to: { rh: 115, rk: -6, lh: -6, lk: 0, ls: -55, le: -30, rs: 80, re: 20, lean: 12, sq: 0.06, dy: -4, tilt: 8 }, ease: Phaser.Math.Easing.Cubic.In },
      { dur: 0.16, to: { rh: 135, rk: 10, ls: -40, rs: 60, lean: 8 }, ease: Phaser.Math.Easing.Quadratic.Out },
    ], false, 0.3);
    this.time.delayedCall(160, () => {
      s.flying = true; this.dodgedThis = false; Fx.whoosh();
      if (Math.random() < FREEZE_P) { this.moveTw?.pause(); this.roamId++; this.pupImg.setTexture('pup_panic'); txt(this, this.pup.x, this.pup.y - 170, '!!', 50, '#ffdf6b', '#22252b', 7).setDepth(60).setData('t', 1); }
      const bez = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(BALL0.x, BALL0.y),
        new Phaser.Math.Vector2((BALL0.x + end.x) / 2 + curve * 3.2, (BALL0.y + end.y) / 2), new Phaser.Math.Vector2(end.x, end.y));
      const o = { t: 0 }; let done = false; let lastT = 0; const bent = Math.abs(curve) > 50; let netHit = false;
      const tw = this.tweens.add({ targets: o, t: 1, duration: 620, onUpdate: () => {
        if (done) return;
        const t1 = o.t; let v = bez.getPoint(t1);
        for (let k = 1; k <= 8; k++) { const tt = lastT + (t1 - lastT) * k / 8; const q = bez.getPoint(tt);
          if (Phaser.Math.Distance.Between(q.x, q.y, this.pup.x, this.pup.y - 70) < HIT_R) { v = q; break; } }
        lastT = t1;
        if (bent) this.ghost(v, o.t, curve); else if (Math.random() < 0.7) { const tr = this.add.circle(v.x, v.y, 26 * (1 - o.t * 0.35), 0xffffff, 0.45).setDepth(44); this.tweens.add({ targets: tr, alpha: 0, scale: 0.4, duration: 260, onComplete: () => tr.destroy() }); }
        // lofted ball: rises off its ground shadow mid-flight; stretched slightly along travel
        const sc = 1 - o.t * 0.35, arc = Math.sin(o.t * Math.PI) * 60 * sc;
        this.ballSh.setPosition(v.x, v.y + 30 * sc).setScale(sc * (1 - arc / 160)).setAlpha(0.35);
        this.ball.setPosition(v.x, v.y - arc * 0.25).setScale(sc * 0.94, sc * 1.06).setAngle(o.t * 900 * Math.sign(curve || 1));
        const nc = COVERS[3]; if (!netHit && v.x > nc.x + nc.w / 2 && v.x < nc.x + nc.w / 2 + 90 && Math.abs(v.y - nc.y) < nc.h / 2) { netHit = true; this.rippleNet(1); Fx.boing(); }
        // cover blocks
        for (const c of COVERS) if (Phaser.Math.Distance.Between(c.x, c.y, this.pup.x, this.pup.y) < 90 && Math.abs(v.x - c.x) < c.w * COVER_CORE && Math.abs(v.y - c.y) < c.h / 2 + 6 && o.t > 0.15) { done = true; tw.stop(); return this.blocked(c); }
        // Puppy proximity: maybe he dodges at the last moment
        const d = Phaser.Math.Distance.Between(v.x, v.y, this.pup.x, this.pup.y - 70);
        if (!this.dodgedThis && d < 230 && d > 140) { this.dodgedThis = true; if (Math.random() < DODGE_P) this.dodgeHop(); }
        if (d < HIT_R) { done = true; tw.stop(); return this.bonk(v, Math.abs(curve) > 50, v.y < this.pup.y - 95); }
      }, onComplete: () => { if (!done) this.resolve(false, 'miss'); } });
    });
  }
  /** Foot meets ball: ball squashes flat, dust puff, tiny shake. */
  private contact() {
    Fx.kick(); this.ball.setScale(1.35, 0.7); this.cameras.main.shake(90, 0.006);
    const p = this.add.circle(BALL0.x, BALL0.y + 26, 18, 0xffffff, 0.7).setDepth(43); this.tweens.add({ targets: p, scale: 3, alpha: 0, duration: 260, onComplete: () => p.destroy() });
    const r = this.add.graphics({ x: BALL0.x, y: BALL0.y }).setDepth(46); r.lineStyle(6, 0xffdf6b, 1).strokeCircle(0, 0, 36); this.tweens.add({ targets: r, scale: 1.8, alpha: 0, duration: 200, onComplete: () => r.destroy() });
  }
  /** Ghost trail for curved kicks: fading tinted ball copies + a rainbow-ish ribbon so the bend reads clearly. */
  private lastGhost = { x: 0, y: 0 };
  private ghost(v: { x: number; y: number }, t: number, curve: number) {
    const col = curve > 0 ? 0x7fd8ff : 0xff9ae0, sc = 1 - t * 0.35;
    if (this.lastGhost.x) { const rb = this.add.graphics().setDepth(43); rb.lineStyle(22 * sc, col, 0.35).lineBetween(this.lastGhost.x, this.lastGhost.y, v.x, v.y);
      this.tweens.add({ targets: rb, alpha: 0, duration: 420, onComplete: () => rb.destroy() }); }
    this.lastGhost = { x: v.x, y: v.y };
    if (Math.random() < 0.45) { const g = this.add.graphics({ x: v.x, y: v.y }).setDepth(44).setScale(sc);
      g.fillStyle(0xffffff, 0.55).lineStyle(4, col, 0.9).fillCircle(0, 0, 32).strokeCircle(0, 0, 32); g.fillStyle(col, 0.6).fillCircle(0, 0, 10);
      this.tweens.add({ targets: g, alpha: 0, scale: sc * 0.6, duration: 380, onComplete: () => g.destroy() }); }
  }
  private dodgeHop() {
    this.moveTw?.stop(); const dir = Math.random() < 0.5 ? -1 : 1;
    this.pupImg.setTexture('pup_panic'); Fx.boing();
    this.tweens.add({ targets: this.pup, x: Phaser.Math.Clamp(this.pup.x + dir * 160, 80, 640), duration: 220, ease: 'Quad.Out' });
    const b = this.pupImg.getData('b') ?? this.pupImg.scaleX; this.tweens.killTweensOf(this.pupImg);
    this.pupImg.setScale(b * 1.15, b * 0.85); // crouch
    this.tweens.add({ targets: this.pupImg, y: -90, angle: dir * 360, scaleX: b * 0.88, scaleY: b * 1.15, duration: 300, ease: 'Quad.Out',
      onComplete: () => { this.pupImg.setY(0).setAngle(0).setScale(b * 1.2, b * 0.8); this.tweens.add({ targets: this.pupImg, scaleX: b, scaleY: b, duration: 260, ease: 'Elastic.Out', easeParams: [1.2, 0.4] }); } });
    floatText(this, this.pup.x, this.pup.y - 190, 'NOPE!', '#ffffff', 28);
    const id = ++this.roamId; this.time.delayedCall(700, () => id === this.roamId && this.roam());
  }
  private bonk(v: { x: number; y: number }, bent: boolean, head: boolean) {
    const s = this.st; this.moveTw?.stop(); this.tweens.killTweensOf(this.pupImg);
    const far = Phaser.Math.Distance.Between(BALL0.x, BALL0.y, this.pup.x, this.pup.y) > 600;
    const pts = 500 + (bent ? 300 : 0) + (head ? 200 : 0) + (far ? 200 : 0); s.score += pts;
    Fx.punch(); Fx.boing(); this.cameras.main.shake(300, 0.02); this.cameras.main.flash(100, 255, 255, 255);
    // impact burst
    const burst = this.add.graphics({ x: v.x, y: v.y }).setDepth(70); burst.fillStyle(0xffffff, 1);
    const ptsA: Phaser.Math.Vector2[] = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? 50 : 120; const a = i / 16 * Math.PI * 2; ptsA.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
    burst.fillPoints(ptsA, true).fillStyle(0xffdf6b, 1).fillCircle(0, 0, 40); burst.setScale(0.3);
    this.tweens.add({ targets: burst, scale: 1.3, alpha: 0, duration: 300, onComplete: () => burst.destroy() });
    sparks(this, v.x, v.y, 30, true); flashVignette(this, 0xffffff, 0.6);
    const w = comic(this, v.x, v.y - 120, head ? 'BONK!!' : pick(['POW!', 'BOINK!', 'THWACK!']), 84).setDepth(75).setScale(0.2).setAngle(Phaser.Math.Between(-12, 12));
    this.tweens.add({ targets: w, scale: 1, duration: 150, ease: 'Back.Out' }); this.tweens.add({ targets: w, alpha: 0, delay: 700, duration: 300, onComplete: () => w.destroy() });
    floatText(this, v.x + 100, v.y, `+${pts}`, '#7dff9a', 46);
    const tags = [bent && 'CURVE!', head && 'NOGGIN!', far && 'LONG SHOT!'].filter(Boolean).join(' ');
    if (tags) floatText(this, v.x, v.y + 80, tags, '#ffffff', 30);
    for (let i = 0; i < 8; i++) { const st = txt(this, this.pup.x, this.pup.y - 100, '★', 40, '#ffdf6b', '#22252b', 4).setDepth(74); const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 100;
      this.tweens.add({ targets: st, x: st.x + Math.cos(a) * d, y: st.y + Math.sin(a) * d, angle: 360, alpha: 0, duration: 650, onComplete: () => st.destroy() }); }
    // hit-stop: freeze tweens a few frames so the smack lands
    this.tweens.timeScale = 0.05; this.time.delayedCall(90, () => { this.tweens.timeScale = 1; });
    // Puppy: pancake squash on contact, knocked back, spins up, flops with a bounce, then little orbiting stars
    const pb = this.pupImg.getData('b') ?? this.pupImg.scaleX; this.pupImg.setScale(pb * 1.35, pb * 0.65);
    this.tweens.add({ targets: this.pup, x: Phaser.Math.Clamp(this.pup.x + (this.pup.x - v.x) * 1.2 + Phaser.Math.Between(-20, 20), 80, 640), y: this.pup.y - 30, duration: 420, ease: 'Quad.Out' });
    this.tweens.add({ targets: this.pupImg, scaleX: pb, scaleY: pb, duration: 420, ease: 'Elastic.Out', easeParams: [1.3, 0.35] });
    this.dizzy?.destroy(); this.dizzy = this.add.container(0, -190); this.pup.add(this.dizzy);
    for (let i = 0; i < 3; i++) this.dizzy.add(txt(this, 0, 0, '★', 34, '#ffdf6b', '#22252b', 5));
    this.time.delayedCall(1400, () => this.dizzy?.destroy());
    const ring = this.add.graphics({ x: v.x, y: v.y }).setDepth(69); ring.lineStyle(10, 0xffffff, 0.9).strokeCircle(0, 0, 50);
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 320, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    this.pupImg.setTexture('pup_dizzy');
    this.tweens.add({ targets: this.pupImg, angle: 720, y: -90, duration: 500, ease: 'Quad.Out', onComplete: () => this.tweens.add({ targets: this.pupImg, y: 0, angle: 810, duration: 300, ease: 'Bounce.Out' }) });
    this.ballSh.setAlpha(0); this.ball.setScale(0.9, 0.55);
    this.tweens.add({ targets: this.ball, x: v.x + Phaser.Math.Between(-250, 250), y: v.y - 200, scaleX: 0.4, scaleY: 0.4, alpha: 0, angle: this.ball.angle + 720, duration: 600, ease: 'Quad.Out' });
    say(this, W / 2, 300, pick(LINES.bonk), 24, 1500);
    this.crowd.forEach((c, i) => this.tweens.add({ targets: c, y: 220, yoyo: true, duration: 150, delay: i * 40, repeat: 1 }));
    this.gla.setMood('happy').act([{ dur: 0.18, to: { ls: -160, le: -20, rs: 160, re: 20, lh: -10, rh: 10, dy: -14, sq: 0.06 }, ease: Phaser.Math.Easing.Back.Out },
      { dur: 0.12, to: { ls: -140, rs: 140, dy: -2 } }, { dur: 0.12, to: { ls: -165, rs: 165, dy: -12 } }], false, 0.3);
    pupFlail(this, this.pupImg, 900);
    this.resolve(true, 'hit');
  }
  private blocked(c: Cover) {
    Fx.block(); Fx.boing(); floatText(this, c.x, c.y - 120, `the ${c.name} saved him!`, '#ffffff', 26);
    this.wobble(COVERS.indexOf(c)); if (c.name === 'post') this.rippleNet(1.3);
    this.cameras.main.shake(140, 0.01); sparks(this, this.ball.x, this.ball.y, 10);
    // rubber-stamp "BLOCKED!" slams down over the cover
    const sx = Phaser.Math.Clamp(c.x, 170, W - 170), stamp = this.add.container(sx, c.y - 40).setDepth(76).setAngle(-12).setScale(2.4).setAlpha(0);
    const sg = this.add.graphics(); sg.fillStyle(0xffffff, 0.85).lineStyle(8, 0xe0243a, 1).fillRoundedRect(-150, -48, 300, 96, 14).strokeRoundedRect(-150, -48, 300, 96, 14);
    sg.lineStyle(3, 0xe0243a, 1).strokeRoundedRect(-140, -38, 280, 76, 10);
    stamp.add([sg, txt(this, 0, 2, 'BLOCKED!', 56, '#e0243a', '#ffffff', 4)]);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 140, ease: 'Quad.In', onComplete: () => this.cameras.main.shake(80, 0.008) });
    this.tweens.add({ targets: stamp, alpha: 0, delay: 1000, duration: 300, onComplete: () => stamp.destroy() });
    // ball pings off the cover with a squash and a bounce
    this.ball.setScale(0.6, 1); this.ballSh.setAlpha(0);
    this.tweens.add({ targets: this.ball, x: this.ball.x + Phaser.Math.Between(-160, 160), y: this.ball.y + 140, scaleX: 0.7, scaleY: 0.7, alpha: 0, angle: this.ball.angle - 540, duration: 550, ease: 'Bounce.Out' });
    say(this, W / 2, 300, pick(LINES.blocked), 24, 1500); this.resolve(false, 'blocked');
  }
  private resolve(hit: boolean, kind: string) {
    const s = this.st; (window as any).__pr.last = kind; s.flying = false;
    s.results[s.kick] = hit; s.kick++; if (hit) s.hits++;
    this.lastGhost = { x: 0, y: 0 };
    if (kind === 'miss') { Fx.save(); this.ballSh.setAlpha(0); say(this, W / 2, 300, pick(this.dodgedThis ? LINES.dodged : LINES.miss), 24, 1500); this.tweens.add({ targets: this.ball, alpha: 0, duration: 300 }); }
    if (!hit && NEED - s.hits === KICKS - s.kick && s.kick < KICKS) this.time.delayedCall(800, () => popBanner(this, 'Bunny is watching... no misses now!', 800, 0xe0243a, 900));
    this.updateHud();
    this.time.delayedCall(1500, () => this.next());
  }
  private next() {
    const s = this.st; if (s.over) return;
    if (s.hits >= NEED) return this.finish(true);
    if (s.hits + (KICKS - s.kick) < NEED) return this.finish(false);
    this.ball.setPosition(BALL0.x, BALL0.y).setScale(1).setAlpha(1).setAngle(0); this.ballSh.setPosition(BALL0.x, BALL0.y + 30).setScale(1).setAlpha(0.35);
    this.ball.setScale(0.6); this.tweens.add({ targets: this.ball, scale: 1, duration: 300, ease: 'Back.Out' });
    this.gla.setMood('smug').setPosition(250, 1230);
    this.pupImg.setAngle(0).setY(0); this.pupImg.setScale(this.pupImg.getData('b') ?? this.pupImg.scaleX); this.dizzy?.destroy();
    this.children.list.filter(o => o.getData && o.getData('t')).forEach(o => o.destroy());
    this.moveTw?.stop(); this.roam();
    this.updateHud(); s.ready = true;
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.ready = false; this.moveTw?.stop();
    (window as any).__pr.ended = win ? 'win' : 'lose';
    if (win) { this.pupImg.setTexture('pup_dizzy'); this.tweens.add({ targets: this.pupImg, angle: 90, duration: 500, ease: 'Bounce.Out' }); }
    else { this.pupImg.setTexture('pup_hearts'); }
    this.time.delayedCall(900, () => endCard(this, 'Glassia', 1, win, s.score, `${s.hits} bonk${s.hits === 1 ? '' : 's'} on Puppy`));
  }
}
