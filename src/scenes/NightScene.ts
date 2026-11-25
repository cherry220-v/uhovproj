import Phaser from 'phaser';
import { RoomView } from '../rendering/RoomView';
import { DEPTH } from '../rendering/depth';
import type { IEventEmitter } from '../engine/events';
import { SceneKeys } from './SceneKeys';
import { FloorMapUI, floorTextureKey } from '../ui/FloorMapUI';
import { profile, moneyWord } from '../meta/profile';
import { ITEM_NAMES, ITEM_ORDER } from '../meta/items';

import { floorMap } from './Cameras'
import { MonitorController } from '../ui/MonitorController';
import { MinigameManager } from '../ai/behaviors/special/MinigameManager';
import { MonsterManager } from '../ai/MonsterManager';
import { MonsterRegistry } from '../ai/MonsterRegistry';
import { MonsterFactory } from '../ai/MonsterFactory';
import { buildRoomGraph } from '../engine/RoomRegistry';
import { getLayerAssets } from '../rendering/CameraLayers';
import { SpecialActionRequest } from '../ai/behaviors/special/SpecialAction';
import { NightManager } from '../systems/NightManager';
import { NightConfig, NightRegistry } from '../systems/NightRegistry';
import { FloorManager } from '../engine/FloorManager';
import HorrifiFilterPlugin from 'phaser4-rex-plugins/plugins/horrififilter-plugin';
import { Monster } from '../ai/Monster';

const ROOM_SIZE = { width: 1600, height: 702 };

const VIEW_TARGETS = {
    default: { fx: 0.45, fy: 0.5, zoom: 1 },
    computer: { fx: 0.46, fy: 0.62, zoom: 1.8 },
    board: { fx: 0.27, fy: 0.3, zoom: 1.3 },
    door: { fx: 0.74, fy: 0.38, zoom: 1.4 }
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
    private floorManager!: FloorManager;
    private nightManager!: NightManager;
    private minigameManager!: MinigameManager;
    private monsterManager!: MonsterManager;
    private roomView!: RoomView;
    private hintText!: Phaser.GameObjects.Text;
    private timeText!: Phaser.GameObjects.Text;
    private lootText!: Phaser.GameObjects.Text;
    private floorMap!: FloorMapUI;
    private monitorController!: MonitorController;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;
    private monitorCamera!: Phaser.Cameras.Scene2D.Camera;

    private nightConfig?: NightConfig;
    private night = 1;
    private elapsedMs = 0;
    private nightOver = false;

    private sideView: SideView = 'default';

    constructor() {
        super({ key: SceneKeys.NightScene });
    }

    init(data: { night?: number }): void {
        this.night = data?.night ?? profile.nightsPassed + 1;
        this.elapsedMs = 0;
        this.nightOver = false;
        this.sideView = 'default';

        this.floorManager = new FloorManager([
            { id: 1, name: "Первый этаж" },
            { id: 2, name: "Второй этаж" },
            { id: 3, name: "Третий этаж" },
            { id: 4, name: "Четвёртый этаж" }
        ]);

        this.nightConfig = NightRegistry.get(`night_${this.night}`);

        if (this.nightConfig) {
        const activeIds = Object.entries(this.nightConfig.floors ?? {})
            .filter(([_, isActive]) => isActive)
            .map(([id]) => Number(id));

        this.floorManager.setActiveFloors(activeIds);
        }
    }

    preload(): void {
        this.load.image('classroom-photo', 'assets/rooms/4/4f.420.b.jpg');
        this.load.image('classroom-computer', 'assets/rooms/4/layers/computer.png')
        this.load.image('classroom-desk', 'assets/rooms/4/layers/desk.png')
        this.load.image('classroom-door', 'assets/rooms/4/layers/door.png')

        this.load.audio('sfx_hover', 'assets/sounds/ui_hover.wav');
        this.load.audio('sfx_click', 'assets/sounds/ui_click.wav');

        this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
            console.warn(`Не загрузился ассет: ${file.key} (${file.url})`);
        });

        for (let floor = 1; floor <= 4; floor++) {
            this.load.image(floorTextureKey(floor), `assets/ui/floors/floor_${floor}.png`);
        }

        this.floorManager.getActiveFloors().forEach(floor => {
            const cameras = floorMap[floor.id]?.cameras ?? [];

            for (const cameraId of cameras) {
                this.load.image(cameraId, `assets/rooms/${floor.id}/${cameraId}.jpg`);
            }
        });

        for (const config of MonsterRegistry.getAll()) {
            this.load.image(`monster_${config.id}`, `assets/monsters/${config.id}.png`);
        }

        for (const asset of getLayerAssets()) {
            this.load.image(asset.key, `assets/rooms/${asset.floor}/layers/${asset.file}.png`);
        }
    }

    create(): void {
        this.cameras.main.fadeIn(1000, 0, 0, 0);

        this.sound.stopByKey('theme');

        this.bus = new Phaser.Events.EventEmitter();
        this.monsterManager = new MonsterManager({events: this.bus});
        this.nightManager = new NightManager(this.nightConfig!, {
            monsters: this.monsterManager,
            events: this.bus,
            setFloorActive: (floor, active) => {
                this.floorManager.setFloorActive(floor, active);
            },

            onHourChanged: (hour) => {
                console.log(`Night hour: ${hour}`);
            },

            onNightFinished: () => {
                console.log("Night finished!");
            }
        });
        this.minigameManager = new MinigameManager({
            game: this.game,
            events: this.bus,
            monsters: this.monsterManager,
        });

        const monsterFactory = new MonsterFactory({
            events: this.bus,
            graph: buildRoomGraph()
        });

        for (const config of MonsterRegistry.getAll()) {
            this.monsterManager.add(monsterFactory.create(config));
        }

        this.bus.on(
            "minigame:accept",
            this.runMinigame,
            this
        );

        this.bus.on(
            "monster:attack",
            this.endGame,
            this
        );

        this.roomView = new RoomView({
            scene: this,
            bus: this.bus,
            roomId: "classroomSpots.id",
            spots: { id: "1", spots: [] },
            backgroundKey: 'classroom-photo',
            backgroundSize: ROOM_SIZE
        });
        this.roomView.addLayer(
            "classroom-computer",
            "classroom-computer",
            { x: 605, y: 299 },
            () => this.computerClicked()
        );
        this.roomView.addLayer(
            "classroom-desk",
            "classroom-desk",
            { x: 205, y: 25 },
            () => this.deskClicked()
        );
        this.roomView.addLayer(
            "classroom-door",
            "classroom-door",
            { x: 1105, y: 53 },
            () => console.log("door")
        );

        this.monitorCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        const horrifiPlugin = new HorrifiFilterPlugin(this.plugins);
        let horrify = horrifiPlugin.add(this.monitorCamera, {
            enable: true,

            bloomEnable: false,
            bloomRadius: 10,
            bloomIntensity: 0.5,
            bloomThreshold: 0.5,

            chromaticEnable: true,
            chabIntensity: 0.3,

            vignetteEnable: false,
            vignetteStrength: 0.5,
            vignetteIntensity: 0.5,

            noiseEnable: true,
            noiseStrength: 0.2,
            noiseSeed: 0.5,

            vhsEnable: true,
            vhsStrength: 0.3,

            scanlinesEnable: true,
            scanStrength: 0.3,

            crtEnable: false,
            crtWidth: 2,
            crtHeight: 2
        });

        this.monitorController = new MonitorController({
            scene: this,
            camera: this.monitorCamera,
            floorManager: this.floorManager,
            events: this.bus,
            monsters: this.monsterManager,
            x: 0,
            y: 0
        });
        this.monitorController.updateMonitorVHS(horrify);
        this.add.existing(this.monitorController);


        const worldObjects = this.children.list.filter(
            obj => obj !== this.monitorController
        );

        this.monitorCamera.ignore(worldObjects);
        this.monitorCamera.ignore(this.monitorController.floorMap);

        this.buildUi();

        this.uiCamera = this.cameras.add();
        this.add.existing(this.monitorController.floorMap);

        this.uiCamera.ignore([
            ...this.roomView.layers,
            this.monitorController,
        ]);

        this.uiCamera.fadeIn(1000, 0, 0, 0);

        this.cameras.main.ignore([
            this.hintText,
            this.timeText,
            this.lootText,
            this.monitorController,
        ]);

        this.uiCamera.addToRenderList(this.monitorController.floorMap);
        this.nightManager.startNight();
    }

    private isMinigameActive(): boolean {
        return !this.scene.isActive("NightScene");
    }

    update(_time: number, delta: number): void {
        if (this.nightOver) return;

        this.monsterManager.update(delta);
        this.monitorController.refresh();

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

    private computerClicked(): void {
        console.log("computerClicked");
        this.monitorController.toggleMonitor();
        this.bus.emit("player:cameras");
    }

    private deskClicked(): void {
        const deskMinigameEmit: SpecialActionRequest = {
            monsterId: "manakova",
            actionId: "special_desk",
            roomId: "4f.420",
            sceneId: "DeskScene",
            duration: 10
        };
        this.bus.emit("minigame:accept", deskMinigameEmit);
        this.scene.pause("NightScene");
        this.scene.launch("DeskScene");
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

    private endGame(request: {monster: Monster, deathText: string}): void {
        this.scene.start("DeathScene", {
            monsterId: request.monster.id,
            monsterName: request.monster.name,
            deathText: request.deathText
    });
    }

    private runMinigame(request: SpecialActionRequest): void {
        this.roomView.disableHotkeys();
        this.scene.pause("NightScene");
        this.scene.launch(request.sceneId, { ...request, eventBus: this.bus });
    }

    private debugSkipHour(): void {
        if (this.nightOver) return;
        this.elapsedMs = Math.min(this.elapsedMs + NIGHT_HOUR_MS, NIGHT_END_MS);
    }

    private playUi(key: string, volume = 0.4): void {
        if (this.cache.audio.exists(key)) {
            this.sound.play(key, { volume });
        }
    }
}