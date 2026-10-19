import Phaser from 'phaser';
import { RES } from './resolution';

/**
 * Bake a static Graphics into a cached texture and swap it for an Image with the same pivot/transform (WebGL
 * re-tessellates every Graphics every frame; the Hall had 28 of them). Box = local bounds (x0,y0,w,h) of the drawing.
 * The Image keeps g's position/scale/angle/depth and container slot, with its origin at g's local (0,0).
 */
export function bakeG(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, key: string, x0: number, y0: number, w: number, h: number): Phaser.GameObjects.Image | Phaser.GameObjects.Graphics {
  const k = bakeTexture(scene, g, key, x0, y0, w, h); if (!k) return g;
  // origin in texels and 1/RES scale (not a fraction + display size): the frame can be a texel larger than requested
  const img = scene.add.image(g.x, g.y, k).setDisplayOrigin(-x0 * RES, -y0 * RES);
  img.setScale(g.scaleX / RES, g.scaleY / RES).setAngle(g.angle).setDepth(g.depth).setAlpha(g.alpha).setVisible(g.visible);
  const parent = g.parentContainer; if (parent) { parent.addAt(img, parent.getIndex(g)); parent.remove(g); }
  g.destroy(); return img;
}

/** Render a Graphics into a cached texture 'bkg_<key>' (once) and return the key, or null if unsupported. Leaves g as is. */
export function bakeTexture(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, key: string, x0: number, y0: number, w: number, h: number): string | null {
  const k = 'bkg_' + key;
  if (!scene.textures.exists(k)) {
    const dt = scene.textures.addDynamicTexture(k, Math.ceil(w * RES), Math.ceil(h * RES));
    if (!dt) return null;
    const ox = g.x, oy = g.y, sx = g.scaleX, sy = g.scaleY, ang = g.angle, a = g.alpha, vis = g.visible;
    g.setPosition(-x0 * RES, -y0 * RES).setScale(RES).setAngle(0).setAlpha(1).setVisible(true); dt.draw(g);
    g.setPosition(ox, oy).setScale(sx, sy).setAngle(ang).setAlpha(a).setVisible(vis);
  }
  return scene.textures.exists(k) ? k : null;
}
