import type { CivilianState, ThiefNpcState } from '@/config/npc';

export type NPCState = CivilianState | ThiefNpcState;

export interface StateTransitionContext {
  arrivedAtDestination: boolean;
  seesPolice: boolean;
  seesThiefPlayer: boolean;
  hearsThreat: boolean;
  isSafe: boolean;
  crimeTimerDone: boolean;
  stuck: boolean;
}

export class NPCStateMachine<TState extends string> {
  private state: TState;

  constructor(
    initial: TState,
    private readonly transitions: Record<
      TState,
      Partial<Record<string, TState>>
    >,
  ) {
    this.state = initial;
  }

  get current(): TState {
    return this.state;
  }

  trigger(event: string): TState {
    const next = this.transitions[this.state]?.[event];
    if (next) this.state = next;
    return this.state;
  }

  force(state: TState): void {
    this.state = state;
  }
}

export const CIVILIAN_TRANSITIONS: Record<CivilianState, Partial<Record<string, CivilianState>>> = {
  idle: {
    go: 'walking',
    threat: 'fleeing',
    suspicious: 'suspicious',
  },
  walking: {
    arrive: 'idle',
    threat: 'fleeing',
    suspicious: 'suspicious',
  },
  suspicious: {
    threat: 'fleeing',
    calm: 'idle',
    report: 'calling_police',
  },
  fleeing: {
    safe: 'idle',
    report: 'calling_police',
  },
  calling_police: {
    done: 'idle',
  },
};

export const THIEF_NPC_TRANSITIONS: Record<ThiefNpcState, Partial<Record<string, ThiefNpcState>>> = {
  walking: {
    arrive: 'committing_crime',
    spotted: 'alert',
  },
  committing_crime: {
    done: 'walking',
    spotted: 'alert',
  },
  alert: {
    flee: 'fleeing',
  },
  fleeing: {
    hide: 'hiding',
    caught: 'surrendering',
  },
  hiding: {
    clear: 'walking',
    spotted: 'fleeing',
  },
  surrendering: {
    reset: 'walking',
  },
};

export function evaluateCivilianEvents(ctx: StateTransitionContext): string[] {
  const events: string[] = [];
  if (ctx.arrivedAtDestination) events.push('arrive');
  if (ctx.seesPolice || ctx.seesThiefPlayer || ctx.hearsThreat) events.push('threat');
  if (ctx.isSafe && ctx.seesPolice) events.push('report');
  if (ctx.isSafe) events.push('safe', 'calm', 'done');
  return events;
}

export function evaluateThiefEvents(ctx: StateTransitionContext): string[] {
  const events: string[] = [];
  if (ctx.arrivedAtDestination) events.push('arrive');
  if (ctx.crimeTimerDone) events.push('done');
  if (ctx.seesPolice) events.push('spotted', 'flee');
  if (ctx.isSafe && ctx.seesPolice === false) events.push('hide', 'clear');
  if (ctx.stuck) events.push('flee');
  return events;
}
