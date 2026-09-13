import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import type { Scene } from '@babylonjs/core/scene';

export interface LoadedGltfAsset {
  rootMesh: AbstractMesh | null;
  meshes: AbstractMesh[];
  animationGroups: AnimationGroup[];
}

export class AssetManager {
  private readonly loadedUrls = new Set<string>();

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

  hasLoaded(url: string): boolean {
    return this.loadedUrls.has(url);
  }

  clear(): void {
    this.loadedUrls.clear();
  }
}
