import type { InputDevice } from '@/input/InputDevice';
import type { Character } from '@/characters/Character';

export interface PlayerConfig {
  id: number;
  displayName: string;
  role: 'police' | 'thief';
  inputLabel: string;
}

export class Player {
  readonly id: number;
  readonly displayName: string;
  readonly role: 'police' | 'thief';
  readonly inputLabel: string;

  constructor(config: PlayerConfig) {
    this.id = config.id;
    this.displayName = config.displayName;
    this.role = config.role;
    this.inputLabel = config.inputLabel;
  }
}

export interface PlayerSession {
  player: Player;
  character: Character;
  inputDevice: InputDevice;
}
