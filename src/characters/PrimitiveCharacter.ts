import { Color3, MeshBuilder, StandardMaterial, Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';

const CAPSULE_HEIGHT = 1.8;
const CAPSULE_RADIUS = 0.35;

export function createCapsuleCharacter(
  scene: Scene,
  name: string,
  tint: Color3,
  position: Vector3,
): AbstractMesh {
  const body = MeshBuilder.CreateCapsule(
    name,
    { height: CAPSULE_HEIGHT, radius: CAPSULE_RADIUS, tessellation: 10, subdivisions: 4 },
    scene,
  );
  body.position.set(position.x, CAPSULE_HEIGHT / 2, position.z);

  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = tint;
  mat.specularColor = new Color3(0.12, 0.12, 0.12);
  body.material = mat;
  body.metadata = { isCharacter: true };

  return body;
}

export function getCapsuleFocusPoint(mesh: AbstractMesh): Vector3 {
  return mesh.position.add(new Vector3(0, CAPSULE_HEIGHT * 0.35, 0));
}
