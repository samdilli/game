import type { CaseDefinition } from '@/cases/CaseDefinition';
import { CITY_POIS, type POI } from '@/world/CityData';

export interface CaseGeneratorOptions {
  /** Sabit seed ile tekrarlanabilir vaka (test / debug). */
  seed?: number;
}

const CRIME_TYPES = new Set(['crime_location', 'civilian_area', 'shop']);
const ESCAPE_TYPES = new Set(['hiding_spot', 'park', 'alley']);

const CASE_TEMPLATES = [
  { title: 'Kaçan Hırsız', briefing: 'Şüpheli olay yerinden kaçtı. Yakalayın ve tutuklayın!' },
  { title: 'Market Baskını', briefing: 'Marketten hırsızlık ihbarı geldi. Şüpheli hâlâ bölgede!' },
  { title: 'Meydan Kargaşası', briefing: 'Meydanda düzen bozuldu. Kaçan şüpheliyi durdurun!' },
  { title: 'Sokak Soygunu', briefing: 'Arka sokakta soygun — şüpheli kaçış halinde!' },
  { title: 'Gece Operasyonu', briefing: 'Saklanma noktasına ulaşmadan önce yakalayın!' },
] as const;

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

function pickDistinctCrimeAndEscape(rng: () => number): { crime: POI; escape: POI } {
  const crimes = CITY_POIS.filter((p) => CRIME_TYPES.has(p.type));
  const escapes = CITY_POIS.filter((p) => ESCAPE_TYPES.has(p.type));
  const crime = pickRandom(crimes, rng);
  let escape = pickRandom(escapes, rng);
  let guard = 0;
  while (escape.id === crime.id && guard++ < 12) {
    escape = pickRandom(escapes, rng);
  }
  return { crime, escape };
}

function timeLimitForDifficulty(crime: POI, escape: POI): number {
  const chaseDistance = Math.hypot(crime.x - escape.x, crime.z - escape.z);
  if (chaseDistance > 45) return 210;
  if (chaseDistance > 30) return 180;
  return 150;
}

export function generatePoliceVsThiefCase(options: CaseGeneratorOptions = {}): CaseDefinition {
  const seed = options.seed ?? Date.now();
  const rng = mulberry32(seed);
  const { crime, escape } = pickDistinctCrimeAndEscape(rng);
  const template = pickRandom([...CASE_TEMPLATES], rng);
  const timeLimitSeconds = timeLimitForDifficulty(crime, escape);

  return {
    id: `pvp_${crime.id}_${escape.id}_${seed % 100000}`,
    title: template.title,
    briefing: `${template.briefing} Olay yeri: ${crime.label}. Hırsız ${escape.label} yönüne kaçabilir.`,
    objectives: [
      { id: 'investigate', description: `Olay yerini incele (${crime.label})` },
      { id: 'locate', description: 'Hırsızı bul ve takip et' },
      { id: 'approach', description: 'Yakın mesafeye gir (15m)' },
      { id: 'arrest', description: 'E veya Space ile tutuklamayı tamamla' },
    ],
    timeLimitSeconds,
    crimePoiId: crime.id,
    escapePoiId: escape.id,
    seed,
  };
}

export function getCaseSpawnPositions(caseDef: CaseDefinition): {
  police: { x: number; z: number };
  thief: { x: number; z: number };
} {
  const crime = CITY_POIS.find((p) => p.id === caseDef.crimePoiId);
  const escape = CITY_POIS.find((p) => p.id === caseDef.escapePoiId);
  if (!crime || !escape) {
    return { police: { x: -4, z: 0 }, thief: { x: 4, z: 0 } };
  }

  const dx = escape.x - crime.x;
  const dz = escape.z - crime.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len;
  const nz = dz / len;
  const px = -nz;
  const pz = nx;

  return {
    police: { x: crime.x + px * 3, z: crime.z + pz * 3 },
    thief: { x: crime.x + nx * 14, z: crime.z + nz * 14 },
  };
}
