import {
  createBabylonEngine,
  type BabylonEngineInstance,
  GameLoop,
} from '@/engine/EngineBootstrap';

export { GameLoop };

export class BabylonEngine {
  readonly engine: BabylonEngineInstance;
  readonly canvas: HTMLCanvasElement;
  readonly backend: 'WebGPU' | 'WebGL2';

  private constructor(canvas: HTMLCanvasElement, engine: BabylonEngineInstance) {
    this.canvas = canvas;
    this.engine = engine;
    this.backend = engine.constructor.name === 'WebGPUEngine' ? 'WebGPU' : 'WebGL2';
  }

  static async create(canvas: HTMLCanvasElement): Promise<BabylonEngine> {
    const engine = await createBabylonEngine(canvas);
    return new BabylonEngine(canvas, engine);
  }

  runRenderLoop(render: () => void): void {
    this.engine.runRenderLoop(render);
  }

  resize(): void {
    this.engine.resize();
  }

  getFps(): number {
    return Math.round(this.engine.getFps());
  }

  dispose(): void {
    this.engine.dispose();
  }
}
