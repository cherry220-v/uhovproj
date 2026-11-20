import Phaser from 'phaser';

export class GlitchManager
{
    private readonly scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public addTitleGlitch(title: Phaser.GameObjects.Text): void {
    this.scene.time.addEvent({
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

            this.scene.time.delayedCall(50, () => {
                title.setPosition(originalX, originalY);
                title.setAlpha(1);
            });
        }
    });
    
    }
    public addScreenGlitches(): void {
    this.scene.time.addEvent({
        delay: 2000,
        loop: true,

        callback: () => {
            if (Math.random() > 0.45) return;

            const y = Phaser.Math.Between(0, this.scene.scale.height);
            const height = Phaser.Math.Between(1, 4);

            const glitch = this.scene.add.rectangle(
                this.scene.scale.width / 2,
                y,
                this.scene.scale.width,
                height,
                0xffffff,
                0.15
            ).setDepth(90);

            this.scene.tweens.add({
                targets: glitch,
                alpha: 0,
                duration: 100,
                onComplete: () => glitch.destroy()
            });
        }
    });
    }
    public addRandomTextCorruption(
    target: Phaser.GameObjects.Text,
    originalText: string,
    interval: number = 2500
): void {
    const glitchCharacters = "█▓▒░╳ЖФЫЭ#%@&!?0123456789";

    this.scene.time.addEvent({
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

            this.scene.time.delayedCall(70, () => {
                target.setText(originalText);
                target.setPosition(originalX, originalY);
                target.setAlpha(1);
            });
        }
    });
    }
    public addCensorshipGlitch(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.scene.time.addEvent({
        delay: 1800,
        loop: true,
        callback: () => {
            if (Math.random() > 0.55) return;

            const x = Phaser.Math.Between(30, width - 30);
            const y = Phaser.Math.Between(30, height - 30);

            const blockWidth = Phaser.Math.Between(25, 90);
            const blockHeight = Phaser.Math.Between(20, 65);
            const cellSize = Phaser.Math.Between(5, 12);

            const container = this.scene.add.container(x, y);
            container.setDepth(90);
            container.setAlpha(0);

            const background = this.scene.add.rectangle(
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

                    const cell = this.scene.add.rectangle(
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

            this.scene.tweens.add({
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