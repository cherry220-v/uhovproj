export interface FloorConfig {
    id: number;
    name?: string;
    active?: boolean;
}

export class FloorManager {
    private floors: Map<number, FloorConfig> = new Map();

    constructor(configs: FloorConfig[] = []) {
        for (const config of configs) {
            this.addFloor(config);
        }
    }

    public addFloor(config: FloorConfig): void {
        if (this.floors.has(config.id)) {
            console.warn(`Floor ${config.id} already exists`);
            return;
        }

        this.floors.set(config.id, {
            ...config,
            active: config.active ?? false
        });
    }

    public removeFloor(id: number): boolean {
        return this.floors.delete(id);
    }

    public getFloor(id: number): FloorConfig | undefined {
        return this.floors.get(id);
    }

    public getAll(): FloorConfig[] {
        return Array.from(this.floors.values());
    }

    public hasFloor(id: number): boolean {
        return this.floors.has(id);
    }

    public get activeFloorsIds(): number[] {
        return this.getActiveFloors().map(floor => floor.id);
    }

    public isActive(id: number): boolean {
        return this.floors.get(id)?.active ?? false;
    }

    public setFloorActive(id: number, active: boolean): void {
        const floor = this.floors.get(id);
        if (floor) floor.active = active;
    }

    public setActiveFloors(ids: number[]): void {
        const activeIds = new Set(ids);

        for (const floor of this.floors.values()) {
            floor.active = activeIds.has(floor.id);
        }
    }

    public getFloorFromCamera(cameraId: string): number | undefined {
        const match = cameraId.match(/^(\d+)f\./);

        if (!match) return undefined;

        const floor = Number(match[1]);

        if (![1, 2, 3, 4].includes(floor)) return undefined;

        return floor;
    }

    public isCameraFloorActive(cameraId: string): boolean {
        const floor = this.getFloorFromCamera(cameraId);

        return floor !== undefined && this.isActive(floor);
    }

    public getActiveFloors(): FloorConfig[] {
        return this.getAll().filter(floor => floor.active);
    }

    public deactivateAll(): void {
        for (const floor of this.floors.values()) {
            floor.active = false;
        }
    }

    public get size(): number {
        return this.floors.size;
    }

    public clear(): void {
        this.floors.clear();
    }

    public destroy(): void {
        this.clear();
    }
}