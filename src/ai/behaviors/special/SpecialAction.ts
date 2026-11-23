export interface SpecialActionRequest {
    monsterId: string;
    actionId: string;
    sceneId: string;
    roomId: string;
    duration?: number;
}

export interface SpecialActionResult {
    success?: boolean;
    ignored?: boolean;
}
