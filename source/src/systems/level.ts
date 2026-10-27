// Shared scaffolding for levels 5-9: HUD (title / left counter / timer / progress bar), comic hit burst, Puppy stars.
import Phaser from 'phaser';
import { GAME_W as W } from '../config';
import { txt } from './fx';
import { floatText, sparks, comic } from './kit';

export class Hud {
  private left: Phaser.GameObjects.Text; private time: Phaser.GameObjects.Text; private bar: Phaser.GameObjects.Graphics;
  constructor(private scene: Phaser.Scene, title: string, private col: number, y = 150) {
    txt(scene, W / 2, y, title, 40, '#ffdf6b', '#22252b', 8).setDepth(600);
    this.left = txt(scene, 170, y + 60, '', 30, '#fff', '#22252b', 6).setDepth(600);
    this.time = txt(scene, 580, y + 60, '', 34, '#fff', '#22252b', 6).setDepth(600);
    this.bar = scene.add.graphics().setDepth(600); this.y = y;
  }
  private y: number;
  /** celebrate a counter change: the label pops and flashes (Tail Catch catches) */
  pop(color = '#7dff9a') { const t = this.left; this.scene.tweens.killTweensOf(t); t.setScale(1).setColor(color); this.scene.tweens.add({ targets: t, scale: 1.5, duration: 140, yoyo: true, ease: 'Quad.Out', onComplete: () => t.setColor('#fff') }); }
  set(label: string, t: number, f: number) {
    this.left.setText(label); this.time.setText((n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`)(Math.max(0, Math.ceil(t)))) /* m:ss (was 0:<secs>, which read 0:982 for test clocks) */.setColor(t < 10 ? '#ff6b6b' : '#fff');
    const y = this.y + 96; this.bar.clear().fillStyle(0x22252b, 1).fillRoundedRect(140, y, 440, 30, 15).fillStyle(this.col, 1).fillRoundedRect(144, y + 4, Math.max(22, 432 * Math.min(1, f)), 22, 11);
  }
}
/** Big cartoon impact: starburst, comic word, +points, sparks, orbiting stars. */
export function impact(scene: Phaser.Scene, x: number, y: number, word: string, pts: number, tag = '', big = false) {
  const k = big ? 1.4 : 1;
  const burst = scene.add.graphics({ x, y }).setDepth(70); burst.fillStyle(0xffffff, 1);
  const p: Phaser.Math.Vector2[] = []; for (let i = 0; i < 16; i++) { const r = (i % 2 ? 46 : 110) * k; const a = i / 16 * Math.PI * 2; p.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  burst.fillPoints(p, true).fillStyle(0xffdf6b, 1).fillCircle(0, 0, 36 * k); burst.setScale(0.3);
  scene.tweens.add({ targets: burst, scale: 1.2, alpha: 0, duration: 320, onComplete: () => burst.destroy() });
  sparks(scene, x, y, big ? 26 : 14, big);
  const w = comic(scene, x, y - 110, word, 66 * (big ? 1.2 : 1)).setDepth(75).setScale(0.3).setAngle(Phaser.Math.Between(-12, 12));
  scene.tweens.add({ targets: w, scale: 1, duration: 140, ease: 'Back.Out' }); scene.tweens.add({ targets: w, alpha: 0, y: w.y - 30, delay: 650, duration: 260, onComplete: () => w.destroy() });
  if (pts) floatText(scene, x - 110, y - 20, `+${pts}${tag ? ' ' + tag : ''}`, '#7dff9a', 38);
  for (let i = 0; i < 3; i++) { const st = txt(scene, x, y - 60, '★', 30, '#ffdf6b', '#22252b', 4).setDepth(74);
    scene.tweens.addCounter({ from: 0, to: 720, duration: 900, onUpdate: (tw) => { const a = Phaser.Math.DegToRad(tw.getValue()! + i * 120); st.setPosition(x + Math.cos(a) * 50, y - 70 + Math.sin(a) * 14); }, onComplete: () => st.destroy() }); }
  scene.cameras.main.shake(big ? 320 : 180, big ? 0.02 : 0.01);
}
