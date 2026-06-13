import Phaser from 'phaser';
import Boot        from './scenes/Boot.js';
import MainMenu    from './scenes/MainMenu.js';
import LevelSelect from './scenes/LevelSelect.js';
import Game        from './scenes/Game.js';
import LevelComplete from './scenes/LevelComplete.js';

const W = 480, H = 854;

const config = {
  type: Phaser.AUTO,
  width:  W,
  height: H,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, MainMenu, LevelSelect, Game, LevelComplete],
};

new Phaser.Game(config);
