import type { Engine } from '@babylonjs/core/Engines/engine';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import type { Scene } from '@babylonjs/core/scene';
import { engineConfig } from '@/config/engine-config';

type AnyEngine = Engine | WebGPUEngine;

export class DevTools {
  private fpsElement: HTMLElement | null = null;
  private inspectorBound = false;

  async bindInspector(scene: Scene): Promise<void> {
    if (!engineConfig.debug.inspectorInDevOnly || !import.meta.env.DEV) return;
    if (this.inspectorBound) return;

    await Promise.all([
      import('@babylonjs/core/Debug/debugLayer'),
      import('@babylonjs/inspector'),
    ]);

    window.addEventListener('keydown', (ev) => {
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key.toLowerCase() === 'i') {
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide();
        } else {
          void scene.debugLayer.show();
        }
      }
    });

    this.inspectorBound = true;
  }

  updateFps(engine: AnyEngine): void {
    if (!engineConfig.debug.showFps) return;

    if (!this.fpsElement) {
      this.fpsElement = document.getElementById('display-fps');
      if (!this.fpsElement) {
        this.fpsElement = document.createElement('div');
        this.fpsElement.id = 'display-fps';
        document.body.appendChild(this.fpsElement);
      }
    }

    this.fpsElement.textContent = `${engine.getFps().toFixed(0)} fps`;
  }

  dispose(): void {
    this.fpsElement?.remove();
    this.fpsElement = null;
  }
}

export function getEngineLabel(engine: AnyEngine): string {
  return engine.constructor.name === 'WebGPUEngine' ? 'WebGPU' : 'WebGL2';
}
