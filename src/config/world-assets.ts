import { isValidGlbUrl } from '@/config/assets';

export const WORLD_ASSET_PATHS = {
  /** Quaternius Modular City — örnek bina GLB */
  quaterniusBuildingSmall: '/assets/world/quaternius/Building_Small.glb',
  quaterniusBuildingLarge: '/assets/world/quaternius/Building_Large.glb',
} as const;

export interface ResolvedWorldAssets {
  source: 'quaternius' | 'procedural';
  buildingSmallUrl?: string;
  buildingLargeUrl?: string;
}

export async function resolveWorldAssets(): Promise<ResolvedWorldAssets> {
  const hasSmall = await isValidGlbUrl(WORLD_ASSET_PATHS.quaterniusBuildingSmall);
  if (!hasSmall) {
    return { source: 'procedural' };
  }

  const hasLarge = await isValidGlbUrl(WORLD_ASSET_PATHS.quaterniusBuildingLarge);
  return {
    source: 'quaternius',
    buildingSmallUrl: WORLD_ASSET_PATHS.quaterniusBuildingSmall,
    buildingLargeUrl: hasLarge ? WORLD_ASSET_PATHS.quaterniusBuildingLarge : undefined,
  };
}
