import { tileCenter, type VehicleDirection, type VehicleRoute, type VehicleRoutePoint } from './Vehicle';

type TilePoint = {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: VehicleDirection;
  tileIds: readonly number[];
  spriteWidth: number;
  spriteHeight: number;
};

function point(tileSize: number, config: TilePoint): VehicleRoutePoint {
  return {
    direction: config.direction,
    position: tileCenter(config.x, config.y, config.width, config.height, tileSize),
    tileIds: config.tileIds,
    widthTiles: config.spriteWidth,
    heightTiles: config.spriteHeight,
  };
}

const currentVehicle: TilePoint[] = [
  { x: 5, y: 20, width: 2, height: 1, direction: 'right', tileIds: [480, 481], spriteWidth: 2, spriteHeight: 1 },
  { x: 54, y: 20, width: 1, height: 2, direction: 'up', tileIds: [400, 427], spriteWidth: 1, spriteHeight: 2 },
  { x: 54, y: 14, width: 2, height: 1, direction: 'left', tileIds: [453, 454], spriteWidth: 2, spriteHeight: 1 },
  { x: 6, y: 14, width: 1, height: 2, direction: 'down', tileIds: [399, 426], spriteWidth: 1, spriteHeight: 2 },
];

const northEastVehicle: TilePoint[] = [
  { x: 22, y: 37, width: 1, height: 2, direction: 'up', tileIds: [400, 427], spriteWidth: 1, spriteHeight: 2 },
  { x: 22, y: 19, width: 1, height: 2, direction: 'right', tileIds: [480, 481], spriteWidth: 2, spriteHeight: 1 },
  { x: 50, y: 19, width: 2, height: 1, direction: 'right', tileIds: [480, 481], spriteWidth: 2, spriteHeight: 1 },
  { x: 51, y: 19, width: 1, height: 2, direction: 'down', tileIds: [399, 426], spriteWidth: 1, spriteHeight: 2 },
  { x: 51, y: 37, width: 1, height: 2, direction: 'down', tileIds: [399, 426], spriteWidth: 1, spriteHeight: 2 },
];

const upperLoopVehicle: TilePoint[] = [
  { x: 1, y: 18, width: 2, height: 2, direction: 'right', tileIds: [393, 394, 420, 421], spriteWidth: 2, spriteHeight: 2 },
  { x: 51, y: 18, width: 2, height: 2, direction: 'right', tileIds: [393, 394, 420, 421], spriteWidth: 2, spriteHeight: 2 },
  { x: 51, y: 18, width: 1, height: 2, direction: 'up', tileIds: [398, 425], spriteWidth: 1, spriteHeight: 2 },
  { x: 51, y: 1, width: 1, height: 2, direction: 'up', tileIds: [398, 425], spriteWidth: 1, spriteHeight: 2 },
];

const centerLeftVehicle: TilePoint[] = [
  { x: 39, y: 37, width: 1, height: 2, direction: 'up', tileIds: [398, 425], spriteWidth: 1, spriteHeight: 2 },
  { x: 39, y: 16, width: 1, height: 2, direction: 'up', tileIds: [398, 425], spriteWidth: 1, spriteHeight: 2 },
  { x: 39, y: 16, width: 1, height: 2, direction: 'left', tileIds: [393, 394, 420, 421], spriteWidth: 2, spriteHeight: 2 },
  { x: 5, y: 16, width: 2, height: 2, direction: 'left', tileIds: [393, 394, 420, 421], spriteWidth: 2, spriteHeight: 2 },
  { x: 6, y: 16, width: 1, height: 2, direction: 'up', tileIds: [398, 425], spriteWidth: 1, spriteHeight: 2 },
  { x: 6, y: 1, width: 1, height: 2, direction: 'up', tileIds: [398, 425], spriteWidth: 1, spriteHeight: 2 },
];

const farRightVehicle: TilePoint[] = [
  { x: 55, y: 37, width: 1, height: 2, direction: 'up', tileIds: [452, 479], spriteWidth: 1, spriteHeight: 2 },
  { x: 55, y: 1, width: 1, height: 2, direction: 'up', tileIds: [452, 479], spriteWidth: 1, spriteHeight: 2 },
];

const leftMiddleVehicle: TilePoint[] = [
  { x: 43, y: 37, width: 1, height: 2, direction: 'up', tileIds: [452, 479], spriteWidth: 1, spriteHeight: 2 },
  { x: 43, y: 16, width: 1, height: 2, direction: 'up', tileIds: [452, 479], spriteWidth: 1, spriteHeight: 2 },
  { x: 42, y: 16, width: 2, height: 2, direction: 'left', tileIds: [447, 448, 474, 475], spriteWidth: 2, spriteHeight: 2 },
  { x: 1, y: 16, width: 2, height: 2, direction: 'left', tileIds: [447, 448, 474, 475], spriteWidth: 2, spriteHeight: 2 },
];

export function createVehicleRoutes(tileSize: number): VehicleRoute[] {
  return [
    { id: 'existing-road-loop', points: currentVehicle.map((config) => point(tileSize, config)), speed: 40, loopMode: 'closed' },
    { id: 'north-east-turn', points: northEastVehicle.map((config) => point(tileSize, config)), speed: 36, loopMode: 'respawn' },
    { id: 'upper-loop', points: upperLoopVehicle.map((config) => point(tileSize, config)), speed: 33, loopMode: 'respawn' },
    { id: 'center-left-turn', points: centerLeftVehicle.map((config) => point(tileSize, config)), speed: 34, loopMode: 'respawn' },
    { id: 'far-right-lane', points: farRightVehicle.map((config) => point(tileSize, config)), speed: 30, loopMode: 'respawn' },
    { id: 'left-middle-turn', points: leftMiddleVehicle.map((config) => point(tileSize, config)), speed: 32, loopMode: 'respawn' },
  ];
}
