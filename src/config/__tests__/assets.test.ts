import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isValidGlbUrl, resolveCharacterAssets, ASSET_PATHS } from '@/config/assets';

describe('isValidGlbUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects HTML fallback responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        arrayBuffer: async () => new TextEncoder().encode('<html').buffer,
      }),
    );

    expect(await isValidGlbUrl('/missing.glb')).toBe(false);
  });

  it('accepts glTF magic bytes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'model/gltf-binary' },
        arrayBuffer: async () => new TextEncoder().encode('glTF').buffer,
      }),
    );

    expect(await isValidGlbUrl('/valid.glb')).toBe(true);
  });
});

describe('resolveCharacterAssets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to dev character when quaternius missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        const isDev = url.includes('dev/CesiumMan');
        return {
          ok: true,
          headers: { get: () => (isDev ? 'model/gltf-binary' : 'text/html') },
          arrayBuffer: async () => new TextEncoder().encode(isDev ? 'glTF' : '<!DO').buffer,
        };
      }),
    );

    const assets = await resolveCharacterAssets();
    expect(assets.source).toBe('dev-fallback');
    expect(assets.modelUrl).toBe(ASSET_PATHS.devFallbackCharacter);
  });
});
