export interface SpecialActionRequest {
    monsterId: string;
    actionId: string;
    sceneId: string;
    roomId: string;
    duration?: number;
}

export type SpecialActionResult =
    | { success: true }
    | { success: false }
    | { ignored: true };