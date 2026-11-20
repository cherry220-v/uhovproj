import { BehaviorRegistry } from "./BehaviorRegistry";
import type { IMonsterBehavior } from "./IBehavior";

export interface BehaviorConfig {
    type: string;
    config?: any;
}

export class BehaviorManager {

    public static create(config: BehaviorConfig): IMonsterBehavior {
        const registration = BehaviorRegistry.get(config.type);

        if (!registration) {
            throw new Error(`Unknown behavior: ${config.type}`);
        }

        return new registration.constructor(config.config ?? {});
    }

    public static createMany(configs: BehaviorConfig[]): IMonsterBehavior[] {
        return configs.map(config => this.create(config));
    }
}