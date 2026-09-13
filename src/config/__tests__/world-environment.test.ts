import { describe, expect, it } from 'vitest';
import {
  formatGameHour,
  fogDensityForWeather,
  startHourFromSeed,
  sunIntensityForHour,
  timePhaseLabel,
  weatherFromSeed,
} from '@/config/world-environment';

describe('world-environment config', () => {
  it('derives stable weather from seed', () => {
    expect(weatherFromSeed(42)).toBe(weatherFromSeed(42));
  });

  it('formats hour labels', () => {
    expect(formatGameHour(17.5)).toBe('17:30');
  });

  it('labels day phases', () => {
    expect(timePhaseLabel(10)).toBe('Gündüz');
    expect(timePhaseLabel(22)).toBe('Gece');
  });

  it('dims sun at night', () => {
    expect(sunIntensityForHour(14)).toBeGreaterThan(sunIntensityForHour(23));
  });

  it('increases fog in rain', () => {
    expect(fogDensityForWeather('rain', 12)).toBeGreaterThan(
      fogDensityForWeather('clear', 12),
    );
  });

  it('start hour stays in afternoon/evening band', () => {
    const h = startHourFromSeed(123);
    expect(h).toBeGreaterThanOrEqual(14);
    expect(h).toBeLessThan(24);
  });
});
