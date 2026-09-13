import type { ZoneType } from '@/world/CityData';

export type CivilianState = 'idle' | 'walking' | 'suspicious' | 'fleeing' | 'calling_police';
export type ThiefNpcState = 'walking' | 'committing_crime' | 'alert' | 'fleeing' | 'hiding' | 'surrendering';

export interface NPCArchetypeConfig {
  id: string;
  displayName: string;
  role: 'civilian' | 'thief_npc';
  moveSpeed: number;
  sprintMultiplier: number;
  visionRange: number;
  visionAngleDeg: number;
  hearingRange: number;
  tint: { r: number; g: number; b: number };
  homePoiId?: string;
  workPoiId?: string;
  crimePoiId?: string;
  hidePoiId?: string;
}

export const CIVILIAN_ARCHETYPE: NPCArchetypeConfig = {
  id: 'civilian',
  displayName: 'Sivil',
  role: 'civilian',
  moveSpeed: 3.5,
  sprintMultiplier: 1.5,
  visionRange: 16,
  visionAngleDeg: 130,
  hearingRange: 22,
  tint: { r: 0.85, g: 0.82, b: 0.75 },
  homePoiId: 'plaza',
  workPoiId: 'shop',
};

export const THIEF_NPC_ARCHETYPE: NPCArchetypeConfig = {
  id: 'thief_npc',
  displayName: 'Şüpheli',
  role: 'thief_npc',
  moveSpeed: 4.5,
  sprintMultiplier: 1.85,
  visionRange: 18,
  visionAngleDeg: 140,
  hearingRange: 24,
  tint: { r: 0.75, g: 0.35, b: 0.35 },
  crimePoiId: 'crime_alley',
  hidePoiId: 'hideout',
};

export const NPC_SPAWN_CONFIG = {
  civilianCount: 3,
  includeThiefNpc: true,
  lod0Distance: 24,
  lod1Distance: 44,
  lod0TickSeconds: 0.15,
  lod1TickSeconds: 0.45,
  lod2TickSeconds: 1.5,
} as const;

export interface PatrolRoute {
  poiIds: string[];
}

export const CIVILIAN_PATROL_ROUTES: PatrolRoute[] = [
  { poiIds: ['plaza', 'shop', 'park'] },
  { poiIds: ['shop', 'plaza'] },
  { poiIds: ['park', 'plaza', 'shop'] },
  { poiIds: ['plaza', 'park'] },
  { poiIds: ['shop', 'park'] },
  { poiIds: ['plaza', 'shop'] },
];

export function zoneIsSafe(type: ZoneType): boolean {
  return type === 'hiding_spot' || type === 'alley' || type === 'park';
}
