import { Vector3 } from '@babylonjs/core';
import type { Character } from '@/characters/Character';
import type { EventBus } from '@/core/EventBus';

export interface ArrestConfig {
  range: number;
  durationSeconds: number;
  maxTargetSpeed: number;
}

export const DEFAULT_ARREST_CONFIG: ArrestConfig = {
  range: 2.8,
  durationSeconds: 2.2,
  maxTargetSpeed: 4.5,
};

export interface ArrestState {
  inRange: boolean;
  progressing: boolean;
  progress: number;
  completed: boolean;
}

export class ArrestSystem {
  private progress = 0;
  private completed = false;

  constructor(
    private readonly eventBus: EventBus,
    private readonly config: ArrestConfig = DEFAULT_ARREST_CONFIG,
  ) {}

  update(
    police: Character,
    suspect: Character,
    policeHoldingInteract: boolean,
    dt: number,
  ): ArrestState {
    if (this.completed || suspect.isArrested) {
      return this.snapshot(true, false, 1, true);
    }

    const dist = Vector3.Distance(
      police.mesh.position,
      suspect.mesh.position,
    );
    const inRange = dist <= this.config.range;
    const vulnerable = suspect.movement.currentSpeed <= this.config.maxTargetSpeed;

    if (inRange && policeHoldingInteract && vulnerable) {
      this.progress = Math.min(1, this.progress + dt / this.config.durationSeconds);
      if (this.progress >= 1) {
        this.completed = true;
        suspect.setArrested(true);
        this.eventBus.emit('PlayerArrested', {
          policeId: police.id,
          suspectId: suspect.id,
          location: suspect.mesh.position.clone(),
        });
      }
      return this.snapshot(inRange, true, this.progress, this.completed);
    }

    if (this.progress > 0) {
      this.progress = Math.max(0, this.progress - dt * 0.8);
    }

    return this.snapshot(inRange, false, this.progress, false);
  }

  reset(): void {
    this.progress = 0;
    this.completed = false;
  }

  isCompleted(): boolean {
    return this.completed;
  }

  private snapshot(
    inRange: boolean,
    progressing: boolean,
    progress: number,
    completed: boolean,
  ): ArrestState {
    return { inRange, progressing, progress, completed };
  }
}

export function isAtPoi(
  position: Vector3,
  poi: { x: number; z: number },
  radius = 3.5,
): boolean {
  return Math.hypot(position.x - poi.x, position.z - poi.z) <= radius;
}
