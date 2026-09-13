import { describe, expect, it } from 'vitest';
import { generatePoliceVsThiefCase, getCaseSpawnPositions } from '@/cases/CaseGenerator';
import { poiById } from '@/world/CityData';

describe('CaseGenerator', () => {
  it('generates deterministic cases with seed', () => {
    const a = generatePoliceVsThiefCase({ seed: 42 });
    const b = generatePoliceVsThiefCase({ seed: 42 });
    expect(a).toEqual(b);
  });

  it('uses distinct crime and escape POIs', () => {
    const c = generatePoliceVsThiefCase({ seed: 99 });
    expect(c.crimePoiId).not.toBe(c.escapePoiId);
    expect(poiById(c.crimePoiId)).toBeDefined();
    expect(poiById(c.escapePoiId)).toBeDefined();
  });

  it('places thief between crime and escape', () => {
    const c = generatePoliceVsThiefCase({ seed: 7 });
    const { police, thief } = getCaseSpawnPositions(c);
    const crime = poiById(c.crimePoiId)!;
    const distPoliceCrime = Math.hypot(police.x - crime.x, police.z - crime.z);
    const distThiefCrime = Math.hypot(thief.x - crime.x, thief.z - crime.z);
    expect(distPoliceCrime).toBeLessThan(8);
    expect(distThiefCrime).toBeGreaterThan(10);
  });
});
