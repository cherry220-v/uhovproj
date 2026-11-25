import Phaser from "phaser";
import { DEPTH } from "../rendering/depth";

interface DeathSceneData {
    monsterId: string;
    monsterName: string;
    deathText?: string;
}

export class DeathScene extends Phaser.Scene {
    private monsterId: string = "";
    private monsterName: string = "";
    private deathText: string = "";

    private deathTitle!: Phaser.GameObjects.Text;
    private deathMessage!: Phaser.GameObjects.Text;
    private monsterText!: Phaser.GameObjects.Text;
    private continueText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: "DeathScene" });
    }

    public init(data: DeathSceneData): void {
        this.monsterId = data.monsterId;
        this.monsterName = data.monsterName;
        this.deathText = data.deathText ?? "Вы не пережили эту ночь.";
    }

    public preload(): void {
        this.load.image('bg-death', 'assets/ui/deathbg.png');
    }

    public create(): void {
        const width = this.scale.width;
        const height = this.scale.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const bg = this.add.image(
            0,
            0,
            "bg-death"
        );
        bg
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDisplaySize(this.scale.width, this.scale.height)
            .setDepth(DEPTH.ROOM_BG);

        bg.setAlpha(0);

        this.tweens.add({
            targets: bg,
            alpha: 1,
            duration: 1200,
            ease: "Sine.easeIn"
        });

        const flash = this.add.rectangle(
            centerX,
            centerY,
            width,
            height,
            0x8b0000
        );

        flash.setAlpha(0);

        this.tweens.add({
            targets: flash,
            alpha: { from: 0.7, to: 0 },
            duration: 1200,
            ease: "Cubic.easeOut"
        });

        this.deathTitle = this.add.text(
            centerX,
            height * 0.22,
            "ВЫ ПОГИБЛИ",
            {
                fontFamily: "Arial",
                fontSize: "64px",
                color: "#8b0000",
                fontStyle: "bold",
                stroke: "#000000",
                strokeThickness: 8,
                align: "center"
            }
        );

        this.deathTitle.setOrigin(0.5);
        this.deathTitle.setAlpha(0);
        this.deathTitle.setScale(1.5);

        this.tweens.add({
            targets: this.deathTitle,
            alpha: 1,
            scale: 1,
            duration: 800,
            ease: "Cubic.easeOut"
        });

        this.monsterText = this.add.text(
            centerX,
            height * 0.42,
            `Причина: ${this.monsterName}`,
            {
                fontFamily: "Arial",
                fontSize: "26px",
                color: "#b5b5b5",
                align: "center"
            }
        );

        this.monsterText.setOrigin(0.5);
        this.monsterText.setAlpha(0);

        this.tweens.add({
            targets: this.monsterText,
            alpha: 1,
            duration: 1000,
            delay: 400
        });

        this.deathMessage = this.add.text(
            centerX,
            height * 0.56,
            this.deathText,
            {
                fontFamily: "Arial",
                fontSize: "30px",
                color: "#d6d6d6",
                align: "center",
                wordWrap: { width: width * 0.8 },
                stroke: "#000000",
                strokeThickness: 4
            }
        );

        this.deathMessage.setOrigin(0.5);
        this.deathMessage.setAlpha(0);

        this.tweens.add({
            targets: this.deathMessage,
            alpha: 1,
            duration: 1000,
            delay: 1000
        });

        this.continueText = this.add.text(
            centerX,
            height * 0.82,
            " [ ВЕРНУТЬСЯ В МЕНЮ ] ",
            {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#777777"
            }
        );

        this.continueText.setOrigin(0.5);
        this.continueText.setAlpha(0);
        this.continueText.setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: this.continueText,
            alpha: 1,
            duration: 1000,
            delay: 1800
        });

        this.continueText.on("pointerover", () => {
            this.continueText.setColor("#ff4444");
        });

        this.continueText.on("pointerout", () => {
            this.continueText.setColor("#777777");
        });

        this.continueText.on("pointerdown", () => {
            this.scene.start("MainMenu");
        });

        this.tweens.add({
            targets: this.deathTitle,
            alpha: { from: 1, to: 0.65 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.createGlitch();

        this.createVignette();

        this.createShake();
    }

    private createGlitch(): void {
        this.time.addEvent({
            delay: Phaser.Math.Between(1500, 4000),
            callback: () => {
                if (!this.scene.isActive()) return;

                const targets = [
                    this.deathTitle,
                    this.deathMessage,
                    this.monsterText
                ];

                const target = Phaser.Utils.Array.GetRandom(targets);
                const originalX = target.x;

                target.x += Phaser.Math.Between(-12, 12);

                this.time.delayedCall(80, () => {
                    if (!target.scene) return;
                    target.x = originalX;
                });

                this.createGlitch();
            }
        });
    }

    private createVignette(): void {
        const width = this.scale.width;
        const height = this.scale.height;

        const edges = [
            this.add.rectangle(width / 2, 8, width, 16, 0x000000),
            this.add.rectangle(width / 2, height - 8, width, 16, 0x000000),
            this.add.rectangle(8, height / 2, 16, height, 0x000000),
            this.add.rectangle(width - 8, height / 2, 16, height, 0x000000)
        ];

        edges.forEach(edge => {
            edge.setAlpha(0.8);
        });
    }

    private createShake(): void {
        this.cameras.main.setBounds(0, 0, this.scale.width, this.scale.height);

        this.time.addEvent({
            delay: Phaser.Math.Between(3000, 6000),
            callback: () => {
                if (!this.scene.isActive()) return;

                this.cameras.main.shake(150, 0.003);
                this.createShake();
            }
        });
    }
}