import floor1Cameras from '../../data/rooms/1/camera_view.json';
import floor2Cameras from '../../data/rooms/2/camera_view.json';
import floor3Cameras from '../../data/rooms/3/camera_view.json';
import floor4Cameras from '../../data/rooms/4/camera_view.json';
import { FLOOR_COUNT } from '../ui/FloorMapUI';

const roomModules = import.meta.glob<{ name: string }>('../../data/rooms/**/*.json', {
  eager: true,
  import: 'default',
});

interface CameraData {
  id: string;
  name: string;
  ways: {id: number};
  specialWays?: {id: number};
  cameras: {id: {active: boolean}};
  spots: {id: string};
  isSpecial: boolean;
}

const cameraDataMap: Record<string, { name: string }> = {};
  for (const [path, data] of Object.entries(roomModules)) {
    const key = path.split('/').pop()?.replace('.json', '');
    if (key) cameraDataMap[key] = data;
}
export const floorMap: Record<number, { cameras: string[] } | undefined> = {
    1: floor1Cameras,
    2: floor2Cameras,
    3: floor3Cameras,
    4: floor4Cameras
};

export function getCameraName(camera: string): string {
  return cameraDataMap[camera]?.name ?? camera;
}

export function getNextCamera(floor: number, activeCamera: string, prev = false): string {
  const cameras = floorMap[floor]?.cameras ?? [];
  const defaultCamera = `${floor}f.1s`;

  if (cameras.length === 0) return defaultCamera;

  const activeFloor = parseInt(activeCamera, FLOOR_COUNT);
  if (activeFloor !== floor) {
    return (prev ? cameras.at(-1) : cameras.at(0)) ?? defaultCamera;
  }

  const currentIndex = cameras.indexOf(activeCamera);
  console.log(cameras[currentIndex]);
  if (currentIndex === -1) return cameras[0];

  const step = prev ? -1 : 1;
  const nextIndex = (currentIndex + step + cameras.length) % cameras.length;
  console.log(cameras[nextIndex]);

  return cameras[nextIndex];
}
