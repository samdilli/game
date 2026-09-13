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

  it('uses primitive capsules when quaternius missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        headers: { get: () => 'text/html' },
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    );

    const assets = await resolveCharacterAssets();
    expect(assets.source).toBe('dev-fallback');
    expect(assets.visual).toBe('primitive');
    expect(assets.modelUrl).toBeUndefined();
  });

  it('uses quaternius glb when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => ({
        ok: true,
        headers: {
          get: () =>
            String(url).includes('quaternius') ? 'model/gltf-binary' : 'text/html',
        },
        arrayBuffer: async () =>
          new TextEncoder().encode(String(url).includes('quaternius') ? 'glTF' : '<!DO').buffer,
      })),
    );

    const assets = await resolveCharacterAssets();
    expect(assets.source).toBe('quaternius');
    expect(assets.visual).toBe('glb');
    expect(assets.modelUrl).toBe(ASSET_PATHS.quaterniusBaseCharacter);
  });
});
