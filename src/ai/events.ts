import { SpecialActionRequest, SpecialActionResult } from "./behaviors/special/SpecialAction";

export interface IEventEmitter {
    on(event: string, fn: (...args: any[]) => void, context?: any): void;
    off(event: string, fn: (...args: any[]) => void, context?: any): void;
    emit(event: string, ...args: any[]): void;
}

export interface MonsterMovedEvent {
    monsterId: string;
    roomId: string;
    spotId: string;
}

export interface MonsterTickEvent {
    monsterId: string;
    roomId: string;
}

export interface GameEvents {
    "monster:special-start": SpecialActionRequest;
    "monster:special-finish": {
        monsterId: string;
        actionId: string;
        result: SpecialActionResult;
    };
    "monster:tick": MonsterTickEvent;
    "monster:move": MonsterMovedEvent;
}