// Iris TRASH DROP: Iris scoots along the rooftop ledge. TAP to drop junk; it lands on the shadow below her.
// Puppy walks, sprints, stops to sniff and pops an umbrella. Banana peels stay on the ground: walk into one = slip!
// Go-big pass: moody alley (street-lamp glow, flickering neon, swaying laundry line, manhole steam, brick parapet),
// a drop-shadow TARGET RING that shrinks as each item falls, spinning items with motion streaks, dust puffs + bounce on
// misses, wobbling banana peels, squash/stars on hits, umbrella BOING + POP.
// Depth: item variety (🐟 SPLAT dazes Puppy longer, 📦 big box = wider hit but slower fall), umbrella pops after 2 blocks,
// CHAIN multiplier for bonks without a miss, phase 2 (2 bonks) Puppy sprints more, phase 3 (4 bonks) he sometimes
// sidesteps a falling item. Now: TIME 55, NEED 7, FALL 420, HIT 75, a miss costs 4 s (MISS_T, audit27: was 6) + a 1.5 s reload.
// (Earlier sim history in pups3-out/iris/sim.mjs: NEED went 6 -> 11 -> 7.)
import Phaser from 'phaser';
import { GAME_W as W } from '../config';
import { setupCamera, worldPoint } from '../systems/resolution';
import { art, ensureArt } from '../art/registry';
import { pointerInMute, makeMuteButton } from '../systems/ui';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { popBanner, say, floatText, tutorialCard, makePauseButton, pointerInPause, setPageBg, sparks } from '../systems/kit';
import { endCard } from '../systems/endcard';
import { LINES, pick } from '../lines';
import { Hud, impact } from '../systems/level';
import { HeroRig, pupFlail } from '../systems/rigs';
import { TrashGfx, IRIS_M } from '../systems/trashGfx';
import { TrashPup, TRASH_PUP_KEYS, KO } from '../systems/trashPups'; // Puppy look: Tail Catch rig + varied knockouts (visual only)

const MISS_LOCK = 1.5, MISS_T = 4;
const TIME = 55, NEED = 7, GROUND = 1080, LEDGE = 330, FALL = 420, HIT = 75;
const PERF = 22, BOX_FALL = 600, BOX_HIT = 100, FISH_DAZE = 1.4, DODGE_P = 0.3, UMB_POP = 2, PEEL_T = 6;
const ITEMS = ['🥫', '🍌', '👟', '🐟', '📦'];
// Bunny-photo daydream (Marc 2026-10-27): a framed photo of Bunny flutters down, Puppy stops dead and dreams; bonk him then = DREAM BONK.
const PHOTO_FIRST: [number, number] = [6, 9], PHOTO_GAP: [number, number] = [13, 17], PHOTO_MAX = 3, DREAM_T = 2.8, DREAM_BONUS = 500;

export class TrashScene extends Phaser.Scene {
  st = { time: TIME, bonks: 0, misses: 0, score: 0, running: false, over: false, ix: 360, idir: 1, px: 120, pv: 120, mode: 'walk', modeT: 2, cool: 0, umbrella: false, phase: 1, chain: 0, umbHits: 0, el: 0, photoAt: 7, photos: 0, dreamBonks: 0, pockets: 0, ko: 0 };
  private iris!: HeroRig; private held!: Phaser.GameObjects.Text; private shadow!: Phaser.GameObjects.Graphics; private pup!: Phaser.GameObjects.Container; private pupImg!: Phaser.GameObjects.Image; private umb!: Phaser.GameObjects.Image;
  private queue: string[] = []; private nextT!: Phaser.GameObjects.Text; private peels: { x: number; o: Phaser.GameObjects.Text; t: number }[] = []; private hud!: Hud;
  private falling: { x: number; item: string; o: Phaser.GameObjects.Text; ring: Phaser.GameObjects.Graphics; hit: number; dur: number; t0: number; dodged: boolean }[] = [];
  private gfx!: TrashGfx; private irisBase = 1; private pupBase = 1; private dazeStars!: Phaser.GameObjects.Text;
  private skin: TrashPup | null = null; private photo: Phaser.GameObjects.Container | null = null;
  constructor() { super('Trash'); }
  create() {
    setupCamera(this); this.cameras.main.fadeIn(250); setPageBg(0x2a2440, 0x3a3650);
    this.st = { time: TIME, bonks: 0, misses: 0, score: 0, running: false, over: false, ix: 360, idir: 1, px: 120, pv: 120, mode: 'walk', modeT: 2, cool: 0, umbrella: false, phase: 1, chain: 0, umbHits: 0, el: 0, photoAt: 7, photos: 0, dreamBonks: 0, pockets: 0, ko: 0 };
    this.queue = Array.from({ length: 3 }, () => Phaser.Utils.Array.GetRandom(ITEMS)); this.peels = []; this.falling = [];
    // Comic Rooftop Heist look (visual only: bins, searchlights, drawn junk, Iris's tail + acting, BONK bursts, BINNED gag live in TrashGfx)
    art(this, 0, 0, 'bg_heist'); this.gfx = new TrashGfx(this, GROUND);
    // ground target marker under Iris + falling-item rings
    this.shadow = this.add.graphics().setDepth(5);
    this.pup = this.add.container(this.st.px, GROUND).setDepth(10); this.pupImg = art(this, 0, 0, 'pup_idle', 0.78); this.pupBase = this.pupImg.scaleX; this.umb = art(this, 0, -130, 'umbrella', 0.9).setVisible(false);
    this.dazeStars = txt(this, 0, -200, '', 34, '#ffdf6b', '#22252b', 5);
    this.pup.add([this.add.image(0, 4, 'su_shadow').setScale(0.7, 0.5), this.pupImg, this.umb, this.dazeStars]);
    this.iris = new HeroRig(this, 'Iris', 360, LEDGE + 4, IRIS_M, { tail: false }).setDepth(20); this.irisBase = IRIS_M; this.gfx.attachIris(this.iris);
    this.held = txt(this, 360, LEDGE + 10, this.queue[0], 56).setDepth(21);
    this.nextT = txt(this, 90, 420, '', 30, '#fff', '#22252b', 5).setDepth(600);
    this.hud = new Hud(this, 'TRASH-CAN DROP', 0x9a55ff, 1150); // HUD at the bottom: Iris walks the rooftop up top
    makeMuteButton(this); makePauseButton(this, () => this.st.running);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { const w = worldPoint(this, p); if (pointerInMute(w.x, w.y) || pointerInPause(w.x, w.y)) return; this.drop(); });
    (window as any).__pr = { scene: 'Trash', st: this.st, force: (win: boolean) => this.finish(win) };
    this.skin = null; this.photo = null; this.st.photoAt = Phaser.Math.FloatBetween(...PHOTO_FIRST);
    Object.assign((window as any).__pr, { skin: () => this.skin ? { mode: this.skin.mode, ko: this.skin.ko } : null, photo: () => this.photo ? { x: this.photo.x, y: this.photo.y } : null, pup: () => ({ x: this.st.px, y: GROUND }) });
    const go = () => { if (this.skin || !this.pup?.scene) return; const sk = this.skin = new TrashPup(this, 1); this.gfx.attachPup(sk, this.umb); this.pupImg.setVisible(false); (this.pup.list[0] as Phaser.GameObjects.Image).setVisible(false); this.pup.addAt(sk.root, 1); };
    if (TRASH_PUP_KEYS.every(k => this.textures.exists(k))) go(); else ensureArt(this, TRASH_PUP_KEYS).then(() => { if (this.sys.isActive() || this.sys.isPaused()) go(); });
    this.updNext();
    tutorialCard(this, 'iris1', 'TRASH-CAN DROP!', ['You are IRIS! 🦝 TAP to drop junk', 'It lands in the RING below you — lead Puppy!', `A miss = -${MISS_T}s + a reload. AIM, don't spam!`, 'Umbrella blocks (twice pops it!) • peels stay 🍌', `🐟 dazes longer • 📦 big but slow • ${NEED} bonks in ${TIME}s!`], () => this.begin());
  }
  private begin() { popBanner(this, 'SPECIAL DELIVERY!', 700, 0x8a3ffc); this.time.delayedCall(600, () => { this.talk(400, 520, pick(LINES.start.Iris), 22); this.st.running = true; }); }
  private talk(x: number, y: number, text: string, size?: number, hold?: number) {
    const b = say(this, x, y, text, size, hold) as Phaser.GameObjects.Container; const t = b.list.find(o => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    const half = (t ? t.width : 300) / 2 + 30; b.x = Phaser.Math.Clamp(x, half + 8, W - half - 8); return b;
  }
  private updNext() { this.nextT.setText('NEXT:\n' + this.queue.slice(1).join(' ')); this.held.setText(this.queue[0]); this.gfx?.wrap(this.held, this.queue[0]); }
  update(_t: number, dms: number) {
    const s = this.st; const dt = Math.min(dms, 50) / 1000, now = this.time.now;
    this.gfx.update(dt, now, s, this.falling, this.held, Math.abs(s.ix - s.px) < (this.queue[0] === '📦' ? BOX_HIT : HIT));
    if (!s.running || s.over) { this.skin?.update(dt, 0); return; }
    s.time -= dt; s.cool -= dt; if (s.time <= 0) { s.time = 0; return this.finish(s.bonks >= NEED); }
    const ph = s.bonks >= 4 ? 3 : s.bonks >= 2 ? 2 : 1;
    if (ph !== s.phase) { s.phase = ph; popBanner(this, ph === 2 ? 'PUPPY SPEEDS UP!' : 'PUPPY GOT SHIFTY!', 600, ph === 2 ? 0x2fa0bf : 0xbf6a2f, 800); }
    const ispd = 200 + (TIME - s.time) * 3; s.ix += s.idir * ispd * dt; if (s.ix > 630) { s.ix = 630; s.idir = -1; this.squashIris(); } if (s.ix < 90) { s.ix = 90; s.idir = 1; this.squashIris(); }
    this.iris.setPosition(s.ix, LEDGE + 4 - Math.abs(Math.sin(now / 80)) * 5).setFlip(s.idir < 0);
    // ledge walk: legs stride, free arm swings, carrying arm holds the next item up and out front
    if (!this.iris.busy) { const st = Math.sin(now / 80), P = this.iris.pose as Record<string, number>, T: Record<string, number> = { lh: st * 28, lk: Math.max(0, -st) * 30, rh: -st * 28, rk: Math.max(0, st) * 30, ls: -15 - st * 22, le: -20, rs: 145, re: -30, lean: 5, sq: 0, dy: 0, tilt: 0 };
      this.gfx.irisWalk(T, now, Math.abs(s.ix - s.px) < (this.queue[0] === '📦' ? BOX_HIT : HIT)); // heist creep (rs/re: the carrying arm stays as it was)
      const k = 1 - Math.exp(-dt * 14); const nx: Record<string, number> = {}; for (const key in T) nx[key] = P[key] + (T[key] - P[key]) * k; this.iris.setPose(nx); }
    const hp = this.iris.point('rp'); this.held.setPosition(hp.x, hp.y - 26 + Math.sin(now / 120) * 3).setAngle(Math.sin(now / 160) * 10);
    // Puppy brain
    s.el += dt; s.ko -= dt;
    if (s.photos < PHOTO_MAX && s.el >= s.photoAt && s.ko <= 0 && !s.umbrella && s.mode !== 'dream' && s.time > 4 && s.bonks < NEED) this.dropPhoto();
    s.modeT -= dt; if (s.modeT <= 0) { if (s.mode === 'dream') this.pocketPhoto(); else this.newMode(); }
    const speed = s.mode === 'run' ? 330 : s.mode === 'walk' ? 140 : 0;
    this.skin?.update(dt, Math.sign(s.pv) * speed, this.gfx.danger);
    s.px += Math.sign(s.pv) * speed * dt; if (s.px > 640) { s.px = 640; s.pv = -1; } if (s.px < 80) { s.px = 80; s.pv = 1; }
    this.pup.setX(s.px);
    if (speed) { const per = s.mode === 'run' ? 50 : 90; this.pupImg.setFlipX(s.pv > 0).setY(-Math.abs(Math.sin(now / per)) * 10);
      if (!this.tweens.isTweening(this.pupImg)) this.pupImg.setAngle(Math.sin(now / per) * (s.mode === 'run' ? 9 : 6)); } // waddle: rocks foot to foot in step with the hop
    else if (!this.tweens.isTweening(this.pupImg)) { const k = 1 - Math.exp(-dt * 18); this.pupImg.setY(this.pupImg.y * (1 - k)).setAngle(this.pupImg.angle * (1 - k)); } // stopping: land the hop instead of freezing mid-air
    this.dazeStars.setText(!this.skin && s.mode === 'stop' && this.pupImg.texture.key === 'pup_dizzy' ? '★ ✦ ★' : '').setAngle(Math.sin(now / 100) * 15);
    for (const p of [...this.peels]) { p.t -= dt; if (p.t < 1.2) p.o.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(now / 80))); if (p.t <= 0) { p.o.destroy(); this.peels.splice(this.peels.indexOf(p), 1); continue; }
      if (speed && !s.umbrella && Math.abs(p.x - s.px) < 40) { this.tweens.killTweensOf(p.o); p.o.destroy(); this.peels.splice(this.peels.indexOf(p), 1); this.hit(s.px, true); } }
    // falling items: shrink their target ring; shifty Puppy may sidestep in phase 3
    for (const f of this.falling) { const k = Math.min(1, (now - f.t0) / f.dur), r = f.hit * (2.6 - 1.6 * k);
      f.ring.clear().fillStyle(0x000000, 0.18 + 0.25 * k).fillEllipse(f.x, GROUND + 6, r * 2 * 0.9, r * 0.36).lineStyle(4 + 3 * k, k > 0.75 ? 0xff5c8a : 0xffffff, 0.5 + 0.5 * k).strokeEllipse(f.x, GROUND + 6, r * 2, r * 0.4);
      f.ring.lineStyle(3, 0xffffff, 0.4 * k).lineBetween(f.x - 12, GROUND + 6, f.x + 12, GROUND + 6);
      if (ph === 3 && !f.dodged && k > 0.4 && speed && Math.abs(f.x - s.px) < f.hit && Math.random() < DODGE_P * dt * 4) { f.dodged = true; const dir = Math.sign(s.px - f.x) || 1;
        this.tweens.add({ targets: this.pupImg, y: -60, duration: 120, yoyo: true }); this.gfx.onDodge(dir); s.px = Phaser.Math.Clamp(s.px + dir * 90, 80, 640); floatText(this, s.px, GROUND - 220, 'nope!', '#ffffff', 30); } }
    this.drawMarker(now);
    this.hud.set(`BONKS ${s.bonks}/${NEED}   MISS ${s.misses}${s.chain > 1 ? `   x${s.chain}` : ''}`, s.time, s.bonks / NEED);
  }
  private squashIris() { this.iris.act([{ dur: 0.07, to: { sq: -0.12, dy: 4, rs: 150, re: -40 } }, { dur: 0.12, to: { sq: 0.06, dy: -2 }, ease: Phaser.Math.Easing.Back.Out }], true); }
  /** Ground target under Iris: soft shadow + dashed ring + crosshair, sized to the held item's hit radius. */
  private drawMarker(now: number) {
    const s = this.st, g = this.shadow.clear(), r = this.queue[0] === '📦' ? BOX_HIT : HIT, x = s.ix, y = GROUND + 6, pr = 1 + Math.sin(now / 160) * 0.05;
    const on = Math.abs(x - s.px) < r, col = s.cool > 0 ? 0x8a8aa0 : on ? 0x7dff9a : 0xffffff;
    g.fillStyle(0x000000, 0.3).fillEllipse(x, y, 110, 26);
    g.fillStyle(col, on ? 0.28 : 0.12).fillEllipse(x, y, r * 2 * pr, r * 0.5 * pr).lineStyle(6, 0x22252b, 0.6).strokeEllipse(x, y, r * 2 * pr + 4, r * 0.5 * pr + 4).lineStyle(4, col, 0.95).strokeEllipse(x, y, r * 2 * pr, r * 0.5 * pr);
    g.lineStyle(3, 0xffffff, 0.5).lineBetween(x - 16, y, x + 16, y).lineBetween(x, y - 6, x, y + 6);
    g.lineStyle(3, col, 0.3).lineBetween(x, LEDGE + 100, x, y - 10);
  }
  /** small hearts/stars popping up from Puppy's head (never heart EYES, never from the heroine) */
  private popHead(n = 3) { for (let i = 0; i < n; i++) { const t = txt(this, (i - (n - 1) / 2) * 26, -175, i % 2 ? '★' : '♥', 24, i % 2 ? '#ffdf6b' : '#ff6b9a', '#22252b', 4).setScale(0.3);
    this.pup.add(t); this.tweens.add({ targets: t, scale: 1, y: -240 - (i % 2) * 18, x: t.x * 1.6, duration: 480, delay: i * 90, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 600 + i * 90, duration: 280, onComplete: () => t.destroy() }); } }
  private newMode() {
    const s = this.st; this.umb.setVisible(false); s.umbrella = false; s.umbHits = 0; this.pupImg.setTexture('pup_idle');
    const r = Math.random(), runP = s.phase >= 2 ? 0.34 : 0.26;
    if (r < 0.18) { s.mode = 'stop'; s.modeT = Phaser.Math.FloatBetween(0.6, 1.2); this.pupImg.setTexture('pup_hearts'); if (this.skin) this.skin.gag(); else this.popHead(); if (Math.random() < 0.4) this.talk(s.px, GROUND - 230, pick(LINES.puppyGag), 20, 900); }
    else if (r < 0.36) { s.mode = 'stop'; s.umbrella = true; s.modeT = Phaser.Math.FloatBetween(1.2, 2); this.umb.setVisible(true).setScale(this.umb.scaleX, 0.1); this.tweens.add({ targets: this.umb, scaleY: this.umb.scaleX, duration: 180, ease: 'Back.Out' }); this.skin?.umbrella(); }
    else if (r < 0.36 + runP) { s.mode = 'run'; s.modeT = Phaser.Math.FloatBetween(0.6, 1.1); this.pupImg.setTexture('pup_panic'); if (Math.random() < 0.5) s.pv = -s.pv; this.skin?.run(Math.sign(s.pv)); }
    else { s.mode = 'walk'; s.modeT = Phaser.Math.FloatBetween(1, 2); if (Math.random() < 0.35) s.pv = -s.pv; this.skin?.walk(Math.sign(s.pv)); }
  }
  drop() {
    const s = this.st; if (!s.running || s.over || s.cool > 0 || this.falling.length > 0) return; s.cool = 0.5;
    const item = this.queue.shift()!; this.queue.push(Phaser.Utils.Array.GetRandom(ITEMS)); this.updNext();
    Fx.whoosh(); this.held.setAlpha(0); this.tweens.add({ targets: this.held, alpha: 1, delay: 320, duration: 160 });
    // arm drop/toss: carrying arm lifts a touch higher, then flicks down past the ledge as she lets go; body dips with it
    this.iris.act([{ dur: 0.06, to: { rs: 165, re: -45, ls: -40, sq: -0.05, lean: -4 } }, { dur: 0.09, to: { rs: 40, re: 10, ls: 20, le: -10, sq: 0.07, lean: 12, dy: 4, tilt: 8 }, ease: Phaser.Math.Easing.Cubic.In },
      { dur: 0.12, to: { rs: 25, re: 20, lean: 8 } }], true);
    const box = item === '📦', dur = box ? BOX_FALL : FALL, hitR = box ? BOX_HIT : HIT;
    const x = s.ix; const o = txt(this, x, LEDGE + 40, item, box ? 92 : 64).setDepth(30); this.gfx.wrap(o, item, true); this.gfx.onDrop();
    const ring = this.add.graphics().setDepth(6);
    const f = { x, item, o, ring, hit: hitR, dur, t0: this.time.now, dodged: false }; this.falling.push(f);
    let trailT = 0;
    this.tweens.add({ targets: o, y: GROUND - 60, angle: box ? 90 : 360, duration: dur, ease: 'Quad.In', onUpdate: (tw) => { if ((trailT += 1) % 3 === 0 && tw.progress > 0.3) { const tr = txt(this, o.x, o.y - 30, item, box ? 92 : 64).setDepth(29).setAlpha(0.25).setAngle(o.angle); this.gfx.wrap(tr, item); this.tweens.add({ targets: tr, alpha: 0, duration: 160, onComplete: () => tr.destroy() }); } },
      onComplete: () => { ring.destroy(); this.falling.splice(this.falling.indexOf(f), 1); this.land(x, item, o, hitR); } });
  }
  private land(x: number, item: string, o: Phaser.GameObjects.Text, hitR = HIT) {
    const s = this.st; if (s.over) { o.destroy(); return; }
    const d = Math.abs(x - s.px);
    if (d < hitR && s.umbrella) { Fx.block(); Fx.boing(); s.umbHits++; this.gfx.onBlock(s.umbHits >= UMB_POP);
      this.tweens.add({ targets: o, x: x + Phaser.Math.Between(-220, 220), y: GROUND - 400, alpha: 0, angle: 720, duration: 600, onComplete: () => o.destroy() });
      this.umb.setScale(this.umb.scaleX * 1.2, this.umb.scaleY * 0.7); this.tweens.add({ targets: this.umb, scaleX: this.umb.scaleX / 1.2, scaleY: this.umb.scaleY / 0.7, duration: 260, ease: 'Elastic.Out' });
      if (s.umbHits >= UMB_POP) { floatText(this, x, GROUND - 280, 'POP! umbrella gone!', '#7dff9a', 34); s.umbrella = false; const u = art(this, s.px, GROUND - 130, 'umbrella', 0.9).setDepth(31); this.gfx.onUmbPop(u); this.umb.setVisible(false);
        this.tweens.add({ targets: u, y: GROUND - 700, x: s.px + 200, angle: 540, alpha: 0, duration: 900, onComplete: () => u.destroy() }); s.mode = 'stop'; s.modeT = 0.6; this.pupImg.setTexture('pup_panic'); this.skin?.idle(); }
      else { floatText(this, x, GROUND - 260, 'BOING!', '#fff', 36); if (Math.random() < 0.5) this.talk(400, 520, pick(LINES.trashBlock), 22, 1000); }
      return; }
    if (d < hitR) { o.destroy(); return this.hit(x, false, d < PERF, item); }
    this.dust(x);
    if (item === '🍌') { o.setAngle(0).setY(GROUND - 10).setFontSize(44); this.gfx.peel(o); this.tweens.add({ targets: o, angle: { from: -12, to: 12 }, yoyo: true, repeat: -1, duration: 260, ease: 'Sine.easeInOut' });
      this.peels.push({ x, o, t: PEEL_T }); floatText(this, x, GROUND - 90, 'peel trap!', '#ffe27a', 24); return; }
    this.gfx.onMiss(x); s.misses++; s.chain = 0; s.time = Math.max(0, s.time - MISS_T); s.cool = Math.max(s.cool, MISS_LOCK); Fx.step(); floatText(this, x, GROUND - 120, `CLATTER  -${MISS_T}s`, '#ff8a8a', 30);
    floatText(this, s.ix, LEDGE - 150, 'fumble! reloading…', '#ffe27a', 24); // misses cost time AND a reload, so spamming loses to careful aim
    this.tweens.chain({ targets: o, tweens: [{ y: GROUND - 120, angle: o.angle + 90, duration: 160, ease: 'Quad.Out' }, { y: GROUND - 30, duration: 160, ease: 'Quad.In' }, { alpha: 0, duration: 260 }], onComplete: () => o.destroy() });
    if (Math.random() < 0.35) this.talk(400, 520, pick(LINES.trashMiss), 22, 1000);
  }
  private dust(x: number) {
    for (let i = 0; i < 8; i++) { const p = this.add.circle(x + Phaser.Math.Between(-30, 30), GROUND - 10, Phaser.Math.Between(10, 18), 0xbfb6d6, 0.7).setDepth(28); const dir = i % 2 ? 1 : -1;
      this.tweens.add({ targets: p, x: p.x + dir * Phaser.Math.Between(40, 90), y: p.y - Phaser.Math.Between(20, 60), scale: 2.2, alpha: 0, duration: 520, ease: 'Quad.Out', onComplete: () => p.destroy() }); }
    this.cameras.main.shake(90, 0.004);
  }
  private hit(x: number, slip: boolean, perfect = false, item = '') {
    const s = this.st, dream = s.mode === 'dream'; s.bonks++; s.chain++; const mult = 1 + 0.25 * (s.chain - 1); const pts = Math.round((slip ? 400 : perfect ? 600 : 350) * mult) + (dream ? DREAM_BONUS : 0); s.score += pts;
    Fx.punch(); Fx.boing(); if (!dream) /* a dream bonk shows only the WAKE UP! stamp (its own DREAM BONK +bonus line): no second title under it */ impact(this, s.px, GROUND - 130, slip ? 'SLIP!' : item === '🐟' ? 'SPLAT!' : item === '📦' ? 'BOXED!' : pick(['CLONK!', 'BONK!', 'THUNK!']), pts, [slip ? 'BANANA!' : perfect ? 'PERFECT!' : '', s.chain > 1 ? `CHAIN x${s.chain}` : ''].filter(Boolean).join(' '), perfect || dream || s.chain >= 3);
    sparks(this, s.px, GROUND - 100, 12); this.gfx.onHit(s.px, slip);
    this.pupImg.setTexture('pup_dizzy'); if (!this.skin) pupFlail(this, this.pupImg, 800); this.iris.setMood('happy'); this.time.delayedCall(700, () => this.iris.setMood('smug'));
    if (slip) this.tweens.add({ targets: this.pupImg, angle: 360 * (s.pv > 0 ? 1 : -1), y: -120, duration: 450, ease: 'Sine.easeOut', onComplete: () => { this.pupImg.setAngle(0).setY(0); this.tweens.add({ targets: this.pupImg, angle: { from: -14, to: 14 }, yoyo: true, repeat: 2, duration: 90, onComplete: () => this.pupImg.setAngle(0) }); } });
    else { this.pupImg.setScale(this.pupBase * 1.25, this.pupBase * 0.68); this.tweens.add({ targets: this.pupImg, scaleX: this.pupBase, scaleY: this.pupBase, duration: 320, ease: 'Elastic.Out' }); }
    s.mode = 'stop'; s.modeT = item === '🐟' ? FISH_DAZE : 0.8; s.ko = s.modeT; s.umbrella = false; this.umb.setVisible(false);
    if (dream) { s.dreamBonks++; this.skin?.wake(s.modeT); this.wakeStamp(); this.flingPhoto(); this.talk(s.px, GROUND - 270, pick(LINES.trashPhotoBonk), 20, 1300); }
    else { this.skin?.hit(s.modeT, slip ? pick<KO>(['flat', 'spin']) : undefined); this.talk(400, 520, pick(LINES.trashHit), 22, 1100); }
    if (s.bonks >= NEED) this.time.delayedCall(700, () => this.finish(true));
  }
  // ---------------------------------------------------------------- Bunny-photo daydream
  /** a framed photo of Bunny flutters down in front of Puppy; he stops dead and daydreams for DREAM_T seconds */
  private dropPhoto() {
    const s = this.st; s.photos++; s.photoAt = s.el + Phaser.Math.FloatBetween(...PHOTO_GAP);
    const dir = s.pv > 0 ? 1 : -1, x = Phaser.Math.Clamp(s.px + dir * 100, 70, 650);
    s.mode = 'dream'; s.modeT = DREAM_T; this.umb.setVisible(false); s.umbrella = false; this.pupImg.setTexture('pup_hearts'); this.skin?.dream(dir);
    const c = this.photo = this.add.container(x + 120, LEDGE + 120).setDepth(12).setAngle(-30);
    const g = this.add.graphics(); g.fillStyle(0x22252b, 0.35).fillRoundedRect(-44, -54, 96, 116, 8); // drop shadow
    g.fillStyle(0xffffff, 1).lineStyle(5, 0x22252b, 1).fillRoundedRect(-48, -58, 96, 116, 8).strokeRoundedRect(-48, -58, 96, 116, 8);
    g.fillStyle(0xffd6e6, 1).fillRect(-38, -48, 76, 78).lineStyle(3, 0xff6b9a, 1).strokeRect(-38, -48, 76, 78);
    const pic = art(this, 0, 30, 'bun_bust_smile', 0.48).setOrigin(0.5, 1);
    const mk = this.make.graphics({}, false); mk.fillStyle(0xffffff, 1).fillRect(-38, -48, 76, 78); pic.setMask(mk.createGeometryMask());
    const cap = txt(this, 0, 44, 'BUNNY ♥', 15, '#ff4f86', '#ffffff', 0);
    c.add([g, pic, cap]); (c as any).maskG = mk; mk.setPosition(c.x, c.y);
    const upd = () => { mk.setPosition(c.x, c.y).setAngle(c.angle).setScale(c.scaleX, c.scaleY); }; this.events.on('update', upd); c.once('destroy', () => { this.events.off('update', upd); mk.destroy(); });
    // flutter down: side-to-side swings, lands propped up in front of him
    this.tweens.add({ targets: c, y: GROUND - 62, duration: 900, ease: 'Sine.In' });
    this.tweens.add({ targets: c, x: { from: x + 120, to: x }, duration: 900, ease: 'Sine.Out' });
    this.tweens.add({ targets: c, angle: { from: -30, to: 25 }, duration: 300, yoyo: true, repeat: 1, ease: 'Sine.InOut', onComplete: () => { this.tweens.add({ targets: c, angle: dir * -8, duration: 160 }); this.tweens.add({ targets: c, scaleY: 0.92, duration: 90, yoyo: true }); } });
    Fx.whoosh(); this.talk(s.px, GROUND - 270, pick(LINES.trashPhotoSee), 20, 1100);
    this.time.delayedCall(250, () => { if (s.mode === 'dream' && !s.over) popBanner(this, 'PUPPY IS DREAMING!\nDROP IT NOW!', 500, 0xff4f86, 900); });
    this.time.delayedCall(1250, () => { if (s.mode === 'dream' && !s.over) this.talk(400, 520, pick(LINES.trashPhotoIris), 22, 1000); });
    this.time.delayedCall(1900, () => { if (s.mode === 'dream' && !s.over) this.talk(s.px, GROUND - 270, pick(LINES.trashPhotoDream), 20, 900); });
  }
  /** missed the window: he snaps out of it and pockets the photo */
  private pocketPhoto() {
    const s = this.st; s.pockets++; s.mode = 'stop'; s.modeT = 0.6; this.pupImg.setTexture('pup_idle'); this.skin?.pocket();
    const c = this.photo; this.photo = null;
    if (c) this.tweens.add({ targets: c, x: s.px, y: GROUND - 90, scale: 0.15, angle: 200, alpha: 0.2, duration: 380, ease: 'Back.In', onComplete: () => c.destroy() });
    floatText(this, s.px, GROUND - 230, 'pocketed!', '#ffb3cf', 26); this.talk(s.px, GROUND - 270, pick(LINES.trashPhotoPocket), 20, 1100);
  }
  /** DREAM BONK: the photo flies off, spinning */
  private flingPhoto() { const c = this.photo; this.photo = null; if (!c) return; this.tweens.killTweensOf(c);
    this.tweens.add({ targets: c, x: c.x + (c.x < 360 ? -1 : 1) * 260, y: GROUND - 520, angle: c.angle + 540, alpha: 0, duration: 800, ease: 'Quad.Out', onComplete: () => c.destroy() }); }
  /** big rubber 'WAKE UP!' stamp that thuds onto the screen */
  private wakeStamp() {
    const c = this.add.container(360, 600).setDepth(80).setAngle(-12).setScale(2.4).setAlpha(0);
    const t = txt(this, 0, 0, 'WAKE UP!', 76, '#ff3b5c', '#ffffff', 10); const g = this.add.graphics();
    g.lineStyle(9, 0xff3b5c, 1).strokeRoundedRect(-t.width / 2 - 22, -t.height / 2 - 10, t.width + 44, t.height + 20, 18);
    const b = txt(this, 0, 74, `DREAM BONK +${DREAM_BONUS}`, 30, '#ffffff', '#ff3b5c', 7);
    c.add([g, t, b]); this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 170, ease: 'Quad.In', onComplete: () => { this.cameras.main.shake(160, 0.012); Fx.block(); } });
    this.tweens.add({ targets: c, alpha: 0, y: 560, delay: 1050, duration: 300, onComplete: () => c.destroy() });
  }
  finish(win: boolean) {
    const s = this.st; if (s.over) return; s.over = true; s.running = false; (window as any).__pr.ended = win ? 'win' : 'lose';
    if (this.photo && !win) this.pocketPhoto(); else this.flingPhoto(); this.time.delayedCall(win ? 650 : 0, () => win ? this.skin?.win() : this.skin?.lose());
    this.gfx.onFinish(win, this.pup.x, LEDGE);
    popBanner(this, win ? 'PUPPY GOT BINNED!' : 'TIME!', 600, win ? 0x2fbf5a : 0x6b4cc9, 800);
    this.time.delayedCall(1100, () => endCard(this, 'Iris', 6, win, s.score + Math.round(s.time) * 20, `${s.bonks} bonks • ${s.misses} misses`));
  }
}
