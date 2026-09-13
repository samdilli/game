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
  private devTools?: DevTools;
  private gameLoop?: GameLoop;
  private ui?: SplitScreenUI;

  private controllers: PlayerController[] = [];
  private sessions: PlayerSession[] = [];
  private debugEnabled: boolean;
  private ready = false;
  private assetSourceLabel = '';

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

    if (engineConfig.features.physics) {
      await this.physicsManager.initialize(this.sceneManager.scene);
      this.sceneManager.enablePhysicsColliders();
    }

    await this.devTools.bindInspector(this.sceneManager.scene);

    this.cameraManager = new CameraManager();
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
        : 'Dev modu: CesiumMan kullanılıyor — Quaternius için public/assets/README.md';

    this.transitionTo(GameState.Menu);
    this.ui!.showMenu(() => void this.startGame(), this.assetSourceLabel);
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

    this.ui?.showLoading('Karakterler, animasyonlar ve şehir NPC\'leri yükleniyor…');

    try {
      const assets = await resolveCharacterAssets();
      await this.buildPlayers(assets);

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

      this.transitionTo(GameState.Playing);
      this.eventBus.emit('GameStarted', undefined);

      this.ui?.showGameHud(
        this.sessions.map((s) => ({
          id: s.player.id,
          role: s.player.role,
          label: s.player.inputLabel,
        })),
      );

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
        () => this.ui?.showMenu(() => void this.startGame(), this.assetSourceLabel),
      );
    }
  }

  private async buildPlayers(assets: Awaited<ReturnType<typeof resolveCharacterAssets>>): Promise<void> {
    this.disposePlayers();
    const scene = this.sceneManager!.scene;
    const half = this.config.worldSize / 2 - 2;
    const factory = this.characterFactory!;

    const char1 = await factory.spawn(scene, assets, {
      id: 1,
      name: 'Polis',
      role: 'police',
      instanceName: 'player1',
      position: new Vector3(-4, 0, 0),
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
      position: new Vector3(4, 0, 0),
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

    for (const controller of this.controllers) {
      controller.update(dt);
    }

    this.cameraManager?.updateCameras(
      this.controllers.map((c) => c.getCharacter().mesh),
    );

    for (const session of this.sessions) {
      this.ui?.updateHud(session.player.id, session.character, session.inputDevice);
    }

    const playerChars = this.sessions.map((s) => s.character);
    this.npcManager?.update(dt, playerChars);

    if (this.babylon) {
      this.devTools?.updateFps(this.babylon.engine);
    }

    if (this.debugEnabled) {
      this.ui?.showDebug(
        `FPS: ${this.babylon?.getFps()} | ${this.babylon?.backend} | NPC: ${this.npcManager?.getActiveCount() ?? 0} | ${this.assetSourceLabel}`,
      );
    }
  }

  private render(): void {
    this.sceneManager?.scene.render();
  }

  private transitionTo(state: GameState): void {
    this.state = state;
  }

  private disposePlayers(): void {
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
