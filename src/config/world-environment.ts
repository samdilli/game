export type WeatherType = 'clear' | 'cloudy' | 'rain';

export interface WorldEnvironmentConfig {
  /** Gerçek saniyede kaç oyun saati geçer (0 = dondur). */
  hoursPerRealSecond: number;
  /** Başlangıç saati (0–24). */
  startHour: number;
}

export const DEFAULT_WORLD_ENV_CONFIG: WorldEnvironmentConfig = {
  hoursPerRealSecond: 0.015,
  startHour: 17.5,
};

export const WEATHER_LABELS: Record<WeatherType, string> = {
  clear: 'Açık',
  cloudy: 'Bulutlu',
  rain: 'Yağmurlu',
};

export function weatherFromSeed(seed: number): WeatherType {
  const n = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  if (n < 0.45) return 'clear';
  if (n < 0.78) return 'cloudy';
  return 'rain';
}

export function startHourFromSeed(seed: number): number {
  const n = Math.abs(Math.sin(seed * 78.233) * 43758.5453) % 1;
  return 14 + n * 10;
}

export function formatGameHour(hour24: number): string {
  const h = Math.floor(hour24 % 24);
  const m = Math.floor((hour24 % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timePhaseLabel(hour24: number): string {
  const h = hour24 % 24;
  if (h >= 5 && h < 7) return 'Şafak';
  if (h >= 7 && h < 18) return 'Gündüz';
  if (h >= 18 && h < 21) return 'Alacakaranlık';
  return 'Gece';
}

export function sunIntensityForHour(hour24: number): number {
  const h = hour24 % 24;
  if (h >= 7 && h <= 17) return 0.85;
  if (h >= 5 && h < 7) return 0.35 + (h - 5) * 0.25;
  if (h > 17 && h < 21) return 0.85 - (h - 17) * 0.2;
  return 0.12;
}

export function ambientIntensityForHour(hour24: number): number {
  const h = hour24 % 24;
  if (h >= 7 && h <= 18) return 0.55;
  if (h >= 5 && h < 7) return 0.3 + (h - 5) * 0.12;
  if (h > 18 && h < 21) return 0.55 - (h - 18) * 0.1;
  return 0.22;
}

export function skyColorForHour(hour24: number): { r: number; g: number; b: number } {
  const h = hour24 % 24;
  if (h >= 7 && h <= 17) return { r: 0.53, g: 0.75, b: 0.92 };
  if (h >= 5 && h < 7) return { r: 0.72, g: 0.58, b: 0.62 };
  if (h > 17 && h < 21) return { r: 0.55, g: 0.42, b: 0.58 };
  return { r: 0.06, g: 0.08, b: 0.16 };
}

export function fogDensityForWeather(weather: WeatherType, hour24: number): number {
  let base = weather === 'rain' ? 0.018 : weather === 'cloudy' ? 0.008 : 0.003;
  const h = hour24 % 24;
  if (h < 6 || h > 20) base += 0.006;
  return base;
}
