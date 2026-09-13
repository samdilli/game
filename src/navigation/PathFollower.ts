import { Vector3 } from '@babylonjs/core';

export class PathFollower {
  private path: Vector3[] = [];
  private index = 0;
  private stuckTimer = 0;
  private lastDistance = Infinity;

  setPath(points: Vector3[]): void {
    this.path = points.length > 0 ? [...points] : [];
    this.index = this.path.length > 1 ? 1 : 0;
    this.stuckTimer = 0;
    this.lastDistance = Infinity;
  }

  get hasPath(): boolean {
    return this.path.length > 0 && this.index < this.path.length;
  }

  get destination(): Vector3 | undefined {
    return this.path[this.path.length - 1];
  }

  /** Returns normalized move direction (x, z) and whether sprinting is suggested. */
  update(current: Vector3, dt: number, arriveDistance = 0.6): { moveX: number; moveZ: number; sprint: boolean } {
    if (!this.hasPath) {
      return { moveX: 0, moveZ: 0, sprint: false };
    }

    const target = this.path[this.index];
    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const dist = Math.hypot(dx, dz);

    if (dist < arriveDistance) {
      this.index++;
      if (!this.hasPath) return { moveX: 0, moveZ: 0, sprint: false };
      return this.update(current, dt, arriveDistance);
    }

    if (dist >= this.lastDistance - 0.02) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
    }
    this.lastDistance = dist;

    const len = Math.max(dist, 0.001);
    return {
      moveX: dx / len,
      moveZ: dz / len,
      sprint: dist > 6,
    };
  }

  isStuck(thresholdSeconds = 1.5): boolean {
    return this.stuckTimer >= thresholdSeconds;
  }

  clear(): void {
    this.path = [];
    this.index = 0;
    this.stuckTimer = 0;
    this.lastDistance = Infinity;
  }
}
