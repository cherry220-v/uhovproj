import { IBehavior } from "../IBehavior";
import type { BehaviorMeta } from "../IBehavior";
import type { Monster, MonsterState } from "../../Monster";
import type { RoomGraph, RoomConfig } from "../../../engine/RoomConfig";

export interface DefaultMovingConfig {
    default_target: string;
    agression: number;
    spProgression: number;

    chances: {
        s: number;
        sp: number;
        e: number;
    };
}

export class DefaultMovingBehavior extends IBehavior {
    public readonly meta: BehaviorMeta = {
        type: "default_moving",
        name: "Default Moving",
        description: "Стандартное перемещение монстра"
    };

    private dconfig: DefaultMovingConfig;
    private config: DefaultMovingConfig;
    private graph: RoomGraph;

    private tickAccumulator: number = 0;
    private tickInterval: number = 1000;

    private remainingTicks: number = 0;
    private selectedWay: string | null = null;

    private currentHour: number = 0;
    private specialChance: number;

    private isMoving: boolean = false;

    constructor(
        config: DefaultMovingConfig,
        graph: RoomGraph
    ) {
        super();

        this.dconfig = config;
        this.config = config;
        this.graph = graph;

        this.specialChance = config.chances.sp;
    }

    public onAttach(monster: Monster): void {
        monster.targetRoom = this.config.default_target;

        this.quick_target(monster);
    }

    public update(monster: Monster, delta: number): void {
        if (!monster.isActive) return;

        this.tickAccumulator += delta;

        while (this.tickAccumulator >= this.tickInterval) {
            this.tickAccumulator -= this.tickInterval;
            this.processTick(monster);
        }
    }

    private processTick(monster: Monster): void {
        this.currentHour = Math.floor(
            this.tickAccumulator / 60000
        );

        if (this.canAttack(monster)) {
            const action = this.what_to_do(monster);

            switch (action) {
                case "attack":
                    this.attack(monster);
                    return;

                case "special":
                    this.special(monster);
                    return;

                case "nothing":
                    break;
            }
        }

        if (this.isMoving) {
            this.move(monster);
            return;
        }

        const movementChance = Math.min(
            100,
            monster.intelligence * 10
        );

        if (Math.random() * 100 >= movementChance) {
            return;
        }

        this.move(monster);
    }

    public quick_target(monster: Monster): string {
        const room = this.graph.getRoom(monster.currentRoom);

        if (!room) {
            monster.quickTarget = null;
            return "";
        }

        const specialTarget = this.trySpecialWay(room);

        if (specialTarget) {
            monster.quickTarget = specialTarget;
            this.selectedWay = specialTarget;
            this.remainingTicks = room.specialWays![specialTarget];
            this.isMoving = true;

            return specialTarget;
        }

        const target = this.selectWay(room);

        if (!target) {
            monster.quickTarget = null;
            this.selectedWay = null;
            this.isMoving = false;

            return "";
        }

        monster.quickTarget = target;
        this.selectedWay = target;
        this.remainingTicks = room.ways[target];
        this.isMoving = true;

        return target;
    }

    public move(monster: Monster): void {
        if (!this.selectedWay || this.remainingTicks <= 0) {
            this.isMoving = false;
            this.quick_target(monster);
            return;
        }

        this.remainingTicks--;

        if (this.remainingTicks > 0) {
            return;
        }

        monster.currentRoom = this.selectedWay;

        this.isMoving = false;
        this.selectedWay = null;

        if (monster.currentRoom === monster.targetRoom) {
            return;
        }

        this.quick_target(monster);
    }

    public canAttack(monster: Monster): boolean {
        return monster.currentRoom === monster.targetRoom;
    }

    public attack(monster: Monster): void {
        monster.state = "attacking";
    }

    public special(monster: Monster): void {
        monster.state = "special";
        this.config = this.dconfig;
    }

    public what_to_do(
        monster: Monster
    ): "attack" | "special" | "nothing" {
        if (this.canAttack(monster)) {
            return "attack";
        }

        if (Math.random() * 100 < this.specialChance) {
            return "special";
        }

        return "nothing";
    }

    private selectWay(room: RoomConfig): string | null {
        const ways = room.ways;

        const entries = Object.entries(ways);

        if (entries.length === 0) {
            return null;
        }

        const stairs = entries.filter(([id]) => id.endsWith(".s"));
        const others = entries.filter(([id]) => !id.endsWith(".s"));

        const stairChance = Math.min(
            100,
            this.config.chances.s + this.config.agression * 5
        );

        if (stairs.length > 0 && Math.random() * 100 < stairChance) {
            return stairs[Math.floor(Math.random() * stairs.length)][0];
        }

        if (others.length > 0) {
            return others[Math.floor(Math.random() * others.length)][0];
        }

        return stairs[Math.floor(Math.random() * stairs.length)][0];
    }

    private trySpecialWay(room: RoomConfig): string | null {
        if (!room.specialWays) return null;

        for (const [target, chance] of Object.entries(room.specialWays)) {
            if (Math.random() * 100 < Number(chance)) {
                return target;
            }
        }

        return null;
    }
}