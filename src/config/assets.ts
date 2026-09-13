/**
 * Asset paths — production targets Quaternius packs (CC0).
 * Drop downloaded zips into public/assets/ (see public/assets/README.md).
 */
export const ASSET_PATHS = {
  /** Universal Base Characters [Standard] — e.g. Regular_Male.glb */
  quaterniusBaseCharacter: '/assets/characters/quaternius/Regular_Male.glb',
  /** Universal Animation Library 2 [Standard, no root motion] */
  quaterniusAnimationLibrary: '/assets/animations/quaternius/UAL2_Standard.glb',
} as const;

export const CHARACTER_SPAWN = {
  targetHeight: 1.75,
  policeTint: { r: 0.55, g: 0.72, b: 1.0 },
  thiefTint: { r: 1.0, g: 0.45, b: 0.4 },
} as const;

export type AssetVisualMode = 'glb' | 'primitive';

export interface ResolvedCharacterAssets {
  source: 'quaternius' | 'dev-fallback';
  visual: AssetVisualMode;
  modelUrl?: string;
  animationLibraryUrl?: string;
}

const GLB_MAGIC = 'glTF';

/** Verify the URL returns a real binary GLB (not Vite HTML fallback). */
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
 * Quaternius GLB varsa onu kullan.
 * Yoksa primitive capsule (CesiumMan GLB dev modda kullanılmaz — ölçek/iskel et sorunlu).
 */
export async function resolveCharacterAssets(): Promise<ResolvedCharacterAssets> {
  const hasQuaternius = await isValidGlbUrl(ASSET_PATHS.quaterniusBaseCharacter);
  if (hasQuaternius) {
    const hasAnimLib = await isValidGlbUrl(ASSET_PATHS.quaterniusAnimationLibrary);
    return {
      source: 'quaternius',
      visual: 'glb',
      modelUrl: ASSET_PATHS.quaterniusBaseCharacter,
      animationLibraryUrl: hasAnimLib ? ASSET_PATHS.quaterniusAnimationLibrary : undefined,
    };
  }

  return {
    source: 'dev-fallback',
    visual: 'primitive',
  };
}
