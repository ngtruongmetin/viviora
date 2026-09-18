import { useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Texture } from 'pixi.js';
import { Camera } from './Camera';
import { TiledCollisionMap } from './collision';
import { KeyboardInput } from './input';
import { loadVivioraMap } from './tiled';
import { createTileTextures, renderMap } from './mapRenderer';
import { Player, type PlayerTextures } from './Player';
import { playerFrameUrls } from './playerAssets';
import { Vehicle } from './Vehicle';
import './game.css';
import { createVehicleRoutes } from './vehicleRoutes';

const SPAWN_TILE = { x: 30, y: 8 };
async function loadPlayerTextures(): Promise<PlayerTextures> {
  const entries = await Promise.all(
    Object.entries(playerFrameUrls).map(
      async ([direction, urls]) =>
        [direction, await Promise.all(urls.map((url) => Assets.load<Texture>(url)))] as const,
    ),
  );
  const textures = Object.fromEntries(entries) as PlayerTextures;
  Object.values(textures)
    .flat()
    .forEach((texture) => {
      texture.source.style.scaleMode = 'nearest';
    });
  return textures;
}

export function GamePage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const abortController = new AbortController();
    const app = new Application();
    let world: Container | undefined;
    let tileTextures: Texture[] | undefined;
    let player: Player | undefined;
    let vehicles: Vehicle[] = [];
    let camera: Camera | undefined;
    let removeUpdate: (() => void) | undefined;
    let initialized = false;
    let cancelled = false;

    const resizeWorld = () => {
      if (!camera || !player) return;
      camera.follow(player.x, player.y, app.screen.width, app.screen.height);
    };
    const resizeObserver = new ResizeObserver(resizeWorld);

    const initialize = async () => {
      try {
        const map = await loadVivioraMap(abortController.signal);
        const tilesetTexture = await Assets.load<Texture>(map.tileset.imageUrl);
        const loadedPlayerTextures = await loadPlayerTextures();
        if (cancelled) return;

        await app.init({
          resizeTo: host,
          backgroundColor: 0x171717,
          antialias: false,
          resolution: window.devicePixelRatio,
          autoDensity: true,
        });
        if (cancelled) {
          app.destroy(true);
          return;
        }
        initialized = true;
        host.appendChild(app.canvas);
        app.canvas.setAttribute('aria-label', 'Viviora game world');
        const loadedTileTextures = createTileTextures(tilesetTexture, map);
        tileTextures = loadedTileTextures;
        const cameraContainer = new Container();
        cameraContainer.label = 'camera';
        world = new Container();
        world.label = 'world';
        cameraContainer.addChild(world);
        app.stage.addChild(cameraContainer);
        const gameWorld = world;
        renderMap(gameWorld, map, loadedTileTextures);

        const collision = new TiledCollisionMap(map);
        vehicles = createVehicleRoutes(map.tileWidth).map(
          (route) => new Vehicle({ tileTextures: loadedTileTextures, tileSize: map.tileWidth, route }),
        );
        gameWorld.sortableChildren = true;

        player = new Player({
          textures: loadedPlayerTextures,
          input: new KeyboardInput(),
          bounds: {
            width: map.width * map.tileWidth,
            height: map.height * map.tileHeight,
          },
          collision,
          obstacles: vehicles,
        });
        player.view.position.set(
          SPAWN_TILE.x * map.tileWidth + map.tileWidth / 2,
          SPAWN_TILE.y * map.tileHeight + map.tileHeight,
        );
        player.view.zIndex = 90;
        gameWorld.addChild(player.view);
        vehicles.forEach((currentVehicle, index) => {
          currentVehicle.view.zIndex = 100 + index;
          gameWorld.addChild(currentVehicle.view);
        });
        camera = new Camera(
          cameraContainer,
          map.width * map.tileWidth,
          map.height * map.tileHeight,
        );

        const update = (ticker: { deltaMS: number }) => {
          const deltaSeconds = ticker.deltaMS / 1000;
          const playerBounds = player?.getCollisionBounds();
          vehicles.forEach((currentVehicle, index) => {
            currentVehicle.update(deltaSeconds, playerBounds, vehicles.slice(0, index));
          });
          player?.update(deltaSeconds);
          resizeWorld();
        };
        app.ticker.add(update);
        removeUpdate = () => app.ticker.remove(update);
        resizeObserver.observe(host);
        resizeWorld();
        app.ticker.addOnce(() => resizeWorld());
      } catch (loadError) {
        if (!cancelled && !abortController.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load game map');
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      abortController.abort();
      resizeObserver.disconnect();
      removeUpdate?.();
      player?.view.parent?.removeChild(player.view);
      player?.destroy();
      vehicles.forEach((currentVehicle) => {
        currentVehicle.view.parent?.removeChild(currentVehicle.view);
        currentVehicle.destroy();
      });
      if (initialized) {
        app.destroy(true, { children: true });
      }
      tileTextures?.forEach((texture) => texture.destroy(false));
      host.replaceChildren();
    };
  }, []);

  return (
    <main className="game-page">
      <div className="game-canvas-host" ref={hostRef}>
        {error && <p className="game-error">{error}</p>}
      </div>
    </main>
  );
}
