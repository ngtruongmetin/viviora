import { Sprite, Texture } from 'pixi.js';
import type { CollisionBody, CollisionRect, PlayerCollision } from './collision';
import { KeyboardInput } from './input';
import type { Direction } from './playerTypes';
import { clampPlayerPosition, type WorldBounds } from './worldBounds';

export type PlayerTextures = Record<Direction, Texture[]>;

type PlayerOptions = {
  textures: PlayerTextures;
  input: KeyboardInput;
  bounds: WorldBounds;
  collision: PlayerCollision;
  obstacles?: readonly CollisionBody[];
  speed?: number;
};

export class Player {
  readonly view: Sprite;
  readonly speed: number;
  private readonly input: KeyboardInput;
  private readonly bounds: WorldBounds;
  private readonly collision: PlayerCollision;
  private readonly obstacles: readonly CollisionBody[];
  private readonly textures: PlayerTextures;
  private direction: Direction = 'down';
  private moving = false;
  private animationFrame = 1;
  private animationTimer = 0;

  constructor({ textures, input, bounds, collision, obstacles = [], speed = 96 }: PlayerOptions) {
    this.textures = textures;
    this.input = input;
    this.bounds = bounds;
    this.collision = collision;
    this.obstacles = obstacles;
    this.speed = speed;
    this.view = new Sprite(this.textures.down[this.animationFrame]);
    this.view.anchor.set(0.5, 1);
    this.view.roundPixels = true;
  }

  get x() {
    return this.view.x;
  }

  get y() {
    return this.view.y;
  }

  getCollisionBounds(x = this.view.x, y = this.view.y): CollisionRect {
    const halfWidth = this.view.width / 4;
    const height = this.view.height / 2;

    return {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - height,
      bottom: y,
    };
  }

  update(deltaSeconds: number) {
    const movement = this.input.getMovement();
    const isMoving = movement.x !== 0 || movement.y !== 0;

    if (isMoving) {
      if (movement.direction) this.direction = movement.direction;
      if (!this.moving) {
        this.animationFrame = 0;
        this.animationTimer = 0;
      }

      this.moving = true;
      this.move(movement.x * this.speed * deltaSeconds, movement.y * this.speed * deltaSeconds);
      this.updateAnimation(deltaSeconds);
      return;
    }

    if (this.moving) {
      this.moving = false;
      this.animationFrame = 1;
      this.animationTimer = 0;
      this.updateTexture();
    }
  }

  destroy() {
    this.input.destroy();
    this.view.destroy();
  }

  private move(deltaX: number, deltaY: number) {
    const horizontal = clampPlayerPosition(
      this.view.x + deltaX,
      this.view.y,
      this.bounds,
      this.view.width / 4,
      this.view.height / 2,
    );
    if (this.canOccupy(horizontal.x, this.view.y)) {
      this.view.x = horizontal.x;
    }

    const vertical = clampPlayerPosition(
      this.view.x,
      this.view.y + deltaY,
      this.bounds,
      this.view.width / 4,
      this.view.height / 2,
    );
    if (this.canOccupy(this.view.x, vertical.y)) {
      this.view.y = vertical.y;
    }
  }

  private canOccupy(x: number, y: number) {
    if (!this.collision.canOccupy(x, y, this.view.width / 4, this.view.height / 2)) {
      return false;
    }

    const playerBounds = this.getCollisionBounds(x, y);
    return !this.obstacles.some((obstacle) =>
      rectanglesOverlap(playerBounds, obstacle.getCollisionBounds()),
    );
  }

  private updateAnimation(deltaSeconds: number) {
    const frameDuration = 1 / 8;
    this.animationTimer += deltaSeconds;

    while (this.animationTimer >= frameDuration) {
      this.animationTimer -= frameDuration;
      this.animationFrame = (this.animationFrame + 1) % 3;
    }
    this.updateTexture();
  }

  private updateTexture() {
    this.view.texture = this.textures[this.direction][this.animationFrame];
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
