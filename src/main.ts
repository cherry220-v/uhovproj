import Phaser from 'phaser';
import UIPlugin from 'phaser4-rex-plugins/templates/ui/ui-plugin.js';
import { MainMenu } from './scenes/MainMenu';
import { NightScene } from './scenes/NightScene';
import { ShopScene } from './scenes/ShopScene';

import HorrifiFilterPlugin from 'phaser4-rex-plugins/plugins/horrififilter-plugin.js';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    
    // antialias: false,
    // antialiasGL: false,

    powerPreference: "low-power",

    fps: {
        target: 30,
        forceSetTimeOut: true
    },

    render: {
        clearBeforeRender: true,
        preserveDrawingBuffer: false
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    plugins: {
        global: [
            {
                key: 'rexHorrifiFilter',
                plugin: HorrifiFilterPlugin,
                start: true
            }
        ],
        scene: [
            {
                key: 'rexUI',
                plugin: UIPlugin,
                mapping: 'rexUI',
                start: true
            }
        ]
    },
    scene: [MainMenu, NightScene, ShopScene]
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
    (window as unknown as { game: Phaser.Game }).game = game;
}