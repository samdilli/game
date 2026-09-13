import {
  Color3,
  DirectionalLight,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
} from '@babylonjs/core';
import '@babylonjs/core/Materials/Textures/cubeTexture';
import '@babylonjs/core/Helpers/sceneHelpers';
import { engineConfig } from '@/config/engine-config';
import type { BabylonEngineInstance } from '@/engine/EngineBootstrap';
import type { AssetManager } from '@/engine/AssetManager';
import { addStaticBoxPhysics } from '@/physics/CharacterPhysicsBody';
import { CityBuilder } from '@/world/CityBuilder';
import { CityKitBuilder } from '@/world/CityKitBuilder';
import type { CityBuildResult } from '@/world/CityData';
import { resolveWorldAssets } from '@/config/world-assets';
import type { SceneLighting } from '@/world/WorldEnvironment';

export interface SceneManagerOptions {
  worldSize: number;
}

export class SceneManager {
  readonly scene: Scene;
  readonly city: CityBuildResult;
  readonly lighting: SceneLighting;

  private ground?: AbstractMesh;
  private groundMat?: StandardMaterial;
  private cityKitCount = 0;

  constructor(engine: BabylonEngineInstance, options: SceneManagerOptions) {
    this.scene = new Scene(engine);
    this.scene.clearColor.set(0.53, 0.75, 0.92, 1);
    if (engineConfig.features.environment) {
      this.scene.createDefaultEnvironment({ createGround: false, createSkybox: true });
    }
    this.lighting = this.buildLighting();
    this.ground = this.buildGround(options.worldSize);
    this.lighting.groundMat = this.groundMat;
    this.city = CityBuilder.build(this.scene, options.worldSize);
  }

  async enhanceCity(assetManager: AssetManager): Promise<void> {
    const assets = await resolveWorldAssets();
    this.cityKitCount = await CityKitBuilder.enhance(this.scene, assetManager, assets);
  }

  getCityKitCount(): number {
    return this.cityKitCount;
  }

  private buildLighting(): SceneLighting {
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.55;
    hemi.groundColor = new Color3(0.25, 0.28, 0.22);
    hemi.diffuse = new Color3(0.95, 0.92, 0.85);

    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4), this.scene);
    sun.intensity = 0.85;
    sun.position.set(40, 80, 30);

    return { hemi, sun, groundMat: undefined };
  }

  private buildGround(worldSize: number): AbstractMesh {
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: worldSize, height: worldSize, subdivisions: 4 },
      this.scene,
    );

    this.groundMat = new StandardMaterial('groundMat', this.scene);
    this.groundMat.diffuseColor = new Color3(0.32, 0.55, 0.28);
    this.groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
    ground.material = this.groundMat;
    ground.receiveShadows = true;
    ground.metadata = { isObstacle: false, zone: 'road' };
    return ground;
  }

  enablePhysicsColliders(): void {
    if (!engineConfig.features.physics || !this.ground) return;
    addStaticBoxPhysics(this.ground, this.scene);
  }

  dispose(): void {
    this.scene.dispose();
  }
}
