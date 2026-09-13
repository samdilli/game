export type InputAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'sprint'
  | 'action'
  | 'interact';

export const ALL_INPUT_ACTIONS: InputAction[] = [
  'moveForward',
  'moveBackward',
  'moveLeft',
  'moveRight',
  'sprint',
  'action',
  'interact',
];

export interface InputState {
  moveX: number;
  moveY: number;
  sprint: boolean;
  action: boolean;
  interact: boolean;
  actionPressed: boolean;
  interactPressed: boolean;
}

export function createEmptyInputState(): InputState {
  return {
    moveX: 0,
    moveY: 0,
    sprint: false,
    action: false,
    interact: false,
    actionPressed: false,
    interactPressed: false,
  };
}
