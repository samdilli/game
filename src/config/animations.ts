/**
 * Animation clip name resolution for Quaternius Universal Animation Library 2.
 * UAL2 uses humanoid clips like Idle, Walk, Run, Sprint (no root motion export recommended for this game).
 */
export const QUATERNIUS_UAL2_CLIPS = {
  idle: ['Idle', 'idle', 'IDLE', 'Breathing Idle', 'Standing Idle'],
  walk: ['Walk', 'walk', 'Walking', 'Walk Forward'],
  run: ['Run', 'run', 'Jog', 'jog', 'Running'],
  sprint: ['Sprint', 'sprint', 'Fast Run', 'Running Fast'],
  interact: ['Interact', 'Pickup', 'Use Item'],
  action: ['Punch', 'Attack', 'Action'],
  arrest: ['Arrest', 'Handcuff', 'Surrender'],
} as const;

export type LocomotionAnimState = 'idle' | 'walk' | 'run' | 'sprint';

export interface LocomotionThresholds {
  idleMax: number;
  walkMax: number;
  runMax: number;
}

export const DEFAULT_LOCOMOTION_THRESHOLDS: LocomotionThresholds = {
  idleMax: 0.15,
  walkMax: 4.5,
  runMax: 7.5,
};

export function locomotionStateFromSpeed(
  speed: number,
  sprinting: boolean,
  thresholds: LocomotionThresholds = DEFAULT_LOCOMOTION_THRESHOLDS,
): LocomotionAnimState {
  if (speed <= thresholds.idleMax) return 'idle';
  if (sprinting) return 'sprint';
  if (speed <= thresholds.walkMax) return 'walk';
  if (speed <= thresholds.runMax) return 'run';
  return 'sprint';
}

export function referenceSpeedForState(state: LocomotionAnimState, moveSpeed: number, sprintMultiplier: number): number {
  switch (state) {
    case 'idle':
      return 0;
    case 'walk':
      return moveSpeed * 0.55;
    case 'run':
      return moveSpeed;
    case 'sprint':
      return moveSpeed * sprintMultiplier;
  }
}
