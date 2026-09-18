export type WorldBounds = {
  width: number;
  height: number;
};

export function clampPlayerPosition(
  x: number,
  y: number,
  bounds: WorldBounds,
  halfWidth: number,
  height: number,
) {
  // Phase 3 can extend this boundary abstraction with tile/object collision checks.
  return {
    x: Math.max(halfWidth, Math.min(bounds.width - halfWidth, x)),
    y: Math.max(height, Math.min(bounds.height, y)),
  };
}
