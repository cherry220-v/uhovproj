import Phaser from 'phaser';
import { RoomView } from '../rendering/RoomView';
import { DEPTH } from '../rendering/depth';
import { GameEvents } from '../ai/events';
import type { IEventEmitter, MonsterArrivedEvent, MonsterLeftEvent } from '../ai/events';
import classroomSpots from '../../data/rooms/classroom.json';

export class NightScene extends Phaser.Scene {
    private bus!: IEventEmitter;
    private roomView!: RoomView;
    private stateText!: Phaser.GameObjects.Text;

    constructor() {
        super('NightScene');
    }

    create(): void {
        this.sound.stopByKey('theme');
        this.bus = new Phaser.Events.EventEmitter();

        this.roomView = new RoomView({
            scene: this,
            bus: this.bus,
            roomId: classroomSpots.id,
            spots: classroomSpots
        });

        this.stateText = this.add
            .text(12, 10, '', { color: '#9adf9a', fontSize: '14px' })
            .setDepth(DEPTH.UI);

        this.bus.on(GameEvents.MonsterArrived, this.onMonsterArrived);
        this.bus.on(GameEvents.MonsterLeft, this.onMonsterLeft);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.bus.off(GameEvents.MonsterArrived, this.onMonsterArrived);
            this.bus.off(GameEvents.MonsterLeft, this.onMonsterLeft);
            this.roomView.destroy();
        });

        this.time.delayedCall(1500, () => this.demoArrive('door'));
        this.time.delayedCall(4000, () => this.demoArrive('behind_desk'));
        this.time.delayedCall(7000, () =>
            this.bus.emit(GameEvents.MonsterLeft, {
                monsterId: 'teacher',
                roomId: classroomSpots.id
            })
        );
    }

    private demoArrive(spotId: string): void {
        this.bus.emit(GameEvents.MonsterArrived, {
            monsterId: 'teacher',
            roomId: classroomSpots.id,
            spotId
        });
    }

    private readonly onMonsterArrived = (payload: MonsterArrivedEvent): void => {
        this.stateText.setText(`Монстр "${payload.monsterId}" -> ${payload.spotId}`);
    };

    private readonly onMonsterLeft = (_payload: MonsterLeftEvent): void => {
        this.stateText.setText('Монстр ушёл');
    };
}
