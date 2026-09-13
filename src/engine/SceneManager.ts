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
import { addStaticBoxPhysics } from '@/physics/CharacterPhysicsBody';
import { CityBuilder } from '@/world/CityBuilder';
import type { CityBuildResult } from '@/world/CityData';

export interface SceneManagerOptions {
  worldSize: number;
}

export class SceneManager {
  readonly scene: Scene;
  readonly city: CityBuildResult;

  private ground?: AbstractMesh;

  constructor(engine: BabylonEngineInstance, options: SceneManagerOptions) {
    this.scene = new Scene(engine);
    this.scene.clearColor.set(0.53, 0.75, 0.92, 1);
    if (engineConfig.features.environment) {
      this.scene.createDefaultEnvironment({ createGround: false, createSkybox: true });
    }
    this.buildLighting();
    this.ground = this.buildGround(options.worldSize);
    this.city = CityBuilder.build(this.scene, options.worldSize);
  }

  private buildLighting(): void {
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.55;
    hemi.groundColor = new Color3(0.25, 0.28, 0.22);
    hemi.diffuse = new Color3(0.95, 0.92, 0.85);

    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4), this.scene);
    sun.intensity = 0.85;
    sun.position.set(40, 80, 30);
  }

  private buildGround(worldSize: number): AbstractMesh {
    const ground = MeshBuilder.CreateGround(
      'ground',
      { width: worldSize, height: worldSize, subdivisions: 4 },
      this.scene,
    );

    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.32, 0.55, 0.28);
    groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
    ground.material = groundMat;
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
