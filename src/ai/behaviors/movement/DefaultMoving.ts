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
    public static readonly meta: BehaviorMeta = {
        type: "default_moving",
        name: "Default Moving",
        description: "Стандартное перемещение монстра"
    };

    public readonly meta: BehaviorMeta = DefaultMovingBehavior.meta;

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

    // Тики ожидания на споте после прихода в комнату
    private restTicks: number = 0;

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
        monster.spot = this.pickSpot(monster.currentRoom);

        this.quick_target(monster);

        this.restTicks = this.randomRest();
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

        // Стоим на споте комнаты, прежде чем двинуться дальше
        if (this.restTicks > 0) {
            this.restTicks--;
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
        monster.spot = this.pickSpot(monster.currentRoom);

        this.isMoving = false;
        this.selectedWay = null;

        // Цель достигнута — остаёмся стоять на споте, не уходим дальше
        if (monster.currentRoom === monster.targetRoom) {
            return;
        }

        // Пауза на точке: монстр заметно стоит, потом идёт дальше
        this.restTicks = this.randomRest();
    }

    // Сколько тиков (секунд) монстр стоит на споте после прихода
    private randomRest(): number {
        return 3 + Math.floor(Math.random() * 4);
    }

    // Случайный спот комнаты из её data-конфига; без спотов — null
    // (тогда камера берёт первую точку из data/layers)
    private pickSpot(roomId: string): string | null {
        const room = this.graph.getRoom(roomId);
        const spots = room?.spots ?? [];

        if (spots.length === 0) return null;

        return spots[Math.floor(Math.random() * spots.length)].id;
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

    public applyConfig(config: Record<string, unknown>): void {
        if (typeof config.agression === "number") {
            this.config.agression = config.agression;
        }

        if (typeof config.spProgression === "number") {
            this.config.spProgression = config.spProgression;
        }

        if (typeof config.chances === "object" && config.chances !== null) {
            this.config.chances = config.chances as typeof this.config.chances;
        }
}
}