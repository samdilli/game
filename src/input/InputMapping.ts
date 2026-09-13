import type { ControlBinding } from '@/config/controls';
import type { InputAction } from '@/input/InputAction';

export class InputMapping {
  constructor(private readonly bindings: ControlBinding[]) {}

  getBindingsForAction(action: InputAction): ControlBinding[] {
    return this.bindings.filter((b) => b.action === action);
  }

  getAllBindings(): ControlBinding[] {
    return this.bindings;
  }
}
