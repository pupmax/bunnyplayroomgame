import Phaser from 'phaser';
import { bootStage } from '../../systems/diag';
import { GAME_W, GAME_H, FONT } from '../../config';
import { setupCamera } from '../../systems/resolution';
import { loadArtKeys } from '../../art/registry';
import { SOLO_BOOT, STANDALONE } from '../../standalone';

/** Standalone loader: generates only this standalone's textures (Ruby boxing / Linye shadow tag), then shows the title card. */
export class SoloBootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
    setupCamera(this); bootStage('fonts');
    const cfg = SOLO_BOOT[STANDALONE || 'ruby'] || SOLO_BOOT.ruby;
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 50, cfg.loading, { fontFamily: FONT, fontSize: '40px', color: '#ffd9a0' }).setOrigin(0.5);
    const bar = this.add.graphics(); const drawBar = (f: number) => { bar.clear().fillStyle(0x22252b, 1).fillRoundedRect(160, GAME_H / 2 + 10, 400, 34, 17).fillStyle(cfg.bar, 1).fillRoundedRect(164, GAME_H / 2 + 14, Math.max(26, 392 * f), 26, 13); };
    drawBar(0);
    const fontReady = (document as any).fonts ? Promise.race([document.fonts.load('700 40px Fredoka'), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
    fontReady.then(() => { bootStage('textures'); return loadArtKeys(this, cfg.keys, (f) => { t.setText(`${cfg.loading} ${Math.round(f * 100)}%`); drawBar(f); }).then(() => { bootStage('ready'); this.scene.start('SoloTitle'); }); }).catch((e: any) => { bootStage('error: ' + String((e && e.message) || e)); throw e; });
  }
}
