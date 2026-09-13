import { describe, expect, it } from 'vitest';
import {
  NPCStateMachine,
  CIVILIAN_TRANSITIONS,
  evaluateCivilianEvents,
} from '@/npc/NPCStateMachine';

describe('NPCStateMachine', () => {
  it('transitions civilian idle to walking on go', () => {
    const sm = new NPCStateMachine('idle', CIVILIAN_TRANSITIONS);
    expect(sm.trigger('go')).toBe('walking');
  });

  it('transitions to fleeing on threat', () => {
    const sm = new NPCStateMachine('walking', CIVILIAN_TRANSITIONS);
    expect(sm.trigger('threat')).toBe('fleeing');
  });

  it('evaluateCivilianEvents emits threat when police seen', () => {
    const events = evaluateCivilianEvents({
      arrivedAtDestination: false,
      seesPolice: true,
      seesThiefPlayer: false,
      hearsThreat: false,
      isSafe: false,
      crimeTimerDone: false,
      stuck: false,
    });
    expect(events).toContain('threat');
  });
});
