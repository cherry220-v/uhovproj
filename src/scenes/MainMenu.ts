import Phaser from 'phaser';
import { MenuButton } from '../ui/MenuButton';
import { SceneKeys } from './SceneKeys';

const MUSIC_FADE_IN_MS = 3000;
const MUSIC_FADE_OUT_MS = 1000;
export const SCREEN_FADE_OUT_MS = 1200;

export class MainMenu extends Phaser.Scene {
    private music?: Phaser.Sound.WebAudioSound;
    private isFadingOut = false;
    private isStarting = false;

    constructor() {
        super({ key: SceneKeys.MainMenu });
    }

    preload(): void {
        this.load.audio('theme', ['assets/sounds/theme.ogg']);
        this.load.audio('sfx_hover', 'assets/sounds/ui_hover.wav');
        this.load.audio('sfx_click', 'assets/sounds/ui_click.wav');
        this.load.image('menu-bg', 'assets/menu/menu-bg.png');
    }

    create(): void {
        this.music = this.sound.add('theme', {
            loop: true,
            volume: 0.05
        }) as Phaser.Sound.WebAudioSound;

        const startMusicWithFade = (): void => {
            this.music?.play();
            this.tweens.add({
                targets: this.music,
                volume: 0.5,
                duration: 3000,
                ease: 'Linear'
            });
        };

        if (!this.sound.locked) {
            startMusicWithFade();
        } else {
            this.sound.once(Phaser.Sound.Events.UNLOCKED, startMusicWithFade);
        }

        let bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'menu-bg');
        bg.displayWidth = this.scale.width;
        bg.displayHeight = this.scale.height;

        const camera = this.cameras.main;
        const vignette = camera.filters.internal.addVignette(0.5, 0.5, 1.1, 0.5);

        const title = this.add.text(
            400,
            140,
            'FIVE NIGHTS AT RKSI',
            {
                color: '#e8e8e8',
                fontSize: '40px',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);

        this.addTitleGlitch(title);

        this.addRandomTextCorruption(
            title,
            "FIVE NIGHTS AT RKSI",
            3000
        );

        this.tweens.add({
            targets: title,
            alpha: { from: 0.85, to: 1 },
            duration: 1800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        let subtitle = this.add.text(400, 190, 'колледж, который не отпустит', {
            color: '#ffffff',
            fontSize: '16px'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: subtitle,
            alpha: { from: 0.45, to: 0.9 },
            duration: 10660,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        this.addScreenGlitches();
        this.addCensorshipGlitch();

        new MenuButton({
            scene: this,
            x: 400,
            y: 300,
            label: 'Начать ночь',
            fontSize: '32px',
            textColor: '#ffffff',
            backgroundColor: 0x333333,
            width: 280,
            height: 64,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click',
            fadeOutMs: SCREEN_FADE_OUT_MS,
            onFadeStart: () => this.fadeOutMusic(),
            onClick: () => this.scene.start(SceneKeys.NightScene)
        });

        new MenuButton({
            scene: this,
            x: 400,
            y: 390,
            label: 'Магазин',
            fontSize: '32px',
            textColor: '#ffffff',
            backgroundColor: 0x333333,
            width: 280,
            height: 64,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click',
            fadeOutMs: SCREEN_FADE_OUT_MS,
            onClick: () => this.scene.start(SceneKeys.ShopScene)
        });
    }

    private startGame(): void {
        if (this.isStarting) {
            return;
        }
        this.isStarting = true;

        if (!this.music) {
            this.scene.start(SceneKeys.NightScene);
            return;
        }

        this.tweens.killTweensOf(this.music);

        this.tweens.add({
            targets: this.music,
            volume: 0,
            duration: 1500,
            ease: 'Linear',
            onComplete: () => {
                this.music?.stop();
                this.music?.destroy();
                this.music = undefined;
                this.scene.start(SceneKeys.NightScene);
            }
        });
    }

    private fadeOutMusic(): void {
        this.isFadingOut = true;
        if (!this.music) return;

        this.tweens.killTweensOf(this.music);
        this.tweens.add({
            targets: this.music,
            volume: 0,
            duration: MUSIC_FADE_OUT_MS,
            ease: 'Linear',
            onComplete: () => {
                this.music?.stop();
                this.music?.destroy();
                this.music = undefined;
            }
        });
    }

    private addTitleGlitch(title: Phaser.GameObjects.Text): void {
    this.time.addEvent({
        delay: 3000,
        loop: true,

        callback: () => {
            if (Math.random() > 0.6) return;

            const originalX = 400;
            const originalY = 140;

            title.setPosition(
                originalX + Phaser.Math.Between(-4, 4),
                originalY + Phaser.Math.Between(-2, 2)
            );

            title.setAlpha(Phaser.Math.FloatBetween(0.4, 0.8));

            this.time.delayedCall(50, () => {
                title.setPosition(originalX, originalY);
                title.setAlpha(1);
            });
        }
    });
    
    }
    private addScreenGlitches(): void {
    this.time.addEvent({
        delay: 2000,
        loop: true,

        callback: () => {
            if (Math.random() > 0.45) return;

            const y = Phaser.Math.Between(0, this.scale.height);
            const height = Phaser.Math.Between(1, 4);

            const glitch = this.add.rectangle(
                this.scale.width / 2,
                y,
                this.scale.width,
                height,
                0xffffff,
                0.15
            ).setDepth(90);

            this.tweens.add({
                targets: glitch,
                alpha: 0,
                duration: 100,
                onComplete: () => glitch.destroy()
            });
        }
    });
    }
    private addRandomTextCorruption(
    target: Phaser.GameObjects.Text,
    originalText: string,
    interval: number = 2500
): void {
    const glitchCharacters = "█▓▒░╳ЖФЫЭ#%@&!?0123456789";

    this.time.addEvent({
        delay: interval,
        loop: true,
        callback: () => {
            if (Math.random() > 0.65) return;

            const corrupted = originalText.split("");

            const count = Phaser.Math.Between(1, 4);

            for (let i = 0; i < count; i++) {
                const index = Phaser.Math.Between(0, corrupted.length - 1);

                if (corrupted[index] !== " ") {
                    corrupted[index] = glitchCharacters[
                        Phaser.Math.Between(0, glitchCharacters.length - 1)
                    ];
                }
            }

            const originalX = target.x;
            const originalY = target.y;

            target.setText(corrupted.join(""));

            target.setPosition(
                originalX + Phaser.Math.Between(-3, 3),
                originalY + Phaser.Math.Between(-2, 2)
            );

            target.setAlpha(Phaser.Math.FloatBetween(0.4, 0.8));

            this.time.delayedCall(70, () => {
                target.setText(originalText);
                target.setPosition(originalX, originalY);
                target.setAlpha(1);
            });
        }
    });
    }
    private addCensorshipGlitch(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.time.addEvent({
        delay: 1800,
        loop: true,
        callback: () => {
            if (Math.random() > 0.55) return;

            const x = Phaser.Math.Between(30, width - 30);
            const y = Phaser.Math.Between(30, height - 30);

            const blockWidth = Phaser.Math.Between(25, 90);
            const blockHeight = Phaser.Math.Between(20, 65);
            const cellSize = Phaser.Math.Between(5, 12);

            const container = this.add.container(x, y);
            container.setDepth(90);
            container.setAlpha(0);

            const background = this.add.rectangle(
                0,
                0,
                blockWidth,
                blockHeight,
                0x000000,
                0.35
            );

            container.add(background);

            for (let px = -blockWidth / 2; px < blockWidth / 2; px += cellSize) {
                for (let py = -blockHeight / 2; py < blockHeight / 2; py += cellSize) {
                    if (Math.random() > 0.7) continue;

                    const colors = [
                        0x000000,
                        0x222222,
                        0x666666,
                        0xaaaaaa,
                        0xffffff
                    ];

                    const color = Phaser.Utils.Array.GetRandom(colors);

                    const cell = this.add.rectangle(
                        px,
                        py,
                        cellSize,
                        cellSize,
                        color,
                        Phaser.Math.FloatBetween(0.2, 0.8)
                    );

                    container.add(cell);
                }
            }

            this.tweens.add({
                targets: container,
                alpha: 1,
                duration: 60,
                yoyo: true,
                hold: Phaser.Math.Between(70, 180),
                onComplete: () => {
                    container.destroy();
                }
            });
        }
    });
    }

}
