import type UIPlugin from 'phaser4-rex-plugins/templates/ui/ui-plugin.js';

declare global {
    namespace Phaser {
        interface Scene {
            rexUI: UIPlugin;
        }
    }
}

export {};