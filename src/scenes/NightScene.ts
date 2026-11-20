import Phaser from 'phaser';
import { RoomView } from '../rendering/RoomView';
import { DEPTH } from '../rendering/depth';
import { GameEvents } from '../ai/events';
import type { IEventEmitter } from '../ai/events';
import { SceneKeys } from './SceneKeys';
import { FloorMapUI, FLOOR_COUNT, floorTextureKey } from '../ui/FloorMapUI';
import { profile, moneyWord } from '../meta/profile';
import { ITEM_NAMES, ITEM_ORDER } from '../meta/items';

import { floorMap } from './Cameras'
import { MonitorController } from '../ui/MonitorController';
import { MinigameManager } from '../ai/behaviors/special/MinigameManager';
import { MonsterManager } from '../ai/MonsterManager';

const ROOM_SIZE = { width: 1678, height: 1119 };

const VIEW_TARGETS = {
    default: { fx: 0.42, fy: 0.54, zoom: 1 },
    computer: { fx: 0.41, fy: 0.71, zoom: 1.4 },
    board: { fx: 0.33, fy: 0.21, zoom: 1.3 },
    door: { fx: 0.66, fy: 0.33, zoom: 1.4 }
} as const;

type SideView = keyof typeof VIEW_TARGETS;

const NIGHT_HOUR_MS = 60_000;
const NIGHT_END_MS = 6 * NIGHT_HOUR_MS;
const DEV_MODE = true;

const PAN_MS = 450;

function formatNightClock(elapsedMs: number): string {
    const totalMinutes = Math.floor(elapsedMs / 1000);
    const hour = Math.floor(totalMinutes / 60);
    const minute = Math.min(59, totalMinutes % 60);
    const hh = hour === 0 ? '12' : String(hour);
    return `${hh}:${String(minute).padStart(2, '0')}`;
}

export class NightScene extends Phaser.Scene {
    private bus!: IEventEmitter;
    private minigameManager!: MinigameManager;
    private monsterManager!: MonsterManager;
    private roomView!: RoomView;
    private hintText!: Phaser.GameObjects.Text;
    private timeText!: Phaser.GameObjects.Text;
    private lootText!: Phaser.GameObjects.Text;
    private floorMap!: FloorMapUI;
    private monitorController!: MonitorController;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;

    private night = 1;
    private elapsedMs = 0;
    private nightOver = false;

    private readonly camView = { x: 0, y: 0, zoom: 1 };

    private sideView: SideView = 'default';

    constructor() {
        super({ key: SceneKeys.NightScene });
    }

    init(data: { night?: number }): void {
        this.night = data?.night ?? profile.nightsPassed + 1;
        this.elapsedMs = 0;
        this.nightOver = false;
        this.sideView = 'default';
    }

    preload(): void {
        this.load.image('classroom-photo', 'assets/rooms/4/4f.420.png');
        this.load.audio('sfx_hover', 'assets/sounds/ui_hover.wav');
        this.load.audio('sfx_click', 'assets/sounds/ui_click.wav');

        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
            console.warn(`Failed to load asset: ${file.key} (${file.url})`);
        });

        for (let floor = 1; floor <= FLOOR_COUNT; floor++) {
            this.load.image(floorTextureKey(floor), `assets/ui/floors/floor_${floor}.png`);

            const cameras = floorMap[floor]?.cameras ?? [];
            for (const cameraKey of cameras) {
                const path = `assets/rooms/${floor}/${cameraKey}.jpg`;
                this.load.image(cameraKey, path);
            }
        }
    }

    create(): void {
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        this.sound.stopByKey('theme');
        this.bus = new Phaser.Events.EventEmitter();
        this.monsterManager = new MonsterManager();
        this.minigameManager = new MinigameManager({
            game: this.game,
            events: this.bus,
            monsters: this.monsterManager,
        });

        const cam = this.cameras.main;
        cam.setBounds(0, 0, ROOM_SIZE.width, ROOM_SIZE.height);

        const def = VIEW_TARGETS.default;
        this.camView.x = def.fx * ROOM_SIZE.width;
        this.camView.y = def.fy * ROOM_SIZE.height;
        this.camView.zoom = def.zoom;
        cam.setZoom(this.camView.zoom);
        cam.centerOn(this.camView.x, this.camView.y);

        this.roomView = new RoomView({
            scene: this,
            bus: this.bus,
            roomId: "classroomSpots.id",
            spots: { id: "1", spots: [] },
            backgroundKey: 'classroom-photo',
            backgroundSize: ROOM_SIZE
        });

        this.monitorController = new MonitorController({
            scene: this,
            events: this.bus,
            x: 0,
            y: 0
        });

        this.buildUi();

        this.uiCamera = this.cameras.add();
        this.uiCamera.ignore(this.roomView.layers);
        this.uiCamera.fadeIn(1000, 0, 0, 0);
        this.cameras.main.ignore([
            this.hintText,
            this.timeText,
            this.lootText,
            this.monitorController,
        ]);

        this.input.keyboard?.on('keydown-Q', () => this.lookAt('board'));
        this.input.keyboard?.on('keydown-W', () => this.lookAt('door'));
        this.input.keyboard?.on('keydown-C', () => this.lookAt('computer'));
        this.input.keyboard?.on('keydown-E', () => this.monitorController.toggleMonitor());
        if (DEV_MODE) {
            this.input.keyboard?.on('keydown-M', () => this.debugSkipHour());
        }
        this.input.keyboard?.on('keydown-ESC', () => {
            this.scene.start(SceneKeys.MainMenu);
        });
    }

    update(_time: number, delta: number): void {
        if (this.nightOver) return;

        this.elapsedMs = Math.min(this.elapsedMs + delta, NIGHT_END_MS);
        this.timeText.setText(formatNightClock(this.elapsedMs));

        if (this.elapsedMs >= NIGHT_END_MS) {
            this.winNight();
        }
    }

    private buildUi(): void {
        const controls = ['Q — доска', 'W — дверь', 'E — камеры', 'ESC — меню'];
        if (DEV_MODE) {
            controls.push('M — +1 час (отладка)');
        }

        this.hintText = this.add
            .text(400, 12, controls.join(' · '), {
                color: '#8a8a8a',
                fontSize: '15px'
            })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI);

            this.timeText = this.add
        .text(788, 34, '12:00', { color: '#e8c56a', fontSize: '18px' })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.UI);

    this.lootText = this.add
        .text(788, 588, '', { color: '#bdbdbd', fontSize: '13px', align: 'right' })
        .setOrigin(1, 1)
        .setScrollFactor(0)
        .setDepth(DEPTH.UI);

    this.rebuildLootText();
    }

    private rebuildLootText(): void {
        const lines: string[] = [`Монеты: ${profile.money}`];
        const items = ITEM_ORDER.filter(id => profile.itemCount(id) > 0).map(
            id => `${ITEM_NAMES[id] ?? id} ×${profile.itemCount(id)}`
        );
        lines.push(items.length > 0 ? items.join(' · ') : 'Инвентарь пуст');
        this.lootText.setText(lines.join('\n'));
    }

    private winNight(): void {
        if (this.nightOver) return;
        this.nightOver = true;
        this.timeText.setText('6:00');

        const reward = profile.completeNight(this.night);
        this.rebuildLootText();

        this.add
            .rectangle(400, 300, 800, 600, 0x000000, 0.8)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 10);

        const title = this.add
            .text(400, 240, `Ночь ${this.night} пройдена`, {
                color: '#ffffff',
                fontSize: '36px',
                fontStyle: 'bold'
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 11);

        const rewardText = this.add
            .text(400, 305, `Награда: +${reward} ${moneyWord(reward)}`, {
                color: '#9adf9a',
                fontSize: '22px'
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 11);

        const hint = this.add
            .text(400, 375, 'Любая клавиша — в меню', {
                color: '#8a8a8a',
                fontSize: '15px'
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 11);

        this.cameras.main.ignore([title, rewardText, hint]);

        this.input.keyboard?.removeAllListeners();
        this.input.keyboard?.once(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, () => {
            this.scene.start(SceneKeys.MainMenu);
        });
    }

    private debugSkipHour(): void {
        if (this.nightOver) return;
        this.elapsedMs = Math.min(this.elapsedMs + NIGHT_HOUR_MS, NIGHT_END_MS);
    }

    private moveView(target: { fx: number; fy: number; zoom: number }): void {
        this.tweens.killTweensOf(this.camView);

        this.tweens.add({
            targets: this.camView,
            x: target.fx * ROOM_SIZE.width,
            y: target.fy * ROOM_SIZE.height,
            zoom: target.zoom,
            duration: PAN_MS,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.cameras.main.setZoom(this.camView.zoom);
                this.cameras.main.centerOn(this.camView.x, this.camView.y);
            }
        });
    }

    private lookAt(target: SideView): void {
        if (this.monitorController.monitorOpened) {
            return;
        }

        this.sideView = this.sideView === target ? 'default' : target;
        this.moveView(VIEW_TARGETS[this.sideView]);
        this.playUi('sfx_hover', 0.25);
    }

    private playUi(key: string, volume = 0.4): void {
        if (this.cache.audio.exists(key)) {
            this.sound.play(key, { volume });
        }
    }
}