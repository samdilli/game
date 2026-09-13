import { InputMapping } from '@/input/InputMapping';
import type { InputDevice } from '@/input/InputDevice';
import {
  createEmptyInputState,
  type InputAction,
  type InputState,
} from '@/input/InputAction';

const DEADZONE = 0.15;

export class GamepadInput implements InputDevice {
  readonly id: string;
  displayName: string;

  private gamepadIndex: number;
  private readonly mapping: InputMapping;
  private readonly state = createEmptyInputState();
  private readonly buttonActions = new Map<number, InputAction>();
  private previousButtons: boolean[] = [];
  private _isConnected = false;

  constructor(id: string, displayName: string, gamepadIndex: number, mapping: InputMapping) {
    this.id = id;
    this.displayName = displayName;
    this.gamepadIndex = gamepadIndex;
    this.mapping = mapping;
    this.buildBindings();
    this.refreshConnection();
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  private buildBindings(): void {
    for (const binding of this.mapping.getAllBindings()) {
      if (binding.gamepadButton !== undefined) {
        this.buttonActions.set(binding.gamepadButton, binding.action);
      }
    }
  }

  update(): void {
    this.refreshConnection();
    if (!this._isConnected) {
      Object.assign(this.state, createEmptyInputState());
      return;
    }

    const pads = navigator.getGamepads();
    const pad = pads[this.gamepadIndex];
    if (!pad) {
      this._isConnected = false;
      Object.assign(this.state, createEmptyInputState());
      return;
    }

    const leftX = applyDeadzone(pad.axes[0] ?? 0);
    const leftY = applyDeadzone(pad.axes[1] ?? 0);

    let moveX = leftX;
    let moveY = -leftY;

    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    this.state.moveX = moveX;
    this.state.moveY = moveY;
    this.state.sprint = this.isButtonDown(pad, 'sprint');
    this.state.action = this.isButtonDown(pad, 'action');
    this.state.interact = this.isButtonDown(pad, 'interact');
    this.state.actionPressed = this.isButtonJustPressed(pad, 'action');
    this.state.interactPressed = this.isButtonJustPressed(pad, 'interact');

    this.previousButtons = pad.buttons.map((b) => b.pressed);
  }

  getState(): InputState {
    return { ...this.state };
  }

  private refreshConnection(): void {
    const pads = navigator.getGamepads();
    let pad = pads[this.gamepadIndex];

    if (!pad) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i]) {
          this.gamepadIndex = i;
          pad = pads[i];
          break;
        }
      }
    }

    this._isConnected = !!pad;
    if (pad) {
      this.displayName = pad.id.slice(0, 40) || 'Gamepad';
    }
  }

  private getButtonIndex(action: InputAction): number | undefined {
    for (const [btn, act] of this.buttonActions) {
      if (act === action) return btn;
    }
    return undefined;
  }

  private isButtonDown(pad: Gamepad, action: InputAction): boolean {
    const idx = this.getButtonIndex(action);
    if (idx === undefined) return false;
    return pad.buttons[idx]?.pressed ?? false;
  }

  private isButtonJustPressed(pad: Gamepad, action: InputAction): boolean {
    const idx = this.getButtonIndex(action);
    if (idx === undefined) return false;
    const pressed = pad.buttons[idx]?.pressed ?? false;
    const wasPressed = this.previousButtons[idx] ?? false;
    return pressed && !wasPressed;
  }

  dispose(): void {
    // Gamepad API uses polling only
  }
}

function applyDeadzone(value: number): number {
  if (Math.abs(value) < DEADZONE) return 0;
  const sign = Math.sign(value);
  return sign * ((Math.abs(value) - DEADZONE) / (1 - DEADZONE));
}
