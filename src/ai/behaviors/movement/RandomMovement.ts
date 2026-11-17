import type { IMonsterBehavior } from "../IMonsterBehavior";
import type { Monster } from "../../Monster";

interface RandomMovementConfig {
    interval: number;
    availableRooms: string[];
}

export class RandomMovement implements IMonsterBehavior {

    private interval: number;
    private availableRooms: string[];

    constructor(config: RandomMovementConfig) {
        this.interval = config.interval;
        this.availableRooms = config.availableRooms;
    }

    public update(monster: Monster, delta: number): void {
        // random(this.aviableRooms)
    }
}