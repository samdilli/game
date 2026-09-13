import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { Bone } from '@babylonjs/core/Bones/bone';
import type { Skeleton } from '@babylonjs/core/Bones/skeleton';
import {
  QUATERNIUS_UAL2_CLIPS,
  locomotionStateFromSpeed,
  referenceSpeedForState,
  type LocomotionAnimState,
  type LocomotionThresholds,
  DEFAULT_LOCOMOTION_THRESHOLDS,
} from '@/config/animations';

export interface CharacterAnimationControllerConfig {
  moveSpeed: number;
  sprintMultiplier: number;
  blendDuration?: number;
  thresholds?: LocomotionThresholds;
}

export class CharacterAnimationController {
  private readonly clipMap = new Map<LocomotionAnimState | 'interact' | 'action', AnimationGroup>();
  private current?: AnimationGroup;
  private currentState: LocomotionAnimState = 'idle';
  private readonly blendDuration: number;
  private readonly thresholds: LocomotionThresholds;
  private readonly moveSpeed: number;
  private readonly sprintMultiplier: number;
  private blendFrom?: AnimationGroup;
  private blendTo?: AnimationGroup;
  private blendT = 1;

  constructor(
    animationGroups: AnimationGroup[],
    config: CharacterAnimationControllerConfig,
  ) {
    this.blendDuration = config.blendDuration ?? 0.2;
    this.thresholds = config.thresholds ?? DEFAULT_LOCOMOTION_THRESHOLDS;
    this.moveSpeed = config.moveSpeed;
    this.sprintMultiplier = config.sprintMultiplier;
    this.resolveClips(animationGroups);
  }

  update(speed: number, sprinting: boolean, dt: number): void {
    this.tickBlend(dt);

    const nextState = locomotionStateFromSpeed(speed, sprinting, this.thresholds);
    if (nextState !== this.currentState && this.blendT >= 1) {
      this.transitionTo(nextState);
      this.currentState = nextState;
    }

    const group = this.clipMap.get(this.currentState);
    if (!group) return;

    if (!group.isPlaying) group.start(true);

    const ref = referenceSpeedForState(this.currentState, this.moveSpeed, this.sprintMultiplier);
    group.speedRatio = ref <= 0.01 ? 1 : Math.max(0.35, Math.min(2.2, speed / ref));
  }

  playAction(action: 'interact' | 'action'): boolean {
    const group = this.clipMap.get(action);
    if (!group || group === this.clipMap.get('idle')) return false;
    this.beginBlend(this.current, group);
    this.current = group;
    return true;
  }

  dispose(): void {
    this.current?.stop();
    this.blendFrom?.stop();
    this.current = undefined;
    this.blendFrom = undefined;
    this.blendTo = undefined;
  }

  private tickBlend(dt: number): void {
    if (!this.blendFrom || !this.blendTo || this.blendT >= 1) return;

    this.blendT = Math.min(1, this.blendT + dt / this.blendDuration);
    this.blendFrom.setWeightForAllAnimatables(1 - this.blendT);
    this.blendTo.setWeightForAllAnimatables(this.blendT);

    if (this.blendT >= 1) {
      this.blendFrom.stop();
      this.blendFrom = undefined;
      this.blendTo = undefined;
    }
  }

  private resolveClips(groups: AnimationGroup[]): void {
    if (groups.length === 0) return;

    const names = groups.map((g) => g.name);
    const idle = this.findClip(groups, QUATERNIUS_UAL2_CLIPS.idle) ?? groups[0]!;
    const walk = this.findClip(groups, QUATERNIUS_UAL2_CLIPS.walk) ?? idle;
    const run = this.findClip(groups, QUATERNIUS_UAL2_CLIPS.run) ?? walk;
    const sprint = this.findClip(groups, QUATERNIUS_UAL2_CLIPS.sprint) ?? run;

    this.clipMap.set('idle', idle);
    this.clipMap.set('walk', walk);
    this.clipMap.set('run', run);
    this.clipMap.set('sprint', sprint);
    this.clipMap.set('interact', this.findClip(groups, QUATERNIUS_UAL2_CLIPS.interact) ?? idle);
    this.clipMap.set('action', this.findClip(groups, QUATERNIUS_UAL2_CLIPS.action) ?? idle);

    if (import.meta.env.DEV) {
      console.info('[CharacterAnimationController]', {
        available: names,
        resolved: Object.fromEntries([...this.clipMap.entries()].map(([k, v]) => [k, v.name])),
      });
    }

    this.transitionTo('idle');
  }

  private findClip(groups: AnimationGroup[], candidates: readonly string[]): AnimationGroup | undefined {
    for (const candidate of candidates) {
      const exact = groups.find((g) => g.name === candidate);
      if (exact) return exact;
    }
    for (const candidate of candidates) {
      const lower = candidate.toLowerCase();
      const fuzzy = groups.find((g) => g.name.toLowerCase().includes(lower));
      if (fuzzy) return fuzzy;
    }
    return undefined;
  }

  private transitionTo(state: LocomotionAnimState): void {
    const next = this.clipMap.get(state);
    if (!next) return;
    this.beginBlend(this.current, next);
    this.current = next;
  }

  private beginBlend(from: AnimationGroup | undefined, to: AnimationGroup): void {
    if (from === to) {
      if (!to.isPlaying) {
        to.start(true);
        to.setWeightForAllAnimatables(1);
      }
      return;
    }

    to.setWeightForAllAnimatables(0);
    to.start(true);

    if (!from) {
      to.setWeightForAllAnimatables(1);
      this.blendT = 1;
      return;
    }

    this.blendFrom = from;
    this.blendTo = to;
    this.blendT = 0;
    from.setWeightForAllAnimatables(1);
  }
}

export function retargetAnimationGroupsToSkeleton(
  groups: AnimationGroup[],
  skeleton: Skeleton,
  prefix: string,
): AnimationGroup[] {
  const retargeted: AnimationGroup[] = [];

  for (const group of groups) {
    const clone = group.clone(`${prefix}_${group.name}`, (name) => `${prefix}_${name}`);
    if (!clone) continue;

    for (const ta of clone.targetedAnimations) {
      const targetName = (ta.target as Bone)?.name ?? '';
      const bone =
        skeleton.bones.find((b) => b.name === targetName) ??
        skeleton.bones.find((b) => b.name.endsWith(targetName) || targetName.endsWith(b.name));
      if (bone) ta.target = bone;
    }

    retargeted.push(clone);
  }

  return retargeted;
}
