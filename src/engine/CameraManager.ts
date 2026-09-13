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

export interface PlayerCameraConfig {
  playerId: number;
  target: AbstractMesh;
  splitLayout: SplitLayout;
  viewportIndex: number;
  viewportCount: number;
}

export class CameraManager {
  private cameras: ArcRotateCamera[] = [];

  createPlayerCamera(scene: Scene, config: PlayerCameraConfig): ArcRotateCamera {
    const cam = new ArcRotateCamera(
      `camera_p${config.playerId}`,
      -Math.PI / 2,
      Math.PI / 2.8,
      10,
      getCharacterFocusPoint(config.target),
      scene,
    );
    cam.lowerRadiusLimit = 5;
    cam.upperRadiusLimit = 18;
    cam.lowerBetaLimit = 0.4;
    cam.upperBetaLimit = Math.PI / 2.2;
    cam.inertia = 0.08;
    cam.angularSensibilityX = 4000;
    cam.angularSensibilityY = 4000;
    cam.attachControl(false);

    this.applyViewport(cam, config.splitLayout, config.viewportIndex, config.viewportCount);
    this.cameras.push(cam);
    return cam;
  }

  updateCameras(targets: AbstractMesh[]): void {
    for (let i = 0; i < this.cameras.length; i++) {
      const cam = this.cameras[i];
      const target = targets[i];
      if (!target) continue;
      cam.setTarget(getCharacterFocusPoint(target));
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
