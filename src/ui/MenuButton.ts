import Phaser from 'phaser';

export interface MenuButtonOptions {
    scene: Phaser.Scene;
    x: number;
    y: number;
    label: string;
    onClick: () => void;
    hoverSound?: string;
    clickSound?: string;
    width?: number;
    height?: number;
    fontSize?: string;
    textColor?: string;
    backgroundColor?: number;

    disableAfterClick?: boolean;
    fadeOutMs?: number;
    onFadeStart?: () => void;
}

export class MenuButton extends Phaser.GameObjects.Container {
    private readonly bg: Phaser.GameObjects.Rectangle;
    private readonly label: Phaser.GameObjects.Text;

    private static readonly FILL_IDLE = 0x2e2e2e;
    private static readonly FILL_HOVER = 0x3d3d3d;

    private disableAfterClick: boolean = true;
    private readonly onClick: () => void;
    private readonly onFadeStart?: () => void;
    private readonly hoverSound?: string;
    private readonly clickSound?: string;
    private readonly fadeOutMs?: number;
    private readonly fillIdle: number;
    private readonly fillHover: number;
    private activated = false;

    constructor(options: MenuButtonOptions) {
        super(options.scene, options.x, options.y);

        const width = options.width ?? 240;
        const height = options.height ?? 56;
        this.onClick = options.onClick;
        this.onFadeStart = options.onFadeStart;
        this.hoverSound = options.hoverSound;
        this.clickSound = options.clickSound;
        this.disableAfterClick = options.disableAfterClick ?? true;
        this.fadeOutMs = options.fadeOutMs;
        this.fillIdle = options.backgroundColor ?? MenuButton.FILL_IDLE;
        this.fillHover = options.backgroundColor
            ? MenuButton.lighten(this.fillIdle)
            : MenuButton.FILL_HOVER;

        this.bg = options.scene.add.rectangle(0, 0, width, height, this.fillIdle)
            .setStrokeStyle(1, 0x555555);
        this.label = options.scene.add.text(0, 0, options.label, {
            color: options.textColor ?? '#dcdcdc',
            fontSize: options.fontSize ?? '20px'
        }).setOrigin(0.5);

        this.add([this.bg, this.label]);
        options.scene.add.existing(this);

        this.setSize(width, height);
        this.setInteractive({ useHandCursor: true });

        this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, this.onPointerOver);
        this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, this.onPointerOut);
        this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onPointerDown);
        this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, this.onPointerUp);

        this.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.off(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, this.onPointerOver);
            this.off(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, this.onPointerOut);
            this.off(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.onPointerDown);
            this.off(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, this.onPointerUp);
        });
    }

    private static lighten(color: number, amount = 0x14): number {
        const r = Math.min(0xff, ((color >> 16) & 0xff) + amount);
        const g = Math.min(0xff, ((color >> 8) & 0xff) + amount);
        const b = Math.min(0xff, (color & 0xff) + amount);
        return (r << 16) | (g << 8) | b;
    }

    public setText(text: string): void {
        this.label.setText(text);
    }

    private playIfLoaded(key?: string, volume = 0.4): void {
        if (key && this.scene.cache.audio.exists(key)) {
            this.scene.sound.play(key, { volume });
        }
    }

    private readonly onPointerOver = (): void => {
        if (this.activated) return;
        this.playIfLoaded(this.hoverSound, 0.25);
        this.bg.setFillStyle(this.fillHover);
        this.scene.tweens.add({
            targets: this,
            scale: 1.06,
            duration: 120,
            ease: 'Sine.easeOut'
        });
    };

    private readonly onPointerOut = (): void => {
        if (this.activated) return;
        this.bg.setFillStyle(this.fillIdle);
        this.scene.tweens.add({
            targets: this,
            scale: 1,
            duration: 120,
            ease: 'Sine.easeOut'
        });
    };

    private readonly onPointerDown = (): void => {
        if (this.activated) return;
        this.scene.tweens.add({
            targets: this,
            scale: 0.96,
            duration: 70,
            ease: 'Sine.easeIn'
        });
    };

    private readonly onPointerUp = (): void => {
        if (this.activated) return;

        this.activated = true;
        this.playIfLoaded(this.clickSound);

        this.scene.tweens.add({
            targets: this,
            scale: 1,
            duration: 70,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.activate();
            }
        });
    };

    private activate(): void {
        if (!this.fadeOutMs) {
            this.onClick();

            if (!this.disableAfterClick) {
                this.activated = false;
            }

            return;
        }

        if (this.disableAfterClick) {
            this.disableInteractive();
        }

        this.onFadeStart?.();

        const camera = this.scene.cameras.main;

        camera.fadeOut(this.fadeOutMs, 0, 0, 0);
        camera.once(
            Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            () => this.onClick()
        );
    }
}