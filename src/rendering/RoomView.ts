import Phaser from 'phaser';
import { DEPTH } from './depth';
import { GameEvents } from '../ai/events';
import type { IEventEmitter } from '../ai/events';

export interface RoomSize {
    width: number;
    height: number;
}

export interface RoomSpot {
    id: string;
    x: number;
    y: number;
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
    backgroundKey: string;
    backgroundSize: RoomSize;
    spots: RoomSpotsData;
}

export class RoomView {
    public readonly roomId: string;

    private readonly scene: Phaser.Scene;
    private readonly bus: IEventEmitter;

    private readonly bgLayer: Phaser.GameObjects.Layer;
    private readonly monsterLayer: Phaser.GameObjects.Layer;
    private readonly fgLayer: Phaser.GameObjects.Layer;
    private readonly backgroundKey?: string;
    private readonly backgroundSize?: RoomSize;

    private readonly spots: Map<string, RoomSpot> = new Map();

    private readonly monsterView: Phaser.GameObjects.Rectangle;

    constructor(options: RoomViewOptions) {
        this.scene = options.scene;
        this.bus = options.bus;
        this.roomId = options.roomId;
        this.backgroundKey = options.backgroundKey;
        this.backgroundSize = options.backgroundSize;

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
    }

    public destroy(): void {
        this.bgLayer.destroy();
        this.monsterLayer.destroy();
        this.fgLayer.destroy();
    }

    private buildBackground(): void {
        if (this.backgroundKey) {
            const { width, height } = this.scene.scale;

            const bg = this.scene.add.image(0, 0, this.backgroundKey)
                .setOrigin(0, 0)
                .setScrollFactor(1)
                .setDepth(1);

            this.bgLayer.add(bg);
        } else {
            const bg = this.scene.add.rectangle(
                0, 0, 800, 600, 0x141414
            ).setOrigin(0, 0);

            this.bgLayer.add(bg);
        }
    }

    private buildFurniture(): void {
    }

    public get layers(): Phaser.GameObjects.Layer[] {
        return [this.bgLayer, this.monsterLayer, this.fgLayer];
    }

}
