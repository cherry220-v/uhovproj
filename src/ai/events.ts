// Контракты событий между AI-слоем и рендером.
// AI-слой не знает про Phaser: ему достаточно этого интерфейса,
// под который структурно подходит и Phaser.Events.EventEmitter.

export interface IEventEmitter {
    on(event: string, fn: (...args: any[]) => void, context?: any): void;
    off(event: string, fn: (...args: any[]) => void, context?: any): void;
    emit(event: string, ...args: any[]): void;
}

// payload события "монстр пришёл в комнату и встал в точку"
export interface MonsterArrivedEvent {
    monsterId: string;
    roomId: string;
    spotId: string;
}

// payload события "монстр покинул комнату"
export interface MonsterLeftEvent {
    monsterId: string;
    roomId: string;
}

// Имена событий в одном месте, чтобы не опечататься в строках
export const GameEvents = {
    MonsterArrived: 'monster:arrived',
    MonsterLeft: 'monster:left'
} as const;
