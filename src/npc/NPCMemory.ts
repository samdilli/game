import { Vector3 } from '@babylonjs/core';

export interface MemoryEvent {
  kind: 'seen_police' | 'seen_crime' | 'heard_alarm' | 'failed_escape';
  position: Vector3;
  timeMs: number;
  entityId?: number;
}

export class NPCMemory {
  lastKnownPolicePosition?: Vector3;
  lastKnownThreatPosition?: Vector3;
  lastCrimePosition?: Vector3;
  suspiciousLocation?: Vector3;
  failedEscapeRoutes: Vector3[] = [];

  private events: MemoryEvent[] = [];
  private readonly maxEvents = 16;

  remember(event: MemoryEvent): void {
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) this.events.pop();

    switch (event.kind) {
      case 'seen_police':
        this.lastKnownPolicePosition = event.position.clone();
        break;
      case 'seen_crime':
        this.lastCrimePosition = event.position.clone();
        this.suspiciousLocation = event.position.clone();
        break;
      case 'failed_escape':
        this.failedEscapeRoutes.push(event.position.clone());
        if (this.failedEscapeRoutes.length > 4) this.failedEscapeRoutes.shift();
        break;
      case 'heard_alarm':
        this.lastKnownThreatPosition = event.position.clone();
        break;
    }
  }

  recentEvents(withinMs: number, nowMs: number): MemoryEvent[] {
    return this.events.filter((e) => nowMs - e.timeMs <= withinMs);
  }

  clear(): void {
    this.events = [];
    this.lastKnownPolicePosition = undefined;
    this.lastKnownThreatPosition = undefined;
    this.lastCrimePosition = undefined;
    this.suspiciousLocation = undefined;
    this.failedEscapeRoutes = [];
  }
}
