import type { IMonsterBehavior } from "./behaviors/IMonsterBehavior";
import type { MonsterConfig } from "./MonsterConfig";

export type MonsterState =
    | "idle"
    | "moving"
    | "watching"
    | "attacking"
    | "stunned"
    | "retreating"
    | "dead";

export class Monster {
    public readonly id: string;
    public readonly name: string;

    public readonly intelligence: number;
    public readonly aggression: number;
    public readonly speed: number;
    public readonly perception: number;

    public state: MonsterState = "idle";

    public currentRoom: string;
    public targetRoom: string | null = null;

    private behaviors: IMonsterBehavior[] = [];

    public isActive: boolean = false;
    public isVisible: boolean = false;

    constructor(config: MonsterConfig) {
        this.id = config.id;
        this.name = config.name;

        this.intelligence = config.stats.intelligence;
        this.aggression = config.stats.aggression;
        this.speed = config.stats.speed;
        this.perception = config.stats.perception;

        this.currentRoom = config.startRoom;
    }

    public addBehavior(behavior: IMonsterBehavior): void {
        this.behaviors.push(behavior);
    }

    public removeBehavior(behavior: IMonsterBehavior): void {
        this.behaviors = this.behaviors.filter(
            b => b !== behavior
        );
    }

    public activate(): void {
        this.isActive = true;
    }

    public deactivate(): void {
        this.isActive = false;
        this.state = "idle";
    }

    public update(delta: number): void {
        if (!this.isActive || this.state === "dead") {
            return;
        }

        for (const behavior of this.behaviors) {
            behavior.update(this, delta);
        }
    }

    public setState(state: MonsterState): void {
        this.state = state;
    }

    public moveTo(roomId: string): void {
        this.targetRoom = roomId;
        this.state = "moving";
    }

    public arriveAt(roomId: string): void {
        this.currentRoom = roomId;
        this.targetRoom = null;
        this.state = "idle";
    }

    public kill(): void {
        this.state = "dead";
        this.isActive = false;
    }
}