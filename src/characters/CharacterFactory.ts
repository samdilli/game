import { Color3, StandardMaterial, Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';
import type { AssetManager } from '@/engine/AssetManager';
import type { ResolvedCharacterAssets } from '@/config/assets';
import { CHARACTER_SPAWN } from '@/config/assets';
import type { CharacterRole } from '@/world/CityData';
import { Character } from '@/characters/Character';
import { CharacterMovement } from '@/characters/Character';
import { CharacterAnimationController } from '@/characters/CharacterAnimationController';
import {
  getSkinnedMesh,
  normalizeCharacterScale,
  placeCharacterOnGround,
  setCharacterXZ,
} from '@/characters/CharacterMeshUtils';
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

    const root = instance.rootMesh;
    normalizeCharacterScale(root, CHARACTER_SPAWN.targetHeight);
    setCharacterXZ(root, options.position.x, options.position.z);
    placeCharacterOnGround(root, 0);
    applyTint(getSkinnedMesh(root), new Color3(options.tint.r, options.tint.g, options.tint.b));

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
      physics = new CharacterPhysicsBody(root, scene);
    }

    return new Character({
      id: options.id,
      name: options.name,
      role: options.role,
      scene,
      mesh: root,
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

function applyTint(root: AbstractMesh, tint: Color3): void {
  const meshes = [root, ...root.getChildMeshes(false)];
  for (const mesh of meshes) {
    if (!mesh.getTotalVertices()) continue;
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
