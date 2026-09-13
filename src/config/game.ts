export enum GameState {
  Boot = 'boot',
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
}

export type SplitLayout = 'horizontal' | 'vertical' | 'single';

export interface GameConfig {
  splitLayout: SplitLayout;
  debugMode: boolean;
  moveSpeed: number;
  sprintMultiplier: number;
  worldSize: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  splitLayout: 'horizontal',
  debugMode: import.meta.env.DEV,
  moveSpeed: 7,
  sprintMultiplier: 1.85,
  worldSize: 80,
};
