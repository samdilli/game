import type { InputDevice } from '@/input/InputDevice';
import type { Character } from '@/characters/Character';
import type { EventBus } from '@/core/EventBus';

export class PlayerController {
  constructor(
    readonly playerId: number,
    readonly label: string,
    private readonly character: Character,
    private readonly inputDevice: InputDevice,
    private readonly eventBus: EventBus,
  ) {}

  update(dt: number): void {
    const prevAction = this.character.actionActive;
    const input = this.inputDevice.getState();
    this.character.update(input, dt);

    if (input.actionPressed) {
      this.eventBus.emit('PlayerAction', {
        playerId: this.playerId,
        action: 'action',
      });
    }
    if (input.interactPressed) {
      this.eventBus.emit('PlayerAction', {
        playerId: this.playerId,
        action: 'interact',
      });
    }

    if (!prevAction && this.character.actionActive) {
      // held action — future animation hooks
    }
  }

  getCharacter(): Character {
    return this.character;
  }

  getInputDevice(): InputDevice {
    return this.inputDevice;
  }
}
