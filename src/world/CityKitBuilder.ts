import { type AbstractMesh, type Scene } from '@babylonjs/core';
import type { AssetManager } from '@/engine/AssetManager';
import type { ResolvedWorldAssets } from '@/config/world-assets';
import { cityHashRandom } from '@/world/CityData';

const REPLACEMENT_CHANCE = 0.38;

export class CityKitBuilder {
  static async enhance(
    scene: Scene,
    assetManager: AssetManager,
    assets: ResolvedWorldAssets,
  ): Promise<number> {
    if (assets.source !== 'quaternius' || !assets.buildingSmallUrl) {
      return 0;
    }

    const smallContainer = await assetManager.loadContainer(assets.buildingSmallUrl, scene);
    let largeContainer = smallContainer;
    if (assets.buildingLargeUrl) {
      largeContainer = await assetManager.loadContainer(assets.buildingLargeUrl, scene);
    }

    let replaced = 0;
    const buildingMeshes = scene.meshes.filter(
      (m) => m.metadata?.zone === 'building' && m.name.startsWith('block_'),
    );

    for (const mesh of buildingMeshes) {
      const parts = mesh.name.split('_');
      const gx = Number(parts[1]);
      const gz = Number(parts[2]);
      if (!Number.isFinite(gx) || !Number.isFinite(gz)) continue;
      if (cityHashRandom(gx, gz, 9) > REPLACEMENT_CHANCE) continue;

      const useLarge = cityHashRandom(gx, gz, 10) > 0.72 && assets.buildingLargeUrl;
      const container = useLarge ? largeContainer : smallContainer;
      const entries = container.instantiateModelsToScene(
        (source) => `kit_${gx}_${gz}_${source}`,
        false,
      );

      const root = findRoot(entries.rootNodes as AbstractMesh[]);
      if (!root) continue;

      root.position.copyFrom(mesh.position);
      root.position.y = 0;
      root.scaling.setAll(useLarge ? 1.15 : 0.95);
      root.rotation.y = cityHashRandom(gx, gz, 11) * Math.PI * 2;
      root.metadata = { ...mesh.metadata, cityKit: true };

      mesh.isVisible = false;
      mesh.setEnabled(false);
      replaced++;
    }

    return replaced;
  }
}

function findRoot(nodes: AbstractMesh[]): AbstractMesh | undefined {
  return nodes.find((n) => !n.parent) ?? nodes[0];
}
