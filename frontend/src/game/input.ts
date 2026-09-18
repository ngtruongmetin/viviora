import type { Direction, MovementInput } from './playerTypes';

const keyDirections: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
};

export class KeyboardInput {
  private readonly pressed = new Map<Direction, number>();
  private sequence = 0;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('blur', this.clear);
  }

  getMovement(): MovementInput {
    let horizontal = 0;
    let vertical = 0;

    if (this.pressed.has('left')) horizontal -= 1;
    if (this.pressed.has('right')) horizontal += 1;
    if (this.pressed.has('up')) vertical -= 1;
    if (this.pressed.has('down')) vertical += 1;

    const length = Math.hypot(horizontal, vertical);
    const direction = [...this.pressed.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      x: length ? horizontal / length : 0,
      y: length ? vertical / length : 0,
      direction,
    };
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('blur', this.clear);
    this.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (this.isBrowserZoomShortcut(event)) {
      event.preventDefault();
      return;
    }

    const direction = keyDirections[event.key] ?? keyDirections[event.key.toLowerCase()];
    if (!direction) return;

    event.preventDefault();
    if (!this.pressed.has(direction)) {
      this.pressed.set(direction, this.sequence++);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    const direction = keyDirections[event.key] ?? keyDirections[event.key.toLowerCase()];
    if (!direction) return;

    event.preventDefault();
    this.pressed.delete(direction);
  };

  private readonly handleWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
    }
  };

  private isBrowserZoomShortcut(event: KeyboardEvent) {
    if (!event.ctrlKey && !event.metaKey) return false;

    return ['Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract', 'Digit0', 'Numpad0'].includes(
      event.code,
    );
  }

  private readonly clear = () => {
    this.pressed.clear();
  };
}
