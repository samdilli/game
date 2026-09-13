import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { ImportMeshAsync, SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Scene } from '@babylonjs/core/scene';
import { retargetAnimationGroupsToSkeleton } from '@/characters/CharacterAnimationController';

export interface LoadedGltfAsset {
  rootMesh: AbstractMesh | null;
  meshes: AbstractMesh[];
  animationGroups: AnimationGroup[];
}

export interface CharacterAssetInstance {
  rootMesh: AbstractMesh;
  animationGroups: AnimationGroup[];
  sourceUrl: string;
}

export class AssetManager {
  private readonly loadedUrls = new Set<string>();
  private readonly containerCache = new Map<string, AssetContainer>();

  async loadGltf(url: string, scene: Scene): Promise<LoadedGltfAsset> {
    const { GLTFLoaderAnimationStartMode } = await import('@babylonjs/loaders/glTF');

    const result = await ImportMeshAsync(url, scene, {
      pluginOptions: {
        gltf: {
          animationStartMode: GLTFLoaderAnimationStartMode.NONE,
        },
      },
    });

    this.loadedUrls.add(url);

    return {
      rootMesh: result.meshes[0] ?? null,
      meshes: result.meshes,
      animationGroups: result.animationGroups,
    };
  }

  async loadContainer(url: string, scene: Scene): Promise<AssetContainer> {
    const cached = this.containerCache.get(url);
    if (cached) return cached;

    const container = await SceneLoader.LoadAssetContainerAsync('', url, scene);
    this.containerCache.set(url, container);
    this.loadedUrls.add(url);
    return container;
  }

  async instantiateCharacter(
    url: string,
    scene: Scene,
    instanceName: string,
  ): Promise<CharacterAssetInstance> {
    const container = await this.loadContainer(url, scene);
    const entries = container.instantiateModelsToScene(
      (source) => `${instanceName}_${source}`,
      false,
    );

    const rootMesh = entries.rootNodes[0] as AbstractMesh | undefined;
    if (!rootMesh) {
      throw new Error(`Karakter kök mesh bulunamadı: ${url}`);
    }

    return {
      rootMesh,
      animationGroups: entries.animationGroups,
      sourceUrl: url,
    };
  }

  async mergeAnimationLibrary(
    animationUrl: string,
    targetMesh: AbstractMesh,
    scene: Scene,
    prefix: string,
  ): Promise<AnimationGroup[]> {
    const library = await this.loadGltf(animationUrl, scene);
    const skeleton =
      targetMesh.skeleton ??
      targetMesh.getChildMeshes(false).map((m) => m.skeleton).find(Boolean);

    if (!skeleton) {
      console.warn('[AssetManager] Skeleton bulunamadı, UAL2 retarget atlandı.');
      return library.animationGroups;
    }

    return retargetAnimationGroupsToSkeleton(library.animationGroups, skeleton, prefix);
  }

  hasLoaded(url: string): boolean {
    return this.loadedUrls.has(url);
  }

  clear(): void {
    for (const container of this.containerCache.values()) {
      container.dispose();
    }
    this.containerCache.clear();
    this.loadedUrls.clear();
  }
}
