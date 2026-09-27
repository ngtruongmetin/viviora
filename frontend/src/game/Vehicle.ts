import { Container, Sprite, Texture } from 'pixi.js';
import type { CollisionBody, CollisionRect } from './collision';

export type VehicleDirection = 'right' | 'up' | 'left' | 'down';
type Point = { x: number; y: number };

export type VehicleRoutePoint = {
  direction: VehicleDirection;
  position: Point;
  tileIds: readonly number[];
  widthTiles: number;
  heightTiles: number;
};

export type VehicleRoute = {
  id: string;
  points: readonly VehicleRoutePoint[];
  speed?: number;
  loopMode?: 'closed' | 'respawn';
};

type VehicleOptions = {
  tileTextures: readonly Texture[];
  tileSize: number;
  route: VehicleRoute;
};

export function tileCenter(
  tileX: number,
  tileY: number,
  widthTiles: number,
  heightTiles: number,
  tileSize: number,
): Point {
  return {
    x: (tileX + widthTiles / 2) * tileSize,
    y: (tileY + heightTiles / 2) * tileSize,
  };
}

export class Vehicle implements CollisionBody {
  readonly view = new Container();
  private readonly tileTextures: readonly Texture[];
  private readonly tileSize: number;
  private readonly speed: number;
  private readonly route: readonly VehicleRoutePoint[];
  private readonly loopMode: 'closed' | 'respawn';
  private routeIndex = 0;
  private widthTiles: number;
  private heightTiles: number;

  constructor({ tileTextures, tileSize, route }: VehicleOptions) {
    if (route.points.length < 2) {
      throw new Error(`Vehicle route "${route.id}" needs at least two points`);
    }

    this.tileTextures = tileTextures;
    this.tileSize = tileSize;
    this.speed = route.speed ?? 40;
    this.route = route.points;
    this.loopMode = route.loopMode ?? 'closed';
    this.widthTiles = route.points[0].widthTiles;
    this.heightTiles = route.points[0].heightTiles;
    this.view.label = `vehicle:${route.id}`;
    this.view.zIndex = 100;
    this.applyRoutePoint(this.route[0]);
    this.view.position.copyFrom(this.route[0].position);
  }

  update(
    deltaSeconds: number,
    playerBounds?: CollisionRect,
    obstacles: readonly CollisionBody[] = [],
  ) {
    let remainingDistance = this.speed * Math.max(0, deltaSeconds);

    while (remainingDistance > 0) {
      const nextIndex = (this.routeIndex + 1) % this.route.length;
      const target = this.route[nextIndex];
      const deltaX = target.position.x - this.view.x;
      const deltaY = target.position.y - this.view.y;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance === 0) {
        this.routeIndex = nextIndex;
        this.applyRoutePoint(target);
        if (this.shouldRespawn()) this.tryRespawn(playerBounds, obstacles);
        continue;
      }

      const travelDistance = Math.min(remainingDistance, distance);
      const nextX = this.view.x + (deltaX / distance) * travelDistance;
      const nextY = this.view.y + (deltaY / distance) * travelDistance;

      if (!this.canOccupy(nextX, nextY, playerBounds, obstacles)) return;

      this.view.position.set(nextX, nextY);
      remainingDistance -= travelDistance;

      if (travelDistance === distance) {
        this.routeIndex = nextIndex;
        this.applyRoutePoint(target);
        if (this.shouldRespawn()) {
          this.tryRespawn(playerBounds, obstacles);
          remainingDistance = 0;
        }
      }
    }
  }

  destroy() {
    this.view.destroy({ children: true });
  }

  getCollisionBounds(x = this.view.x, y = this.view.y): CollisionRect {
    const halfWidth = (this.widthTiles * this.tileSize) / 2;
    const halfHeight = (this.heightTiles * this.tileSize) / 2;
    return {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - halfHeight,
      bottom: y + halfHeight,
    };
  }

  private canOccupy(
    x: number,
    y: number,
    playerBounds: CollisionRect | undefined,
    obstacles: readonly CollisionBody[],
  ) {
    if (playerBounds && rectanglesOverlap(this.getCollisionBounds(x, y), playerBounds))
      return false;
    return !obstacles.some((obstacle) =>
      rectanglesOverlap(this.getCollisionBounds(x, y), obstacle.getCollisionBounds()),
    );
  }

  private shouldRespawn() {
    return this.loopMode === 'respawn' && this.routeIndex === this.route.length - 1;
  }

  private tryRespawn(playerBounds: CollisionRect | undefined, obstacles: readonly CollisionBody[]) {
    const spawn = this.route[0];
    if (!this.canOccupy(spawn.position.x, spawn.position.y, playerBounds, obstacles)) return;
    this.routeIndex = 0;
    this.applyRoutePoint(spawn);
    this.view.position.copyFrom(spawn.position);
  }

  private applyRoutePoint(point: VehicleRoutePoint) {
    this.widthTiles = point.widthTiles;
    this.heightTiles = point.heightTiles;
    const expectedTileCount = point.widthTiles * point.heightTiles;
    if (point.tileIds.length !== expectedTileCount) {
      throw new Error(
        `Vehicle route point needs ${expectedTileCount} tiles, received ${point.tileIds.length}`,
      );
    }

    this.view.removeChildren().forEach((child) => child.destroy());
    point.tileIds.forEach((tileId, index) => {
      const texture = this.tileTextures[tileId];
      if (!texture) throw new Error(`Missing vehicle tile texture ${tileId}`);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.roundPixels = true;
      sprite.x =
        (index % point.widthTiles) * this.tileSize - ((point.widthTiles - 1) * this.tileSize) / 2;
      sprite.y =
        Math.floor(index / point.widthTiles) * this.tileSize -
        ((point.heightTiles - 1) * this.tileSize) / 2;
      this.view.addChild(sprite);
    });
  }
}

function rectanglesOverlap(first: CollisionRect, second: CollisionRect) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}
