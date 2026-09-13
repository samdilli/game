import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type Scene,
} from '@babylonjs/core';
import {
  buildObstacleLayout,
  cityHashRandom,
  type CityBuildResult,
} from '@/world/CityData';

export class CityBuilder {
  static build(scene: Scene, worldSize: number): CityBuildResult {
    const layout = buildObstacleLayout(worldSize);
    const spacing = 12;
    const half = layout.halfSize;

    const blockMat = new StandardMaterial('blockMat', scene);
    blockMat.diffuseColor = new Color3(0.55, 0.58, 0.62);

    const roadMat = new StandardMaterial('roadMat', scene);
    roadMat.diffuseColor = new Color3(0.2, 0.22, 0.25);

    for (let x = -half; x <= half; x += spacing) {
      for (let z = -half; z <= half; z += spacing) {
        if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;

        const isRoad = Math.abs(x % (spacing * 2)) < 1 || Math.abs(z % (spacing * 2)) < 1;
        const mat = isRoad ? roadMat : blockMat;
        const h = isRoad ? 0.15 : 2 + cityHashRandom(x, z, 3) * 6;
        const w = isRoad ? 3 : 4 + cityHashRandom(x, z, 1) * 3;
        const d = isRoad ? 3 : 4 + cityHashRandom(x, z, 2) * 3;

        const box = MeshBuilder.CreateBox(`block_${x}_${z}`, { width: w, height: h, depth: d }, scene);
        box.position.set(x, h / 2, z);
        box.material = mat;
        box.metadata = { isObstacle: !isRoad, zone: isRoad ? 'road' : 'building' };
      }
    }

    for (const poi of layout.pois) {
      const marker = MeshBuilder.CreateCylinder(
        `poi_${poi.id}`,
        { height: 0.1, diameter: 1.2, tessellation: 8 },
        scene,
      );
      marker.position = new Vector3(poi.x, 0.06, poi.z);
      marker.isVisible = false;
      marker.metadata = { poiId: poi.id, zone: poi.type };
    }

    return layout;
  }
}
