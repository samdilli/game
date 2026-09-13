import {
  PhysicsShapeType,
  PhysicsMotionType,
} from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsShape } from '@babylonjs/core/Physics/v2/physicsShape';
import { Quaternion, Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';

export interface CharacterPhysicsConfig {
  capsuleHeight: number;
  capsuleRadius: number;
}

const DEFAULT_PHYSICS: CharacterPhysicsConfig = {
  capsuleHeight: 1.6,
  capsuleRadius: 0.35,
};

export class CharacterPhysicsBody {
  readonly body: PhysicsBody;

  constructor(mesh: AbstractMesh, scene: Scene, config: Partial<CharacterPhysicsConfig> = {}) {
    const cfg = { ...DEFAULT_PHYSICS, ...config };

    this.body = new PhysicsBody(
      mesh,
      PhysicsMotionType.ANIMATED,
      false,
      scene,
    );

    const shape = new PhysicsShape(
      {
        type: PhysicsShapeType.CAPSULE,
        parameters: {
          pointA: new Vector3(0, -cfg.capsuleHeight * 0.5 + cfg.capsuleRadius, 0),
          pointB: new Vector3(0, cfg.capsuleHeight * 0.5 - cfg.capsuleRadius, 0),
          radius: cfg.capsuleRadius,
        },
      },
      scene,
    );

    this.body.shape = shape;
    this.body.setMassProperties({ mass: 70 });
  }

  syncTransform(position: Vector3, rotationY: number): void {
    this.body.setTargetTransform(position, Quaternion.FromEulerAngles(0, rotationY, 0));
  }

  dispose(): void {
    this.body.dispose();
  }
}

export function addStaticBoxPhysics(
  mesh: AbstractMesh,
  scene: Scene,
): PhysicsBody {
  const body = new PhysicsBody(mesh, PhysicsMotionType.STATIC, false, scene);
  const shape = new PhysicsShape({ type: PhysicsShapeType.BOX }, scene);
  body.shape = shape;
  body.setMassProperties({ mass: 0 });
  return body;
}
