import Phaser from 'phaser';
import { MenuButton } from '../ui/MenuButton';
import { SceneKeys } from './SceneKeys';
import { GlitchManager } from '../effects/GlitchManager';

import { profile } from '../meta/profile';

const MUSIC_FADE_IN_MS = 3000;
const MUSIC_FADE_OUT_MS = 1000;
export const SCREEN_FADE_OUT_MS = 1200;

export class MainMenu extends Phaser.Scene {
    private glitchManager: GlitchManager = new GlitchManager(this);
    private music?: Phaser.Sound.WebAudioSound;
    private isFadingOut = false;
    private isStarting = false;
    private selectedNight = 1;

    private statsText!: Phaser.GameObjects.Text;
    private nightText!: Phaser.GameObjects.Text;
    private playButton!: MenuButton;
    private prevButton!: MenuButton;
    private nextButton!: MenuButton;
    private resetText!: Phaser.GameObjects.Text;
    private resetArmed = false;

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
        this.music = this.sound.get('theme');
        if (!this.music)
            this.music = this.sound.add('theme', {
                loop: true,
                volume: 0.05
            }) as Phaser.Sound.WebAudioSound;

        const startMusicWithFade = (): void => {
            if (!this.music?.isPlaying)
            {
            this.music?.play();
            this.tweens.add({
                targets: this.music,
                // volume: 0.5,
                volume: 0,
                duration: 3000,
                ease: 'Linear'
            });
            }
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
        camera.filters.internal.addBlur(0, 0.4, 0.4, 1, 0xffffff, 1);

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

        this.glitchManager.addTitleGlitch(title);

        this.glitchManager.addRandomTextCorruption(
            title,
            "FIVE NIGHTS AT RKSI",
            3000
        );

        this.tweens.add({
            targets: title,
            alpha: { from: 1, to: 0.89 },
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

        this.glitchManager.addScreenGlitches();
        this.glitchManager.addCensorshipGlitch();

        this.selectedNight = profile.nightsPassed + 1;

        this.statsText = this.add.text(400, 232, '', {
            color: '#c9c05a',
            fontSize: '16px'
        }).setOrigin(0.5);

        this.prevButton = new MenuButton({
            scene: this,
            x: 235,
            y: 300,
            label: '◀',
            fontSize: '24px',
            width: 64,
            height: 48,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click',
            disableAfterClick: false,
            onClick: () => this.shiftNight(-1)
        });

        this.nightText = this.add.text(400, 300, '', {
            color: '#e8e8e8',
            fontSize: '28px'
        }).setOrigin(0.5);

        this.nextButton = new MenuButton({
            scene: this,
            x: 565,
            y: 300,
            label: '▶',
            fontSize: '24px',
            width: 64,
            height: 48,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click',
            disableAfterClick: false,
            onClick: () => {
                if (profile.isNightUnlocked(this.selectedNight + 1)) {
                    this.selectedNight++;
                    this.updateMenuUi();
                }
            }
        });

        this.playButton = new MenuButton({
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
        
        this.updateMenuUi();

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

    private shiftNight(delta: number): void {
        const nextNight = this.selectedNight + delta;
        console.log("NIGHT SHIFT" + " next night = " + nextNight);

        if (!profile.isNightUnlocked(nextNight)) return;

        this.selectedNight = nextNight;
        this.updateMenuUi();
    }

    private updateMenuUi(): void {
        const maxNight = profile.nightsPassed + 1;

        this.statsText.setText(
            `Монеты: ${profile.money} · Пройдено ночей: ${profile.nightsPassed}`
        );
        this.nightText.setText(`Ночь ${this.selectedNight}`);
        this.playButton.setText(`Начать ночь ${this.selectedNight}`);

        this.prevButton.setAlpha(this.selectedNight > 1 ? 1 : 0.35);
        this.nextButton.setAlpha(this.selectedNight < maxNight ? 1 : 0.35);
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
}
