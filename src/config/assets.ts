/**
 * Asset paths — CC0 character packs (Kenney + Quaternius).
 * See public/assets/README.md and `npm run fetch-assets`.
 */
export const ASSET_PATHS = {
  quaternius: {
    male: '/assets/characters/quaternius/Regular_Male.glb',
    female: '/assets/characters/quaternius/Regular_Female.glb',
    mannequin: '/assets/characters/quaternius/Mannequin_F.glb',
    animationLibrary: '/assets/animations/quaternius/UAL2_Standard.glb',
  },
  kenney: {
    police: '/assets/characters/kenney/character-male-a.glb',
    thief: '/assets/characters/kenney/character-female-a.glb',
    npc: [
      '/assets/characters/kenney/character-male-b.glb',
      '/assets/characters/kenney/character-male-c.glb',
      '/assets/characters/kenney/character-female-b.glb',
      '/assets/characters/kenney/character-female-c.glb',
    ],
  },
} as const;

/** @deprecated use ASSET_PATHS.quaternius.male */
export const LEGACY_QUATERNIUS_PATHS = {
  quaterniusBaseCharacter: ASSET_PATHS.quaternius.male,
  quaterniusAnimationLibrary: ASSET_PATHS.quaternius.animationLibrary,
} as const;

export const CHARACTER_SPAWN = {
  targetHeight: 1.75,
  policeTint: { r: 0.55, g: 0.72, b: 1.0 },
  thiefTint: { r: 1.0, g: 0.45, b: 0.4 },
} as const;

export type AssetVisualMode = 'glb' | 'primitive';
export type CharacterAssetSource = 'quaternius' | 'kenney' | 'dev-fallback';

export interface ResolvedCharacterAssets {
  source: CharacterAssetSource;
  visual: AssetVisualMode;
  models: {
    police: string;
    thief: string;
  };
  npcModels: string[];
  animationLibraryUrl?: string;
  /** Kenney GLB'ler animasyonları içerir; UAL2 merge edilmez. */
  mergeExternalAnimations: boolean;
}

import type { CharacterRole } from '@/world/CityData';

const GLB_MAGIC = 'glTF';

export async function isValidGlbUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-3' } });
    if (!res.ok) return false;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) return false;

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 4) return false;

    const magic = new TextDecoder().decode(new Uint8Array(buf).slice(0, 4));
    return magic === GLB_MAGIC;
  } catch {
    return false;
  }
}

/**
 * Öncelik: Quaternius UBC → Kenney Mini Characters → Quaternius mannequin + UAL2 → capsule.
 */
export async function resolveCharacterAssets(): Promise<ResolvedCharacterAssets> {
  const qMale = await isValidGlbUrl(ASSET_PATHS.quaternius.male);
  const qFemale = await isValidGlbUrl(ASSET_PATHS.quaternius.female);
  const qMannequin = await isValidGlbUrl(ASSET_PATHS.quaternius.mannequin);
  const animLib = await isValidGlbUrl(ASSET_PATHS.quaternius.animationLibrary);

  if (qMale || qFemale) {
    const police = qMale ? ASSET_PATHS.quaternius.male : ASSET_PATHS.quaternius.female;
    const thief = qFemale ? ASSET_PATHS.quaternius.female : ASSET_PATHS.quaternius.male;
    const npcModels: string[] = [];
    if (qMale) npcModels.push(ASSET_PATHS.quaternius.male);
    if (qFemale) npcModels.push(ASSET_PATHS.quaternius.female);

    return {
      source: 'quaternius',
      visual: 'glb',
      models: { police, thief },
      npcModels,
      animationLibraryUrl: animLib ? ASSET_PATHS.quaternius.animationLibrary : undefined,
      mergeExternalAnimations: Boolean(animLib),
    };
  }

  const kenneyPolice = await isValidGlbUrl(ASSET_PATHS.kenney.police);
  const kenneyThief = await isValidGlbUrl(ASSET_PATHS.kenney.thief);
  if (kenneyPolice && kenneyThief) {
    const npcModels: string[] = [];
    for (const url of ASSET_PATHS.kenney.npc) {
      if (await isValidGlbUrl(url)) npcModels.push(url);
    }
    return {
      source: 'kenney',
      visual: 'glb',
      models: {
        police: ASSET_PATHS.kenney.police,
        thief: ASSET_PATHS.kenney.thief,
      },
      npcModels,
      mergeExternalAnimations: false,
    };
  }

  if (qMannequin) {
    return {
      source: 'quaternius',
      visual: 'glb',
      models: {
        police: ASSET_PATHS.quaternius.mannequin,
        thief: ASSET_PATHS.quaternius.mannequin,
      },
      npcModels: [ASSET_PATHS.quaternius.mannequin],
      animationLibraryUrl: animLib ? ASSET_PATHS.quaternius.animationLibrary : undefined,
      mergeExternalAnimations: Boolean(animLib),
    };
  }

  return {
    source: 'dev-fallback',
    visual: 'primitive',
    models: { police: '', thief: '' },
    npcModels: [],
    mergeExternalAnimations: false,
  };
}

export function pickNpcModelUrl(assets: ResolvedCharacterAssets, npcId: number): string | undefined {
  if (assets.visual === 'primitive') return undefined;
  if (assets.npcModels.length === 0) {
    return assets.models.police || assets.models.thief;
  }
  return assets.npcModels[npcId % assets.npcModels.length];
}

export function pickPlayerModelUrl(
  assets: ResolvedCharacterAssets,
  role: 'police' | 'thief',
): string | undefined {
  if (assets.visual === 'primitive') return undefined;
  return role === 'police' ? assets.models.police : assets.models.thief;
}

export function pickRoleModelUrl(
  assets: ResolvedCharacterAssets,
  role: CharacterRole,
  entityId: number,
): string | undefined {
  if (assets.visual === 'primitive') return undefined;
  if (role === 'police' || role === 'police_npc') return assets.models.police;
  if (role === 'thief' || role === 'thief_npc') return assets.models.thief;
  return pickNpcModelUrl(assets, entityId);
}
