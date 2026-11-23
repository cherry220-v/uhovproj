import {
    ENERGY_MAX,
    ENERGY_IDLE_DRAIN_PER_SEC,
    ENERGY_CAMERA_DRAIN_PER_SEC,
} from "./rules";

export type EnergyDepletionListener = () => void;

export class Energy {
    public readonly max: number = ENERGY_MAX;

    private _current: number;
    private _cameraActive: boolean = false;

    private _depleted: boolean = false;

    private readonly depletionListeners: Set<EnergyDepletionListener> = new Set();

    constructor() {
        this._current = this.max;
    }

    get current(): number {
        return this._current;
    }

    get ratio(): number {
        return this.max > 0 ? this._current / this.max : 0;
    }

    get isFull(): boolean {
        return this._current >= this.max;
    }

    get isDepleted(): boolean {
        return this._current <= 0;
    }

    get isCameraActive(): boolean {
        return this._cameraActive;
    }

    onDepleted(listener: EnergyDepletionListener): () => void {
        this.depletionListeners.add(listener);
        return () => {
            this.depletionListeners.delete(listener);
        };
    }

    setCameraActive(active: boolean): void {
        this._cameraActive = active;
    }

    update(deltaMs: number): void {
        if (this._depleted) return;

        const seconds = deltaMs / 1000;
        let rate = ENERGY_IDLE_DRAIN_PER_SEC;
        if (this._cameraActive) {
            rate += ENERGY_CAMERA_DRAIN_PER_SEC;
        }

        this._current = Math.max(0, this._current - rate * seconds);

        if (this._current <= 0) {
            this._current = 0;
            this._depleted = true;
            this.fireDepleted();
        }
    }

    drain(amount: number): number {
        if (amount <= 0 || this._depleted) return 0;

        const before = this._current;
        this._current = Math.max(0, this._current - amount);

        if (this._current <= 0) {
            this._current = 0;
            this._depleted = true;
            this.fireDepleted();
        }

        return before - this._current;
    }

    restore(amount: number): number {
        if (amount <= 0 || this._depleted) return 0;

        const before = this._current;
        this._current = Math.min(this.max, this._current + amount);
        return this._current - before;
    }

    refill(): void {
        this._current = this.max;
        this._depleted = false;
    }

    resetForNight(): void {
        this._current = this.max;
        this._cameraActive = false;
        this._depleted = false;
    }

    private fireDepleted(): void {
        for (const listener of this.depletionListeners) {
            listener();
        }
    }
}
