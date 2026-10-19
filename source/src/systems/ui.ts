import Phaser from 'phaser';
import { bakeG, bakeTexture } from './bake';
import { COLORS, FONT, GAME_W, TOUCH_MIN } from '../config';
import { isMuted, toggleMute, Sfx } from './audio';

export interface Button extends Phaser.GameObjects.Container { setLabel(s: string): void; }

/** Big rounded button. Fires onClick on release inside the button. */
export function makeButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string,
  onClick: () => void, color: number = COLORS.BUTTON, fontSize = 48): Button {
  w = Math.max(w, TOUCH_MIN); h = Math.max(h, TOUCH_MIN);
  const c = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  const dark = Phaser.Display.Color.IntegerToColor(color).darken(28).color, lite = Phaser.Display.Color.IntegerToColor(color).lighten(14).color;
  g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 12, w, h, 28);
  g.fillStyle(dark, 1); g.lineStyle(5, COLORS.INK, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 28); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 28);
  g.fillStyle(color, 1); g.fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, h - 14, 24);
  g.fillStyle(lite, 1); g.fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, (h - 14) * 0.5, { tl: 24, tr: 24, bl: 6, br: 6 });
  g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(-w / 2 + 16, -h / 2 + 9, w - 32, h * 0.2, 12);
  g.lineStyle(2, 0xffffff, 0.45); g.strokeRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h - 16, 22);
  const t = scene.add.text(0, -4, text, { fontFamily: FONT, fontStyle: 'bold', fontSize: `${fontSize}px`, color: '#ffffff', stroke: '#22252b', strokeThickness: 7, align: 'center' }).setOrigin(0.5).setShadow(0, 4, '#00000066', 0, true, false);
  c.add([g, t]); bakeG(scene, g, `btn_${w}x${h}_${color.toString(16)}`, -w / 2 - 4, -h / 2 - 4, w + 8, h + 18);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  let down = false;
  c.on('pointerdown', () => { down = true; scene.tweens.add({ targets: c, scale: 0.94, duration: 60 }); });
  c.on('pointerout', () => { down = false; scene.tweens.add({ targets: c, scale: 1, duration: 80 }); });
  c.on('pointerup', () => {
    scene.tweens.add({ targets: c, scale: 1, duration: 80 });
    if (down) { down = false; Sfx.click(); onClick(); }
  });
  c.setLabel = (s: string) => t.setText(s);
  return c;
}

/** Speaker mute toggle, always top-right. 96x96 touch target. */
export function makeMuteButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const size = 96;
  const c = scene.add.container(GAME_W - 16 - size / 2, 16 + size / 2).setDepth(905);
  let g = scene.add.graphics();
  const redraw = () => {
    g.clear();
    g.fillStyle(0xffffff, 0.85); g.lineStyle(4, COLORS.INK, 1);
    g.fillRoundedRect(-size / 2, -size / 2, size, size, 22); g.strokeRoundedRect(-size / 2, -size / 2, size, size, 22);
    // speaker
    g.fillStyle(COLORS.INK, 1);
    g.fillRect(-26, -10, 14, 20);
    g.fillTriangle(-14, -10, 6, -26, 6, 26); g.fillTriangle(-14, 10, 6, -26, 6, 26);
    g.lineStyle(5, isMuted() ? 0xe0243a : COLORS.INK, 1);
    if (isMuted()) {
      g.lineBetween(14, -12, 32, 12); g.lineBetween(14, 12, 32, -12);
    } else {
      g.beginPath(); g.arc(8, 0, 14, -0.9, 0.9); g.strokePath();
      g.beginPath(); g.arc(8, 0, 26, -0.9, 0.9); g.strokePath();
    }
  };
  // two baked variants (sound on / muted), swapped on toggle instead of re-tessellating every frame
  let img: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics = g;
  const show = () => { const m = isMuted();
    if (!scene.textures.exists('bkg_mute_' + (m ? 1 : 0))) { const keep = g; g = scene.add.graphics(); redraw(); bakeTexture(scene, g, 'mute_' + (m ? 1 : 0), -size / 2 - 3, -size / 2 - 3, size + 6, size + 6); g.destroy(); g = keep; }
    if (img instanceof Phaser.GameObjects.Image && scene.textures.exists('bkg_mute_' + (m ? 1 : 0))) img.setTexture('bkg_mute_' + (m ? 1 : 0)); else if (!(img instanceof Phaser.GameObjects.Image)) redraw(); };
  redraw();
  c.add(g); img = bakeG(scene, g, 'mute_' + (isMuted() ? 1 : 0), -size / 2 - 3, -size / 2 - 3, size + 6, size + 6);
  c.setSize(size, size);
  c.setInteractive({ useHandCursor: true });
  c.setDepth(1000);
  c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    toggleMute(); show(); Sfx.click();
  });
  (c as any).isMuteButton = true;
  return c;
}

/** True if a pointer is over the mute button region (used to ignore jump taps there). */
export function pointerInMute(px: number, py: number): boolean {
  return px > GAME_W - 16 - 96 - 8 && py < 16 + 96 + 8;
}
