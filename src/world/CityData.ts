export type CharacterRole = 'police' | 'thief' | 'civilian' | 'thief_npc' | 'police_npc';

export type ZoneType =
  | 'road'
  | 'building'
  | 'sidewalk'
  | 'park'
  | 'shop'
  | 'police_station'
  | 'crime_location'
  | 'hiding_spot'
  | 'alley'
  | 'civilian_area';

export interface POI {
  id: string;
  type: ZoneType;
  x: number;
  z: number;
  label: string;
}

export interface ObstacleRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  zone: ZoneType;
}

export interface CityBuildResult {
  worldSize: number;
  halfSize: number;
  obstacles: ObstacleRect[];
  pois: POI[];
}

/** Deterministic pseudo-random for reproducible city + nav grid. */
export function cityHashRandom(gx: number, gz: number, salt = 0): number {
  const n = Math.sin(gx * 127.1 + gz * 311.7 + salt * 17.13) * 43758.5453;
  return n - Math.floor(n);
}

export const CITY_POIS: POI[] = [
  { id: 'police_station', type: 'police_station', x: -28, z: -28, label: 'Polis Merkezi' },
  { id: 'park', type: 'park', x: 22, z: 24, label: 'Park' },
  { id: 'shop', type: 'shop', x: -14, z: 18, label: 'Market' },
  { id: 'crime_alley', type: 'crime_location', x: 30, z: 8, label: 'Şüpheli Sokak' },
  { id: 'back_alley', type: 'alley', x: -22, z: -6, label: 'Arka Sokak' },
  { id: 'hideout', type: 'hiding_spot', x: 26, z: -22, label: 'Saklanma Noktası' },
  { id: 'plaza', type: 'civilian_area', x: 0, z: 0, label: 'Meydan' },
];

export function buildObstacleLayout(worldSize: number): CityBuildResult {
  const spacing = 12;
  const half = worldSize / 2 - 4;
  const obstacles: ObstacleRect[] = [];

  for (let x = -half; x <= half; x += spacing) {
    for (let z = -half; z <= half; z += spacing) {
      if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;

      const isRoad = Math.abs(x % (spacing * 2)) < 1 || Math.abs(z % (spacing * 2)) < 1;
      if (isRoad) continue;

      const w = 4 + cityHashRandom(x, z, 1) * 3;
      const d = 4 + cityHashRandom(x, z, 2) * 3;
      obstacles.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        zone: 'building',
      });
    }
  }

  return {
    worldSize,
    halfSize: half,
    obstacles,
    pois: CITY_POIS,
  };
}

export function poiById(id: string): POI | undefined {
  return CITY_POIS.find((p) => p.id === id);
}

export function nearestPoi(x: number, z: number, type?: ZoneType): POI | undefined {
  let best: POI | undefined;
  let bestDist = Infinity;
  for (const poi of CITY_POIS) {
    if (type && poi.type !== type) continue;
    const d = (poi.x - x) ** 2 + (poi.z - z) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = poi;
    }
  }
  return best;
}
