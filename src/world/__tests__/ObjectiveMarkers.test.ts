import { describe, expect, it } from 'vitest';
import { bearingDegrees, compassArrow } from '@/world/ObjectiveMarkers';

describe('ObjectiveMarkers helpers', () => {
  it('computes east bearing', () => {
    expect(Math.round(bearingDegrees({ x: 0, z: 0 }, { x: 10, z: 0 }))).toBe(90);
  });

  it('maps bearing to compass arrow', () => {
    expect(compassArrow(0)).toBe('↑');
    expect(compassArrow(90)).toBe('→');
  });
});
