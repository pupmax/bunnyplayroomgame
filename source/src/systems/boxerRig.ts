// Two-segment boxer arms (shoulder -> elbow -> wrist) attached to a body container, with shaded gloves + wrist wraps.
// Poses are joint targets (elbow + wrist points, glove scale) in the parent's local space; x is mirrored per side.
import Phaser from 'phaser';
import { artScale } from '../art/registry';

export interface ArmPose { ex: number; ey: number; wx: number; wy: number; gs: number }
export interface ArmStyle { shoulder: [number, number]; upper: number; fore: number; upperW: number; foreW: number; glove: string; gloveSize: number; wrap: number; ink?: number }
const INK = 0x2a1a14;

export class BoxerArms {
  private g: Phaser.GameObjects.Graphics; gloves: Phaser.GameObjects.Image[];
  pose: ArmPose[]; bob = 0;
  constructor(private scene: Phaser.Scene, parent: Phaser.GameObjects.Container, private st: ArmStyle, start: ArmPose) {
    this.g = scene.add.graphics();
    this.gloves = [-1, 1].map(s => scene.add.image(0, 0, st.glove).setOrigin(0.5, 0.8).setFlipX(s < 0));
    parent.add([this.g, ...this.gloves]);
    this.pose = [{ ...start }, { ...start }];
    this.draw();
  }
  /** Tween one side (0 = left, 1 = right) or both to a pose. */
  to(side: number | 'both', p: ArmPose, dur = 150, ease = 'Quad.Out', yoyo = false, hold = 0) {
    const sides = side === 'both' ? [0, 1] : [side];
    for (const i of sides) { this.scene.tweens.killTweensOf(this.pose[i]); this.scene.tweens.add({ targets: this.pose[i], ...p, duration: dur, ease, yoyo, hold }); }
  }
  fade(dur = 200) { this.scene.tweens.add({ targets: [this.g, ...this.gloves], alpha: 0, duration: dur }); }
  set(side: number, p: ArmPose) { this.scene.tweens.killTweensOf(this.pose[side]); Object.assign(this.pose[side], p); }
  draw() {
    const g = this.g, st = this.st; g.clear();
    const seg = (x1: number, y1: number, x2: number, y2: number, w: number, col: number, hi: number) => {
      g.lineStyle(w + 9, st.ink ?? INK, 1).lineBetween(x1, y1, x2, y2);
      g.fillStyle(st.ink ?? INK, 1).fillCircle(x1, y1, (w + 9) / 2).fillCircle(x2, y2, (w + 9) / 2);
      g.lineStyle(w, col, 1).lineBetween(x1, y1, x2, y2); g.fillStyle(col, 1).fillCircle(x1, y1, w / 2).fillCircle(x2, y2, w / 2);
      // light from upper-left: highlight strip + shadow strip
      const a = Math.atan2(y2 - y1, x2 - x1), nx = Math.sin(a), ny = -Math.cos(a), o = w * 0.25;
      g.lineStyle(w * 0.25, 0x000000, 0.18).lineBetween(x1 - nx * o, y1 - ny * o, x2 - nx * o, y2 - ny * o);
      g.lineStyle(w * 0.22, hi, 0.75).lineBetween(x1 + nx * o * (nx < 0 ? -1 : 1), y1 + ny * o, x2 + nx * o * (nx < 0 ? -1 : 1), y2 + ny * o);
    };
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1, p = this.pose[i], b = this.bob;
      const sx = st.shoulder[0] * s, sy = st.shoulder[1] + b, ex = p.ex * s, ey = p.ey + b * 1.2, wx = p.wx * s, wy = p.wy + b * 1.5;
      seg(sx, sy, ex, ey, st.upperW, st.upper, 0xffffff);
      seg(ex, ey, wx, wy, st.foreW, st.fore, 0xffffff);
      // wrist wrap / cuff
      const a = Math.atan2(wy - ey, wx - ex), cx = wx - Math.cos(a) * 6, cy = wy - Math.sin(a) * 6;
      g.lineStyle(st.foreW + 14, st.ink ?? INK, 1).lineBetween(cx - Math.cos(a) * 9, cy - Math.sin(a) * 9, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
      g.lineStyle(st.foreW + 6, st.wrap, 1).lineBetween(cx - Math.cos(a) * 9, cy - Math.sin(a) * 9, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
      const gl = this.gloves[i];
      const len = Math.hypot(wx - ex, wy - ey);
      const ang = Phaser.Math.RadToDeg(a) + 90;
      gl.setPosition(wx, wy).setAngle(len < 25 ? 0 : ang).setScale(artScale(st.glove, st.gloveSize * p.gs));
    }
  }
}
