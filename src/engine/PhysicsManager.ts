import { Vector3, type Scene } from '@babylonjs/core';
import '@babylonjs/core/Physics/physicsEngineComponent';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';

export class PhysicsManager {
  private initialized = false;

  get isReady(): boolean {
    return this.initialized;
  }

  async initialize(scene: Scene): Promise<boolean> {
    if (this.initialized) return true;

    const { default: HavokPhysics } = await import('@babylonjs/havok');
    const havok = await HavokPhysics();
    const plugin = new HavokPlugin(true, havok);
    const ok = scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
    this.initialized = ok;
    return ok;
  }
}
