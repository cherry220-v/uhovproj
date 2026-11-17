import Phaser from 'phaser';
import { DEPTH } from './depth';
import { GameEvents } from '../ai/events';
import type { IEventEmitter, MonsterArrivedEvent, MonsterLeftEvent } from '../ai/events';

export interface RoomSpot {
    id: string;
    /** Координаты в пространстве сцены (центр точки, у монстра origin снизу) */
    x: number;
    y: number;
    /** Порядок монстров между собой внутри слоя MONSTER (кто рисуется поверх) */
    depth?: number;
}

export interface RoomSpotsData {
    id: string;
    spots: RoomSpot[];
}

export interface RoomViewOptions {
    scene: Phaser.Scene;
    bus: IEventEmitter;
    roomId: string;
    spots: RoomSpotsData;
}

export class RoomView {
    public readonly roomId: string;

    private readonly scene: Phaser.Scene;
    private readonly bus: IEventEmitter;

    private readonly bgLayer: Phaser.GameObjects.Layer;
    private readonly monsterLayer: Phaser.GameObjects.Layer;
    private readonly fgLayer: Phaser.GameObjects.Layer;

    private readonly spots: Map<string, RoomSpot> = new Map();

    private readonly monsterView: Phaser.GameObjects.Rectangle;

    constructor(options: RoomViewOptions) {
        this.scene = options.scene;
        this.bus = options.bus;
        this.roomId = options.roomId;

        for (const spot of options.spots.spots) {
            this.spots.set(spot.id, spot);
        }

        this.bgLayer = this.scene.add.layer().setDepth(DEPTH.ROOM_BG);
        this.monsterLayer = this.scene.add.layer().setDepth(DEPTH.MONSTER);
        this.fgLayer = this.scene.add.layer().setDepth(DEPTH.FOREGROUND);

        this.buildBackground();
        this.buildFurniture();

        this.monsterView = this.scene.add
            .rectangle(0, 0, 70, 140, 0xc03a3a)
            .setOrigin(0.5, 1) // точка спота = ноги монстра
            .setVisible(false);
        this.monsterLayer.add(this.monsterView);

        this.bus.on(GameEvents.MonsterArrived, this.onArrived);
        this.bus.on(GameEvents.MonsterLeft, this.onLeft);
    }

    public destroy(): void {
        this.bus.off(GameEvents.MonsterArrived, this.onArrived);
        this.bus.off(GameEvents.MonsterLeft, this.onLeft);
        this.bgLayer.destroy();
        this.monsterLayer.destroy();
        this.fgLayer.destroy();
    }

    private buildBackground(): void {
        const bg = this.scene.add.rectangle(400, 300, 800, 600, 0x141414);
        const wall = this.scene.add.rectangle(400, 310, 700, 420, 0x232323);
        const board = this.scene.add.rectangle(400, 140, 260, 70, 0x1e3a2a);
        this.bgLayer.add([bg, wall, board]);
    }

    private buildFurniture(): void {
        const teacherDesk = this.scene.add.rectangle(400, 300, 220, 34, 0x6b4a2f);
        const deskLeft = this.scene.add.rectangle(190, 360, 220, 34, 0x5d4030);
        const deskRight = this.scene.add.rectangle(610, 360, 220, 34, 0x5d4030);
        this.fgLayer.add([teacherDesk, deskLeft, deskRight]);
    }

    private readonly onArrived = (payload: MonsterArrivedEvent): void => {
        if (payload.roomId !== this.roomId) {
            return;
        }

        const spot = this.spots.get(payload.spotId);
        if (!spot) {
            console.warn(`RoomView[${this.roomId}]: неизвестный спот "${payload.spotId}"`);
            return;
        }

        this.monsterView.setPosition(spot.x, spot.y);
        this.monsterView.setDepth(spot.depth ?? 0);
        this.monsterView.setVisible(true);
    };

    private readonly onLeft = (payload: MonsterLeftEvent): void => {
        if (payload.roomId !== this.roomId) {
            return;
        }
        this.monsterView.setVisible(false);
    };
}
