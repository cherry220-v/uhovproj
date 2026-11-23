import type { IEventEmitter } from "../../../engine/events";
import type { MonsterManager } from "../../MonsterManager";
import { ISpecialActionBehavior } from "../IBehavior";
import type {
    SpecialActionRequest,
    SpecialActionResult
} from "./SpecialAction";

interface MinigameManagerOptions {
    game: Phaser.Game;
    events: IEventEmitter;
    monsters: MonsterManager;
}

export class MinigameManager {
    private events: IEventEmitter;
    private monsters: MonsterManager;
    private game: Phaser.Game;

    private activeRequest: SpecialActionRequest | null = null;
    private ignoreTimer?: Phaser.Time.TimerEvent;
    private pendingRequest: SpecialActionRequest | null = null;
    
    constructor(options: MinigameManagerOptions) {
        this.game = options.game;
        this.events = options.events;
        this.monsters = options.monsters;

        this.events.on(
            "monster:special-start",
            this.startSpecial,
            this
        );

        this.events.on(
            "monster:special-finish",
            this.finishSpecial,
            this
        );

        this.events.on(
            "minigame:accept",
            this.onAcceptMinigame,
            this
        );
    }

    private onAcceptMinigame(request: SpecialActionRequest): void {
        if (this.activeRequest) return;

        this.activeRequest = request;
        this.pendingRequest = null;

        this.events.emit("monitor:minigame-pending-end", request);
    }

    private startSpecial(request: SpecialActionRequest): void {
        if (this.pendingRequest) return;

        this.pendingRequest = request;

        this.events.emit("monitor:minigame-pending", request);

        this.game.sound.play("qte_alarm");
    }

    private finishSpecial(event: {
        monsterId: string;
        actionId: string;
        result: SpecialActionResult;
    }): void {
        if (!this.activeRequest) return;

        if (
            event.monsterId !== this.activeRequest.monsterId ||
            event.actionId !== this.activeRequest.actionId
        ) return;

        const request = this.activeRequest;

        this.activeRequest = null;

        this.ignoreTimer?.remove();
        this.ignoreTimer = undefined;

        if (this.game.scene.isActive("QTEScene")) {
            this.game.scene.stop("QTEScene");
        }

        const monster = this.monsters.getById(event.monsterId);
        if (!monster) return;

        const behavior = monster.getBehavior<ISpecialActionBehavior>(
            "special_action"
        );

        if (!behavior) return;

        behavior.resolve(event.result.success === true);

        if (event.result.ignored) {
            this.applyIgnorePenalty(request);
        }
    }

    private applyIgnorePenalty(
        request: SpecialActionRequest
    ): void {
        console.log("Ты проигнорировал специальное событие. Мы порвём тебе туз")
    }

    public destroy(): void {
        this.ignoreTimer?.remove();

        this.events.off(
            "monster:special-start",
            this.startSpecial,
            this
        );

        this.events.off(
            "monster:special-finish",
            this.finishSpecial,
            this
        );

        this.events.off(
            "minigame:accept",
            this.onAcceptMinigame,
            this
        );
    }
}