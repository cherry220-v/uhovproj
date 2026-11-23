import { IEventEmitter } from "../../../engine/events";
import type { Monster } from "../../Monster";
import type { ISpecialActionBehavior, BehaviorMeta } from "../IBehavior";
import { SpecialActionRequest } from "./SpecialAction";

export interface SpecialActionConfig {
    actionId: string;
    sceneId?: string;
    roomId?: string;
    duration?: number;

    // Минимальная пауза между спецсобытиями, мс
    cooldownMs?: number;
}

const DEFAULT_SCENE_ID = "QTEScene";
const DEFAULT_COOLDOWN_MS = 45_000;

export class SpecialActionBehavior implements ISpecialActionBehavior {
    public readonly meta: BehaviorMeta = {
        type: "special_action",
        name: "QTE Special",
        description: "Handles monster special actions and minigames"
    };

    private config: SpecialActionConfig;
    private events: IEventEmitter;

    private active = false;
    private elapsed = 0;
    private resolved = false;
    private cooldown = 0;

    private monster?: Monster;

    constructor(
        config: SpecialActionConfig,
        events: IEventEmitter
    ) {
        this.config = config;
        this.events = events;
    }

    public onAttach(monster: Monster): void {
        this.monster = monster;
    }

    public onDetach(_monster: Monster): void {
        this.reset();
        this.monster = undefined;
    }

    public applyConfig(_config: Record<string, unknown>): void {
        // Конфиг задаётся конструктором; переопределение на лету не требуется
    }

    public update(monster: Monster, delta: number): void {
        if (this.resolved) return;

        if (this.cooldown > 0) {
            this.cooldown = Math.max(0, this.cooldown - delta);
        }

        if (
            !this.active &&
            this.cooldown <= 0 &&
            monster.state === "special"
        ) {
            this.start(monster);
        }

        if (!this.active) return;

        if (!this.config.duration || this.config.duration <= 0) {
            return;
        }

        this.elapsed += delta;

        if (this.elapsed >= this.config.duration * 1000) {
            this.resolve(false);
        }
    }

    private start(monster: Monster): void {
        if (this.active || this.resolved) return;

        this.active = true;
        this.elapsed = 0;

        let request: SpecialActionRequest = {
            monsterId: monster.id,
            sceneId: this.config.sceneId ?? DEFAULT_SCENE_ID,
            actionId: this.config.actionId,
            // Спецсобытие привязано к комнате, где монстра застали
            roomId: this.config.roomId ?? monster.currentRoom,
            duration: this.config.duration,
        };

        this.events.emit("monster:special-start", request);
    }

    public resolve(success: boolean): void {
        if (!this.active || this.resolved) return;

        this.resolved = true;
        this.active = false;
        this.cooldown = this.config.cooldownMs ?? DEFAULT_COOLDOWN_MS;

        if (!this.monster) {
            this.reset();
            return;
        }

        // Возвращаем монстра к обычному поведению после QTE
        this.monster.state = "idle";

        this.events.emit("monster:special-finish", {
            monsterId: this.monster.id,
            actionId: this.config.actionId,
            result: { success },
        });

        this.reset();
    }

    private reset(): void {
        this.active = false;
        this.elapsed = 0;
        this.resolved = false;
    }
}