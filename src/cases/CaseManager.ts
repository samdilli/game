import type { EventBus } from '@/core/EventBus';
import type {
  CaseDefinition,
  CaseObjectiveState,
  CaseSnapshot,
  CaseStatus,
  CaseUpdateContext,
} from '@/cases/CaseDefinition';

export class CaseManager {
  private definition?: CaseDefinition;
  private objectives: CaseObjectiveState[] = [];
  private status: CaseStatus = 'inactive';
  private elapsed = 0;

  constructor(private readonly eventBus: EventBus) {}

  start(definition: CaseDefinition): void {
    this.definition = definition;
    this.status = 'active';
    this.elapsed = 0;
    this.objectives = definition.objectives.map((o, i) => ({
      id: o.id,
      description: o.description,
      status: i === 0 ? 'active' : 'pending',
    }));
    this.eventBus.emit('CaseStarted', {
      caseId: definition.id,
      title: definition.title,
    });
  }

  update(dt: number, ctx: CaseUpdateContext): void {
    if (this.status !== 'active' || !this.definition) return;

    this.elapsed += dt;
    const limit = this.definition.timeLimitSeconds;

    if (this.elapsed >= limit) {
      this.finish('failed', 'time');
      return;
    }

    if (ctx.arrestCompleted) {
      this.setObjectiveStatus('arrest', 'completed');
      this.setObjectiveStatus('approach', 'completed');
      this.setObjectiveStatus('locate', 'completed');
      this.finish('completed', 'arrest');
      return;
    }

    if (ctx.thiefEscaped) {
      this.finish('failed', 'escape');
      return;
    }

    const dist = distanceXZ(ctx.policePosition, ctx.thiefPosition);
    if (dist <= 15) {
      this.activateObjective('approach');
    }
    if (dist <= 25) {
      this.completeObjective('locate');
    }
  }

  getSnapshot(): CaseSnapshot | null {
    if (!this.definition) return null;
    const limit = this.definition.timeLimitSeconds;
    return {
      id: this.definition.id,
      title: this.definition.title,
      briefing: this.definition.briefing,
      status: this.status,
      objectives: this.objectives.map((o) => ({ ...o })),
      elapsedSeconds: this.elapsed,
      timeLimitSeconds: limit,
      timeRemainingSeconds: Math.max(0, limit - this.elapsed),
    };
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  dispose(): void {
    this.definition = undefined;
    this.objectives = [];
    this.status = 'inactive';
    this.elapsed = 0;
  }

  private finish(result: 'completed' | 'failed', reason: string): void {
    if (this.status !== 'active' || !this.definition) return;
    this.status = result;
    if (result === 'completed') {
      this.eventBus.emit('CaseCompleted', { caseId: this.definition.id, reason });
    } else {
      this.eventBus.emit('CaseFailed', { caseId: this.definition.id, reason });
    }
  }

  private activateObjective(id: string): void {
    const obj = this.objectives.find((o) => o.id === id);
    if (!obj || obj.status !== 'pending') return;
    obj.status = 'active';
    this.eventBus.emit('CaseObjectiveUpdated', { objectiveId: id, status: 'active' });
  }

  private completeObjective(id: string): void {
    const obj = this.objectives.find((o) => o.id === id);
    if (!obj || obj.status === 'completed') return;
    obj.status = 'completed';
    this.eventBus.emit('CaseObjectiveUpdated', { objectiveId: id, status: 'completed' });
  }

  private setObjectiveStatus(id: string, status: CaseObjectiveState['status']): void {
    const obj = this.objectives.find((o) => o.id === id);
    if (obj) obj.status = status;
  }
}

function distanceXZ(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
