import { Vector3, type AbstractMesh } from '@babylonjs/core';

/** Skinned görünür mesh'i bul (CesiumMan'da asıl model `Cesium_Man`). */
export function getSkinnedMesh(root: AbstractMesh): AbstractMesh {
  const children = root.getChildMeshes(true);
  const skinned =
    children.find((m) => m.skeleton && m.getTotalVertices() > 0) ??
    children.find((m) => m.getTotalVertices() > 0);
  return skinned ?? root;
}

/** GLB instantiate sonrası hareket/kamera için kök node. */
export function resolveCharacterRoot(rootNodes: unknown[]): AbstractMesh {
  const nodes = rootNodes.filter((n): n is AbstractMesh => isAbstractMesh(n));
  if (nodes.length === 0) {
    throw new Error('Karakter root node bulunamadı');
  }

  const named = nodes.find((n) => /cesium|man|character|humanoid/i.test(n.name));
  if (named) return named;

  let best = nodes[0];
  let bestVerts = 0;
  for (const node of nodes) {
    const verts = node.getChildMeshes(true).reduce((s, m) => s + m.getTotalVertices(), 0);
    if (verts > bestVerts) {
      bestVerts = verts;
      best = node;
    }
  }
  return best;
}

export function normalizeCharacterScale(root: AbstractMesh, targetHeight: number): void {
  const visual = getSkinnedMesh(root);
  visual.computeWorldMatrix(true);
  visual.refreshBoundingInfo(true, true);

  const extend = visual.getBoundingInfo().boundingBox.extendSizeWorld;
  const height = Math.max(extend.y * 2, 0.01);
  const scale = targetHeight / height;

  root.scaling.setAll(scale);
  root.computeWorldMatrix(true);
  visual.refreshBoundingInfo(true, true);
}

export function placeCharacterOnGround(root: AbstractMesh, groundY = 0): void {
  const visual = getSkinnedMesh(root);
  visual.computeWorldMatrix(true);
  visual.refreshBoundingInfo(true, true);
  const minY = visual.getBoundingInfo().boundingBox.minimumWorld.y;
  root.position.y += groundY - minY;
}

export function setCharacterXZ(root: AbstractMesh, x: number, z: number): void {
  root.position.x = x;
  root.position.z = z;
}

/** Kamera takibi için göğüs hizası nokta. */
export function getCharacterFocusPoint(root: AbstractMesh): Vector3 {
  const visual = getSkinnedMesh(root);
  visual.computeWorldMatrix(true);
  visual.refreshBoundingInfo(true, true);
  const box = visual.getBoundingInfo().boundingBox;
  const centerY = (box.minimumWorld.y + box.maximumWorld.y) * 0.55;
  return new Vector3(root.position.x, centerY, root.position.z);
}

function isAbstractMesh(node: unknown): node is AbstractMesh {
  return !!node && typeof node === 'object' && 'getChildMeshes' in node;
}
