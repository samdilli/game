import { describe, expect, it } from 'vitest';
import {
  locomotionStateFromSpeed,
  DEFAULT_LOCOMOTION_THRESHOLDS,
} from '@/config/animations';

describe('locomotionStateFromSpeed', () => {
  it('returns idle when nearly stopped', () => {
    expect(locomotionStateFromSpeed(0, false)).toBe('idle');
    expect(locomotionStateFromSpeed(0.1, false)).toBe('idle');
  });

  it('returns walk at moderate speed', () => {
    expect(locomotionStateFromSpeed(3, false, DEFAULT_LOCOMOTION_THRESHOLDS)).toBe('walk');
  });

  it('returns sprint when sprinting', () => {
    expect(locomotionStateFromSpeed(3, true)).toBe('sprint');
  });

  it('returns run at high speed without sprint flag', () => {
    expect(locomotionStateFromSpeed(6, false, DEFAULT_LOCOMOTION_THRESHOLDS)).toBe('run');
  });
});
