import floor1Cameras from '../../data/rooms/1/camera_view.json';
import floor2Cameras from '../../data/rooms/2/camera_view.json';
import floor3Cameras from '../../data/rooms/3/camera_view.json';
import floor4Cameras from '../../data/rooms/4/camera_view.json';
import { FloorManager } from '../engine/FloorManager';

const roomModules = import.meta.glob<{ name: string }>('../../data/rooms/**/?f.**.json', {
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

export const cameraDataMap: Record<string, { name: string; active: boolean }> = {};

for (const data of Object.values(roomModules as Record<string, CameraData>)) {
  if (!data?.cameras) continue;

  for (const [cameraId, cameraConfig] of Object.entries(data.cameras)) {
    console.log(cameraId, cameraConfig);
    cameraDataMap[cameraId] = {
      name: data.name,
      active: cameraConfig.active,
    };
  }
}
console.log(cameraDataMap);

export const floorMap: Record<number, { cameras: string[] } | undefined> = {
    1: floor1Cameras,
    2: floor2Cameras,
    3: floor3Cameras,
    4: floor4Cameras
};

export function getCameraName(camera: string): string {
  return cameraDataMap[camera]?.name ?? camera;
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