// Tap-to-skip interlude after a win (~7s): victory flop -> Bunny lasso teaser -> Puppy walks to the next door.
import Phaser from 'phaser';
import { leaveOnce } from '../systems/leave';
import { GAME_W as W, GAME_H as H } from '../config';
import { setupCamera } from '../systems/resolution';
import { art } from '../art/registry';
import { txt } from '../systems/fx';
import { Fx } from '../systems/audio';
import { hallBg, say, drawHall, DOOR_POS, setPageBg } from '../systems/kit';
import { CAST } from '../art/chibi';
import { LINES, pick } from '../lines';
import { doorState } from './Hub';
import { Storage } from '../systems/storage';
import { koPupFor } from '../systems/koPup';

export class InterludeScene extends Phaser.Scene {
  private layer!: Phaser.GameObjects.Container; private done = false;
  constructor() { super('Interlude'); }
  create(d: { name: string; idx: number; points?: boolean }) {
    setupCamera(this); this.cameras.main.fadeIn(200); this.done = false;
    (window as any).__pr = { scene: 'Interlude', beat: 0 };
    this.victory(d.name, !!d.points); setPageBg(0xff9fc0, 0xc77a4a);
    this.time.delayedCall(2800, () => d.name === 'Iris' ? this.reveal() : this.teaser());
    this.time.delayedCall(4800, () => this.walk(d.idx));
    this.time.delayedCall(7600, () => this.exit());
    const skip = txt(this, W / 2, 1235, 'tap to skip ▸', 26, '#fff', '#22252b', 5).setDepth(999);
    this.tweens.add({ targets: skip, alpha: 0.4, yoyo: true, repeat: -1, duration: 500 });
    this.time.delayedCall(250, () => this.input.once('pointerdown', () => this.exit()));
  }
  private fresh() { this.layer?.destroy(); this.tweens.killAll(); this.layer = this.add.container(0, 0); return this.layer; }
  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T { this.layer.add(o); return o; }
  private victory(name: string, points = false) {
    this.fresh(); (window as any).__pr.beat = 1;
    this.add2(hallBg(this, 0xff9fc0, 0xffe27a, false));
    const g = this.add2(this.add.graphics()); g.fillStyle(0xffffff, 0.35);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.fillTriangle(W / 2, 640, W / 2 + Math.cos(a) * 900, 640 + Math.sin(a) * 900, W / 2 + Math.cos(a + 0.2) * 900, 640 + Math.sin(a + 0.2) * 900); }
    this.add2(art(this, 0, 0, 'bg_vignette', 1).setAlpha(0.6));
    const ko = this.add2(txt(this, W / 2, 150, points ? 'WIN ON\nPOINTS!' : name === 'Ruby' ? 'K.O.!' : name === 'Zoe' ? 'BONKED!' : name === 'Nana' ? 'BONKED!' : name === 'Midnight' ? 'SNATCHED!' : name === 'Noir' ? 'POUNCED!' : name === 'Iris' ? 'CLONKED!' : name === 'Linye' ? 'TAGGED!' : name === 'Glassia' ? 'WALLOPED!' : 'CHAMPION!', points ? 90 : 120, '#ffdf6b', '#e0243a', 16));
    ko.setScale(0); this.tweens.add({ targets: ko, scale: 1, angle: -6, duration: 400, ease: 'Back.Out' });
    const hero = this.add2(art(this, 230, 1050, `full_${name}_happy`, 1.3));
    this.tweens.add({ targets: hero, y: 990, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 260, ease: 'Quad.Out' });
    const pup = this.add2(art(this, 560, 1000, 'pup_panic', 1.2)); koPupFor(this, pup, { stars: false }); // after the flop he's the cute KO'd rig (this scene already orbits stars)
    // Puppy's dramatic flop: wobble, spin, plop.
    this.tweens.chain({ targets: pup, tweens: [
      { angle: 15, duration: 150, yoyo: true, repeat: 2 },
      { angle: -95, y: 1090, duration: 400, ease: 'Bounce.Out', onStart: () => { pup.setTexture('pup_dizzy'); Fx.boing(); } },
      { scaleY: pup.scaleY * 0.85, duration: 120, yoyo: true },
    ] });
    for (let i = 0; i < 3; i++) { const s = this.add2(txt(this, 0, 0, '★', 40, '#ffdf6b', '#22252b', 5));
      this.tweens.addCounter({ from: 0, to: 360, duration: 900, repeat: -1, onUpdate: (tw) => { const a = Phaser.Math.DegToRad(tw.getValue()! + i * 120); s.setPosition(420 + Math.cos(a) * 60, 1020 + Math.sin(a) * 18); } }); }
    ['♪', '♫', '♪'].forEach((s, i) => { const n = this.add2(txt(this, 110 + i * 90, 660, s, 60, '#fff', '#22252b', 6));
      this.tweens.add({ targets: n, y: 600, yoyo: true, repeat: -1, duration: 400 + i * 100 }); });
    this.add2(say(this, 230, 700, ({ Ruby: 'Baa-rilliant! Sorry Puppy!', Glassia: 'Hoof-ray! Sorry Puppy!', Zoe: 'Un-BEAR-lievable! Sorry Puppy!', Nana: 'Acorn-some! Sorry Puppy!', Midnight: 'Caw-some! Sorry Puppy!', Noir: 'Purr-fect pounce! Sorry Puppy!', Iris: 'Trash-tastic! Sorry Puppy!', Linye: '...tagged. Sorry Puppy.' } as Record<string, string>)[name] ?? 'Sorry Puppy!', 26, 2400));
    this.time.delayedCall(700, () => this.layer && this.add2(say(this, 500, 820, pick(LINES.puppyLose), 22, 1800)));
    Fx.sting(true);
  }
  private teaser() {
    if (this.done) return; this.fresh(); (window as any).__pr.beat = 2; setPageBg(0x12081c, 0x3b1f5e);
    const bg = this.add2(this.add.graphics()); bg.fillGradientStyle(0x12081c, 0x12081c, 0x3b1f5e, 0x3b1f5e, 1).fillRect(0, 0, W, H);
    bg.fillStyle(0xffffff, 0.08).fillCircle(W / 2, 640, 330);
    const bun = this.add2(art(this, W / 2 - 40, 900, 'bun_full_cool', 1.5).setTint(0x0b0610));
    const las = this.add2(art(this, W / 2 + 70, 640, 'lasso', 1.5));
    this.tweens.add({ targets: las, angle: { from: -10, to: 14 }, yoyo: true, repeat: -1, duration: 260, ease: 'Sine.InOut' });
    this.tweens.add({ targets: bun, scale: bun.scale * 1.05, duration: 2000 });
    const t = this.add2(txt(this, W / 2, 1060, 'Bunny is watching...', 52, '#ff5c8a', '#000', 8)); t.setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 500 });
    this.add2(txt(this, W / 2, 1130, pick(LINES.teaser.slice(1)), 28, '#fff', '#000', 5));
    Fx.whoosh();
  }
  /** Linye's intro: purple smoke puffs, cute hedgehog Linye pops in. */
  private reveal() {
    if (this.done) return; this.fresh(); (window as any).__pr.beat = 2; setPageBg(0x0d0618, 0x2a1450);
    const bg = this.add2(this.add.graphics()); bg.fillGradientStyle(0x0d0618, 0x0d0618, 0x2a1450, 0x2a1450, 1).fillRect(0, 0, W, H);
    bg.fillStyle(0x9a7aff, 0.12).fillCircle(W / 2, 700, 360).fillStyle(0x9a7aff, 0.1).fillCircle(W / 2, 700, 240);
    const hero = this.add2(art(this, W / 2, 1000, 'full_Linye_smug', 1.6).setAlpha(0));
    for (let i = 0; i < 16; i++) { const p = this.add2(this.add.circle(W / 2 + Phaser.Math.Between(-200, 200), 860 + Phaser.Math.Between(-200, 120), Phaser.Math.Between(30, 70), 0x6b4cc9, 0.5));
      this.tweens.add({ targets: p, alpha: 0, scale: 1.8, delay: 600 + i * 20, duration: 700 }); }
    this.time.delayedCall(700, () => { this.tweens.add({ targets: hero, alpha: 1, duration: 250 }); Fx.special(); this.cameras.main.flash(150, 180, 140, 255); });
    const t = this.add2(txt(this, W / 2, 230, 'MEET LINYE\nTHE HEDGEHOG!', 70, '#c9b0ff', '#1a0d33', 10)); t.setScale(0); this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.Out' });
    this.add2(txt(this, W / 2, 1080, 'LINYE the Hedgehog', 40, '#fff', '#1a0d33', 7));
    this.time.delayedCall(900, () => this.layer && this.add2(say(this, W / 2, 560, pick(LINES.linyeReveal), 24, 1800)));
  }
  private walk(idx: number) {
    if (this.done) return; this.fresh(); (window as any).__pr.beat = 3; setPageBg(0x2a070d, 0x1a0a0e);
    const hall = this.add.container(0, 0); this.layer.add(hall);
    const n0 = this.children.list.length;
    drawHall(this, CAST, doorState, (i) => Storage.getLevelBest(CAST[i].name));
    this.children.list.slice(n0).forEach(o => hall.add(o));
    const from = DOOR_POS[idx], to = DOOR_POS[Math.min(idx + 1, 8)];
    const pup = this.add2(art(this, from[0], from[1] + 150, 'pup_idle', 0.7));
    this.tweens.add({ targets: pup, x: to[0], y: to[1] + (idx + 1 >= 8 ? 200 : 150), duration: 2300, ease: 'Sine.InOut' });
    this.tweens.add({ targets: pup, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 160, onYoyo: () => Fx.step() });
    const bun = this.add2(art(this, 600, 520, 'bun_sip_smile', 0.7));
    this.tweens.add({ targets: bun, y: 505, yoyo: true, repeat: -1, duration: 400 });
    this.add2(say(this, 420, 330 + 260, pick(LINES.walk), 22, 2400));
    const nextName = idx + 1 < 8 ? CAST[idx + 1].name : 'Bunny';
    this.add2(txt(this, W / 2, 70, `NEXT: ${nextName.toUpperCase()}`, 44, '#ffdf6b', '#22252b', 8));
  }
  private exit() { if (this.done || !leaveOnce(this)) return; this.done = true; this.cameras.main.fadeOut(200); this.time.delayedCall(220, () => this.scene.start('Hub')); }
}
