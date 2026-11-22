import { SpecialActionRequest, SpecialActionResult } from "../ai/behaviors/special/SpecialAction";

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
    "night:start": {nightId: number; duration: number;};
    "night:end": {gameOver: boolean;};
    "night:tick": {time: string;};

    "player:move": {};
    "player:cameras": {};
    "player:door": {};

    "monster:special-start": SpecialActionRequest;
    "monster:special-finish": {
        monsterId: string;
        actionId: string;
        result: SpecialActionResult;
    };
    "monster:tick": MonsterTickEvent;
    "monster:move": MonsterMovedEvent;
    "monitor:minigame-pending": SpecialActionRequest;
    "monitor:minigame-pending-end": SpecialActionRequest;
    "minigame:accept": SpecialActionRequest;
}