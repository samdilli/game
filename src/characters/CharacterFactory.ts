import { Color3, StandardMaterial, Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';
import type { AssetManager } from '@/engine/AssetManager';
import type { ResolvedCharacterAssets } from '@/config/assets';
import { CHARACTER_SPAWN } from '@/config/assets';
import type { CharacterRole } from '@/world/CityData';
import { Character } from '@/characters/Character';
import { CharacterMovement } from '@/characters/Character';
import { CharacterAnimationController } from '@/characters/CharacterAnimationController';
import { CharacterPhysicsBody } from '@/physics/CharacterPhysicsBody';
import { engineConfig } from '@/config/engine-config';

export interface SpawnCharacterOptions {
  id: number;
  name: string;
  role: CharacterRole;
  instanceName: string;
  position: Vector3;
  moveSpeed: number;
  sprintMultiplier: number;
  worldHalfSize: number;
  tint: { r: number; g: number; b: number };
}

export class CharacterFactory {
  constructor(private readonly assetManager: AssetManager) {}

  async spawn(
    scene: Scene,
    assets: ResolvedCharacterAssets,
    options: SpawnCharacterOptions,
  ): Promise<Character> {
    const instance = await this.assetManager.instantiateCharacter(
      assets.modelUrl,
      scene,
      options.instanceName,
    );

    let animationGroups = instance.animationGroups;

    if (assets.animationLibraryUrl) {
      const merged = await this.assetManager.mergeAnimationLibrary(
        assets.animationLibraryUrl,
        instance.rootMesh,
        scene,
        options.instanceName,
      );
      animationGroups = [...animationGroups, ...merged];
    }

    normalizeCharacterScale(instance.rootMesh, CHARACTER_SPAWN.targetHeight);
    applyTint(instance.rootMesh, new Color3(options.tint.r, options.tint.g, options.tint.b));
    instance.rootMesh.position.copyFrom(options.position);

    const movement = new CharacterMovement({
      moveSpeed: options.moveSpeed,
      sprintMultiplier: options.sprintMultiplier,
      worldHalfSize: options.worldHalfSize,
    });

    const animation = new CharacterAnimationController(animationGroups, {
      moveSpeed: options.moveSpeed,
      sprintMultiplier: options.sprintMultiplier,
    });

    let physics: CharacterPhysicsBody | undefined;
    if (engineConfig.features.physics) {
      physics = new CharacterPhysicsBody(instance.rootMesh, scene);
    }

    return new Character({
      id: options.id,
      name: options.name,
      role: options.role,
      scene,
      mesh: instance.rootMesh,
      movement,
      animation,
      physics,
    });
  }

  spawnNpc(
    scene: Scene,
    assets: ResolvedCharacterAssets,
    options: SpawnCharacterOptions,
  ): Promise<Character> {
    return this.spawn(scene, assets, options);
  }
}

function normalizeCharacterScale(mesh: AbstractMesh, targetHeight: number): void {
  mesh.refreshBoundingInfo(true, true);
  const bounds = mesh.getBoundingInfo();
  const extend = bounds.boundingBox.extendSizeWorld;
  const height = Math.max(extend.y * 2, 0.01);
  const scale = targetHeight / height;
  mesh.scaling.setAll(scale);
  mesh.refreshBoundingInfo(true, true);

  const minY = mesh.getBoundingInfo().boundingBox.minimumWorld.y;
  mesh.position.y -= minY;
}

function applyTint(root: AbstractMesh, tint: Color3): void {
  const meshes = [root, ...root.getChildMeshes(false)];
  for (const mesh of meshes) {
    if (!mesh.material) {
      const mat = new StandardMaterial(`${mesh.name}_mat`, root.getScene());
      mat.diffuseColor = tint;
      mesh.material = mat;
      continue;
    }
    if (mesh.material instanceof StandardMaterial) {
      mesh.material.diffuseColor = mesh.material.diffuseColor.multiply(tint);
    }
  }
}
