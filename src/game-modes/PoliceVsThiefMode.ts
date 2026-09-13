import type { EventBus } from '@/core/EventBus';
import { CaseManager } from '@/cases/CaseManager';
import { generatePoliceVsThiefCase } from '@/cases/CaseGenerator';
import type { CaseDefinition } from '@/cases/CaseDefinition';
import { ArrestSystem, isAtPoi } from '@/systems/ArrestSystem';
import { poiById } from '@/world/CityData';
import { bearingDegrees, compassArrow } from '@/world/ObjectiveMarkers';
import type { GameMode, GameModeContext, GameModeHud } from '@/game-modes/GameMode';

const INVESTIGATE_RADIUS = 8;

export class PoliceVsThiefMode implements GameMode {
  readonly id = 'police_vs_thief';
  readonly name = 'Polis vs Hırsız';

  private readonly caseManager: CaseManager;
  private readonly arrestSystem: ArrestSystem;
  private activeCase?: CaseDefinition;
  private resultMessage?: string;

  constructor(eventBus: EventBus, caseDef?: CaseDefinition) {
    this.caseManager = new CaseManager(eventBus);
    this.arrestSystem = new ArrestSystem(eventBus);
    this.presetCase = caseDef;
  }

  private readonly presetCase?: CaseDefinition;

  start(): void {
    this.activeCase = this.presetCase ?? generatePoliceVsThiefCase();
    this.caseManager.start(this.activeCase);
    this.resultMessage = undefined;
  }

  getActiveCase(): CaseDefinition | undefined {
    return this.activeCase;
  }

  update(ctx: GameModeContext): GameModeHud {
    const caseDef = this.activeCase;
    const hideout = caseDef ? poiById(caseDef.escapePoiId) : undefined;
    const crime = caseDef ? poiById(caseDef.crimePoiId) : undefined;

    const thiefEscaped = hideout
      ? isAtPoi(ctx.thief.mesh.position, hideout, 4)
      : false;

    const crimeSceneInvestigated = crime
      ? isAtPoi(ctx.police.mesh.position, crime, INVESTIGATE_RADIUS)
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
      crimeSceneInvestigated,
    });

    const snapshot = this.caseManager.getSnapshot();
    const distToThief = distanceXZ(ctx.police.mesh.position, ctx.thief.mesh.position);
    const distToHideout = hideout
      ? distanceXZ(ctx.thief.mesh.position, hideout)
      : 0;

    const escalation = Boolean(
      snapshot && snapshot.status === 'active' && snapshot.timeRemainingSeconds <= 45,
    );

    if (snapshot?.status === 'completed') {
      this.resultMessage = 'Polis kazandı — hırsız tutuklandı!';
    } else if (snapshot?.status === 'failed') {
      this.resultMessage = thiefEscaped
        ? `Hırsız kazandı — ${hideout?.label ?? 'saklanma noktası'}na ulaştı!`
        : 'Süre doldu — hırsız kaçtı!';
    }

    const finished = snapshot?.status === 'completed' || snapshot?.status === 'failed';

    let policeHint = `Hırsıza mesafe: ${Math.round(distToThief)}m`;
    if (!crimeSceneInvestigated && crime) {
      policeHint = `Olay yerine git: ${crime.label} (${Math.round(distanceXZ(ctx.police.mesh.position, crime))}m)`;
    } else if (arrestState.inRange) {
      policeHint = arrestState.progressing
        ? 'Tutuklama devam ediyor — E veya Space basılı tut'
        : 'Yakındasın! E veya Space ile tutukla';
    } else if (distToThief > 25) {
      policeHint = 'Hırsızı takip et — pusulayı kullan';
    }

    const escapeLabel = hideout?.label ?? 'Saklanma noktası';
    let thiefHint = hideout
      ? `${escapeLabel}: ${Math.round(distToHideout)}m`
      : 'Saklanma noktasına ulaş';

    if (escalation) {
      thiefHint += ' · ACİL!';
    }

    const policeCompass = compassArrow(
      bearingDegrees(ctx.police.mesh.position, ctx.thief.mesh.position),
    );
    const thiefCompass = hideout
      ? compassArrow(bearingDegrees(ctx.thief.mesh.position, hideout))
      : '↑';

    return {
      caseSnapshot: snapshot,
      arrestState,
      thiefObjective: `${escapeLabel} yönüne kaç`,
      policeHint,
      thiefHint,
      policeCompass,
      thiefCompass,
      briefing: caseDef?.briefing,
      escalationActive: escalation,
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
    this.activeCase = undefined;
  }
}

function distanceXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
