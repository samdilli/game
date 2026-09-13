import {
  Color3,
  Color4,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
  type DirectionalLight,
  type HemisphericLight,
} from '@babylonjs/core';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import {
  DEFAULT_WORLD_ENV_CONFIG,
  ambientIntensityForHour,
  fogDensityForWeather,
  formatGameHour,
  skyColorForHour,
  sunIntensityForHour,
  timePhaseLabel,
  type WeatherType,
  type WorldEnvironmentConfig,
} from '@/config/world-environment';

export interface SceneLighting {
  hemi: HemisphericLight;
  sun: DirectionalLight;
  groundMat?: StandardMaterial;
}

export interface WorldEnvironmentState {
  hour: number;
  weather: WeatherType;
  phaseLabel: string;
  timeLabel: string;
}

export class WorldEnvironment {
  private hour: number;
  private readonly weather: WeatherType;
  private rainSystem?: ParticleSystem;
  private streetLamps: PointLight[] = [];
  private lampMeshes: AbstractMesh[] = [];
  private readonly config: WorldEnvironmentConfig;

  constructor(
    private readonly scene: Scene,
    private readonly lighting: SceneLighting,
    weather: WeatherType,
    startHour: number,
    config: Partial<WorldEnvironmentConfig> = {},
  ) {
    this.weather = weather;
    this.hour = startHour;
    this.config = { ...DEFAULT_WORLD_ENV_CONFIG, ...config };
    this.buildStreetLamps();
    this.applyWeather();
    this.applyTimeOfDay();
  }

  update(dt: number): WorldEnvironmentState {
    if (this.config.hoursPerRealSecond > 0) {
      this.hour = (this.hour + dt * this.config.hoursPerRealSecond) % 24;
    }
    this.applyTimeOfDay();
    return this.getState();
  }

  getState(): WorldEnvironmentState {
    return {
      hour: this.hour,
      weather: this.weather,
      phaseLabel: timePhaseLabel(this.hour),
      timeLabel: formatGameHour(this.hour),
    };
  }

  dispose(): void {
    this.rainSystem?.dispose();
    this.rainSystem = undefined;
    for (const lamp of this.streetLamps) lamp.dispose();
    for (const mesh of this.lampMeshes) mesh.dispose();
    this.streetLamps = [];
    this.lampMeshes = [];
    this.scene.fogEnabled = false;
  }

  private applyTimeOfDay(): void {
    const { hemi, sun, groundMat } = this.lighting;
    const sky = skyColorForHour(this.hour);

    this.scene.clearColor.set(sky.r, sky.g, sky.b, 1);
    hemi.intensity = ambientIntensityForHour(this.hour);
    sun.intensity = sunIntensityForHour(this.hour);

    const sunProgress = (this.hour - 6) / 12;
    const angle = sunProgress * Math.PI;
    const x = -Math.cos(angle) * 0.8;
    const y = -Math.max(0.15, Math.sin(angle));
    sun.direction.set(x, y, -0.35).normalize();

    if (groundMat) {
      const night = this.hour % 24 < 6 || this.hour % 24 >= 20;
      groundMat.diffuseColor = night
        ? new Color3(0.12, 0.2, 0.14)
        : new Color3(0.32, 0.55, 0.28);
    }

    const night = this.hour % 24 < 6.5 || this.hour % 24 >= 19.5;
    for (const lamp of this.streetLamps) {
      lamp.intensity = night ? 0.85 : 0;
    }
    for (const mesh of this.lampMeshes) {
      const mat = mesh.material as StandardMaterial | null;
      if (mat) {
        mat.emissiveColor = night
          ? new Color3(1, 0.85, 0.45)
          : Color3.Black();
      }
    }

    if (this.scene.fogEnabled) {
      this.scene.fogColor.copyFromFloats(sky.r, sky.g, sky.b);
      this.scene.fogDensity = fogDensityForWeather(this.weather, this.hour);
    }
  }

  private applyWeather(): void {
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogEnabled = true;
    this.scene.fogDensity = fogDensityForWeather(this.weather, this.hour);

    if (this.weather === 'rain') {
      this.startRain();
    }
  }

  private startRain(): void {
    if (this.rainSystem) return;

    const rain = new ParticleSystem('rain', 2500, this.scene);
    rain.particleTexture = new Texture(
      'https://assets.babylonjs.com/textures/flare.png',
      this.scene,
    );
    rain.emitter = new Vector3(0, 40, 0);
    rain.minEmitBox = new Vector3(-45, 0, -45);
    rain.maxEmitBox = new Vector3(45, 0, 45);
    rain.direction1 = new Vector3(-0.2, -8, 0.2);
    rain.direction2 = new Vector3(0.2, -8, -0.2);
    rain.minLifeTime = 0.4;
    rain.maxLifeTime = 0.9;
    rain.minSize = 0.08;
    rain.maxSize = 0.18;
    rain.emitRate = 900;
    rain.color1 = new Color4(0.75, 0.82, 0.95, 0.55);
    rain.color2 = new Color4(0.65, 0.72, 0.9, 0.35);
    rain.gravity = new Vector3(0, -9, 0);
    rain.start();
    this.rainSystem = rain;
  }

  private buildStreetLamps(): void {
    const positions = [
      [-12, 0, -12],
      [12, 0, -12],
      [-12, 0, 12],
      [12, 0, 12],
      [0, 0, -18],
      [0, 0, 18],
      [-24, 0, 0],
      [24, 0, 0],
      [-18, 0, 18],
      [18, 0, -18],
    ];

    for (let i = 0; i < positions.length; i++) {
      const [x, , z] = positions[i]!;
      const pole = MeshBuilder.CreateCylinder(
        `lamp_pole_${i}`,
        { height: 3.2, diameter: 0.12, tessellation: 6 },
        this.scene,
      );
      pole.position.set(x, 1.6, z);
      const poleMat = new StandardMaterial(`lamp_pole_mat_${i}`, this.scene);
      poleMat.diffuseColor = new Color3(0.25, 0.25, 0.28);
      pole.material = poleMat;

      const bulb = MeshBuilder.CreateSphere(
        `lamp_bulb_${i}`,
        { diameter: 0.35, segments: 8 },
        this.scene,
      );
      bulb.position.set(x, 3.25, z);
      const bulbMat = new StandardMaterial(`lamp_bulb_mat_${i}`, this.scene);
      bulbMat.diffuseColor = new Color3(0.9, 0.85, 0.6);
      bulbMat.emissiveColor = Color3.Black();
      bulb.material = bulbMat;

      const light = new PointLight(`lamp_light_${i}`, new Vector3(x, 3.1, z), this.scene);
      light.intensity = 0;
      light.range = 14;
      light.diffuse = new Color3(1, 0.9, 0.65);

      this.lampMeshes.push(pole, bulb);
      this.streetLamps.push(light);
    }
  }
}
