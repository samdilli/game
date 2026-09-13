import type { EventBus } from '@/core/EventBus';
import { CaseManager } from '@/cases/CaseManager';
import { POLICE_VS_THIEF_CASE } from '@/cases/CaseDefinition';
import { ArrestSystem, isAtPoi } from '@/systems/ArrestSystem';
import { poiById } from '@/world/CityData';
import type { GameMode, GameModeContext, GameModeHud } from '@/game-modes/GameMode';

export class PoliceVsThiefMode implements GameMode {
  readonly id = 'police_vs_thief';
  readonly name = 'Polis vs Hırsız';

  private readonly caseManager: CaseManager;
  private readonly arrestSystem: ArrestSystem;
  private resultMessage?: string;

  constructor(eventBus: EventBus) {
    this.caseManager = new CaseManager(eventBus);
    this.arrestSystem = new ArrestSystem(eventBus);
  }

  start(): void {
    this.caseManager.start(POLICE_VS_THIEF_CASE);
    this.resultMessage = undefined;
  }

  update(ctx: GameModeContext): GameModeHud {
    const hideout = poiById(POLICE_VS_THIEF_CASE.escapePoiId);
    const thiefEscaped = hideout
      ? isAtPoi(ctx.thief.mesh.position, hideout, 4)
      : false;

    const arrestState = this.arrestSystem.update(
      ctx.police,
      ctx.thief,
      ctx.policeHoldingInteract,
      ctx.dt,
    );

    this.caseManager.update(ctx.dt, {
      policePosition: ctx.police.mesh.position,
      thiefPosition: ctx.thief.mesh.position,
      arrestCompleted: arrestState.completed,
      thiefEscaped,
    });

    const snapshot = this.caseManager.getSnapshot();
    const distToThief = distanceXZ(ctx.police.mesh.position, ctx.thief.mesh.position);
    const distToHideout = hideout
      ? distanceXZ(ctx.thief.mesh.position, hideout)
      : 0;

    if (snapshot?.status === 'completed') {
      this.resultMessage = 'Polis kazandı — hırsız tutuklandı!';
    } else if (snapshot?.status === 'failed') {
      this.resultMessage = thiefEscaped
        ? 'Hırsız kazandı — saklanma noktasına ulaştı!'
        : 'Süre doldu — hırsız kaçtı!';
    }

    const finished = snapshot?.status === 'completed' || snapshot?.status === 'failed';

    let policeHint = `Hırsıza mesafe: ${Math.round(distToThief)}m`;
    if (arrestState.inRange) {
      policeHint = arrestState.progressing
        ? 'Tutuklama devam ediyor — E veya Space basılı tut'
        : 'Yakındasın! E veya Space ile tutukla';
    } else if (distToThief > 25) {
      policeHint = 'Hırsızı ara — güneydoğuya bak';
    }

    let thiefHint = hideout
      ? `Saklanma noktası: ${Math.round(distToHideout)}m (güneydoğu)`
      : 'Saklanma noktasına ulaş';

    return {
      caseSnapshot: snapshot,
      arrestState,
      thiefObjective: 'Saklanma noktasına ulaş (harita güneydoğu)',
      policeHint,
      thiefHint,
      resultMessage: this.resultMessage,
      showRestart: finished,
    };
  }

  isFinished(): boolean {
    const s = this.caseManager.getSnapshot()?.status;
    return s === 'completed' || s === 'failed';
  }

  dispose(): void {
    this.caseManager.dispose();
    this.arrestSystem.reset();
  }
}

function distanceXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
