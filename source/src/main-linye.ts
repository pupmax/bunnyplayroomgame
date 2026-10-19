// Standalone entry: Linye's Shadow Tag only (loader -> title card -> Shadow -> result card). Built by vite.linye.config.ts.
import { installContextLossGuard } from './systems/contextloss';
import { installDiag, bootStage, checkForUpdate } from './systems/diag';
import { installAutoBake } from './systems/autobake';
import Phaser from 'phaser';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { GAME_W, GAME_H } from './config';
import { installAudioUnlock } from './systems/audio';
import { RES, patchTextResolution } from './systems/resolution';
import { SoloBootScene } from './scenes/solo/SoloBoot';
import { SoloTitleScene } from './scenes/solo/SoloTitle';
import { ShadowScene } from './scenes/Shadow';
import { PauseScene } from './scenes/Pause';

const prevent = (e: Event) => { if (e.cancelable) e.preventDefault(); };
document.addEventListener('touchmove', prevent, { passive: false });
document.addEventListener('gesturestart', prevent as EventListener, { passive: false } as AddEventListenerOptions);
document.addEventListener('dblclick', prevent, { passive: false });
document.addEventListener('contextmenu', prevent);
installAudioUnlock();
patchTextResolution();
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game',
  width: GAME_W * RES, height: GAME_H * RES,
  backgroundColor: '#0d0618',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },
  input: { activePointers: 3 },
  render: { antialias: true, roundPixels: false },
  scene: [SoloBootScene, SoloTitleScene, ShadowScene, PauseScene],
});
(window as any).__game = game;
installContextLossGuard(game);
installDiag(game);
installAutoBake(game);
bootStage('phaser');
checkForUpdate(game);
