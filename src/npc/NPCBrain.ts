import { Vector3 } from '@babylonjs/core';
import type { Character } from '@/characters/Character';
import type { EventBus } from '@/core/EventBus';
import type { NavigationManager } from '@/navigation/NavigationManager';
import { PathFollower } from '@/navigation/PathFollower';
import { createEmptyInputState } from '@/input/InputAction';
import type { NPCArchetypeConfig, CivilianState, ThiefNpcState, PatrolRoute } from '@/config/npc';
import { zoneIsSafe } from '@/config/npc';
import { poiById, type POI } from '@/world/CityData';
import { NPCMemory } from '@/npc/NPCMemory';
import { NPCPerception, type PerceivableTarget } from '@/npc/NPCPerception';
import {
  NPCStateMachine,
  CIVILIAN_TRANSITIONS,
  THIEF_NPC_TRANSITIONS,
  type StateTransitionContext,
} from '@/npc/NPCStateMachine';

export type NPCSimulationLod = 0 | 1 | 2;

export interface NPCBrainDeps {
  character: Character;
  archetype: NPCArchetypeConfig;
  navigation: NavigationManager;
  eventBus: EventBus;
  patrolRoute?: PatrolRoute;
  getTargets: () => PerceivableTarget[];
}

export class NPCBrain {
  readonly memory = new NPCMemory();
  readonly pathFollower = new PathFollower();
  readonly perception: NPCPerception;

  private readonly character: Character;
  private readonly archetype: NPCArchetypeConfig;
  private readonly navigation: NavigationManager;
  private readonly eventBus: EventBus;
  private readonly getTargets: () => PerceivableTarget[];
  private readonly pathId: string;

  private civilianSm?: NPCStateMachine<CivilianState>;
  private thiefSm?: NPCStateMachine<ThiefNpcState>;
  private patrolIndex = 0;
  private patrolRoute: string[] = [];
  private crimeTimer = 0;
  private reportTimer = 0;
  private tickAccumulator = 0;
  private lod: NPCSimulationLod = 0;
  private currentPoi?: POI;

  constructor(deps: NPCBrainDeps) {
    this.character = deps.character;
    this.archetype = deps.archetype;
    this.navigation = deps.navigation;
    this.eventBus = deps.eventBus;
    this.getTargets = deps.getTargets;
    this.pathId = `npc_${deps.character.id}`;
    this.perception = new NPCPerception(deps.character.mesh.getScene(), {
      visionRange: deps.archetype.visionRange,
      visionAngleDeg: deps.archetype.visionAngleDeg,
      hearingRange: deps.archetype.hearingRange,
    });

    if (deps.archetype.role === 'civilian') {
      this.civilianSm = new NPCStateMachine<CivilianState>('idle', CIVILIAN_TRANSITIONS);
      this.patrolRoute = deps.patrolRoute?.poiIds ?? [deps.archetype.workPoiId ?? 'plaza'];
      this.queueNextPatrolTarget();
    } else {
      this.thiefSm = new NPCStateMachine<ThiefNpcState>('walking', THIEF_NPC_TRANSITIONS);
      this.goToPoi(deps.archetype.crimePoiId ?? 'crime_alley');
    }
  }

  setLod(lod: NPCSimulationLod): void {
    this.lod = lod;
  }

  update(dt: number): void {
    this.tickAccumulator += dt;
    const thinkInterval =
      this.lod === 0 ? 0.15 : this.lod === 1 ? 0.45 : 1.5;

    if (this.tickAccumulator >= thinkInterval) {
      this.think(this.tickAccumulator);
      this.tickAccumulator = 0;
    }

    this.applyMovement(dt);
  }

  getStateLabel(): string {
    return this.civilianSm?.current ?? this.thiefSm?.current ?? 'unknown';
  }

  private think(dt: number): void {
    const pos = this.character.mesh.position;
    const facingY = this.character.mesh.rotation.y;
    const targets = this.getTargets().filter((t) => t.id !== this.character.id);
    const perceptions = this.perception.scan(pos, facingY, targets);

    const seesPolice = perceptions.some(
      (p) => p.seen && (p.target.role === 'police' || p.target.role === 'police_npc'),
    );
    const seesThiefPlayer = perceptions.some((p) => p.seen && p.target.role === 'thief');
    const hearsThreat = perceptions.some((p) => p.heard);

    for (const p of perceptions) {
      if (p.seen && p.target.role === 'police') {
        this.memory.remember({
          kind: 'seen_police',
          position: p.target.mesh.position.clone(),
          timeMs: performance.now(),
          entityId: p.target.id,
        });
      }
      if (p.seen && p.target.role === 'thief') {
        this.memory.remember({
          kind: 'seen_crime',
          position: p.target.mesh.position.clone(),
          timeMs: performance.now(),
          entityId: p.target.id,
        });
        this.eventBus.emit('NPCWitnessedCrime', {
          npcId: this.character.id,
          suspectId: p.target.id,
          location: p.target.mesh.position.clone(),
        });
      }
    }

    const ctx: StateTransitionContext = {
      arrivedAtDestination: !this.pathFollower.hasPath,
      seesPolice,
      seesThiefPlayer,
      hearsThreat,
      isSafe: this.currentPoi ? zoneIsSafe(this.currentPoi.type) : false,
      crimeTimerDone: false,
      stuck: this.pathFollower.isStuck(),
    };

    if (this.civilianSm) this.updateCivilian(ctx, dt);
    if (this.thiefSm) this.updateThief(ctx, dt);
  }

  private updateCivilian(ctx: StateTransitionContext, dt: number): void {
    const sm = this.civilianSm!;
    const state = sm.current;

    if (state === 'idle' && !this.pathFollower.hasPath) {
      sm.trigger('go');
      this.queueNextPatrolTarget();
    }

    if (state === 'walking' && ctx.arrivedAtDestination) {
      sm.trigger('arrive');
    }

    if (ctx.seesThiefPlayer || ctx.hearsThreat) {
      sm.trigger('suspicious');
    }

    if (ctx.seesPolice || ctx.seesThiefPlayer) {
      if (sm.trigger('threat') === 'fleeing') {
        this.fleeFromThreat();
        this.eventBus.emit('NPCFleeStarted', { npcId: this.character.id, reason: 'threat' });
      }
    }

    if (state === 'fleeing' && ctx.arrivedAtDestination && ctx.isSafe) {
      sm.trigger('safe');
      sm.trigger('report');
      this.reportTimer = 2;
      this.eventBus.emit('NPCCalledPolice', { npcId: this.character.id, location: this.character.mesh.position.clone() });
    }

    if (state === 'calling_police') {
      this.reportTimer -= dt;
      if (this.reportTimer <= 0) sm.trigger('done');
    }

    if (ctx.stuck) {
      this.goToPoi(this.patrolRoute[this.patrolIndex] ?? 'plaza');
    }
  }

  private updateThief(ctx: StateTransitionContext, dt: number): void {
    const sm = this.thiefSm!;
    const state = sm.current;

    if (state === 'walking' && ctx.arrivedAtDestination) {
      sm.trigger('arrive');
      this.crimeTimer = 3;
    }

    if (state === 'committing_crime') {
      this.crimeTimer -= dt;
      ctx.crimeTimerDone = this.crimeTimer <= 0;
      if (ctx.crimeTimerDone) {
        sm.trigger('done');
        this.goToPoi(this.archetype.hidePoiId ?? 'hideout');
      }
    }

    if (ctx.seesPolice) {
      if (sm.current !== 'fleeing' && sm.current !== 'hiding') {
        sm.trigger('spotted');
        sm.trigger('flee');
        this.fleeFromThreat();
        this.eventBus.emit('SuspectSeen', {
          suspectId: this.character.id,
          location: this.character.mesh.position.clone(),
        });
      }
    }

    if (state === 'fleeing' && ctx.arrivedAtDestination) {
      sm.trigger('hide');
    }

    if (state === 'hiding' && !ctx.seesPolice && ctx.arrivedAtDestination) {
      sm.trigger('clear');
      this.goToPoi(this.archetype.crimePoiId ?? 'crime_alley');
    }

    if (ctx.stuck) {
      this.memory.remember({
        kind: 'failed_escape',
        position: this.character.mesh.position.clone(),
        timeMs: performance.now(),
      });
      this.goToPoi(this.archetype.hidePoiId ?? 'hideout');
    }
  }

  private fleeFromThreat(): void {
    const policePos =
      this.memory.lastKnownPolicePosition ??
      this.memory.lastKnownThreatPosition ??
      this.memory.lastCrimePosition;
    if (!policePos) {
      this.goToPoi(this.archetype.hidePoiId ?? 'hideout');
      return;
    }

    const pos = this.character.mesh.position.clone();
    const away = pos.subtract(new Vector3(policePos.x, 0, policePos.z));
    if (away.length() < 0.01) away.set(1, 0, 1);
    away.normalize();

    const fleeTarget = pos.add(away.scale(14));
    this.setPathToWorld(fleeTarget);
  }

  private queueNextPatrolTarget(): void {
    if (this.patrolRoute.length === 0) return;
    const poiId = this.patrolRoute[this.patrolIndex];
    this.patrolIndex = (this.patrolIndex + 1) % this.patrolRoute.length;
    this.goToPoi(poiId);
  }

  private goToPoi(poiId: string): void {
    const poi = poiById(poiId);
    if (!poi) return;
    this.currentPoi = poi;
    this.setPathToWorld(new Vector3(poi.x, 0, poi.z));
  }

  private setPathToWorld(target: Vector3): void {
    const path = this.navigation.requestPath({
      id: this.pathId,
      from: this.character.mesh.position.clone(),
      to: target,
    });

    if (path.length === 0) return;
    this.pathFollower.setPath(path);
  }

  private applyMovement(dt: number): void {
    const pos = this.character.mesh.position;
    const motor = this.pathFollower.update(pos, dt);
    const input = createEmptyInputState();
    input.moveX = motor.moveX;
    input.moveY = motor.moveZ;
    input.sprint = motor.sprint;

    this.character.movement.setSpeeds(this.archetype.moveSpeed, this.archetype.sprintMultiplier);
    this.character.update(input, dt);
  }

  dispose(): void {
    this.pathFollower.clear();
    this.memory.clear();
  }
}
