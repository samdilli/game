import type { Vector3 } from '@babylonjs/core';

export type ObjectiveStatus = 'pending' | 'active' | 'completed' | 'failed';

export type CaseStatus = 'inactive' | 'active' | 'completed' | 'failed';

export interface CaseObjectiveDefinition {
  id: string;
  description: string;
  optional?: boolean;
}

export interface CaseDefinition {
  id: string;
  title: string;
  briefing: string;
  objectives: CaseObjectiveDefinition[];
  timeLimitSeconds: number;
  crimePoiId: string;
  escapePoiId: string;
  seed?: number;
}

export interface CaseObjectiveState {
  id: string;
  description: string;
  status: ObjectiveStatus;
}

export interface CaseSnapshot {
  id: string;
  title: string;
  briefing: string;
  status: CaseStatus;
  objectives: CaseObjectiveState[];
  elapsedSeconds: number;
  timeLimitSeconds: number;
  timeRemainingSeconds: number;
}

export interface CaseUpdateContext {
  policePosition: Vector3;
  thiefPosition: Vector3;
  arrestCompleted: boolean;
  thiefEscaped: boolean;
  crimeSceneInvestigated?: boolean;
}

export const POLICE_VS_THIEF_CASE: CaseDefinition = {
  id: 'pvp_chase_01',
  title: 'Kaçan Hırsız',
  briefing: 'Hırsız şehir merkezinde görüldü. Yakalayın ve tutuklayın!',
  objectives: [
    { id: 'locate', description: 'Hırsızı bul ve takip et' },
    { id: 'approach', description: 'Yakın mesafeye gir (15m)' },
    { id: 'arrest', description: 'E veya Space ile tutuklamayı tamamla' },
  ],
  timeLimitSeconds: 180,
  crimePoiId: 'plaza',
  escapePoiId: 'hideout',
};
