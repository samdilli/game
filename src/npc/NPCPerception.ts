import { Ray, Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';

import type { CharacterRole } from '@/world/CityData';

export interface PerceivableTarget {
  id: number;
  mesh: AbstractMesh;
  role: CharacterRole;
  isSprinting?: boolean;
}

export interface PerceptionResult {
  target: PerceivableTarget;
  distance: number;
  seen: boolean;
  heard: boolean;
}

export interface PerceptionConfig {
  visionRange: number;
  visionAngleDeg: number;
  hearingRange: number;
}

export class NPCPerception {
  constructor(
    private readonly scene: Scene,
    private config: PerceptionConfig,
  ) {}

  scan(observerPos: Vector3, facingY: number, targets: PerceivableTarget[]): PerceptionResult[] {
    const results: PerceptionResult[] = [];

    for (const target of targets) {
      const targetPos = target.mesh.position;
      const distance = Vector3.Distance(
        new Vector3(observerPos.x, 0, observerPos.z),
        new Vector3(targetPos.x, 0, targetPos.z),
      );

      const heard =
        distance <= this.config.hearingRange &&
        (target.isSprinting === true || target.role === 'police');

      const seen =
        distance <= this.config.visionRange &&
        this.inVisionCone(observerPos, facingY, targetPos) &&
        this.hasLineOfSight(observerPos, targetPos);

      if (seen || heard) {
        results.push({ target, distance, seen, heard });
      }
    }

    return results;
  }

  private inVisionCone(origin: Vector3, facingY: number, target: Vector3): boolean {
    const forwardX = Math.sin(facingY);
    const forwardZ = Math.cos(facingY);
    const toX = target.x - origin.x;
    const toZ = target.z - origin.z;
    const len = Math.hypot(toX, toZ) || 1;
    const dot = (toX / len) * forwardX + (toZ / len) * forwardZ;
    const halfAngleCos = Math.cos((this.config.visionAngleDeg * Math.PI) / 360);
    return dot >= halfAngleCos;
  }

  private hasLineOfSight(from: Vector3, to: Vector3): boolean {
    const eyeFrom = from.add(new Vector3(0, 1.4, 0));
    const eyeTo = to.add(new Vector3(0, 1.2, 0));
    const dir = eyeTo.subtract(eyeFrom);
    const distance = dir.length();
    if (distance < 0.01) return true;
    dir.normalize();

    const ray = new Ray(eyeFrom, dir, distance);
    const pick = this.scene.pickWithRay(ray, (mesh) => mesh.metadata?.isObstacle === true);
    return !pick?.hit;
  }
}
