import type { InputDevice } from '@/input/InputDevice';
import type { Vector3 } from '@babylonjs/core';

export type GameEventMap = {
  GameStarted: void;
  GamePaused: void;
  GameResumed: void;
  PlayerAction: { playerId: number; action: string };
  GamepadConnected: { id: string; index: number };
  GamepadDisconnected: { id: string; index: number };
  DebugToggled: { enabled: boolean };
  NPCWitnessedCrime: { npcId: number; suspectId: number; location: Vector3 };
  NPCCalledPolice: { npcId: number; location: Vector3 };
  NPCFleeStarted: { npcId: number; reason: string };
  SuspectSeen: { suspectId: number; location: Vector3 };
  PlayerEnteredZone: { playerId: number; zoneId: string };
};

type EventHandler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEventMap, Set<EventHandler<unknown>>>();

  on<K extends keyof GameEventMap>(
    event: K,
    handler: EventHandler<GameEventMap[K]>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEventMap>(
    event: K,
    handler: EventHandler<GameEventMap[K]>,
  ): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export class ServiceContainer {
  private services = new Map<string, unknown>();

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  get<T>(key: string): T {
    const service = this.services.get(key);
    if (service === undefined) {
      throw new Error(`Service not registered: ${key}`);
    }
    return service as T;
  }

  tryGet<T>(key: string): T | undefined {
    return this.services.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.services.has(key);
  }
}

export interface InputManagerDeps {
  devices: InputDevice[];
}

export class InputManager {
  private devices: InputDevice[];

  constructor(deps: InputManagerDeps) {
    this.devices = deps.devices;
  }

  update(): void {
    for (const device of this.devices) {
      device.update();
    }
  }

  getDevice(index: number): InputDevice | undefined {
    return this.devices[index];
  }

  getDevices(): readonly InputDevice[] {
    return this.devices;
  }

  dispose(): void {
    for (const device of this.devices) {
      device.dispose();
    }
  }
}
