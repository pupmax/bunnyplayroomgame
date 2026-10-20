import Phaser from 'phaser';
import { bootStage } from '../systems/diag';
import { GAME_W, GAME_H, FONT } from '../config';
import { setupCamera } from '../systems/resolution';
import { loadAllArt, whenArtReady } from '../art/registry';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create(): void {
    setupCamera(this); bootStage('fonts');
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 50, 'Opening the Playroom...', { fontFamily: FONT, fontSize: '40px', color: '#ffd9a0' }).setOrigin(0.5);
    const bar = this.add.graphics(); const drawBar = (f: number) => { bar.clear().fillStyle(0x22252b, 1).fillRoundedRect(160, GAME_H / 2 + 10, 400, 34, 17).fillStyle(0xff5c8a, 1).fillRoundedRect(164, GAME_H / 2 + 14, Math.max(26, 392 * f), 26, 13); };
    drawBar(0);
    const fontReady = (document as any).fonts ? Promise.race([document.fonts.load('700 40px Fredoka'), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
    fontReady.then(() => { bootStage('textures'); return loadAllArt(this, (f) => { t.setText(`Opening the Playroom... ${Math.round(f * 100)}%`); drawBar(f); }).then(() => { const m = new URLSearchParams(location.search).get('mock'), tm = new URLSearchParams(location.search).get('tailmock'); if (tm) whenArtReady().then(() => this.scene.start('MockTail', { n: Number(tm), t: Number(new URLSearchParams(location.search).get('t') ?? -1) })); else if (m) whenArtReady().then(() => this.scene.start('Mock2', { n: Number(m) })); else { bootStage('ready'); this.scene.start('Title'); }; }); }).catch((e: any) => { bootStage('error: ' + String((e && e.message) || e)); throw e; });
  }
}
