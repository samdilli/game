import { describe, expect, it } from 'vitest';
import { MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import { normalizeCharacterScale, placeCharacterOnGround } from '@/characters/CharacterMeshUtils';

describe('CharacterMeshUtils', () => {
  it('scales a mesh hierarchy to target height', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const root = MeshBuilder.CreateBox('root', { size: 1 }, scene);
    const body = MeshBuilder.CreateBox('body', { height: 2, width: 0.5, depth: 0.5 }, scene);
    body.parent = root;
    body.position.y = 1;

    normalizeCharacterScale(root, 1.75);
    placeCharacterOnGround(root, 0);

    body.refreshBoundingInfo(true, true);
    const h = body.getBoundingInfo().boundingBox.extendSizeWorld.y * 2;
    expect(h).toBeGreaterThan(1.4);
    expect(h).toBeLessThan(2.1);
    expect(root.position.y).toBeLessThanOrEqual(0.01);
    scene.dispose();
  });
});
