import { IBehavior } from "../IBehavior";
import type { BehaviorMeta } from "../IBehavior";
import type { Monster } from "../../Monster";
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

type MovingMode = "idle" | "moving" | "returning";

export class DefaultMovingBehavior extends IBehavior {
    public static readonly meta: BehaviorMeta = {
        type: "default_moving",
        name: "Default Moving",
        description: "Стандартное перемещение монстра"
    };

    public readonly meta: BehaviorMeta = DefaultMovingBehavior.meta;

    /** Исходная конфигурация */
    private readonly dconfig: DefaultMovingConfig;

    /** Рабочая конфигурация */
    private config: DefaultMovingConfig;

    /** Текущие накопленные вероятности */
    private chances: {
        s: number;
        sp: number;
        e: number;
    };

    private readonly graph: RoomGraph;

    /** Текущая выбранная точка маршрута */
    private selectedWay: string | null = null;

    /** Сколько шагов осталось пройти до следующей комнаты */
    private remainingTicks: number = 0;

    /** Внутренний режим движения */
    private mode: MovingMode = "idle";

    /** Время до следующего игрового тика */
    private tickAccumulator: number = 0;

    private readonly tickInterval: number = 1000;

    /** Счётчик игровых часов */
    private elapsedGameTicks: number = 0;

    /** Сколько тиков составляет игровой час */
    private readonly ticksPerGameHour: number = 60;

    /** Сколько игровых часов уже обработано */
    private processedHours: number = 0;

    /** Ожидание после посещения комнаты */
    private restTicks: number = 0;

    /** Блокировка обычного движения */
    private blocked: boolean = false;

    constructor(config: DefaultMovingConfig, graph: RoomGraph) {
        super();

        this.dconfig = {
            ...config,
            chances: { ...config.chances }
        };

        this.config = {
            ...config,
            chances: { ...config.chances }
        };

        this.chances = { ...config.chances };
        this.graph = graph;
    }

    public onAttach(monster: Monster): void {
        monster.targetRoom = this.config.default_target;
        monster.spot = this.pickSpot(monster.currentRoom);

        this.mode = "idle";
        this.restTicks = this.randomRest();
        this.selectedWay = null;
        this.remainingTicks = 0;
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
        this.elapsedGameTicks++;

        this.processGameHours();

        if (
            monster.state === "watching" ||
            monster.state === "special" ||
            monster.state === "attacking"
        ) {
            this.blocked = true;
            return;
        }

        if (this.blocked) {
            this.blocked = false;
            this.resetAfterSpecial();
        }

        if (this.mode === "returning") {
            this.processReturning(monster);
            return;
        }

        if (monster.currentRoom === this.config.default_target) {
            this.processAttack(monster);
            return;
        }

        if (this.mode === "moving") {
            this.processMovement(monster);
            return;
        }
        if (this.restTicks > 0) {
            this.restTicks--;
            return;
        }

        const movementChance = Math.min(
            100,
            Math.max(0, monster.intelligence * 10)
        );

        if (Math.random() * 100 >= movementChance) {
            return;
        }

        this.chooseDestination(monster);
    }

    private processGameHours(): void {
        const hours = Math.floor(
            this.elapsedGameTicks / this.ticksPerGameHour
        );

        while (this.processedHours < hours) {
            this.processedHours++;

            this.chances.sp = Math.min(
                100,
                this.chances.sp + this.config.spProgression
            );
        }
    }

    public resetAfterSpecial(): void {
        this.chances = { ...this.dconfig.chances };
    }

    private chooseDestination(monster: Monster): void {
        const room = this.graph.getRoom(monster.currentRoom);

        if (!room) return;

        if (monster.currentRoom === monster.targetRoom) {
            this.processAttack(monster);
            return;
        }

        const destination = this.selectDestination(room);

        if (!destination) {
            this.mode = "idle";
            return;
        }

        const path = this.findPath(
            monster.currentRoom,
            destination
        );

        if (!path || path.length < 2) {
            this.mode = "idle";
            return;
        }

        monster.quickTarget = path[1];

        this.beginMovement(monster, path[1]);
    }

    private selectDestination(room: RoomConfig): string | null {
        const ways = Object.keys(room.ways ?? {});
        if (ways.length === 0) return null;

        const specialWays = Object.keys(room.specialWays ?? {});
        const stairs = ways.filter(id => id.endsWith(".s"));
        const ordinary = ways.filter(id => !id.endsWith(".s"));

        const stairChance = Math.min(
            100,
            Math.max(0, this.chances.s + this.config.agression * 5)
        );

        if (this.chances.sp > 50) {
            const special = this.rollSpecial(specialWays);
            if (special) return special;

            const stair = this.rollStairs(stairs, stairChance);
            if (stair) return stair;
        } else {
            const stair = this.rollStairs(stairs, stairChance);
            if (stair) return stair;

            const special = this.rollSpecial(specialWays);
            if (special) return special;
        }

        if (ordinary.length > 0) {
            return this.randomItem(ordinary);
        }

        if (stairs.length > 0) {
            return this.randomItem(stairs);
        }

        return this.randomItem(ways);
    }

    private rollSpecial(specialWays: string[]): string | null {
        if (specialWays.length === 0) return null;

        if (Math.random() * 100 >= this.chances.sp) {
            return null;
        }

        return this.randomItem(specialWays);
    }

    private rollStairs(
        stairs: string[],
        chance: number
    ): string | null {
        if (stairs.length === 0) return null;

        if (Math.random() * 100 >= chance) {
            return null;
        }

        return this.randomItem(stairs);
    }

    private findPath(
        start: string,
        destination: string
    ): string[] | null {
        if (start === destination) return [start];

        const queue: string[] = [start];
        const visited = new Set<string>([start]);
        const parent = new Map<string, string>();

        while (queue.length > 0) {
            const current = queue.shift()!;

            const room = this.graph.getRoom(current);
            if (!room) continue;

            const neighbors = Object.keys(room.ways ?? {});

            for (const next of neighbors) {
                if (visited.has(next)) continue;

                visited.add(next);
                parent.set(next, current);

                if (next === destination) {
                    return this.buildPath(parent, start, destination);
                }

                queue.push(next);
            }
        }

        return null;
    }

    private buildPath(
        parent: Map<string, string>,
        start: string,
        destination: string
    ): string[] {
        const path: string[] = [];
        let current = destination;

        path.push(current);

        while (current !== start) {
            const previous = parent.get(current);

            if (!previous) {
                return [];
            }

            current = previous;
            path.push(current);
        }

        path.reverse();
        return path;
    }

    private beginMovement(
        monster: Monster,
        destination: string
    ): void {
        const room = this.graph.getRoom(monster.currentRoom);

        if (!room) return;

        const normalDistance = room.ways?.[destination];
        const specialDistance = room.specialWays?.[destination];

        let distance: number | undefined;

        if (typeof normalDistance === "number") {
            distance = normalDistance;
        } else if (typeof specialDistance === "number") {
            distance = specialDistance;
        }

        if (distance === undefined || distance <= 0) {
            this.mode = "idle";
            monster.quickTarget = null;
            return;
        }

        this.selectedWay = destination;
        this.remainingTicks = distance;
        this.mode = "moving";
        monster.state = "moving";
    }

    private processMovement(monster: Monster): void {
        if (!this.selectedWay || this.remainingTicks <= 0) {
            this.finishMovementStep(monster);
            return;
        }

        const movementChance = Math.min(
            100,
            Math.max(0, monster.intelligence * 10)
        );

        if (Math.random() * 100 >= movementChance) {
            return;
        }

        this.remainingTicks--;

        if (this.remainingTicks > 0) {
            return;
        }

        this.finishMovementStep(monster);
    }

    private finishMovementStep(monster: Monster): void {
        if (!this.selectedWay) {
            this.mode = "idle";
            return;
        }

        monster.currentRoom = this.selectedWay;
        monster.spot = this.pickSpot(monster.currentRoom);

        this.selectedWay = null;
        this.remainingTicks = 0;
        this.mode = "idle";

        if (monster.currentRoom === monster.targetRoom) {
            this.processAttack(monster);
            return;
        }

        this.restTicks = this.randomRest();
        monster.state = "idle";
    }

    private processAttack(monster: Monster): void {
        if (monster.currentRoom !== monster.targetRoom) {
            return;
        }

        monster.state = "attacking";
        this.blocked = true;
    }

    public failAttack(monster: Monster): void {
        this.selectedWay = null;
        this.remainingTicks = 0;
        this.restTicks = 0;

        monster.quickTarget = null;

        this.mode = "returning";
        monster.state = "returning";

        this.blocked = false;
    }

    private processReturning(monster: Monster): void {
        if (monster.currentRoom === monster.startRoom) {
            this.finishReturning(monster);
            return;
        }

        if (!this.selectedWay) {
            const path = this.findPath(
                monster.currentRoom,
                monster.startRoom
            );

            if (!path || path.length < 2) {
                this.finishReturning(monster);
                return;
            }

            this.beginReturnStep(monster, path[1]);
            return;
        }

        const movementChance = Math.min(
            100,
            Math.max(0, monster.intelligence * 10)
        );

        if (Math.random() * 100 >= movementChance) {
            return;
        }

        this.remainingTicks--;

        if (this.remainingTicks > 0) {
            return;
        }

        monster.currentRoom = this.selectedWay;
        monster.spot = this.pickSpot(monster.currentRoom);

        this.selectedWay = null;
        this.remainingTicks = 0;

        if (monster.currentRoom === monster.startRoom) {
            this.finishReturning(monster);
        }
    }

    private beginReturnStep(
        monster: Monster,
        destination: string
    ): void {
        const room = this.graph.getRoom(monster.currentRoom);

        if (!room) {
            this.finishReturning(monster);
            return;
        }

        const distance = room.ways?.[destination];

        if (typeof distance !== "number" || distance <= 0) {
            this.finishReturning(monster);
            return;
        }

        this.selectedWay = destination;
        this.remainingTicks = distance;
        monster.quickTarget = destination;
    }

    private finishReturning(monster: Monster): void {
        monster.currentRoom = monster.startRoom;
        monster.spot = this.pickSpot(monster.startRoom);

        monster.quickTarget = null;

        monster.targetRoom = this.config.default_target;

        this.selectedWay = null;
        this.remainingTicks = 0;
        this.restTicks = this.randomRest();

        this.mode = "idle";
        monster.state = "idle";
    }

    private pickSpot(roomId: string): string | null {
        const room = this.graph.getRoom(roomId);
        const spots = room?.spots ?? [];

        if (spots.length === 0) {
            return null;
        }

        return this.randomItem(spots.map(spot => spot.id));
    }

    private randomRest(): number {
        return 3 + Math.floor(Math.random() * 4);
    }

    private randomItem<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)];
    }

    public applyConfig(config: Record<string, unknown>): void {
        if (typeof config.agression === "number") {
            this.config.agression = config.agression;
        }

        if (typeof config.spProgression === "number") {
            this.config.spProgression = config.spProgression;
        }

        if (
            typeof config.chances === "object" &&
            config.chances !== null
        ) {
            const chances = config.chances as Partial<
                DefaultMovingConfig["chances"]
            >;

            this.config.chances = {
                ...this.config.chances,
                ...chances
            };
        }
    }
}