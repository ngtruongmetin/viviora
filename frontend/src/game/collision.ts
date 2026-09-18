import type { TiledLayer, TiledMap } from './tiled';

const GID_MASK = 0x0fffffff;
const WALKABLE_LAYER_NAMES = new Set(['Road', 'Ground', 'Grass', 'Stairs']);

export type CollisionRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type CollisionBody = {
  getCollisionBounds(): CollisionRect;
};

export type PlayerCollision = {
  canOccupy(x: number, y: number, halfWidth: number, height: number): boolean;
};

export class TiledCollisionMap implements PlayerCollision {
  private readonly walkableLayers: TiledLayer[];
  private readonly blockingLayers: TiledLayer[];

  constructor(private readonly map: TiledMap) {
    this.walkableLayers = map.layers.filter((layer) => WALKABLE_LAYER_NAMES.has(layer.name));
    this.blockingLayers = map.layers.filter((layer) => !WALKABLE_LAYER_NAMES.has(layer.name));

    if (!this.walkableLayers.length) {
      throw new Error('The map must contain a Road or Ground layer for player movement');
    }
  }

  canOccupy(x: number, y: number, halfWidth: number, height: number) {
    const minTileX = Math.floor((x - halfWidth) / this.map.tileWidth);
    const maxTileX = Math.floor((x + halfWidth - Number.EPSILON) / this.map.tileWidth);
    const minTileY = Math.floor((y - height) / this.map.tileHeight);
    const maxTileY = Math.floor((y - Number.EPSILON) / this.map.tileHeight);

    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
        if (!this.isWalkableTile(tileX, tileY) || this.isBlockedTile(tileX, tileY)) {
          return false;
        }
      }
    }

    return true;
  }

  private isWalkableTile(tileX: number, tileY: number) {
    return this.walkableLayers.some((layer) => this.hasTile(layer, tileX, tileY));
  }

  private isBlockedTile(tileX: number, tileY: number) {
    return this.blockingLayers.some((layer) => this.hasTile(layer, tileX, tileY));
  }

  private hasTile(layer: TiledLayer, tileX: number, tileY: number) {
    if (tileX < 0 || tileY < 0 || tileX >= layer.width || tileY >= layer.height) {
      return false;
    }

    const gid = layer.gids[tileY * layer.width + tileX];
    return (gid & GID_MASK) !== 0;
  }
}
