/**
 * Engine feature flags — inspired by bp900 template-config.
 * Gameplay tuning lives in config/game.ts.
 */
export const engineConfig = {
  features: {
    physics: true,
    renderingPipeline: false,
    environment: true,
  },
  rendering: {
    webgpuFirst: true,
    engine: {
      adaptToDeviceRatio: true,
      antialias: true,
      powerPreference: 'high-performance' as const,
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    },
    pipeline: {
      samples: 4,
      fxaaEnabled: true,
    },
  },
  debug: {
    showFps: import.meta.env.DEV,
    inspectorInDevOnly: true,
  },
} as const;

export type EngineConfig = typeof engineConfig;
