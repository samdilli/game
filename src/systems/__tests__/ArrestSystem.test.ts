import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { EventBus } from '@/core/EventBus';
import { ArrestSystem } from '@/systems/ArrestSystem';
import type { Character } from '@/characters/Character';

function mockCharacter(id: number, x: number, z: number, speed = 0): Character {
  return {
    id,
    mesh: { position: new Vector3(x, 0, z) },
    movement: { currentSpeed: speed },
    isArrested: false,
    setArrested(value: boolean) {
      (this as { isArrested: boolean }).isArrested = value;
    },
  } as unknown as Character;
}

describe('ArrestSystem', () => {
  it('completes arrest when in range and holding interact', () => {
    const bus = new EventBus();
    const arrested = vi.fn();
    bus.on('PlayerArrested', arrested);

    const system = new ArrestSystem(bus, {
      range: 3,
      durationSeconds: 0.5,
      maxTargetSpeed: 5,
    });

    const police = mockCharacter(1, 0, 0);
    const thief = mockCharacter(2, 1, 0);

    let state = system.update(police, thief, true, 0.3);
    expect(state.progress).toBeGreaterThan(0);

    state = system.update(police, thief, true, 0.3);
    expect(state.completed).toBe(true);
    expect(arrested).toHaveBeenCalled();
  });

  it('resets progress when suspect runs away', () => {
    const system = new ArrestSystem(new EventBus());
    const police = mockCharacter(1, 0, 0);
    const thief = mockCharacter(2, 1, 0);

    system.update(police, thief, true, 0.2);
    const far = mockCharacter(2, 10, 0, 6);
    const state = system.update(police, far, true, 0.1);
    expect(state.progressing).toBe(false);
  });
});
