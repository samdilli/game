import { Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';
import type { InputState } from '@/input/InputAction';

export interface CharacterMovementConfig {
  moveSpeed: number;
  sprintMultiplier: number;
  worldHalfSize: number;
}

export class CharacterMovement {
  readonly velocity = Vector3.Zero();
  readonly facingDirection = new Vector3(0, 0, 1);
  isMoving = false;
  isSprinting = false;
  currentSpeed = 0;

  constructor(private config: CharacterMovementConfig) {}

  update(mesh: AbstractMesh, input: InputState, dt: number): void {
    const speed = input.sprint
      ? this.config.moveSpeed * this.config.sprintMultiplier
      : this.config.moveSpeed;

    const moveX = input.moveX;
    const moveZ = input.moveY;

    this.isMoving = Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;
    this.isSprinting = input.sprint && this.isMoving;
    this.currentSpeed = this.isMoving ? speed : 0;

    if (this.isMoving) {
      this.facingDirection.set(moveX, 0, moveZ).normalize();
      mesh.rotation.y = Math.atan2(this.facingDirection.x, this.facingDirection.z);
    }

    const dx = moveX * speed * dt;
    const dz = moveZ * speed * dt;

    mesh.position.x = clamp(mesh.position.x + dx, -this.config.worldHalfSize, this.config.worldHalfSize);
    mesh.position.z = clamp(mesh.position.z + dz, -this.config.worldHalfSize, this.config.worldHalfSize);
    mesh.position.y = 0.9;

    this.velocity.set(dx / Math.max(dt, 0.0001), 0, dz / Math.max(dt, 0.0001));
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface CharacterConfig {
  id: number;
  name: string;
  role: 'police' | 'thief';
  scene: Scene;
  mesh: AbstractMesh;
  movement: CharacterMovement;
}

export class Character {
  readonly id: number;
  readonly name: string;
  readonly role: 'police' | 'thief';
  readonly mesh: AbstractMesh;
  readonly movement: CharacterMovement;

  actionActive = false;

  constructor(config: CharacterConfig) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.mesh = config.mesh;
    this.movement = config.movement;
  }

  update(input: InputState, dt: number): void {
    this.movement.update(this.mesh, input, dt);
    this.actionActive = input.action;
  }

  dispose(): void {
    this.mesh.dispose();
  }
}
