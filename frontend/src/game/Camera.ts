import { Container } from 'pixi.js';

export class Camera {
  constructor(
    private readonly cameraContainer: Container,
    private readonly worldWidth: number,
    private readonly worldHeight: number,
    private readonly zoom = 3,
  ) {}

  follow(targetX: number, targetY: number, viewportWidth: number, viewportHeight: number) {
    if (!viewportWidth || !viewportHeight) return;

    this.cameraContainer.scale.set(this.zoom);

    const scaledWorldWidth = this.worldWidth * this.zoom;
    const scaledWorldHeight = this.worldHeight * this.zoom;
    const desiredX = viewportWidth / 2 - targetX * this.zoom;
    const desiredY = viewportHeight / 2 - targetY * this.zoom;
    const x = this.clampOffset(desiredX, viewportWidth, scaledWorldWidth);
    const y = this.clampOffset(desiredY, viewportHeight, scaledWorldHeight);

    // Round the camera transform so the pixel-art view stays crisp.
    this.cameraContainer.position.set(Math.round(x), Math.round(y));
  }

  private clampOffset(desiredOffset: number, viewportSize: number, scaledWorldSize: number) {
    if (scaledWorldSize <= viewportSize) {
      return (viewportSize - scaledWorldSize) / 2;
    }

    const minimumOffset = viewportSize - scaledWorldSize;
    return Math.min(0, Math.max(minimumOffset, desiredOffset));
  }
}
