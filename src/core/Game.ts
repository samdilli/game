import { Vector3 } from '@babylonjs/core';
import { DEFAULT_GAME_CONFIG, GameState, type GameConfig } from '@/config/game';
import {
  PLAYER1_KEYBOARD_BINDINGS,
  PLAYER2_GAMEPAD_BINDINGS,
} from '@/config/controls';
import { engineConfig } from '@/config/engine-config';
import { resolveCharacterAssets, CHARACTER_SPAWN } from '@/config/assets';
import { EventBus, InputManager, ServiceContainer } from '@/core/EventBus';
import { BabylonEngine, GameLoop } from '@/engine/BabylonEngine';
import { CameraManager } from '@/engine/CameraManager';
import { SceneManager } from '@/engine/SceneManager';
import { PhysicsManager } from '@/engine/PhysicsManager';
import { AssetManager } from '@/engine/AssetManager';
import { DevTools } from '@/engine/DevTools';
import { CharacterFactory } from '@/characters/CharacterFactory';
import { Player, type PlayerSession } from '@/players/Player';
import { PlayerController } from '@/players/PlayerController';
import { InputMapping } from '@/input/InputMapping';
import { KeyboardInput } from '@/input/KeyboardInput';
import { GamepadInput } from '@/input/GamepadInput';
import { SplitScreenUI } from '@/ui/SplitScreenUI';
import { NavigationManager } from '@/navigation/NavigationManager';
import { NPCManager } from '@/npc/NPCManager';
import { generatePoliceVsThiefCase, getCaseSpawnPositions } from '@/cases/CaseGenerator';
import type { CaseDefinition } from '@/cases/CaseDefinition';
import { poiById } from '@/world/CityData';
import { ObjectiveMarkers } from '@/world/ObjectiveMarkers';
import { PoliceVsThiefMode } from '@/game-modes/PoliceVsThiefMode';
import type { GameMode } from '@/game-modes/GameMode';
import { WorldEnvironment } from '@/world/WorldEnvironment';
import { startHourFromSeed, weatherFromSeed } from '@/config/world-environment';
import { AudioManager } from '@/audio/AudioManager';

export class Game {
  private config: GameConfig;
  private state = GameState.Boot;
  private services = new ServiceContainer();
  private eventBus = new EventBus();

  private babylon?: BabylonEngine;
  private sceneManager?: SceneManager;
  private cameraManager?: CameraManager;
  private inputManager?: InputManager;
  private physicsManager?: PhysicsManager;
  private assetManager?: AssetManager;
  private characterFactory?: CharacterFactory;
  private navigationManager?: NavigationManager;
  private npcManager?: NPCManager;
  private gameMode?: GameMode;
  private objectiveMarkers?: ObjectiveMarkers;
  private worldEnvironment?: WorldEnvironment;
  private audioManager?: AudioManager;
  private devTools?: DevTools;
  private gameLoop?: GameLoop;
  private ui?: SplitScreenUI;

  private controllers: PlayerController[] = [];
  private sessions: PlayerSession[] = [];
  private debugEnabled: boolean;
  private ready = false;
  private assetSourceLabel = '';
  private matchEnded = false;
  private restartBound = false;
  private countdownRemaining = 0;

  private boundResize = (): void => this.babylon?.resize();
  private boundGamepadConnected = (e: GamepadEvent): void => {
    this.eventBus.emit('GamepadConnected', { id: e.gamepad.id, index: e.gamepad.index });
  };
  private boundGamepadDisconnected = (e: GamepadEvent): void => {
    this.eventBus.emit('GamepadDisconnected', { id: e.gamepad.id, index: e.gamepad.index });
  };

  private constructor(
    private canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
    config: Partial<GameConfig> = {},
  ) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    this.debugEnabled = this.config.debugMode;
    this.ui = new SplitScreenUI(uiRoot);
    this.services.register('eventBus', this.eventBus);
    this.services.register('config', this.config);
  }

  static async create(
    canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
    config?: Partial<GameConfig>,
  ): Promise<Game> {
    const game = new Game(canvas, uiRoot, config);
    await game.initialize();
    return game;
  }

  private async initialize(): Promise<void> {
    this.babylon = await BabylonEngine.create(this.canvas);
    this.physicsManager = new PhysicsManager();
    this.assetManager = new AssetManager();
    this.characterFactory = new CharacterFactory(this.assetManager);
    this.devTools = new DevTools();

    this.sceneManager = new SceneManager(this.babylon.engine, {
      worldSize: this.config.worldSize,
    });
    await this.sceneManager.enhanceCity(this.assetManager);

    if (engineConfig.features.physics) {
      await this.physicsManager.initialize(this.sceneManager.scene);
      this.sceneManager.enablePhysicsColliders();
    }

    await this.devTools.bindInspector(this.sceneManager.scene);

    this.cameraManager = new CameraManager();
    this.audioManager = new AudioManager(this.eventBus);
    this.services.register('assetManager', this.assetManager);
    this.services.register('physicsManager', this.physicsManager);

    window.addEventListener('resize', this.boundResize);
    window.addEventListener('gamepadconnected', this.boundGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.boundGamepadDisconnected);

    this.setupInput();

    const assets = await resolveCharacterAssets();
    this.assetSourceLabel =
      assets.source === 'quaternius'
        ? 'Quaternius karakterler aktif'
        : 'Dev modu: capsule modeller — Quaternius GLB için public/assets/README.md';

    this.transitionTo(GameState.Menu);
    this.ui!.showMenu(() => {
      this.audioManager?.unlock();
      void this.startGame();
    }, this.assetSourceLabel);
    this.ready = true;
  }

  private setupInput(): void {
    const keyboard = new KeyboardInput(
      'keyboard-p1',
      'Klavye',
      new InputMapping(PLAYER1_KEYBOARD_BINDINGS),
    );
    const gamepad = new GamepadInput(
      'gamepad-p2',
      'Gamepad',
      0,
      new InputMapping(PLAYER2_GAMEPAD_BINDINGS),
    );

    this.inputManager = new InputManager({ devices: [keyboard, gamepad] });
    this.services.register('inputManager', this.inputManager);
  }

  private async startGame(): Promise<void> {
    if (!this.ready || this.state === GameState.Playing) return;

    this.matchEnded = false;
    this.restartBound = false;
    this.audioManager?.resetMatch();
    this.ui?.showLoading('Karakterler, animasyonlar ve şehir NPC\'leri yükleniyor…');

    try {
      const assets = await resolveCharacterAssets();
      const caseDef = generatePoliceVsThiefCase();
      await this.buildPlayers(assets, caseDef);

      const envSeed = caseDef.seed ?? Date.now();
      this.worldEnvironment?.dispose();
      this.worldEnvironment = new WorldEnvironment(
        this.sceneManager!.scene,
        this.sceneManager!.lighting,
        weatherFromSeed(envSeed),
        startHourFromSeed(envSeed),
      );

      this.navigationManager = new NavigationManager(this.sceneManager!.city);
      this.npcManager = new NPCManager(
        this.sceneManager!.scene,
        this.navigationManager,
        this.eventBus,
        this.characterFactory!,
      );
      await this.npcManager.spawnPopulation(
        assets,
        this.config.worldSize / 2 - 2,
        this.sessions.map((s) => s.character),
      );

      const crime = poiById(caseDef.crimePoiId);
      const escape = poiById(caseDef.escapePoiId);
      if (crime && escape) {
        this.objectiveMarkers = new ObjectiveMarkers();
        this.objectiveMarkers.build(this.sceneManager!.scene, crime, escape);
      }

      this.transitionTo(GameState.Playing);
      this.eventBus.emit('GameStarted', undefined);

      this.ui?.showGameHud(
        this.sessions.map((s) => ({
          id: s.player.id,
          role: s.player.role,
          label: s.player.inputLabel,
        })),
      );
      this.ui?.setRestartHandler(() => void this.restartMatch());

      this.gameMode = new PoliceVsThiefMode(this.eventBus, caseDef);
      this.gameMode.start();

      this.countdownRemaining = 3;
      this.ui?.showCountdown(3, caseDef.briefing);

      if (!this.gameLoop) {
        this.gameLoop = new GameLoop(
          (dt) => this.update(dt),
          () => this.render(),
        );
        this.babylon!.runRenderLoop(() => {
          this.gameLoop!.tick(performance.now());
        });
      }
      this.gameLoop.start();
    } catch (error) {
      console.error(error);
      this.ui?.showError(
        `Oyun başlatılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        () => this.ui?.showMenu(() => {
          this.audioManager?.unlock();
          void this.startGame();
        }, this.assetSourceLabel),
      );
    }
  }

  private async buildPlayers(
    assets: Awaited<ReturnType<typeof resolveCharacterAssets>>,
    caseDef: CaseDefinition,
  ): Promise<void> {
    this.disposePlayers();
    const scene = this.sceneManager!.scene;
    const half = this.config.worldSize / 2 - 2;
    const factory = this.characterFactory!;
    const spawn = getCaseSpawnPositions(caseDef);

    const char1 = await factory.spawn(scene, assets, {
      id: 1,
      name: 'Polis',
      role: 'police',
      instanceName: 'player1',
      position: new Vector3(spawn.police.x, 0, spawn.police.z),
      moveSpeed: this.config.moveSpeed,
      sprintMultiplier: this.config.sprintMultiplier,
      worldHalfSize: half,
      tint: CHARACTER_SPAWN.policeTint,
    });

    const char2 = await factory.spawn(scene, assets, {
      id: 2,
      name: 'Hırsız',
      role: 'thief',
      instanceName: 'player2',
      position: new Vector3(spawn.thief.x, 0, spawn.thief.z),
      moveSpeed: this.config.moveSpeed,
      sprintMultiplier: this.config.sprintMultiplier,
      worldHalfSize: half,
      tint: CHARACTER_SPAWN.thiefTint,
    });

    const keyboard = this.inputManager!.getDevice(0)!;
    const gamepad = this.inputManager!.getDevice(1)!;

    const player1 = new Player({
      id: 1,
      displayName: 'Polis',
      role: 'police',
      inputLabel: 'Klavye (WASD)',
    });
    const player2 = new Player({
      id: 2,
      displayName: 'Hırsız',
      role: 'thief',
      inputLabel: 'Gamepad (Sol Stick)',
    });

    this.sessions = [
      { player: player1, character: char1, inputDevice: keyboard },
      { player: player2, character: char2, inputDevice: gamepad },
    ];

    this.cameraManager!.createPlayerCamera(scene, {
      playerId: 1,
      target: char1.mesh,
      splitLayout: this.config.splitLayout,
      viewportIndex: 0,
      viewportCount: 2,
    });
    this.cameraManager!.createPlayerCamera(scene, {
      playerId: 2,
      target: char2.mesh,
      splitLayout: this.config.splitLayout,
      viewportIndex: 1,
      viewportCount: 2,
    });

    this.controllers = [
      new PlayerController(1, 'P1', char1, keyboard, this.eventBus),
      new PlayerController(2, 'P2', char2, gamepad, this.eventBus),
    ];
  }

  private update(dt: number): void {
    if (this.state !== GameState.Playing) return;

    this.inputManager?.update();

    if (this.countdownRemaining > 0) {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
      const shown = Math.ceil(this.countdownRemaining);
      if (shown > 0) {
        this.ui?.updateCountdown(shown);
        this.audioManager?.updateCountdown(shown);
      } else {
        this.ui?.hideCountdown();
      }
    } else if (!this.matchEnded) {
      for (const controller of this.controllers) {
        controller.update(dt);
      }
    }

    this.cameraManager?.updateCameras(
      this.controllers.map((c) => c.getCharacter().mesh),
      dt,
    );

    for (const session of this.sessions) {
      this.ui?.updateHud(session.player.id, session.character, session.inputDevice);
    }

    const playerChars = this.sessions.map((s) => s.character);
    this.npcManager?.update(dt, playerChars);

    const envState = this.worldEnvironment?.update(dt);

    const policeSession = this.sessions.find((s) => s.player.role === 'police');
    const thiefSession = this.sessions.find((s) => s.player.role === 'thief');
    if (this.gameMode && policeSession && thiefSession && this.countdownRemaining <= 0) {
      const policeInput = policeSession.inputDevice.getState();
      const holdingArrest = policeInput.interact || policeInput.action;
      const hud = this.gameMode.update({
        police: policeSession.character,
        thief: thiefSession.character,
        policeHoldingInteract: holdingArrest,
        dt,
        environment: envState,
      });
      this.ui?.updateCaseHud(hud);

      if (!this.matchEnded) {
        const dist = Math.hypot(
          policeSession.character.mesh.position.x - thiefSession.character.mesh.position.x,
          policeSession.character.mesh.position.z - thiefSession.character.mesh.position.z,
        );
        this.audioManager?.setChaseTension(Math.max(0, 1 - dist / 28));
      }

      if (hud.showRestart && !this.restartBound) {
        this.matchEnded = true;
        this.restartBound = true;
      }
    }

    if (this.babylon) {
      this.devTools?.updateFps(this.babylon.engine);
    }

    if (this.debugEnabled) {
      const kit = this.sceneManager?.getCityKitCount() ?? 0;
      const env = envState ? `${envState.timeLabel} ${envState.phaseLabel}` : '';
      this.ui?.showDebug(
        `FPS: ${this.babylon?.getFps()} | ${this.babylon?.backend} | NPC: ${this.npcManager?.getActiveCount() ?? 0} | Kit: ${kit} | ${env} | ${this.assetSourceLabel}`,
      );
    }
  }

  private render(): void {
    this.sceneManager?.scene.render();
  }

  private transitionTo(state: GameState): void {
    this.state = state;
  }

  private async restartMatch(): Promise<void> {
    this.gameLoop?.stop();
    this.worldEnvironment?.dispose();
    this.worldEnvironment = undefined;
    this.audioManager?.resetMatch();
    this.objectiveMarkers?.dispose();
    this.objectiveMarkers = undefined;
    this.npcManager?.dispose();
    this.npcManager = undefined;
    this.navigationManager?.clear();
    this.navigationManager = undefined;
    this.disposePlayers();
    this.transitionTo(GameState.Menu);
    await this.startGame();
  }

  private disposePlayers(): void {
    this.gameMode?.dispose();
    this.gameMode = undefined;
    this.objectiveMarkers?.dispose();
    this.objectiveMarkers = undefined;
    for (const controller of this.controllers) {
      controller.getCharacter().dispose();
    }
    this.controllers = [];
    this.sessions = [];
    this.cameraManager?.dispose();
    this.cameraManager = new CameraManager();
  }

  dispose(): void {
    this.gameLoop?.stop();
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('gamepadconnected', this.boundGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.boundGamepadDisconnected);
    this.disposePlayers();
    this.npcManager?.dispose();
    this.navigationManager?.clear();
    this.inputManager?.dispose();
    this.sceneManager?.dispose();
    this.babylon?.dispose();
    this.devTools?.dispose();
    this.assetManager?.clear();
    this.audioManager?.dispose();
    this.ui?.clear();
    this.eventBus.clear();
  }
}

export async function createGame(
  canvas: HTMLCanvasElement,
  uiRoot: HTMLElement,
  config?: Partial<GameConfig>,
): Promise<Game> {
  return Game.create(canvas, uiRoot, config);
}
