import type { InputState } from '@/input/InputAction';

export interface InputDevice {
  readonly id: string;
  displayName: string;
  readonly isConnected: boolean;
  update(): void;
  getState(): InputState;
  dispose(): void;
}
