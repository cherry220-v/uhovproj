import type { IMonsterBehavior, BehaviorMeta } from "./IBehavior";

export type BehaviorConstructor = new (config: any) => IMonsterBehavior;

interface BehaviorRegistration {
    metadata: BehaviorMeta;
    constructor: BehaviorConstructor;
}

export class BehaviorRegistry {
    private static behaviors = new Map<string, BehaviorRegistration>();

    public static register(
        metadata: BehaviorMeta,
        constructor: BehaviorConstructor
    ): void {
        if (this.behaviors.has(metadata.type)) {
            throw new Error(`Behavior "${metadata.type}" already registered`);
        }

        this.behaviors.set(metadata.type, {
            metadata,
            constructor
        });
    }

    public static get(type: string): BehaviorRegistration | undefined {
        return this.behaviors.get(type);
    }

    public static getAll(): BehaviorMeta[] {
        return Array.from(this.behaviors.values())
            .map(behavior => behavior.metadata);
    }

    public static has(type: string): boolean {
        return this.behaviors.has(type);
    }
}