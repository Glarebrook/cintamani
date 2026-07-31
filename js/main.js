import { GRID_W, GRID_H, CELL_SIZE, STATUS_PANEL_HEIGHT } from './config/constants.js';
import { createGame } from './game.js';
import { createTouchControls } from './input/touchControls.js';

window.addEventListener('load', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.width  = GRID_W * CELL_SIZE;   // 내부 해상도
  canvas.height = GRID_H * CELL_SIZE;
  // CSS 표시 크기를 내부 해상도와 1:1로 고정 → 항상 정사각형 픽셀
  canvas.style.width  = canvas.width  + 'px';
  canvas.style.height = canvas.height + 'px';

  // 하단 상태창 캔버스 - 너비는 게임 캔버스와 항상 같게(GRID_W*CELL_SIZE) 맞춘다, 높이는 고정.
  const statusCanvas = document.getElementById('status-canvas');
  statusCanvas.width  = GRID_W * CELL_SIZE;
  statusCanvas.height = STATUS_PANEL_HEIGHT;
  statusCanvas.style.width  = statusCanvas.width  + 'px';
  statusCanvas.style.height = statusCanvas.height + 'px';

  const game = createGame(canvas);
  window.__game = game;
  game.start();

  createTouchControls();
});
