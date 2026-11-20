import type { IBehavior } from "./behaviors/IBehavior";

const monsterConfigs = import.meta.glob<{ name: string }>('../../data/monsters/*.json', {
  eager: true,
  import: 'default',
});

export type MonsterState =
    | "idle"
    | "moving"
    | "watching"
    | "special"
    | "attacking"
    | "returning";

export class Monster {
    public readonly id: string;
    public readonly name: string;

    public intelligence: number = 0;

    public state: MonsterState = "idle";

    public startRoom: string;
    public currentRoom: string;
    public pose: string | null = "default";
    public targetRoom: string | null = null;
    public quickTarget: string | null = null;


    private behaviors: IBehavior[] = [];

    public isActive: boolean = false;
    public isVisible: boolean = false;

    constructor(
        id: string,
        name: string,
        startRoom: string
    ) {
        this.id = id;
        this.name = name;
        this.startRoom = startRoom;
        this.currentRoom = startRoom;
    }

    public addBehavior(behavior: IBehavior): void {
        this.behaviors.push(behavior);
        behavior.onAttach?.(this);
    }

    public removeBehavior(type: string): void {
        const index = this.behaviors.findIndex(
            b => b.meta.type === type
        );

        if (index === -1) return;

        const behavior = this.behaviors[index];

        behavior.onDetach?.(this);
        this.behaviors.splice(index, 1);
    }

    public getBehavior<T extends IBehavior>(
        type: string
    ): T | undefined {
        return this.behaviors.find(
            b => b.meta.type === type
        ) as T | undefined;
    }

    public hasBehavior(type: string): boolean {
        return this.behaviors.some(
            b => b.meta.type === type
        );
    }

    public update(delta: number): void {
        if (!this.isActive) return;

        for (const behavior of this.behaviors) {
            behavior.update(this, delta);
        }
    }

    public activate(): void {
        this.isActive = true;
    }

    public deactivate(): void {
        this.isActive = false;
    }
}