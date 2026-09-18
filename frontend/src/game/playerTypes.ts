export type Direction = 'up' | 'down' | 'left' | 'right';

export type MovementInput = {
  x: number;
  y: number;
  direction?: Direction;
};
