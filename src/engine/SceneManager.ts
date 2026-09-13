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

export interface SceneManagerOptions {
  worldSize: number;
}

export class SceneManager {
  readonly scene: Scene;

  private ground?: AbstractMesh;

  constructor(engine: BabylonEngineInstance, options: SceneManagerOptions) {
    this.scene = new Scene(engine);
    this.scene.clearColor.set(0.53, 0.75, 0.92, 1);
    if (engineConfig.features.environment) {
      this.scene.createDefaultEnvironment({ createGround: false, createSkybox: true });
    }
    this.buildLighting();
    this.buildEnvironment(options.worldSize);
  }

  private buildLighting(): void {
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.55;
    hemi.groundColor = new Color3(0.25, 0.28, 0.22);
    hemi.diffuse = new Color3(0.95, 0.92, 0.85);

    const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4), this.scene);
    sun.intensity = 0.85;
    sun.position = new Vector3(40, 80, 30);
  }

  private buildEnvironment(worldSize: number): void {
    this.ground = MeshBuilder.CreateGround(
      'ground',
      { width: worldSize, height: worldSize, subdivisions: 4 },
      this.scene,
    );

    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.32, 0.55, 0.28);
    groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
    this.ground.material = groundMat;
    this.ground.receiveShadows = true;

    this.buildCityBlocks(worldSize);
  }

  private buildCityBlocks(worldSize: number): void {
    const blockMat = new StandardMaterial('blockMat', this.scene);
    blockMat.diffuseColor = new Color3(0.55, 0.58, 0.62);

    const roadMat = new StandardMaterial('roadMat', this.scene);
    roadMat.diffuseColor = new Color3(0.2, 0.22, 0.25);

    const spacing = 12;
    const half = worldSize / 2 - 4;

    for (let x = -half; x <= half; x += spacing) {
      for (let z = -half; z <= half; z += spacing) {
        if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;

        const isRoad = Math.abs(x % (spacing * 2)) < 1 || Math.abs(z % (spacing * 2)) < 1;
        const mat = isRoad ? roadMat : blockMat;
        const h = isRoad ? 0.15 : 2 + Math.random() * 6;
        const w = isRoad ? 3 : 4 + Math.random() * 3;
        const d = isRoad ? 3 : 4 + Math.random() * 3;

        const box = MeshBuilder.CreateBox(
          `block_${x}_${z}`,
          { width: w, height: h, depth: d },
          this.scene,
        );
        box.position.set(x, h / 2, z);
        box.material = mat;
      }
    }
  }

  dispose(): void {
    this.scene.dispose();
  }
}
