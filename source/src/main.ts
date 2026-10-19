import { installContextLossGuard } from './systems/contextloss';
import { installDiag, bootStage, checkForUpdate } from './systems/diag';
import { installAutoBake } from './systems/autobake';
import Phaser from 'phaser';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { GAME_W, GAME_H } from './config';
import { installAudioUnlock } from './systems/audio';
import { RES, patchTextResolution } from './systems/resolution';
import { BootScene } from './scenes/Boot';
import { TitleScene } from './scenes/Title';
import { HubScene } from './scenes/Hub';
import { BoxingScene } from './scenes/Boxing';
import { FootballScene } from './scenes/Football';
import { HiveScene } from './scenes/Hive';
import { AcornScene } from './scenes/Acorn';
import { DiveScene } from './scenes/Dive';
import { PounceScene } from './scenes/Pounce';
import { TrashScene } from './scenes/Trash';
import { ShadowScene } from './scenes/Shadow';
import { LassoScene } from './scenes/Lasso';
import { ChampionScene } from './scenes/Champion';
import { InterludeScene } from './scenes/Interlude';
import { Mock2Scene } from './scenes/Mock2';
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
  backgroundColor: '#3a1f1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },
  input: { activePointers: 3 },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, TitleScene, HubScene, BoxingScene, FootballScene, HiveScene, AcornScene, DiveScene, PounceScene, TrashScene, ShadowScene, LassoScene, ChampionScene, InterludeScene, Mock2Scene, PauseScene],
});
(window as any).__game = game;
installContextLossGuard(game);
installDiag(game);
installAutoBake(game);
bootStage('phaser');
checkForUpdate(game);
