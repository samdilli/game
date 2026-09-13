import {
  ArcRotateCamera,
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  Viewport,
  type AbstractMesh,
} from '@babylonjs/core';
import type { SplitLayout } from '@/config/game';
import { getCharacterFocusPoint } from '@/characters/CharacterMeshUtils';
import { getCapsuleFocusPoint } from '@/characters/PrimitiveCharacter';

export interface PlayerCameraConfig {
  playerId: number;
  target: AbstractMesh;
  splitLayout: SplitLayout;
  viewportIndex: number;
  viewportCount: number;
}

function focusPoint(target: AbstractMesh): Vector3 {
  if (target.metadata?.isCharacter) {
    return getCapsuleFocusPoint(target);
  }
  return getCharacterFocusPoint(target);
}

export class CameraManager {
  private cameras: ArcRotateCamera[] = [];
  private focusPoints: Vector3[] = [];

  createPlayerCamera(scene: Scene, config: PlayerCameraConfig): ArcRotateCamera {
    const cam = new ArcRotateCamera(
      `camera_p${config.playerId}`,
      -Math.PI / 2,
      Math.PI / 2.75,
      9,
      focusPoint(config.target),
      scene,
    );
    cam.lowerRadiusLimit = 4.5;
    cam.upperRadiusLimit = 16;
    cam.lowerBetaLimit = 0.35;
    cam.upperBetaLimit = Math.PI / 2.15;
    cam.inertia = 0.12;
    cam.angularSensibilityX = 4000;
    cam.angularSensibilityY = 4000;
    cam.attachControl(false);

    this.applyViewport(cam, config.splitLayout, config.viewportIndex, config.viewportCount);
    this.cameras.push(cam);
    this.focusPoints.push(focusPoint(config.target).clone());
    return cam;
  }

  updateCameras(targets: AbstractMesh[], dt = 0.016): void {
    const lerpFactor = 1 - Math.exp(-10 * dt);
    for (let i = 0; i < this.cameras.length; i++) {
      const cam = this.cameras[i];
      const target = targets[i];
      if (!target) continue;
      const desired = focusPoint(target);
      const current = this.focusPoints[i] ?? desired.clone();
      current.x += (desired.x - current.x) * lerpFactor;
      current.y += (desired.y - current.y) * lerpFactor;
      current.z += (desired.z - current.z) * lerpFactor;
      this.focusPoints[i] = current;
      cam.setTarget(current);
    }
  }

  setSplitLayout(layout: SplitLayout): void {
    for (let i = 0; i < this.cameras.length; i++) {
      this.applyViewport(this.cameras[i], layout, i, this.cameras.length);
    }
  }

  private applyViewport(
    camera: ArcRotateCamera,
    layout: SplitLayout,
    index: number,
    count: number,
  ): void {
    if (layout === 'single' || count <= 1) {
      camera.viewport = new Viewport(0, 0, 1, 1);
      return;
    }

    if (layout === 'horizontal') {
      const width = 1 / count;
      camera.viewport = new Viewport(index * width, 0, width, 1);
      return;
    }

    const height = 1 / count;
    camera.viewport = new Viewport(0, 1 - (index + 1) * height, 1, height);
  }

  dispose(): void {
    for (const cam of this.cameras) {
      cam.dispose();
    }
    this.cameras = [];
    this.focusPoints = [];
  }
}

export function createPlayerMesh(
  scene: Scene,
  name: string,
  color: Color3,
  position: Vector3,
): AbstractMesh {
  const body = MeshBuilder.CreateCapsule(
    name,
    { height: 1.8, radius: 0.35, tessellation: 12 },
    scene,
  );
  body.position.copyFrom(position);

  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.15, 0.15, 0.15);
  body.material = mat;

  return body;
}
