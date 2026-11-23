import Phaser from "phaser";
import type { IEventEmitter } from "../engine/events";
import type { SpecialActionRequest } from "../ai/behaviors/special/SpecialAction";

const QTE_CODES: string[] = [
    "tryexcept",
    "learning_log",
    "aefkg*rf2fs3d",
    "OlGaMaNaKoVa2023"
] as const;

const PRINTABLE_KEY = /^[\x20-\x7e]$/;

interface QTEData extends SpecialActionRequest {
    duration?: number;
}

export class QTEScene extends Phaser.Scene {
    private eventsBus: IEventEmitter | undefined;

    private code = "";
    private progress = 0;

    private codeText!: Phaser.GameObjects.Text;
    private progressText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;

    private elapsedMs = 0;
    private duration = 15;
    private startedAt = 0;

    private request!: QTEData;
    private finished = false;

    constructor() {
        super({ key: "QTEScene" });
    }

    public init(data: { eventBus?: IEventEmitter }): void {
        this.eventsBus = data?.eventBus;
    }

    public create(data: QTEData): void {
        this.request = data;
        this.finished = false;
        this.progress = 0;
        this.code = QTE_CODES[Math.floor(Math.random() * QTE_CODES.length)];

        this.duration = data.duration ?? 15;
        this.startedAt = Date.now();
        this.elapsedMs = 0;

        const { width, height } = this.scale;

        const overlay = this.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x000000,
            0.85
        );

        overlay.setDepth(1000);

        this.add.text(width / 2, height * 0.25, "ВВЕДИТЕ КОД", {
            fontSize: "32px",
            color: "#ffffff",
            fontFamily: "monospace"
        }).setOrigin(0.5).setDepth(1001);

        this.codeText = this.add.text(
            width / 2,
            height * 0.45,
            "",
            {
                fontSize: "42px",
                color: "#00ff00",
                fontFamily: "monospace"
            }
        ).setOrigin(0.5).setDepth(1001);

        this.progressText = this.add.text(
            width / 2,
            height * 0.60,
            "",
            {
                fontSize: "22px",
                color: "#ffffff",
                fontFamily: "monospace"
            }
        ).setOrigin(0.5).setDepth(1001);

        this.timerText = this.add.text(
            width / 2,
            height * 0.75,
            "",
            {
                fontSize: "24px",
                color: "#ff4444",
                fontFamily: "monospace"
            }
        ).setOrigin(0.5).setDepth(1001);

        this.add.text(width / 2, height * 0.85,
            "Shift — заглавные буквы и символы (!@#$%^&* …)",
            {
                fontSize: "16px",
                color: "#777777",
                fontFamily: "monospace"
            }
        ).setOrigin(0.5).setDepth(1001);

        this.refreshUI();

        this.input.keyboard?.on(
            "keydown",
            this.handleKey,
            this
        );
    }

    private handleKey(event: KeyboardEvent): void {
        if (this.finished) return;

        if (event.ctrlKey || event.altKey || event.metaKey) return;

        const key = event.key;

        if (!PRINTABLE_KEY.test(key)) return;

        const expected = this.code[this.progress];

        if (key === expected) {
            this.progress++;
        } else {
            this.progress = 0;
        }

        this.refreshUI();

        if (this.progress >= this.code.length) {
            this.finish(true);
        }
    }

    private refreshUI(): void {
        const completed = this.code.slice(0, this.progress);
        const remaining = this.code.slice(this.progress);

        this.codeText.setText(completed + remaining);

        this.codeText.setColor(
            this.progress === this.code.length
                ? "#00ff00"
                : "#ffffff"
        );

        this.progressText.setText(
            `${this.progress} / ${this.code.length}`
        );
    }

    public update(): void {
        if (this.finished) return;

        this.elapsedMs = Date.now() - this.startedAt;

        const remaining = Math.max(
            0,
            this.duration * 1000 - this.elapsedMs
        );

        this.timerText.setText(
            `Время: ${(remaining / 1000).toFixed(1)}`
        );

        if (remaining <= 0) {
            this.finish(false);
        }
    }

    private finish(success: boolean): void {
        if (this.finished) return;

        this.finished = true;

        this.input.keyboard?.off(
            "keydown",
            this.handleKey,
            this
        );

        this.eventsBus?.emit("monster:special-finish", {
            monsterId: this.request.monsterId,
            actionId: this.request.actionId,
            result: { success }
        });

        this.scene.stop();
    }
}