import type { InputAction } from '@/input/InputAction';

export interface ControlBinding {
  action: InputAction;
  keys?: string[];
  gamepadButton?: number;
  gamepadAxis?: { index: number; threshold?: number };
}

export const PLAYER1_KEYBOARD_BINDINGS: ControlBinding[] = [
  { action: 'moveForward', keys: ['KeyW', 'ArrowUp'] },
  { action: 'moveBackward', keys: ['KeyS', 'ArrowDown'] },
  { action: 'moveLeft', keys: ['KeyA', 'ArrowLeft'] },
  { action: 'moveRight', keys: ['KeyD', 'ArrowRight'] },
  { action: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
  { action: 'action', keys: ['Space'] },
  { action: 'interact', keys: ['KeyE'] },
];

export const PLAYER2_GAMEPAD_BINDINGS: ControlBinding[] = [
  { action: 'moveForward', gamepadAxis: { index: 1, threshold: 0.25 } },
  { action: 'moveBackward', gamepadAxis: { index: 1, threshold: 0.25 } },
  { action: 'moveLeft', gamepadAxis: { index: 0, threshold: 0.25 } },
  { action: 'moveRight', gamepadAxis: { index: 0, threshold: 0.25 } },
  { action: 'sprint', gamepadButton: 5 },
  { action: 'action', gamepadButton: 0 },
  { action: 'interact', gamepadButton: 2 },
];

export const DEBUG_TOGGLE_KEY = 'F3';
