import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import type { POI } from '@/world/CityData';

export class ObjectiveMarkers {
  private meshes: AbstractMesh[] = [];

  build(scene: Scene, crime: POI, escape: POI): void {
    this.dispose();
    this.meshes.push(this.createBeacon(scene, crime, new Color3(1, 0.35, 0.2), 'crime'));
    this.meshes.push(this.createBeacon(scene, escape, new Color3(0.2, 0.9, 0.45), 'escape'));
  }

  private createBeacon(
    scene: Scene,
    poi: POI,
    color: Color3,
    kind: 'crime' | 'escape',
  ): AbstractMesh {
    const pillar = MeshBuilder.CreateCylinder(
      `marker_${kind}_${poi.id}`,
      { height: 3.5, diameter: 0.35, tessellation: 8 },
      scene,
    );
    pillar.position = new Vector3(poi.x, 1.75, poi.z);

    const mat = new StandardMaterial(`markerMat_${kind}_${poi.id}`, scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.35);
    mat.alpha = kind === 'escape' ? 0.85 : 0.7;
    pillar.material = mat;
    pillar.metadata = { objectiveMarker: kind, poiId: poi.id };

    const ring = MeshBuilder.CreateTorus(
      `markerRing_${kind}_${poi.id}`,
      { diameter: 2.4, thickness: 0.12, tessellation: 16 },
      scene,
    );
    ring.position = new Vector3(poi.x, 0.15, poi.z);
    ring.material = mat;
    this.meshes.push(ring);

    return pillar;
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes = [];
  }
}

export function bearingDegrees(from: { x: number; z: number }, to: { x: number; z: number }): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return (Math.atan2(dx, dz) * 180) / Math.PI;
}

export function compassArrow(bearing: number): string {
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const idx = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return arrows[idx]!;
}
