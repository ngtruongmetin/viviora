import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { TiledMap } from './tiled';

const HORIZONTAL_FLIP_FLAG = 0x80000000;
const VERTICAL_FLIP_FLAG = 0x40000000;
const DIAGONAL_FLIP_FLAG = 0x20000000;
const GID_MASK = 0x0fffffff;

export function createTileTextures(texture: Texture, map: TiledMap): Texture[] {
  texture.source.style.scaleMode = 'nearest';
  const { columns, tileCount, tileWidth, tileHeight } = map.tileset;
  return Array.from({ length: tileCount }, (_, tileIndex) => {
    const column = tileIndex % columns;
    const row = Math.floor(tileIndex / columns);
    return new Texture({
      source: texture.source,
      frame: new Rectangle(column * tileWidth, row * tileHeight, tileWidth, tileHeight),
    });
  });
}

export function renderMap(world: Container, map: TiledMap, tileTextures: Texture[]) {
  const mapContainer = new Container();
  mapContainer.label = 'map';
  const firstGid = map.tileset.firstGid;

  for (const layer of map.layers) {
    const layerContainer = new Container();
    layerContainer.label = layer.name;

    layer.gids.forEach((gid, index) => {
      if (gid === 0) return;

      const tileGid = gid & GID_MASK;
      const tileTexture = tileTextures[tileGid - firstGid];
      if (!tileTexture) return;

      const sprite = new Sprite(tileTexture);
      sprite.roundPixels = true;
      sprite.anchor.set(0.5);
      sprite.x = (index % layer.width) * map.tileWidth + map.tileWidth / 2;
      sprite.y = Math.floor(index / layer.width) * map.tileHeight + map.tileHeight / 2;
      applyTiledFlipFlags(sprite, gid);
      layerContainer.addChild(sprite);
    });

    mapContainer.addChild(layerContainer);
  }

  world.addChild(mapContainer);
  return mapContainer;
}

function applyTiledFlipFlags(sprite: Sprite, gid: number) {
  const flipHorizontally = (gid & HORIZONTAL_FLIP_FLAG) !== 0;
  const flipVertically = (gid & VERTICAL_FLIP_FLAG) !== 0;
  const flipDiagonally = (gid & DIAGONAL_FLIP_FLAG) !== 0;

  if (!flipDiagonally) {
    sprite.scale.set(flipHorizontally ? -1 : 1, flipVertically ? -1 : 1);
    return;
  }

  // Tiled applies diagonal (x/y swap), then horizontal and vertical flips.
  if (flipVertically) {
    sprite.rotation = -Math.PI / 2;
    sprite.scale.y = flipHorizontally ? -1 : 1;
    return;
  }

  sprite.rotation = Math.PI / 2;
  sprite.scale.y = flipHorizontally ? 1 : -1;
}
