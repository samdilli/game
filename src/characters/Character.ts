import { Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';
import type { InputState } from '@/input/InputAction';
import type { CharacterAnimationController } from '@/characters/CharacterAnimationController';
import type { CharacterPhysicsBody } from '@/physics/CharacterPhysicsBody';
import type { CharacterRole } from '@/world/CityData';

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

  private smoothedMoveX = 0;
  private smoothedMoveZ = 0;

  constructor(private config: CharacterMovementConfig) {}

  setSpeeds(moveSpeed: number, sprintMultiplier: number): void {
    this.config.moveSpeed = moveSpeed;
    this.config.sprintMultiplier = sprintMultiplier;
  }

  update(mesh: AbstractMesh, input: InputState, dt: number): void {
    const speed = input.sprint
      ? this.config.moveSpeed * this.config.sprintMultiplier
      : this.config.moveSpeed;

    const targetX = input.moveX;
    const targetZ = input.moveY;
    const accel = 14;
    const blend = 1 - Math.exp(-accel * dt);
    this.smoothedMoveX += (targetX - this.smoothedMoveX) * blend;
    this.smoothedMoveZ += (targetZ - this.smoothedMoveZ) * blend;

    const moveX = Math.abs(this.smoothedMoveX) < 0.02 ? 0 : this.smoothedMoveX;
    const moveZ = Math.abs(this.smoothedMoveZ) < 0.02 ? 0 : this.smoothedMoveZ;

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

    this.velocity.set(dx / Math.max(dt, 0.0001), 0, dz / Math.max(dt, 0.0001));
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface CharacterConfig {
  id: number;
  name: string;
  role: CharacterRole;
  scene: Scene;
  mesh: AbstractMesh;
  movement: CharacterMovement;
  animation?: CharacterAnimationController;
  physics?: CharacterPhysicsBody;
}

export class Character {
  readonly id: number;
  readonly name: string;
  readonly role: CharacterRole;
  readonly mesh: AbstractMesh;
  readonly movement: CharacterMovement;
  readonly animation?: CharacterAnimationController;
  readonly physics?: CharacterPhysicsBody;

  actionActive = false;
  private _arrested = false;

  constructor(config: CharacterConfig) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.mesh = config.mesh;
    this.movement = config.movement;
    this.animation = config.animation;
    this.physics = config.physics;
  }

  get isArrested(): boolean {
    return this._arrested;
  }

  setArrested(value: boolean): void {
    this._arrested = value;
    if (value) {
      this.movement.currentSpeed = 0;
      this.movement.isMoving = false;
      this.movement.isSprinting = false;
    }
  }

  update(input: InputState, dt: number): void {
    if (this._arrested) return;
    this.movement.update(this.mesh, input, dt);
    this.animation?.update(this.movement.currentSpeed, this.movement.isSprinting, dt);
    this.physics?.syncTransform(this.mesh.position, this.mesh.rotation.y);

    if (input.actionPressed) {
      this.animation?.playAction('action');
    }
    if (input.interactPressed) {
      this.animation?.playAction('interact');
    }

    this.actionActive = input.action;
  }

  dispose(): void {
    this.animation?.dispose();
    this.physics?.dispose();
    this.mesh.dispose();
  }
}
