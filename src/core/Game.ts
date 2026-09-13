import { Color3, Vector3 } from '@babylonjs/core';
import { DEFAULT_GAME_CONFIG, GameState, type GameConfig } from '@/config/game';
import {
  PLAYER1_KEYBOARD_BINDINGS,
  PLAYER2_GAMEPAD_BINDINGS,
} from '@/config/controls';
import { engineConfig } from '@/config/engine-config';
import { EventBus, InputManager, ServiceContainer } from '@/core/EventBus';
import { BabylonEngine, GameLoop } from '@/engine/BabylonEngine';
import { CameraManager, createPlayerMesh } from '@/engine/CameraManager';
import { SceneManager } from '@/engine/SceneManager';
import { PhysicsManager } from '@/engine/PhysicsManager';
import { AssetManager } from '@/engine/AssetManager';
import { DevTools } from '@/engine/DevTools';
import { Character, CharacterMovement } from '@/characters/Character';
import { Player, type PlayerSession } from '@/players/Player';
import { PlayerController } from '@/players/PlayerController';
import { InputMapping } from '@/input/InputMapping';
import { KeyboardInput } from '@/input/KeyboardInput';
import { GamepadInput } from '@/input/GamepadInput';
import { SplitScreenUI } from '@/ui/SplitScreenUI';

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
  private devTools?: DevTools;
  private gameLoop?: GameLoop;
  private ui?: SplitScreenUI;

  private controllers: PlayerController[] = [];
  private sessions: PlayerSession[] = [];
  private debugEnabled: boolean;
  private ready = false;

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
    this.devTools = new DevTools();

    this.sceneManager = new SceneManager(this.babylon.engine, {
      worldSize: this.config.worldSize,
    });

    if (engineConfig.features.physics) {
      await this.physicsManager.initialize(this.sceneManager.scene);
    }

    await this.devTools.bindInspector(this.sceneManager.scene);

    this.cameraManager = new CameraManager();
    this.services.register('assetManager', this.assetManager);
    this.services.register('physicsManager', this.physicsManager);

    window.addEventListener('resize', this.boundResize);
    window.addEventListener('gamepadconnected', this.boundGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.boundGamepadDisconnected);

    this.setupInput();
    this.transitionTo(GameState.Menu);
    this.ui!.showMenu(() => this.startGame());
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

  private startGame(): void {
    if (!this.ready || this.state === GameState.Playing) return;
    this.buildPlayers();
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
  }

  private buildPlayers(): void {
    this.disposePlayers();
    const scene = this.sceneManager!.scene;
    const half = this.config.worldSize / 2 - 2;

    const p1Mesh = createPlayerMesh(
      scene,
      'player1',
      new Color3(0.2, 0.45, 0.95),
      new Vector3(-4, 0.9, 0),
    );
    const p2Mesh = createPlayerMesh(
      scene,
      'player2',
      new Color3(0.9, 0.25, 0.2),
      new Vector3(4, 0.9, 0),
    );

    const movementConfig = {
      moveSpeed: this.config.moveSpeed,
      sprintMultiplier: this.config.sprintMultiplier,
      worldHalfSize: half,
    };

    const char1 = new Character({
      id: 1,
      name: 'Polis',
      role: 'police',
      scene,
      mesh: p1Mesh,
      movement: new CharacterMovement(movementConfig),
    });

    const char2 = new Character({
      id: 2,
      name: 'Hırsız',
      role: 'thief',
      scene,
      mesh: p2Mesh,
      movement: new CharacterMovement(movementConfig),
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
      target: p1Mesh,
      splitLayout: this.config.splitLayout,
      viewportIndex: 0,
      viewportCount: 2,
    });
    this.cameraManager!.createPlayerCamera(scene, {
      playerId: 2,
      target: p2Mesh,
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

    if (this.babylon) {
      this.devTools?.updateFps(this.babylon.engine);
    }

    if (this.debugEnabled) {
      this.ui?.showDebug(
        `FPS: ${this.babylon?.getFps()} | ${this.babylon?.backend} | NPC: 0 | Ctrl+Alt+Shift+I: Inspector`,
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
