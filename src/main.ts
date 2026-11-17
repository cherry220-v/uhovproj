import Phaser from 'phaser';
import { MainMenu } from './scenes/MainMenu';
import { NightScene } from './scenes/NightScene';
import { ShopScene } from './scenes/ShopScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainMenu, NightScene, ShopScene]
};

const game = new Phaser.Game(config);
