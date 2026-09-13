import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  isValidGlbUrl,
  resolveCharacterAssets,
  ASSET_PATHS,
  pickRoleModelUrl,
} from '@/config/assets';

function mockFetch(handler: (url: string) => { ok: boolean; contentType: string; magic: string }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url: string) => {
      const r = handler(String(url));
      return {
        ok: r.ok,
        headers: { get: () => r.contentType },
        arrayBuffer: async () => new TextEncoder().encode(r.magic).buffer,
      };
    }),
  );
}

describe('isValidGlbUrl', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects HTML fallback responses', async () => {
    mockFetch(() => ({ ok: true, contentType: 'text/html', magic: '<htm' }));
    expect(await isValidGlbUrl('/missing.glb')).toBe(false);
  });

  it('accepts glTF magic bytes', async () => {
    mockFetch(() => ({ ok: true, contentType: 'model/gltf-binary', magic: 'glTF' }));
    expect(await isValidGlbUrl('/valid.glb')).toBe(true);
  });
});

describe('resolveCharacterAssets', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uses primitive capsules when no packs present', async () => {
    mockFetch(() => ({ ok: false, contentType: 'text/html', magic: '' }));
    const assets = await resolveCharacterAssets();
    expect(assets.source).toBe('dev-fallback');
    expect(assets.visual).toBe('primitive');
  });

  it('prefers kenney when quaternius UBC missing', async () => {
    mockFetch((url) => {
      const kenney = url.includes('/kenney/');
      return {
        ok: kenney,
        contentType: kenney ? 'model/gltf-binary' : 'text/html',
        magic: kenney ? 'glTF' : '<!DO',
      };
    });

    const assets = await resolveCharacterAssets();
    expect(assets.source).toBe('kenney');
    expect(assets.models.police).toBe(ASSET_PATHS.kenney.police);
    expect(assets.models.thief).toBe(ASSET_PATHS.kenney.thief);
    expect(assets.mergeExternalAnimations).toBe(false);
  });

  it('uses quaternius UBC when present', async () => {
    mockFetch((url) => {
      const q = url.includes('/quaternius/Regular_');
      return {
        ok: q,
        contentType: q ? 'model/gltf-binary' : 'text/html',
        magic: q ? 'glTF' : '<!DO',
      };
    });

    const assets = await resolveCharacterAssets();
    expect(assets.source).toBe('quaternius');
    expect(assets.models.police).toBe(ASSET_PATHS.quaternius.male);
  });
});

describe('pickRoleModelUrl', () => {
  it('maps roles to pack models', () => {
    const assets = {
      source: 'kenney' as const,
      visual: 'glb' as const,
      models: {
        police: ASSET_PATHS.kenney.police,
        thief: ASSET_PATHS.kenney.thief,
      },
      npcModels: [...ASSET_PATHS.kenney.npc],
      mergeExternalAnimations: false,
    };
    expect(pickRoleModelUrl(assets, 'police', 1)).toBe(ASSET_PATHS.kenney.police);
    expect(pickRoleModelUrl(assets, 'civilian', 1001)).toBe(ASSET_PATHS.kenney.npc[1]);
  });
});
