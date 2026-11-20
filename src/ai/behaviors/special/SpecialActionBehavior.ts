import { IEventEmitter } from "../../events";
import type { Monster } from "../../Monster";
import type { ISpecialActionBehavior, BehaviorMeta } from "../IBehavior";
import { SpecialActionRequest } from "./SpecialAction";

export interface SpecialActionConfig {
    actionId: string;
    sceneId: string;
    roomId: string;
    duration?: number;
}

export class SpecialActionBehavior implements ISpecialActionBehavior {
    public readonly meta: BehaviorMeta = {
        type: "qte_special",
        name: "QTE Special",
        description: "Handles monster special actions and minigames"
    };

    private config: SpecialActionConfig;
    private events: IEventEmitter;

    private active = false;
    private elapsed = 0;
    private resolved = false;

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

    public update(monster: Monster, delta: number): void {
        if (this.resolved) return;

        if (!this.active && monster.state === "special") {
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
            sceneId: this.config.sceneId,
            actionId: this.config.actionId,
            roomId: this.config.roomId,
            duration: this.config.duration,
        };

        this.events.emit("monster:special-start", request);
    }

    public resolve(success: boolean): void {
        if (!this.active || this.resolved) return;

        this.resolved = true;
        this.active = false;

        if (!this.monster) {
            this.reset();
            return;
        }

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