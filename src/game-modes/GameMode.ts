import type { CaseSnapshot } from '@/cases/CaseDefinition';
import type { ArrestState } from '@/systems/ArrestSystem';
import type { Character } from '@/characters/Character';
import type { WorldEnvironmentState } from '@/world/WorldEnvironment';

export interface GameModeContext {
  police: Character;
  thief: Character;
  policeHoldingInteract: boolean;
  dt: number;
  environment?: WorldEnvironmentState;
}

export interface GameModeHud {
  caseSnapshot: CaseSnapshot | null;
  arrestState: ArrestState | null;
  thiefObjective: string;
  policeHint?: string;
  thiefHint?: string;
  policeCompass?: string;
  thiefCompass?: string;
  briefing?: string;
  escalationActive?: boolean;
  environmentLabel?: string;
  resultMessage?: string;
  showRestart?: boolean;
}

export interface GameMode {
  readonly id: string;
  readonly name: string;
  start(): void;
  update(ctx: GameModeContext): GameModeHud;
  isFinished(): boolean;
  dispose(): void;
}
