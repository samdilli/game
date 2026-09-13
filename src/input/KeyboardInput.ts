import { InputMapping } from '@/input/InputMapping';
import type { InputDevice } from '@/input/InputDevice';
import {
  createEmptyInputState,
  type InputAction,
  type InputState,
} from '@/input/InputAction';

export class KeyboardInput implements InputDevice {
  readonly id: string;
  readonly displayName: string;
  readonly isConnected = true;

  private readonly pressedKeys = new Set<string>();
  private readonly justPressedKeys = new Set<string>();
  private readonly state = createEmptyInputState();
  private readonly actionKeys = new Map<InputAction, Set<string>>();

  constructor(
    id: string,
    displayName: string,
    mapping: InputMapping,
  ) {
    this.id = id;
    this.displayName = displayName;

    for (const binding of mapping.getAllBindings()) {
      if (!binding.keys?.length) continue;
      let keys = this.actionKeys.get(binding.action);
      if (!keys) {
        keys = new Set<string>();
        this.actionKeys.set(binding.action, keys);
      }
      binding.keys.forEach((k) => keys!.add(k));
    }

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (!this.pressedKeys.has(e.code)) {
      this.justPressedKeys.add(e.code);
    }
    this.pressedKeys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressedKeys.delete(e.code);
  };

  update(): void {
    const prev = { ...this.state };

    let moveX = 0;
    let moveY = 0;

    if (this.isActionDown('moveForward')) moveY += 1;
    if (this.isActionDown('moveBackward')) moveY -= 1;
    if (this.isActionDown('moveLeft')) moveX -= 1;
    if (this.isActionDown('moveRight')) moveX += 1;

    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    this.state.moveX = moveX;
    this.state.moveY = moveY;
    this.state.sprint = this.isActionDown('sprint');
    this.state.action = this.isActionDown('action');
    this.state.interact = this.isActionDown('interact');
    this.state.actionPressed = this.isActionJustPressed('action');
    this.state.interactPressed = this.isActionJustPressed('interact');

    if (prev.action && !this.state.action) {
      // release frame handled by pressed flags
    }

    this.justPressedKeys.clear();
  }

  getState(): InputState {
    return { ...this.state };
  }

  private isActionDown(action: InputAction): boolean {
    const keys = this.actionKeys.get(action);
    if (!keys) return false;
    for (const key of keys) {
      if (this.pressedKeys.has(key)) return true;
    }
    return false;
  }

  private isActionJustPressed(action: InputAction): boolean {
    const keys = this.actionKeys.get(action);
    if (!keys) return false;
    for (const key of keys) {
      if (this.justPressedKeys.has(key)) return true;
    }
    return false;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
