import mapUrl from './assets/viviora.tmx?url';
import tilesetUrl from './assets/v1.tsx?url';
import tilesetImageUrl from './assets/kenney_rpg-urban-pack/Tilemap/tilemap_packed.png?url';

export type TiledLayer = {
  name: string;
  width: number;
  height: number;
  gids: number[];
};

export type TiledMap = {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  tileset: {
    firstGid: number;
    tileCount: number;
    columns: number;
    imageWidth: number;
    imageHeight: number;
    tileWidth: number;
    tileHeight: number;
    imageUrl: string;
  };
  layers: TiledLayer[];
};

const assetUrls = new Map([
  ['v1.tsx', tilesetUrl],
  ['kenney_rpg-urban-pack/Tilemap/tilemap_packed.png', tilesetImageUrl],
]);

function requiredAttribute(element: Element, name: string): string {
  const value = element.getAttribute(name);
  if (value === null) {
    throw new Error(`Missing ${name} in <${element.tagName}>`);
  }
  return value;
}

function numberAttribute(element: Element, name: string): number {
  const value = Number(requiredAttribute(element, name));
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid ${name} in <${element.tagName}>`);
  }
  return value;
}

function parseXml(xml: string, label: string): Document {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error(`Could not parse ${label}: ${parserError.textContent ?? 'invalid XML'}`);
  }
  return document;
}

function parseCsvLayer(layer: Element): TiledLayer {
  const data = layer.querySelector('data[encoding="csv"]');
  if (!data) {
    throw new Error(`Layer ${requiredAttribute(layer, 'name')} is not CSV encoded`);
  }

  const gids = (data.textContent ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number);

  if (gids.some((gid) => !Number.isInteger(gid) || gid < 0)) {
    throw new Error(`Layer ${requiredAttribute(layer, 'name')} contains invalid tile data`);
  }

  const width = numberAttribute(layer, 'width');
  const height = numberAttribute(layer, 'height');
  if (gids.length !== width * height) {
    throw new Error(`Layer ${requiredAttribute(layer, 'name')} has incomplete tile data`);
  }

  return {
    name: requiredAttribute(layer, 'name'),
    width,
    height,
    gids,
  };
}

function resolveAssetPath(path: string): string {
  const normalizedPath = path.replaceAll('\\', '/').replace(/^\.\//, '');
  const resolved = assetUrls.get(normalizedPath);
  if (!resolved) {
    throw new Error(`Asset reference is not registered: ${path}`);
  }
  return resolved;
}

export async function loadVivioraMap(signal: AbortSignal): Promise<TiledMap> {
  const mapResponse = await fetch(mapUrl, { signal });
  if (!mapResponse.ok) {
    throw new Error(`Could not load map (${mapResponse.status})`);
  }
  const mapDocument = parseXml(await mapResponse.text(), 'viviora.tmx');
  const mapElement = mapDocument.documentElement;
  if (mapElement.tagName !== 'map') {
    throw new Error('viviora.tmx does not contain a <map> root element');
  }

  const tilesetElement = mapElement.querySelector(':scope > tileset');
  if (!tilesetElement) {
    throw new Error('viviora.tmx does not define a tileset');
  }
  const tilesetSource = requiredAttribute(tilesetElement, 'source');
  const externalTilesetUrl = resolveAssetPath(tilesetSource);
  const tilesetResponse = await fetch(externalTilesetUrl, { signal });
  if (!tilesetResponse.ok) {
    throw new Error(`Could not load tileset (${tilesetResponse.status})`);
  }

  const tilesetDocument = parseXml(await tilesetResponse.text(), tilesetSource);
  const tileset = tilesetDocument.documentElement;
  if (tileset.tagName !== 'tileset') {
    throw new Error(`${tilesetSource} does not contain a <tileset> root element`);
  }
  const imageElement = tileset.querySelector(':scope > image');
  if (!imageElement) {
    throw new Error(`${tilesetSource} does not define an image`);
  }

  const imageSource = requiredAttribute(imageElement, 'source');
  const imageUrl = resolveAssetPath(imageSource);
  const layers = Array.from(mapElement.querySelectorAll(':scope > layer')).map(parseCsvLayer);

  return {
    width: numberAttribute(mapElement, 'width'),
    height: numberAttribute(mapElement, 'height'),
    tileWidth: numberAttribute(mapElement, 'tilewidth'),
    tileHeight: numberAttribute(mapElement, 'tileheight'),
    tileset: {
      firstGid: numberAttribute(tilesetElement, 'firstgid'),
      tileCount: numberAttribute(tileset, 'tilecount'),
      columns: numberAttribute(tileset, 'columns'),
      imageWidth: numberAttribute(imageElement, 'width'),
      imageHeight: numberAttribute(imageElement, 'height'),
      tileWidth: numberAttribute(tileset, 'tilewidth'),
      tileHeight: numberAttribute(tileset, 'tileheight'),
      imageUrl,
    },
    layers,
  };
}
