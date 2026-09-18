import type { Direction } from './playerTypes';
import left1 from './assets/kenney_rpg-urban-pack/Tiles/tile_0023.png?url';
import down1 from './assets/kenney_rpg-urban-pack/Tiles/tile_0024.png?url';
import up1 from './assets/kenney_rpg-urban-pack/Tiles/tile_0025.png?url';
import right1 from './assets/kenney_rpg-urban-pack/Tiles/tile_0026.png?url';
import left2 from './assets/kenney_rpg-urban-pack/Tiles/tile_0050.png?url';
import down2 from './assets/kenney_rpg-urban-pack/Tiles/tile_0051.png?url';
import up2 from './assets/kenney_rpg-urban-pack/Tiles/tile_0052.png?url';
import right2 from './assets/kenney_rpg-urban-pack/Tiles/tile_0053.png?url';
import left3 from './assets/kenney_rpg-urban-pack/Tiles/tile_0077.png?url';
import down3 from './assets/kenney_rpg-urban-pack/Tiles/tile_0078.png?url';
import up3 from './assets/kenney_rpg-urban-pack/Tiles/tile_0079.png?url';
import right3 from './assets/kenney_rpg-urban-pack/Tiles/tile_0080.png?url';

export const playerFrameUrls: Record<Direction, string[]> = {
  left: [left1, left2, left3],
  down: [down1, down2, down3],
  up: [up1, up2, up3],
  right: [right1, right2, right3],
};
