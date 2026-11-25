import floor1Cameras from '../../data/rooms/1/camera_view.json';
import floor2Cameras from '../../data/rooms/2/camera_view.json';
import floor3Cameras from '../../data/rooms/3/camera_view.json';
import floor4Cameras from '../../data/rooms/4/camera_view.json';
import { FloorManager } from '../engine/FloorManager';

interface RoomModuleData {
    id?: string;
    name?: string;
    cameras?: Record<string, { active: boolean }>;
    ways?: Record<string, number>;
    specialWays?: Record<string, number>;
    spots?: { id: string }[];
    isSpecial?: boolean;
}

const roomModules = import.meta.glob<RoomModuleData>('../../data/rooms/**/?f*.json', {
    eager: true,
    import: 'default',
});

export interface CameraData {
    id: string;
    name: string;

    ways: Record<string, number>;
    specialWays?: Record<string, number>;

    cameras: Record<string, {
        active: boolean;
    }>;

    spots: {
        id: string;
    }[];

    isSpecial: boolean;
}

interface CameraInfo {
    name: string;
    active: boolean;
}

export const cameraDataMap: Record<string, CameraInfo> = {};

const roomNameMap: Record<string, string> = {};

for (const data of Object.values(roomModules)) {
    if (data?.id) {
        roomNameMap[data.id] = data.name ?? data.id;
    }

    if (!data?.cameras) continue;

    for (const [cameraId, cameraConfig] of Object.entries(data.cameras)) {
        cameraDataMap[cameraId] = {
            name: data.name ?? cameraId,
            active: cameraConfig?.active ?? true,
        };
    }
}
console.log(cameraDataMap);
export function getRoomIdFromCamera(cameraId: string): string {
    return cameraId.split('.').slice(0, 2).join('.');
}

function normalizeCameraId(cameraId: string): string {
    if (cameraDataMap[cameraId]) return cameraId;

    const withSpot = `${cameraId}.1`;

    if (cameraDataMap[withSpot]) return withSpot;

    return cameraId;
}

function buildFloorMap(): Record<number, { cameras: string[] } | undefined> {
    const raw: Record<number, { cameras: string[] }> = {
        1: floor1Cameras,
        2: floor2Cameras,
        3: floor3Cameras,
        4: floor4Cameras
    };

    const map: Record<number, { cameras: string[] } | undefined> = {};

    for (const [floor, config] of Object.entries(raw)) {
        map[Number(floor)] = {
            cameras: (config.cameras ?? []).map(normalizeCameraId)
        };
    }

    return map;
}

export const floorMap: Record<number, { cameras: string[] } | undefined> = buildFloorMap();

export function getCameraName(camera: string): string {
    return cameraDataMap[camera]?.name
        ?? roomNameMap[getRoomIdFromCamera(camera)]
        ?? camera;
}

export function getNextCamera(
    floor: number,
    activeCamera: string,
    floorManager: FloorManager,
    prev = false
): string {
    const cameras = floorMap[floor]?.cameras ?? [];

    const defaultCamera = `${floor}f.1s.1`;

    if (cameras.length === 0) return defaultCamera;

    const activeFloor = floorManager.getFloorFromCamera(activeCamera);

    if (activeFloor !== floor) {
        return prev
            ? cameras.at(-1) ?? defaultCamera
            : cameras[0] ?? defaultCamera;
    }

    const currentIndex = cameras.indexOf(activeCamera);

    if (currentIndex === -1) {
        return cameras[0] ?? defaultCamera;
    }

    const step = prev ? -1 : 1;

    const nextIndex =
        (currentIndex + step + cameras.length) % cameras.length;

    return cameras[nextIndex] ?? defaultCamera;
}
