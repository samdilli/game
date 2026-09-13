import { createGame } from '@/core/Game';

// Register glTF loader plugin (required before any GLB load)
import '@babylonjs/loaders/glTF';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const uiRoot = document.getElementById('ui-root') as HTMLElement | null;

if (!canvas || !uiRoot) {
  throw new Error('Game canvas or UI root not found');
}

let gamePromise = createGame(canvas, uiRoot);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void gamePromise.then((game) => game.dispose());
  });
}
