import { Engine } from '@babylonjs/core/Engines/engine';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { engineConfig } from '@/config/engine-config';

export type BabylonEngineInstance = Engine | WebGPUEngine;

export async function createBabylonEngine(
  canvas: HTMLCanvasElement,
): Promise<BabylonEngineInstance> {
  const opts = engineConfig.rendering.engine;

  if (engineConfig.rendering.webgpuFirst && 'gpu' in navigator) {
    try {
      const webgpu = new WebGPUEngine(canvas, {
        adaptToDeviceRatio: opts.adaptToDeviceRatio,
        antialias: opts.antialias,
      });
      await webgpu.initAsync();
      return webgpu;
    } catch (error) {
      console.warn('WebGPU başlatılamadı, WebGL2 kullanılıyor.', error);
    }
  }

  return new Engine(canvas, opts.antialias, {
    powerPreference: opts.powerPreference,
    preserveDrawingBuffer: opts.preserveDrawingBuffer,
    stencil: opts.stencil,
    disableWebGL2Support: opts.disableWebGL2Support,
    adaptToDeviceRatio: opts.adaptToDeviceRatio,
  });
}

export class GameLoop {
  private running = false;
  private lastTime = 0;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
  }

  stop(): void {
    this.running = false;
  }

  tick(now: number): void {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.render();
  }

  isRunning(): boolean {
    return this.running;
  }
}
